import type {
  GlyphCallbackResponse,
  GlyphCallbackVerificationOptions,
  GlyphDappMeta,
  GlyphPreparedRelaySession,
  GlyphRequest,
} from "@glyph-oss/connect";
import {
  createConnectRequest,
  createEnvelope,
  createRelayCapabilities,
  createSignMessageRequest,
  GLYPH_MAINNET,
  GlyphRelayError,
  relayUrls,
  subscribeViaRelayV2,
} from "@glyph-oss/connect";
import type { Identity } from "@qubic.org/crypto";
import { identityToPublicKey, k12, verify } from "@qubic.org/crypto";
import { extensionConnector } from "@qubic.org/react";
import type SignClient from "@walletconnect/sign-client";

import { QUBIC_SIGNED_MESSAGE_PREFIX } from "@/lib/profiles/signature";

import { isValidWalletIdentity as isValidIdentity, selectWalletConnectIdentity } from "./selection";
import type { ProfileWalletAccount, ProfileWalletSignature } from "./types";

const ACTIVE_ACCOUNT_STORAGE_KEY = "glyph-explorer.wallet.active-account";
const GLYPH_ACCOUNT_STORAGE_KEY = "glyph-explorer.wallet.glyph-account";
const WALLETCONNECT_TOPIC_STORAGE_KEY = "glyph-explorer.wallet.walletconnect-topic";

const QUBIC_CHAIN_ID = "qubic:mainnet";
const WALLETCONNECT_METHODS = [
  "qubic_requestAccounts",
  "qubic_signTransaction",
  "qubic_sendQubic",
  "qubic_sign",
];
const WALLETCONNECT_EVENTS = ["accountsChanged", "amountChanged"];
const HEX_REGEX = /^[0-9a-fA-F]+$/;
const REJECT_MESSAGE_REGEX = /reject|denied|cancel/i;
const TIMEOUT_MESSAGE_REGEX = /timed?\s*out|timeout/i;
const HTTPS_ORIGIN_REGEX = /HTTPS origin|credential-free HTTPS/i;
const RELAY_REGISTRATION_TIMEOUT_MS = 10_000;

type WalletConnectConnectResult = Awaited<ReturnType<SignClient["connect"]>>;
type WalletConnectSession = Awaited<ReturnType<WalletConnectConnectResult["approval"]>>;

let walletConnectClientPromise: Promise<SignClient> | null = null;

/** A wallet failure whose message is safe to show to the user. */
export class WalletError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "WalletError";
  }
}

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getWalletConnectProjectId(): string | null {
  if (typeof process === "undefined") {
    return null;
  }
  const value = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  return value && value.trim().length > 0 ? value.trim() : null;
}

export function readStoredJson<T>(key: string): T | null {
  if (!isBrowser()) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeStoredJson(key: string, value: unknown): void {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in privacy modes. The wallet still works in memory.
  }
}

export function removeStoredValue(key: string): void {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export interface StoredActiveAccount {
  account: ProfileWalletAccount;
  kind: ProfileWalletAccount["kind"];
}

export function readActiveAccount(): StoredActiveAccount | null {
  const stored = readStoredJson<StoredActiveAccount>(ACTIVE_ACCOUNT_STORAGE_KEY);
  if (!(stored?.account && stored.kind)) {
    return null;
  }
  if (!isValidIdentity(stored.account.identity)) {
    return null;
  }
  return stored;
}

export function persistActiveAccount(account: ProfileWalletAccount): void {
  writeStoredJson(ACTIVE_ACCOUNT_STORAGE_KEY, { account, kind: account.kind });
  if (account.kind === "glyph") {
    writeStoredJson(GLYPH_ACCOUNT_STORAGE_KEY, account);
  }
}

export function clearStoredWalletState(): void {
  removeStoredValue(ACTIVE_ACCOUNT_STORAGE_KEY);
  removeStoredValue(GLYPH_ACCOUNT_STORAGE_KEY);
  removeStoredValue(WALLETCONNECT_TOPIC_STORAGE_KEY);
}

export function clearActiveAccount(): void {
  removeStoredValue(ACTIVE_ACCOUNT_STORAGE_KEY);
}

export function identityPublicKey(identity: string): Uint8Array | null {
  try {
    return identityToPublicKey(identity as Identity);
  } catch {
    return null;
  }
}

export function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function base64ToBytes(value: string): Uint8Array | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function bytesToHex(bytes: Uint8Array): string {
  let output = "";
  for (const byte of bytes) {
    output += byte.toString(16).padStart(2, "0");
  }
  return output;
}

function hexToBytes(value: string): Uint8Array | null {
  if (!HEX_REGEX.test(value) || value.length % 2 !== 0) {
    return null;
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function decodeBytes(value: unknown, byteLength: number): Uint8Array | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const hexValue = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  if (HEX_REGEX.test(hexValue) && hexValue.length === byteLength * 2) {
    return hexToBytes(hexValue);
  }
  const bytes = base64ToBytes(trimmed);
  return bytes?.length === byteLength ? bytes : null;
}

/** Normalizes a 64 byte hex or base64 signature into lowercase 128 character hex. */
export function normalizeSignatureHex(value: unknown): string | null {
  const bytes = decodeBytes(value, 64);
  return bytes ? bytesToHex(bytes) : null;
}

/** Normalizes a 32 byte hex or base64 public key into bytes. */
export function normalizePublicKeyBytes(value: unknown): Uint8Array | null {
  return decodeBytes(value, 32);
}

export function verifyMessageSignature(
  message: string,
  signatureHex: string,
  identity: string,
  allowQubicMessagePrefix = false,
): boolean {
  const signature = hexToBytes(signatureHex);
  const publicKey = identityPublicKey(identity);
  if (signature?.length !== 64 || !publicKey) {
    return false;
  }
  const messages = allowQubicMessagePrefix
    ? [message, `${QUBIC_SIGNED_MESSAGE_PREFIX}${message}`]
    : [message];
  return messages.some((value) => {
    const digest = k12(new TextEncoder().encode(value), 32);
    return verify(digest, signature, publicKey);
  });
}

export function toSafeWalletError(error: unknown): string {
  if (error instanceof WalletError) {
    return error.message;
  }
  if (error instanceof GlyphRelayError) {
    switch (error.code) {
      case "stream_timeout":
      case "poll_timeout":
      case "poll_exhausted":
      case "result_pending":
        return "Glyph Wallet did not respond in time. Try again.";
      case "callback_invalid":
      case "callback_verification_failed":
        return "Glyph Wallet returned a response that could not be verified. Try again.";
      case "registration_failed":
      case "registration_timeout":
        return "Could not reach the Glyph Wallet relay. Try again.";
      case "aborted":
        return "The Glyph Wallet request was cancelled.";
      default:
        return "Glyph Wallet request failed. Try again.";
    }
  }
  const message = error instanceof Error ? error.message : "";
  if (REJECT_MESSAGE_REGEX.test(message)) {
    return "The request was rejected in the wallet.";
  }
  if (TIMEOUT_MESSAGE_REGEX.test(message)) {
    return "The wallet did not respond in time. Try again.";
  }
  if (HTTPS_ORIGIN_REGEX.test(message)) {
    return "Glyph Wallet requires a secure HTTPS origin.";
  }
  return "Wallet request failed. Try again.";
}

export function glyphDappMeta(): GlyphDappMeta {
  if (!isBrowser()) {
    throw new WalletError("Glyph Wallet is only available in the browser.");
  }
  return { name: "Glyph Explorer", origin: window.location.origin };
}

/**
 * Registers a Glyph relay session without the SDK's trailing AbortController
 * abort. In browsers that abort makes an otherwise successful registration
 * appear cancelled, so the request would never settle and Glyph Wallet would
 * stay stuck on "Preparing the Glyph Wallet relay".
 */
export async function createGlyphRelaySession(): Promise<GlyphPreparedRelaySession> {
  const urls = relayUrls(createRelayCapabilities());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RELAY_REGISTRATION_TIMEOUT_MS);

  try {
    const response = await fetch(urls.registerUrl, {
      body: JSON.stringify({
        callbackCap: urls.callbackCap,
        readCap: urls.readCap,
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });

    // Drain the response before returning so the connection is not torn down.
    await response.text().catch(() => undefined);

    if (!response.ok) {
      throw new GlyphRelayError(
        response.status === 408 ? "registration_timeout" : "registration_failed",
      );
    }

    // The SDK brands this shape with an internal symbol; it only reads the URLs.
    return { ...urls, registered: true } as GlyphPreparedRelaySession;
  } catch (error) {
    if (error instanceof GlyphRelayError) {
      throw error;
    }
    throw new GlyphRelayError(
      controller.signal.aborted ? "registration_timeout" : "registration_failed",
    );
  } finally {
    clearTimeout(timer);
  }
}

export interface GlyphRelayRequest {
  controller: AbortController;
  envelope: ReturnType<typeof createEnvelope>;
  relay: GlyphPreparedRelaySession;
  request: GlyphRequest;
  result: Promise<GlyphCallbackResponse>;
}

export function createGlyphConnectRequest() {
  return createConnectRequest({
    dapp: glyphDappMeta(),
    permissions: ["sign_message"],
    type: "connect",
  });
}

export function createGlyphSignMessageRequest(message: string, identity: string) {
  return createSignMessageRequest({
    dapp: glyphDappMeta(),
    from: identity,
    message,
    type: "sign_message",
  });
}

export function buildGlyphVerification(
  request: GlyphRequest,
  expectedIdentity?: string,
): GlyphCallbackVerificationOptions {
  return {
    expectedDappOrigin: request.dapp.origin,
    expectedNetwork: GLYPH_MAINNET,
    requireSigned: true,
    verifySignature(input) {
      try {
        if (input.algorithm !== "qubic-schnorrq-sha256") {
          return false;
        }
        const { proof } = input.envelope;
        if (expectedIdentity && proof.identity !== expectedIdentity) {
          return false;
        }

        const identityKey = identityToPublicKey(proof.identity as Identity);
        if (!bytesEqual(identityKey, input.publicKey)) {
          return false;
        }

        const proofKey = normalizePublicKeyBytes(proof.public_key);
        if (!(proofKey && bytesEqual(identityKey, proofKey))) {
          return false;
        }

        const digest = k12(input.payload, 32);
        return verify(digest, input.signature, identityKey);
      } catch {
        return false;
      }
    },
  };
}

export function startGlyphRelayRequest(
  request: GlyphRequest,
  relay: GlyphPreparedRelaySession,
  expectedIdentity?: string,
): GlyphRelayRequest {
  const envelope = createEnvelope(request, {
    callback: relay.callbackUrl,
    network: GLYPH_MAINNET,
  });
  const controller = new AbortController();
  const result = subscribeViaRelayV2(request, relay, {
    maxPollAttempts: 3,
    requestHash: envelope.request_hash,
    signal: controller.signal,
    verification: buildGlyphVerification(request, expectedIdentity),
  });

  return { controller, envelope, relay, request, result };
}

export function userActivationIsActive(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }
  const activation = (navigator as Navigator & { userActivation?: { isActive: boolean } })
    .userActivation;
  return activation ? activation.isActive : true;
}

// Browser extension

export function isExtensionAvailable(): boolean {
  try {
    return extensionConnector.isAvailable();
  } catch {
    return false;
  }
}

function extensionAccount(wallet: { identity: string; name?: string }): ProfileWalletAccount {
  if (!isValidIdentity(wallet.identity)) {
    throw new WalletError("The extension returned an invalid Qubic identity.");
  }
  return {
    identity: wallet.identity,
    kind: "extension",
    label: wallet.name?.trim() || "Browser extension",
  };
}

export async function connectExtension(): Promise<ProfileWalletAccount> {
  if (!isExtensionAvailable()) {
    throw new WalletError("The Qubic browser extension is not installed.");
  }
  const wallet = await extensionConnector.connect();
  return extensionAccount(wallet);
}

export async function restoreExtension(): Promise<ProfileWalletAccount | null> {
  if (!isExtensionAvailable()) {
    return null;
  }
  try {
    const wallet = await extensionConnector.getAccount();
    if (!wallet) {
      return null;
    }
    return extensionAccount(wallet);
  } catch {
    return null;
  }
}

export async function signWithExtension(
  message: string,
  identity: string,
): Promise<ProfileWalletSignature> {
  const wallet = await extensionConnector.getAccount();
  if (!wallet || wallet.identity !== identity) {
    throw new WalletError("The browser extension account changed. Reconnect and try again.");
  }
  const result = await extensionConnector.signMessage(message);
  const signatureHex = normalizeSignatureHex(result.signatureHex);
  if (!signatureHex) {
    throw new WalletError("The extension returned an invalid signature.");
  }
  if (!verifyMessageSignature(message, signatureHex, identity)) {
    throw new WalletError("The extension signature could not be verified.");
  }
  return { identity, signatureHex };
}

export async function disconnectExtension(): Promise<void> {
  try {
    await extensionConnector.disconnect();
  } catch {
    // The extension may already be disconnected.
  }
}

// WalletConnect

function getWalletConnectClient(): Promise<SignClient> {
  const projectId = getWalletConnectProjectId();
  if (!projectId) {
    throw new WalletError("WalletConnect is not configured.");
  }
  if (!walletConnectClientPromise) {
    walletConnectClientPromise = import("@walletconnect/sign-client")
      .then(({ default: SignClientClient }) =>
        SignClientClient.init({
          metadata: {
            description: "Glyph Explorer verified profiles",
            icons: [],
            name: "Glyph Explorer",
            url: window.location.origin,
          },
          projectId,
        }),
      )
      .catch((error: unknown) => {
        walletConnectClientPromise = null;
        throw error;
      });
  }
  return walletConnectClientPromise;
}

function readWalletConnectTopic(): string | null {
  if (!isBrowser()) {
    return null;
  }
  try {
    return window.localStorage.getItem(WALLETCONNECT_TOPIC_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function restoreWalletConnect(
  preferredIdentity?: string,
): Promise<ProfileWalletAccount | null> {
  const topic = readWalletConnectTopic();
  if (!(topic && getWalletConnectProjectId())) {
    return null;
  }
  try {
    const client = await getWalletConnectClient();
    const session = client.session.get(topic);
    if (!session) {
      removeStoredValue(WALLETCONNECT_TOPIC_STORAGE_KEY);
      return null;
    }
    const identity = selectWalletConnectIdentity(
      session.namespaces.qubic?.accounts,
      preferredIdentity,
    );
    if (!identity) {
      return null;
    }
    return { identity, kind: "walletconnect", label: "WalletConnect" };
  } catch {
    return null;
  }
}

export async function connectWalletConnect(
  onUri: (uri: string) => void,
  preferredIdentity?: string,
): Promise<ProfileWalletAccount> {
  const existing = await restoreWalletConnect(preferredIdentity);
  if (existing) {
    return existing;
  }

  const client = await getWalletConnectClient();
  const { uri, approval } = await client.connect({
    requiredNamespaces: {
      qubic: {
        chains: [QUBIC_CHAIN_ID],
        events: WALLETCONNECT_EVENTS,
        methods: WALLETCONNECT_METHODS,
      },
    },
  });

  if (uri) {
    onUri(uri);
  }

  let session: WalletConnectSession;
  try {
    session = await approval();
  } finally {
    onUri("");
  }

  const identity = selectWalletConnectIdentity(
    session.namespaces.qubic?.accounts,
    preferredIdentity,
  );
  if (!identity) {
    throw new WalletError("WalletConnect did not return a valid Qubic identity.");
  }

  try {
    window.localStorage.setItem(WALLETCONNECT_TOPIC_STORAGE_KEY, session.topic);
  } catch {
    // The in-memory session still works for this page load.
  }

  return { identity, kind: "walletconnect", label: "WalletConnect" };
}

function extractWalletConnectSignature(response: unknown): string | null {
  if (typeof response === "string") {
    return normalizeSignatureHex(response);
  }
  if (!response || typeof response !== "object") {
    return null;
  }
  const record = response as Record<string, unknown>;
  return (
    normalizeSignatureHex(record.signatureHex) ??
    normalizeSignatureHex(record.signature) ??
    normalizeSignatureHex(record.signature_hex)
  );
}

export async function signWithWalletConnect(
  message: string,
  identity: string,
): Promise<ProfileWalletSignature> {
  const topic = readWalletConnectTopic();
  if (!topic) {
    throw new WalletError("WalletConnect is not connected.");
  }
  const client = await getWalletConnectClient();
  const response = await client.request<unknown>({
    chainId: QUBIC_CHAIN_ID,
    request: {
      method: "qubic_sign",
      params: { from: identity, message },
    },
    topic,
  });

  const signatureHex = extractWalletConnectSignature(response);
  if (!signatureHex) {
    throw new WalletError("WalletConnect returned an invalid signature.");
  }
  if (!verifyMessageSignature(message, signatureHex, identity, true)) {
    throw new WalletError("The WalletConnect signature could not be verified.");
  }
  return { identity, signatureHex };
}

export async function disconnectWalletConnect(): Promise<void> {
  const topic = readWalletConnectTopic();
  removeStoredValue(WALLETCONNECT_TOPIC_STORAGE_KEY);
  if (!(topic && walletConnectClientPromise)) {
    return;
  }
  try {
    const client = await getWalletConnectClient();
    await client.disconnect({
      reason: { code: 6000, message: "User disconnected" },
      topic,
    });
  } catch {
    // The session may already be gone.
  }
}

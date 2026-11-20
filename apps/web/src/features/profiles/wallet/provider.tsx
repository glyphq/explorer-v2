"use client";

import type {
  GlyphCallbackResponse,
  GlyphPreparedRelaySession,
  GlyphRequest,
} from "@glyph-oss/connect";
import { launchGlyphRequest } from "@glyph-oss/connect";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  bytesEqual,
  clearActiveAccount,
  clearStoredWalletState,
  connectExtension,
  connectWalletConnect,
  createGlyphConnectRequest,
  createGlyphRelaySession,
  createGlyphSignMessageRequest,
  disconnectExtension,
  disconnectWalletConnect,
  getWalletConnectProjectId,
  identityPublicKey,
  isBrowser,
  isExtensionAvailable,
  normalizePublicKeyBytes,
  normalizeSignatureHex,
  persistActiveAccount,
  readActiveAccount,
  restoreExtension,
  restoreWalletConnect,
  signWithExtension,
  signWithWalletConnect,
  startGlyphRelayRequest,
  toSafeWalletError,
  userActivationIsActive,
  verifyMessageSignature,
  WalletError,
} from "./connectors";
import { isValidWalletIdentity as isValidIdentity } from "./selection";
import type {
  GlyphReadiness,
  ProfileWalletAccount,
  ProfileWalletApi,
  ProfileWalletAvailability,
  ProfileWalletKind,
  ProfileWalletSignature,
} from "./types";

const initialAvailability: ProfileWalletAvailability = {
  extension: false,
  glyph: false,
  walletconnect: false,
};

const ProfileWalletContext = createContext<ProfileWalletApi | null>(null);

function unavailableMessage(kind: ProfileWalletKind): string {
  switch (kind) {
    case "glyph":
      return "Glyph Wallet is not available in this browser.";
    case "extension":
      return "The Qubic browser extension is not installed.";
    case "walletconnect":
      return "WalletConnect is not configured.";
    default:
      return "This wallet is not available.";
  }
}

function rejectedMessage(kind: ProfileWalletKind): string {
  return kind === "glyph"
    ? "The request was rejected in Glyph Wallet."
    : "The request was rejected in the wallet.";
}

export function ProfileWalletProvider({
  children,
  preferredIdentity,
}: {
  children: React.ReactNode;
  preferredIdentity?: string;
}) {
  const [account, setAccount] = useState<ProfileWalletAccount | null>(null);
  const [kind, setKind] = useState<ProfileWalletKind | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletConnectUri, setWalletConnectUri] = useState<string | null>(null);
  const [glyphReadiness, setGlyphReadiness] = useState<GlyphReadiness>("idle");
  const [glyphError, setGlyphError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<ProfileWalletAvailability>(initialAvailability);

  const accountRef = useRef<ProfileWalletAccount | null>(null);
  const kindRef = useRef<ProfileWalletKind | null>(null);
  const connectingRef = useRef(false);
  const relayRef = useRef<GlyphPreparedRelaySession | null>(null);
  const relayPromiseRef = useRef<Promise<GlyphPreparedRelaySession> | null>(null);
  const relayControllersRef = useRef<Set<AbortController>>(new Set());

  const applyAccount = useCallback(
    (nextAccount: ProfileWalletAccount, nextKind: ProfileWalletKind) => {
      accountRef.current = nextAccount;
      kindRef.current = nextKind;
      setAccount(nextAccount);
      setKind(nextKind);
      persistActiveAccount(nextAccount);
    },
    [],
  );

  const prepareRelay = useCallback((): Promise<GlyphPreparedRelaySession> => {
    if (relayRef.current) {
      return Promise.resolve(relayRef.current);
    }
    if (relayPromiseRef.current) {
      return relayPromiseRef.current;
    }

    setGlyphReadiness("preparing");
    setGlyphError(null);

    const promise = createGlyphRelaySession()
      .then((relay) => {
        relayRef.current = relay;
        setGlyphReadiness("ready");
        return relay;
      })
      .catch(() => {
        setGlyphReadiness("error");
        setGlyphError("Could not reach the Glyph Wallet relay. Try again.");
        throw new WalletError("Could not reach the Glyph Wallet relay. Try again.");
      })
      .finally(() => {
        if (relayPromiseRef.current === promise) {
          relayPromiseRef.current = null;
        }
      });

    relayPromiseRef.current = promise;
    return promise;
  }, []);

  const consumeRelay = useCallback(async (): Promise<GlyphPreparedRelaySession> => {
    const relay = await prepareRelay();
    if (relayRef.current === relay) {
      relayRef.current = null;
    }
    return relay;
  }, [prepareRelay]);

  const takeRelayNow = useCallback((): GlyphPreparedRelaySession | null => {
    const relay = relayRef.current;
    if (!relay) {
      return null;
    }
    relayRef.current = null;
    return relay;
  }, []);

  const startNextRelayPreparation = useCallback(() => {
    if (!isBrowser()) {
      return;
    }
    prepareRelay().catch(() => {
      // The error is exposed through glyphReadiness and glyphError.
    });
  }, [prepareRelay]);

  const runGlyphRequest = useCallback(
    async (
      request: GlyphRequest,
      relay: GlyphPreparedRelaySession,
      expectedIdentity?: string,
    ): Promise<GlyphCallbackResponse> => {
      const { envelope, controller, result } = startGlyphRelayRequest(
        request,
        relay,
        expectedIdentity,
      );
      relayControllersRef.current.add(controller);

      try {
        if (!userActivationIsActive()) {
          controller.abort();
          result.catch(() => {
            // The relay request was aborted before launch.
          });
          throw new WalletError("Tap the button again to open Glyph Wallet.");
        }

        try {
          launchGlyphRequest(envelope);
        } catch (cause) {
          controller.abort();
          result.catch(() => {
            // The relay request was aborted before launch.
          });
          throw new WalletError("Could not open Glyph Wallet. Try again.", {
            cause,
          });
        }

        return await result;
      } finally {
        relayControllersRef.current.delete(controller);
      }
    },
    [],
  );

  const connectGlyph = useCallback(async (): Promise<ProfileWalletAccount> => {
    const relay = takeRelayNow() ?? (await consumeRelay());
    startNextRelayPreparation();

    const request = createGlyphConnectRequest();
    const result = await runGlyphRequest(request, relay);

    if (result.status === "rejected") {
      throw new WalletError(rejectedMessage("glyph"));
    }
    if (result.status !== "connected" || result.type !== "connect") {
      throw new WalletError("Glyph Wallet returned an unexpected connection response.");
    }
    if (!result.permissions.includes("sign_message")) {
      throw new WalletError("Glyph Wallet did not grant message signing permission.");
    }
    if (!isValidIdentity(result.identity)) {
      throw new WalletError("Glyph Wallet returned an invalid Qubic identity.");
    }

    return { identity: result.identity, kind: "glyph", label: "Glyph Wallet" };
  }, [consumeRelay, runGlyphRequest, startNextRelayPreparation, takeRelayNow]);

  const signWithGlyph = useCallback(
    async (message: string, identity: string): Promise<ProfileWalletSignature> => {
      const relay = takeRelayNow() ?? (await consumeRelay());
      startNextRelayPreparation();

      const request = createGlyphSignMessageRequest(message, identity);
      const result = await runGlyphRequest(request, relay, identity);

      if (result.status === "rejected") {
        throw new WalletError(rejectedMessage("glyph"));
      }
      if (result.status !== "signed" || result.type !== "sign_message") {
        throw new WalletError("Glyph Wallet returned an unexpected signing response.");
      }
      if (result.identity !== identity) {
        throw new WalletError("Glyph Wallet signed with a different identity.");
      }

      if (result.public_key) {
        const declaredKey = normalizePublicKeyBytes(result.public_key);
        const expectedKey = identityPublicKey(identity);
        if (!(declaredKey && expectedKey && bytesEqual(declaredKey, expectedKey))) {
          throw new WalletError(
            "Glyph Wallet returned a public key that does not match the account.",
          );
        }
      }

      const signatureHex = normalizeSignatureHex(result.signature);
      if (!signatureHex) {
        throw new WalletError("Glyph Wallet returned an invalid signature.");
      }
      if (!verifyMessageSignature(message, signatureHex, identity)) {
        throw new WalletError("The Glyph Wallet signature could not be verified.");
      }

      return { identity, signatureHex };
    },
    [consumeRelay, runGlyphRequest, startNextRelayPreparation, takeRelayNow],
  );

  const connect = useCallback(
    async (
      nextKind: ProfileWalletKind,
      requestedIdentity?: string,
    ): Promise<ProfileWalletAccount> => {
      if (!isBrowser()) {
        const message = "Wallets are only available in the browser.";
        setError(message);
        throw new WalletError(message);
      }
      // biome-ignore lint/suspicious/noUnnecessaryConditions: guards concurrent wallet requests.
      if (connectingRef.current) {
        const message = "A wallet request is already in progress.";
        setError(message);
        throw new WalletError(message);
      }
      if (!availability[nextKind]) {
        const message = unavailableMessage(nextKind);
        setError(message);
        throw new WalletError(message);
      }

      connectingRef.current = true;
      setIsConnecting(true);
      setError(null);

      try {
        let nextAccount: ProfileWalletAccount;
        switch (nextKind) {
          case "glyph":
            nextAccount = await connectGlyph();
            break;
          case "extension":
            nextAccount = await connectExtension();
            break;
          case "walletconnect":
            nextAccount = await connectWalletConnect((uri) => {
              setWalletConnectUri(uri || null);
            }, requestedIdentity ?? preferredIdentity);
            break;
          default:
            throw new WalletError("Unsupported wallet.");
        }

        setWalletConnectUri(null);
        applyAccount(nextAccount, nextKind);
        return nextAccount;
      } catch (cause) {
        const message = toSafeWalletError(cause);
        setError(message);
        setWalletConnectUri(null);
        throw new WalletError(message, { cause });
      } finally {
        connectingRef.current = false;
        setIsConnecting(false);
      }
    },
    [applyAccount, availability, connectGlyph, preferredIdentity],
  );

  const disconnect = useCallback(async (): Promise<void> => {
    const currentKind = kindRef.current;

    if (currentKind === "extension") {
      await disconnectExtension();
    } else if (currentKind === "walletconnect") {
      await disconnectWalletConnect();
    }

    for (const controller of relayControllersRef.current) {
      controller.abort();
    }
    relayControllersRef.current.clear();

    clearStoredWalletState();
    accountRef.current = null;
    kindRef.current = null;
    setAccount(null);
    setKind(null);
    setWalletConnectUri(null);
    setError(null);
  }, []);

  const signMessage = useCallback(
    async (message: string): Promise<ProfileWalletSignature> => {
      const currentKind = kindRef.current;
      const currentAccount = accountRef.current;

      if (!(currentKind && currentAccount)) {
        const messageText = "Connect a wallet before signing.";
        setError(messageText);
        throw new WalletError(messageText);
      }
      if (!message) {
        const messageText = "The challenge message is empty.";
        setError(messageText);
        throw new WalletError(messageText);
      }

      setError(null);

      try {
        switch (currentKind) {
          case "glyph":
            return await signWithGlyph(message, currentAccount.identity);
          case "extension":
            return await signWithExtension(message, currentAccount.identity);
          case "walletconnect":
            return await signWithWalletConnect(message, currentAccount.identity);
          default:
            throw new WalletError("Unsupported wallet.");
        }
      } catch (cause) {
        const messageText = toSafeWalletError(cause);
        setError(messageText);
        throw new WalletError(messageText, { cause });
      }
    },
    [signWithGlyph],
  );

  const prepareGlyph = useCallback(() => {
    if (!isBrowser()) {
      return;
    }
    prepareRelay().catch(() => {
      // The error is exposed through glyphReadiness and glyphError.
    });
  }, [prepareRelay]);

  const clearError = useCallback(() => {
    setError(null);
    setGlyphError(null);
  }, []);

  useEffect(() => {
    setAvailability({
      extension: isExtensionAvailable(),
      glyph: isBrowser(),
      walletconnect: getWalletConnectProjectId() !== null,
    });

    if (!isBrowser()) {
      return;
    }

    prepareGlyph();

    const saved = readActiveAccount();
    if (saved) {
      if (saved.kind === "glyph") {
        applyAccount(saved.account, "glyph");
      } else if (saved.kind === "extension") {
        restoreExtension()
          .then((restored) => {
            if (restored) {
              applyAccount(restored, "extension");
            } else {
              clearActiveAccount();
              accountRef.current = null;
              kindRef.current = null;
              setAccount(null);
              setKind(null);
            }
          })
          .catch(() => {
            // Keep the stored account when the extension cannot be reached.
          });
      } else if (saved.kind === "walletconnect") {
        restoreWalletConnect(preferredIdentity)
          .then((restored) => {
            if (restored) {
              applyAccount(restored, "walletconnect");
            } else {
              clearActiveAccount();
              accountRef.current = null;
              kindRef.current = null;
              setAccount(null);
              setKind(null);
            }
          })
          .catch(() => {
            // Keep the stored account when WalletConnect cannot be reached.
          });
      }
    }

    return () => {
      for (const controller of relayControllersRef.current) {
        controller.abort();
      }
      relayControllersRef.current.clear();
    };
  }, [applyAccount, preferredIdentity, prepareGlyph]);

  const value = useMemo<ProfileWalletApi>(
    () => ({
      account,
      availability,
      clearError,
      connect,
      disconnect,
      error,
      glyphError,
      glyphReadiness,
      isConnecting,
      kind,
      prepareGlyph,
      signMessage,
      walletConnectUri,
    }),
    [
      account,
      availability,
      clearError,
      connect,
      disconnect,
      error,
      glyphError,
      glyphReadiness,
      isConnecting,
      kind,
      prepareGlyph,
      signMessage,
      walletConnectUri,
    ],
  );

  return <ProfileWalletContext.Provider value={value}>{children}</ProfileWalletContext.Provider>;
}

export function useProfileWallet(): ProfileWalletApi {
  const value = useContext(ProfileWalletContext);
  if (!value) {
    throw new Error("useProfileWallet must be used within ProfileWalletProvider");
  }
  return value;
}

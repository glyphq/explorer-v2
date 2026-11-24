export {};

const keyPair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
  "sign",
  "verify",
])) as CryptoKeyPair;

const rawPublicKey = (await crypto.subtle.exportKey("raw", keyPair.publicKey)) as ArrayBuffer;
const privateJwk = (await crypto.subtle.exportKey("jwk", keyPair.privateKey)) as JsonWebKey;
const publicKey = new Uint8Array(rawPublicKey);
if (!privateJwk.d) {
  throw new Error("P-256 private key export did not include d");
}

const encode = (value: Uint8Array | string): string =>
  typeof value === "string" ? value : Buffer.from(value).toString("base64url");

console.log(`VAPID_PUBLIC_KEY=${encode(publicKey)}`);
console.log(`VAPID_PRIVATE_KEY=${encode(privateJwk.d)}`);
console.log("VAPID_SUBJECT=https://explorer.glyphq.org");

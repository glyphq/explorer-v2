export {};

declare global {
  interface CloudflareEnv {
    PROPOSALS_KV?: KVNamespace;
  }
}

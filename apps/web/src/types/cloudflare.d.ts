export {};

declare global {
  interface CloudflareEnv {
    PROPOSALS_KV?: KVNamespace;
    PROFILES_DB?: D1Database;
  }
}

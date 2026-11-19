export {};

declare global {
  interface CloudflareEnv {
    PROPOSALS_DB?: D1Database;
  }
}

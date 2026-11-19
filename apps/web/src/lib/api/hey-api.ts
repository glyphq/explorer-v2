import type { CreateClientConfig } from "./generated/client.gen";

export const GLYPH_API_URL = "https://api.glyphq.org";

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: GLYPH_API_URL,
  headers: {
    Accept: "application/json",
    ...config?.headers,
  },
});

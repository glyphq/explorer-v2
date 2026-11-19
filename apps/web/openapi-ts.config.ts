import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./openapi/glyph.openapi.json",
  output: {
    entryFile: false,
    path: "./src/lib/api/generated",
  },
  plugins: [
    "@hey-api/typescript",
    "@hey-api/sdk",
    {
      name: "@hey-api/client-fetch",
      runtimeConfigPath: "./src/lib/api/hey-api.ts",
    },
    {
      mutationKeys: true,
      mutationOptions: true,
      name: "@tanstack/react-query",
      queryKeys: true,
      queryOptions: true,
    },
  ],
});

// @ts-expect-error - bun:test is provided by the Bun runtime; the project does not install bun-types.
import { describe, expect, test } from "bun:test";

import { ProfileError, parseProfileInput } from "./validation";

describe("parseProfileInput", () => {
  test("normalizes a valid profile", () => {
    expect(
      parseProfileInput({
        bio: "  Qubic builder  ",
        displayName: "  Glyph Builder  ",
        website: "https://example.com/profile",
      }),
    ).toEqual({
      bio: "Qubic builder",
      displayName: "Glyph Builder",
      website: "https://example.com/profile",
    });
  });

  test("accepts a profile without optional fields", () => {
    expect(parseProfileInput({ bio: "", displayName: "Glyph" })).toEqual({
      bio: "",
      displayName: "Glyph",
      website: undefined,
    });
  });

  test("keeps line breaks in bios", () => {
    expect(
      parseProfileInput({
        bio: "  First line\r\nSecond line\n\nThird line  ",
        displayName: "Glyph",
      }),
    ).toEqual({
      bio: "First line\nSecond line\n\nThird line",
      displayName: "Glyph",
      website: undefined,
    });
  });

  test("rejects empty names and oversized fields", () => {
    expect(() => parseProfileInput({ displayName: "   " })).toThrow(ProfileError);
    expect(() => parseProfileInput({ displayName: "a".repeat(49) })).toThrow(ProfileError);
    expect(() => parseProfileInput({ bio: "a".repeat(281), displayName: "Glyph" })).toThrow(
      ProfileError,
    );
  });

  test("rejects non-HTTPS and credential-bearing links", () => {
    expect(() =>
      parseProfileInput({ displayName: "Glyph", website: "http://example.com" }),
    ).toThrow(ProfileError);
    expect(() =>
      parseProfileInput({
        displayName: "Glyph",
        website: "https://user:pass@example.com",
      }),
    ).toThrow(ProfileError);
  });

  test("rejects unknown fields and bidi control characters", () => {
    expect(() => parseProfileInput({ displayName: "Glyph", privateNote: "hidden" })).toThrow(
      ProfileError,
    );
    expect(() => parseProfileInput({ displayName: "Glyph\nExplorer" })).toThrow(ProfileError);
    expect(() => parseProfileInput({ displayName: "Glyph \u202Eevil" })).toThrow(ProfileError);
    expect(() => parseProfileInput({ bio: "safe \u2066text\u2069", displayName: "Glyph" })).toThrow(
      ProfileError,
    );
  });
});

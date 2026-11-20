// @ts-expect-error - bun:test is provided by the Bun runtime; the project does not install bun-types.
import { describe, expect, test } from "bun:test";

import { ProfileError, parseProfileInput } from "./validation";

function errorCode(action: () => void): string | undefined {
  try {
    action();
  } catch (error) {
    return error instanceof ProfileError ? error.code : undefined;
  }
  return undefined;
}

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
      socials: undefined,
      website: "https://example.com/profile",
    });
  });

  test("accepts a profile without optional fields", () => {
    expect(parseProfileInput({ bio: "", displayName: "Glyph" })).toEqual({
      bio: "",
      displayName: "Glyph",
      socials: undefined,
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
      socials: undefined,
      website: undefined,
    });
  });

  test("normalizes social handles and profile links", () => {
    expect(
      parseProfileInput({
        bio: "",
        displayName: "Glyph",
        socials: {
          discord: "discord.gg/glyph",
          github: "glyphq",
          telegram: "@glyphq",
          x: "https://twitter.com/glyphq?ref=profile#top",
        },
      }),
    ).toEqual({
      bio: "",
      displayName: "Glyph",
      socials: {
        discord: "https://discord.gg/glyph",
        github: "https://github.com/glyphq",
        telegram: "https://t.me/glyphq",
        x: "https://x.com/glyphq",
      },
      website: undefined,
    });
  });

  test("rejects social links on the wrong host or without a profile path", () => {
    expect(
      errorCode(() =>
        parseProfileInput({
          displayName: "Glyph",
          socials: { x: "https://example.com/glyph" },
        }),
      ),
    ).toBe("invalid_request");
    expect(
      errorCode(() =>
        parseProfileInput({
          displayName: "Glyph",
          socials: { x: "https://x.com" },
        }),
      ),
    ).toBe("invalid_request");
    expect(
      errorCode(() =>
        parseProfileInput({
          displayName: "Glyph",
          socials: { github: "http://github.com/glyphq" },
        }),
      ),
    ).toBe("invalid_request");
  });

  test("rejects unknown social platforms", () => {
    expect(
      errorCode(() =>
        parseProfileInput({
          displayName: "Glyph",
          socials: { mastodon: "https://mastodon.social/@glyph" },
        }),
      ),
    ).toBe("invalid_request");
  });

  test("rejects profanity and slurs in public text", () => {
    expect(errorCode(() => parseProfileInput({ displayName: "fuck this" }))).toBe(
      "content_not_allowed",
    );
    expect(errorCode(() => parseProfileInput({ bio: "a shitty bio", displayName: "Glyph" }))).toBe(
      "content_not_allowed",
    );
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

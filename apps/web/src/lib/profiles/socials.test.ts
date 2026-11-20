// @ts-expect-error - bun:test is provided by the Bun runtime; the project does not install bun-types.
import { describe, expect, test } from "bun:test";

import { normalizeSocialUrl, parseStoredSocials } from "./socials";

describe("normalizeSocialUrl", () => {
  test("canonicalizes hosts, handles, and tracking parameters", () => {
    expect(normalizeSocialUrl("x", "@glyphq")).toBe("https://x.com/glyphq");
    expect(normalizeSocialUrl("x", "twitter.com/glyphq?ref=explorer#top")).toBe(
      "https://x.com/glyphq",
    );
    expect(normalizeSocialUrl("x", "https://mobile.twitter.com/glyphq")).toBe(
      "https://x.com/glyphq",
    );
    expect(normalizeSocialUrl("telegram", "telegram.me/glyphq")).toBe("https://t.me/glyphq");
    expect(normalizeSocialUrl("github", "www.github.com/glyphq/")).toBe(
      "https://github.com/glyphq",
    );
    expect(normalizeSocialUrl("discord", "https://discord.com/invite/glyph")).toBe(
      "https://discord.com/invite/glyph",
    );
    expect(normalizeSocialUrl("discord", "@glyphq")).toBe("https://discord.com/users/glyphq");
    expect(normalizeSocialUrl("discord", "glyphq")).toBe("https://discord.com/users/glyphq");
    expect(normalizeSocialUrl("discord", "@alez.t04")).toBe("https://discord.com/users/alez.t04");
    expect(normalizeSocialUrl("discord", "alez.t04")).toBe("https://discord.com/users/alez.t04");
    expect(normalizeSocialUrl("discord", "https://discord.com/users/glyphq")).toBe(
      "https://discord.com/users/glyphq",
    );
    expect(normalizeSocialUrl("discord", "https://discordapp.com/users/123456789012345678")).toBe(
      "https://discord.com/users/123456789012345678",
    );
    expect(normalizeSocialUrl("github", "@glyphq")).toBe("https://github.com/glyphq");
  });

  test("rejects links outside the selected platform", () => {
    expect(normalizeSocialUrl("x", "https://example.com/glyphq")).toBeNull();
    expect(normalizeSocialUrl("github", "https://gitlab.com/glyphq")).toBeNull();
    expect(normalizeSocialUrl("discord", "https://discord.gg/")).toBeNull();
    expect(normalizeSocialUrl("discord", "discord.com")).toBeNull();
    expect(normalizeSocialUrl("discord", "discordapp.com")).toBeNull();
    expect(normalizeSocialUrl("x", "@glyph.q")).toBeNull();
    expect(normalizeSocialUrl("x", "https://user:pass@x.com/glyphq")).toBeNull();
    expect(normalizeSocialUrl("x", "http://x.com/glyphq")).toBeNull();
    expect(normalizeSocialUrl("x", `https://x.com/${"a".repeat(200)}`)).toBeNull();
  });
});

describe("parseStoredSocials", () => {
  test("reads valid stored links and drops invalid entries", () => {
    expect(
      parseStoredSocials(
        JSON.stringify({
          github: "https://github.com/glyphq",
          mastodon: "https://mastodon.social/@glyphq",
          x: "https://example.com/not-x",
        }),
      ),
    ).toEqual({ github: "https://github.com/glyphq" });
  });

  test("handles missing or malformed values", () => {
    expect(parseStoredSocials(null)).toEqual({});
    expect(parseStoredSocials("not json")).toEqual({});
    expect(parseStoredSocials("[]")).toEqual({});
    expect(parseStoredSocials('{"x":42}')).toEqual({});
  });
});

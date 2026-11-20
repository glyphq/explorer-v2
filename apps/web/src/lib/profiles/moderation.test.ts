// @ts-expect-error - bun:test is provided by the Bun runtime; the project does not install bun-types.
import { describe, expect, test } from "bun:test";

import { hasDisallowedLanguage } from "./moderation";

describe("hasDisallowedLanguage", () => {
  test("accepts normal profile text", () => {
    expect(hasDisallowedLanguage("Glyph Explorer")).toBe(false);
    expect(hasDisallowedLanguage("Aurora Node")).toBe(false);
    expect(hasDisallowedLanguage("Qubic builder and validator")).toBe(false);
    expect(hasDisallowedLanguage("Classy, assassin-free analysis")).toBe(false);
    expect(hasDisallowedLanguage("Dickinson Labs")).toBe(false);
    expect(hasDisallowedLanguage("Penistone")).toBe(false);
  });

  test("detects profanity and slurs", () => {
    expect(hasDisallowedLanguage("fuck this")).toBe(true);
    expect(hasDisallowedLanguage("a shitty name")).toBe(true);
    expect(hasDisallowedLanguage("nigger")).toBe(true);
    expect(hasDisallowedLanguage("retard")).toBe(true);
  });

  test("detects padded and zero-width obfuscation", () => {
    expect(hasDisallowedLanguage("f.u.c.k")).toBe(true);
    expect(hasDisallowedLanguage("fu\u200Bck")).toBe(true);
    expect(hasDisallowedLanguage("ʃ𝐟ʃὗƈｋ")).toBe(true);
  });
});

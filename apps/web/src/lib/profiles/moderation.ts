import { englishDataset, englishRecommendedTransformers, RegExpMatcher } from "obscenity";

const dataset = englishDataset.build();
const matcher = new RegExpMatcher({
  ...dataset,
  ...englishRecommendedTransformers,
  whitelistedTerms: [...(dataset.whitelistedTerms ?? []), "dickerson", "dickinson", "penistone"],
});

const ZERO_WIDTH_CHARACTERS = /[\u200B-\u200D\u2060\uFEFF]/g;
const SPACED_LETTERS = /\b(?:[a-z][\W_]+){2,}[a-z]\b/gi;

/**
 * Collapses letter-spaced evasions such as `f.u.c.k` or `s h i t` without
 * merging ordinary words together, which would create false positives.
 */
function collapseSpacedLetters(value: string): string {
  return value.replace(SPACED_LETTERS, (match) => match.replace(/[\W_]+/g, ""));
}

/**
 * Checks public profile text for profanity and common slurs. Matching is
 * intentionally conservative. The form uses it for immediate feedback, while
 * the server remains the authority for what can be published.
 */
export function hasDisallowedLanguage(value: string): boolean {
  const normalized = collapseSpacedLetters(
    value.normalize("NFKC").replace(ZERO_WIDTH_CHARACTERS, ""),
  );
  return matcher.hasMatch(normalized);
}

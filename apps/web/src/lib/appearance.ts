export const APPEARANCE_KEY = "glyph:appearance";

export const palettes = [
  { id: "iris", label: "Iris", swatch: "#c9b8ff" },
  { id: "tidal", label: "Tidal", swatch: "#ccfcfb" },
  { id: "jade", label: "Jade", swatch: "#b8f7cf" },
  { id: "ember", label: "Ember", swatch: "#f9d3b8" },
] as const;

export const typefaces = [
  { id: "space-grotesk", label: "Space Grotesk" },
  { id: "geist", label: "Geist" },
  { id: "system", label: "System" },
] as const;

export const textSizes = [
  { id: "compact", label: "Compact" },
  { id: "default", label: "Default" },
  { id: "large", label: "Large" },
] as const;

export const motionPreferences = [
  { id: "system", label: "System" },
  { id: "full", label: "Full" },
  { id: "reduced", label: "Reduced" },
] as const;

export type PaletteId = (typeof palettes)[number]["id"];
export type TypefaceId = (typeof typefaces)[number]["id"];
export type TextSizeId = (typeof textSizes)[number]["id"];
export type MotionPreferenceId = (typeof motionPreferences)[number]["id"];

export interface Appearance {
  motion: MotionPreferenceId;
  palette: PaletteId;
  textSize: TextSizeId;
  typeface: TypefaceId;
}

export const DEFAULT_APPEARANCE: Appearance = {
  motion: "system",
  palette: "iris",
  textSize: "default",
  typeface: "space-grotesk",
};

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

export function parseAppearance(value: unknown): Appearance {
  if (!value || typeof value !== "object") {
    return DEFAULT_APPEARANCE;
  }

  const candidate = value as Partial<Record<keyof Appearance, unknown>>;
  return {
    motion: isOneOf(
      candidate.motion,
      motionPreferences.map((option) => option.id),
    )
      ? candidate.motion
      : DEFAULT_APPEARANCE.motion,
    palette: isOneOf(
      candidate.palette,
      palettes.map((option) => option.id),
    )
      ? candidate.palette
      : DEFAULT_APPEARANCE.palette,
    textSize: isOneOf(
      candidate.textSize,
      textSizes.map((option) => option.id),
    )
      ? candidate.textSize
      : DEFAULT_APPEARANCE.textSize,
    typeface: isOneOf(
      candidate.typeface,
      typefaces.map((option) => option.id),
    )
      ? candidate.typeface
      : DEFAULT_APPEARANCE.typeface,
  };
}

export function readAppearance(): Appearance {
  try {
    return parseAppearance(JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? "null"));
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function applyAppearance(appearance: Appearance) {
  const root = document.documentElement;
  root.dataset.motion = appearance.motion;
  root.dataset.palette = appearance.palette;
  root.dataset.textSize = appearance.textSize;
  root.dataset.typeface = appearance.typeface;
}

export function storeAppearance(appearance: Appearance) {
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
  } catch {
    // Preferences are optional in private browsing.
  }
}

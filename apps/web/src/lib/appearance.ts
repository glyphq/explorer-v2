export const APPEARANCE_KEY = "glyph:appearance";
const APPEARANCE_VERSION = 2;

export const palettes = [
  { id: "iris", label: "Iris", swatch: "#c9b8ff" },
  { id: "tidal", label: "Tidal", swatch: "#ccfcfb" },
  { id: "jade", label: "Jade", swatch: "#b8f7cf" },
  { id: "ember", label: "Ember", swatch: "#f9d3b8" },
  { id: "rose", label: "Rose", swatch: "#ffc1d6" },
  { id: "sky", label: "Sky", swatch: "#b8d8ff" },
  { id: "gold", label: "Gold", swatch: "#f6e6a5" },
  { id: "steel", label: "Steel", swatch: "#cbd5e1" },
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
  palette: "sky",
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
    const stored = JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? "null") as
      | (Partial<Appearance> & { version?: unknown })
      | null;
    const appearance = parseAppearance(stored);

    if (stored && stored.version !== APPEARANCE_VERSION) {
      const migrated = { ...appearance, palette: DEFAULT_APPEARANCE.palette };
      storeAppearance(migrated);
      return migrated;
    }

    return appearance;
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
    localStorage.setItem(
      APPEARANCE_KEY,
      JSON.stringify({ ...appearance, version: APPEARANCE_VERSION }),
    );
  } catch {
    // Preferences are optional in private browsing.
  }
}

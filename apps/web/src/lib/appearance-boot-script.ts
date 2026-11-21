import {
  APPEARANCE_KEY,
  APPEARANCE_VERSION,
  DEFAULT_APPEARANCE,
  motionPreferences,
  palettes,
  textSizes,
  typefaces,
} from "./appearance";

const appearanceOptions = {
  motion: motionPreferences.map(({ id }) => id),
  palette: palettes.map(({ id }) => id),
  textSize: textSizes.map(({ id }) => id),
  typeface: typefaces.map(({ id }) => id),
};

export const APPEARANCE_BOOT_SCRIPT = `(() => {
  const key = ${JSON.stringify(APPEARANCE_KEY)};
  const version = ${APPEARANCE_VERSION};
  const defaults = ${JSON.stringify(DEFAULT_APPEARANCE)};
  const options = ${JSON.stringify(appearanceOptions)};

  try {
    const stored = JSON.parse(localStorage.getItem(key) || "null");
    if (!stored || typeof stored !== "object") return;

    const root = document.documentElement;
    for (const name of Object.keys(options)) {
      const value = stored[name];
      if (!options[name].includes(value)) continue;
      if (name === "palette" && stored.version !== version) {
        root.dataset[name] = defaults[name];
        continue;
      }
      root.dataset[name] = value;
    }
  } catch {
    // Storage can be unavailable in private browsing. Server defaults still apply.
  }
})();`;

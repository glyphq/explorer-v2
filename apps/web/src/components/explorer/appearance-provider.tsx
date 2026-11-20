"use client";

import { MotionConfig } from "motion/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import {
  applyAppearance,
  DEFAULT_APPEARANCE,
  type Appearance,
  type MotionPreferenceId,
  type PaletteId,
  readAppearance,
  storeAppearance,
  type TextSizeId,
  type TypefaceId,
} from "@/lib/appearance";

interface AppearanceContextValue {
  appearance: Appearance;
  resetAppearance: () => void;
  setMotion: (motion: MotionPreferenceId) => void;
  setPalette: (palette: PaletteId) => void;
  setTextSize: (textSize: TextSizeId) => void;
  setTypeface: (typeface: TypefaceId) => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(() =>
    typeof window === "undefined" ? DEFAULT_APPEARANCE : readAppearance(),
  );

  useIsomorphicLayoutEffect(() => {
    applyAppearance(appearance);
  }, [appearance]);

  useEffect(() => {
    storeAppearance(appearance);
  }, [appearance]);

  const setPalette = useCallback(
    (palette: PaletteId) => setAppearance((current) => ({ ...current, palette })),
    [],
  );
  const setTypeface = useCallback(
    (typeface: TypefaceId) => setAppearance((current) => ({ ...current, typeface })),
    [],
  );
  const setTextSize = useCallback(
    (textSize: TextSizeId) => setAppearance((current) => ({ ...current, textSize })),
    [],
  );
  const setMotion = useCallback(
    (motion: MotionPreferenceId) => setAppearance((current) => ({ ...current, motion })),
    [],
  );
  const resetAppearance = useCallback(() => setAppearance(DEFAULT_APPEARANCE), []);

  const value = useMemo(
    () => ({
      appearance,
      resetAppearance,
      setMotion,
      setPalette,
      setTextSize,
      setTypeface,
    }),
    [appearance, resetAppearance, setMotion, setPalette, setTextSize, setTypeface],
  );

  return (
    <AppearanceContext.Provider value={value}>
      <MotionConfig
        reducedMotion={
          appearance.motion === "reduced"
            ? "always"
            : appearance.motion === "full"
              ? "never"
              : "user"
        }
      >
        {children}
      </MotionConfig>
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used within AppearanceProvider");
  }
  return context;
}

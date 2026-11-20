"use client";

import { Button, Modal } from "@heroui/react";
import { useTheme } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";

import {
  motionPreferences,
  palettes,
  textSizes,
  typefaces,
  type MotionPreferenceId,
  type PaletteId,
  type TextSizeId,
  type TypefaceId,
} from "@/lib/appearance";
import { classNames } from "@/lib/format";

import { useAppearance } from "./appearance-provider";

const modeOptions = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
] as const;

const typefacePreview: Record<TypefaceId, string> = {
  geist: "var(--font-geist-sans)",
  "space-grotesk": "var(--font-space-grotesk)",
  system: "ui-sans-serif, system-ui, sans-serif",
};

function SettingSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="grid gap-3">
      <div>
        <h3 className="font-medium text-foreground text-sm">{title}</h3>
        {description ? <p className="mt-1 text-muted text-xs leading-5">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SegmentedButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={classNames(
        "flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center text-xs transition-colors",
        active
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-border text-muted hover:border-foreground/20 hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function SettingsDialog({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const { appearance, resetAppearance, setMotion, setPalette, setTextSize, setTypeface } =
    useAppearance();
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const activeMode = mounted ? (theme ?? "system") : "system";

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container scroll="inside" size="lg">
          <Modal.Dialog className="max-h-[86vh]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Appearance</Modal.Heading>
              <p className="mt-1 text-muted text-sm">
                Tune the explorer without leaving the page. Preferences stay on this device.
              </p>
            </Modal.Header>
            <Modal.Body className="gap-6">
              <SettingSection title="Mode">
                <div className="grid grid-cols-3 gap-2">
                  {modeOptions.map((option) => (
                    <SegmentedButton
                      active={activeMode === option.id}
                      key={option.id}
                      onClick={() => setTheme(option.id)}
                    >
                      {option.label}
                    </SegmentedButton>
                  ))}
                </div>
              </SettingSection>

              <SettingSection
                description="Every accent keeps the same tinted neutrals and semantic colors."
                title="Accent"
              >
                <div className="grid grid-cols-2 gap-2">
                  {palettes.map((palette) => {
                    const active = appearance.palette === palette.id;
                    return (
                      <button
                        aria-pressed={active}
                        className={classNames(
                          "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                          active
                            ? "border-accent/40 bg-accent/10"
                            : "border-border hover:border-foreground/20 hover:bg-surface-secondary/50",
                        )}
                        key={palette.id}
                        onClick={() => setPalette(palette.id as PaletteId)}
                        type="button"
                      >
                        <span
                          className="size-5 shrink-0 rounded-full ring-1 ring-foreground/15"
                          style={{ backgroundColor: palette.swatch }}
                        />
                        <span className="min-w-0">
                          <span
                            className={classNames(
                              "block font-medium text-xs",
                              active ? "text-accent" : "text-foreground",
                            )}
                          >
                            {palette.label}
                          </span>
                          <span className="block font-mono text-[10px] text-muted uppercase">
                            {palette.swatch}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </SettingSection>

              <SettingSection title="Typeface">
                <div className="grid grid-cols-3 gap-2">
                  {typefaces.map((typeface) => (
                    <SegmentedButton
                      active={appearance.typeface === typeface.id}
                      key={typeface.id}
                      onClick={() => setTypeface(typeface.id as TypefaceId)}
                    >
                      <span
                        className="text-base"
                        style={{ fontFamily: typefacePreview[typeface.id] }}
                      >
                        Aa
                      </span>
                      <span className="truncate">{typeface.label}</span>
                    </SegmentedButton>
                  ))}
                </div>
              </SettingSection>

              <SettingSection title="Text size">
                <div className="grid grid-cols-3 gap-2">
                  {textSizes.map((size) => (
                    <SegmentedButton
                      active={appearance.textSize === size.id}
                      key={size.id}
                      onClick={() => setTextSize(size.id as TextSizeId)}
                    >
                      {size.label}
                    </SegmentedButton>
                  ))}
                </div>
              </SettingSection>

              <SettingSection
                description="Follow your system preference, always animate, or keep layout motion minimal."
                title="Motion"
              >
                <div className="grid grid-cols-3 gap-2">
                  {motionPreferences.map((option) => (
                    <SegmentedButton
                      active={appearance.motion === option.id}
                      key={option.id}
                      onClick={() => setMotion(option.id as MotionPreferenceId)}
                    >
                      {option.label}
                    </SegmentedButton>
                  ))}
                </div>
              </SettingSection>
            </Modal.Body>
            <Modal.Footer className="justify-between">
              <Button onPress={resetAppearance} size="sm" variant="ghost">
                Reset appearance
              </Button>
              <Button onPress={() => onOpenChange(false)} size="sm" variant="outline">
                Done
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

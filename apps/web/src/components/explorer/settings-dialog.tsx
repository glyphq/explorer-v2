"use client";

import { Button, ListBox, ListBoxItem, Modal, Select } from "@heroui/react";
import { UndoLeftIcon } from "@solar-icons/react/linear/undo-left";
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
import { ModalSheet } from "./modal-sheet";

const modeOptions = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
] as const;

type SelectOption<T extends string> = {
  id: T;
  label: string;
};

function SettingSelect<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (id: T) => void;
  options: readonly SelectOption<T>[];
  value: T;
}) {
  return (
    <Select
      aria-label={label}
      className="w-full"
      onChange={(key) => {
        if (key !== null) {
          onChange(String(key) as T);
        }
      }}
      value={value}
      variant="secondary"
    >
      <Select.Trigger className="relative flex h-10 w-full items-center rounded-lg bg-surface-secondary pr-9 pl-3 text-sm transition-colors hover:bg-surface-tertiary">
        <Select.Value className="flex-1 truncate text-left" />
        <Select.Indicator className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2" />
      </Select.Trigger>
      <Select.Popover className="bg-surface-tertiary">
        <ListBox>
          {options.map((option) => (
            <ListBoxItem id={option.id} key={option.id} textValue={option.label}>
              {option.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function SettingRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex min-h-13 items-center justify-between gap-1.5 py-2 sm:gap-4">
      <span className="shrink-0 text-muted text-sm">{label}</span>
      <div className="w-56 shrink-0">{children}</div>
    </div>
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

  const activeMode = (
    mounted ? (theme ?? "system") : "system"
  ) as (typeof modeOptions)[number]["id"];

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container
          className="modal-sheet modal-drag-sheet p-0 sm:p-0"
          placement="top"
          scroll="inside"
          size="lg"
        >
          <Modal.Dialog className="max-h-[92dvh] w-full max-w-lg rounded-none bg-transparent p-0">
            <ModalSheet onOpenChange={onOpenChange} open={open}>
              <Modal.Header className="mb-3">
                <Modal.Heading>Appearance</Modal.Heading>
                <p className="mt-1 text-muted text-sm">
                  Changes apply immediately. Preferences stay on this device.
                </p>
              </Modal.Header>
              <Modal.Body>
                <SettingRow label="Accent">
                  <div
                    aria-label="Accent palette"
                    className="flex h-10 w-full items-center justify-between"
                    role="radiogroup"
                  >
                    {palettes.map((palette) => {
                      const active = appearance.palette === palette.id;
                      return (
                        <button
                          aria-checked={active}
                          aria-label={palette.label}
                          className="flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                          key={palette.id}
                          onClick={() => setPalette(palette.id as PaletteId)}
                          role="radio"
                          title={palette.label}
                          type="button"
                        >
                          <span
                            className={classNames(
                              "size-5 rounded-full transition-[box-shadow]",
                              active
                                ? "ring-2 ring-foreground/70 ring-offset-2 ring-offset-overlay"
                                : "ring-1 ring-foreground/15",
                            )}
                            style={{ backgroundColor: palette.swatch }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </SettingRow>
                <SettingRow label="Mode">
                  <SettingSelect
                    label="Mode"
                    onChange={(id) => setTheme(id)}
                    options={modeOptions}
                    value={activeMode}
                  />
                </SettingRow>
                <SettingRow label="Typeface">
                  <SettingSelect
                    label="Typeface"
                    onChange={(id) => setTypeface(id as TypefaceId)}
                    options={typefaces}
                    value={appearance.typeface}
                  />
                </SettingRow>
                <SettingRow label="Text size">
                  <SettingSelect
                    label="Text size"
                    onChange={(id) => setTextSize(id as TextSizeId)}
                    options={textSizes}
                    value={appearance.textSize}
                  />
                </SettingRow>
                <SettingRow label="Motion">
                  <SettingSelect
                    label="Motion"
                    onChange={(id) => setMotion(id as MotionPreferenceId)}
                    options={motionPreferences}
                    value={appearance.motion}
                  />
                </SettingRow>
              </Modal.Body>
              <Modal.Footer className="mt-4 justify-start">
                <Button onPress={resetAppearance} size="sm" variant="ghost">
                  <UndoLeftIcon className="size-4" />
                  Reset appearance
                </Button>
              </Modal.Footer>
            </ModalSheet>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

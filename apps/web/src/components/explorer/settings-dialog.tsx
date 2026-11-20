"use client";

import { Button, ListBox, ListBoxItem, Modal, Select } from "@heroui/react";
import { UndoLeftIcon } from "@solar-icons/react/linear/undo-left";
import { motion, useDragControls } from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

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
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted text-sm">{label}</span>
      <Select
        aria-label={label}
        className="w-44 shrink-0 sm:w-48"
        onChange={(key) => {
          if (key !== null) {
            onChange(String(key) as T);
          }
        }}
        value={value}
        variant="secondary"
      >
        <Select.Trigger className="h-9 w-full justify-between rounded-lg bg-surface-secondary/60 px-3 text-xs">
          <Select.Value />
          <Select.Indicator />
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
  const dragControls = useDragControls();

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
          <Modal.Dialog className="max-h-[92dvh] w-full max-w-xl rounded-none bg-transparent p-0">
            <motion.div
              animate={
                open ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0.6, scale: 0.985, y: "-100%" }
              }
              className="flex max-h-[92dvh] flex-col overflow-hidden rounded-b-3xl bg-overlay px-6 pt-[calc(2rem+env(safe-area-inset-top))] pb-6"
              drag="y"
              dragConstraints={{ bottom: 0, top: -1000 }}
              dragControls={dragControls}
              dragElastic={{ bottom: 0, top: 0.9 }}
              dragListener={false}
              dragSnapToOrigin
              initial={{ opacity: 0.6, scale: 0.985, y: "-100%" }}
              key={open ? "open" : "closed"}
              onDragEnd={(_, info) => {
                if (info.offset.y < -120 || info.velocity.y < -700) {
                  onOpenChange(false);
                }
              }}
              transition={{ damping: 34, mass: 0.9, stiffness: 380, type: "spring" }}
            >
              <Modal.Header>
                <Modal.Heading>Appearance</Modal.Heading>
                <p className="mt-1 text-muted text-sm">
                  Changes apply immediately. Preferences stay on this device.
                </p>
              </Modal.Header>
              <Modal.Body className="gap-5">
                <div className="grid gap-3">
                  <h3 className="font-medium text-foreground text-sm">Accent</h3>
                  <div
                    aria-label="Accent palette"
                    className="flex max-w-[17rem] items-center justify-between"
                    role="radiogroup"
                  >
                    {palettes.map((palette) => {
                      const active = appearance.palette === palette.id;
                      return (
                        <button
                          aria-checked={active}
                          aria-label={palette.label}
                          className="flex size-8 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                          key={palette.id}
                          onClick={() => setPalette(palette.id as PaletteId)}
                          role="radio"
                          title={palette.label}
                          type="button"
                        >
                          <span
                            className={classNames(
                              "size-6 rounded-full transition-[box-shadow]",
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
                </div>

                <div className="grid gap-2">
                  <SettingSelect
                    label="Mode"
                    onChange={(id) => setTheme(id)}
                    options={modeOptions}
                    value={activeMode}
                  />
                  <SettingSelect
                    label="Typeface"
                    onChange={(id) => setTypeface(id as TypefaceId)}
                    options={typefaces}
                    value={appearance.typeface}
                  />
                  <SettingSelect
                    label="Text size"
                    onChange={(id) => setTextSize(id as TextSizeId)}
                    options={textSizes}
                    value={appearance.textSize}
                  />
                  <SettingSelect
                    label="Motion"
                    onChange={(id) => setMotion(id as MotionPreferenceId)}
                    options={motionPreferences}
                    value={appearance.motion}
                  />
                </div>
              </Modal.Body>
              <Modal.Footer className="justify-start">
                <Button onPress={resetAppearance} size="sm" variant="ghost">
                  <UndoLeftIcon className="size-4" />
                  Reset appearance
                </Button>
              </Modal.Footer>
              <div
                className="-mx-6 -mb-6 flex cursor-grab touch-none justify-center px-6 pt-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] select-none active:cursor-grabbing"
                onPointerDown={(event) => dragControls.start(event)}
              >
                <div aria-hidden className="h-1 w-10 rounded-full bg-foreground/15" />
              </div>
            </motion.div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

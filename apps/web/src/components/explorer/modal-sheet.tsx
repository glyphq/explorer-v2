"use client";

import { AnimatePresence, motion, useDragControls } from "motion/react";
import { type ReactNode, useContext } from "react";
import { OverlayTriggerStateContext } from "react-aria-components";

import { classNames } from "@/lib/format";

export function ModalSheet({
  children,
  className,
  maxHeightClassName = "max-h-[92dvh]",
  onOpenChange,
  open,
}: {
  children: ReactNode;
  className?: string;
  maxHeightClassName?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const dragControls = useDragControls();
  const overlayState = useContext(OverlayTriggerStateContext);
  const visible = overlayState ? overlayState.isOpen : open;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className={classNames(
            "corner-frame corner-frame-card flex flex-col rounded-[10px] bg-transparent p-1.5",
            maxHeightClassName,
            className,
          )}
          drag="y"
          dragConstraints={{ bottom: 0, top: -1000 }}
          dragControls={dragControls}
          dragElastic={{ bottom: 0, top: 0.9 }}
          dragListener={false}
          dragSnapToOrigin
          exit={{ opacity: 0.6, scale: 0.985, y: "-100%" }}
          initial={{ opacity: 0.6, scale: 0.985, y: "-100%" }}
          onDragEnd={(_, info) => {
            if (info.offset.y < -120 || info.velocity.y < -700) {
              onOpenChange(false);
            }
          }}
          transition={{
            damping: 34,
            mass: 0.9,
            stiffness: 380,
            type: "spring",
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[7px] bg-surface px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-6 shadow-2xl shadow-black/50 sm:px-6">
            {children}
            <div
              className="-mx-4 -mb-6 flex cursor-grab touch-none select-none justify-center px-4 pt-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] active:cursor-grabbing sm:-mx-6 sm:px-6"
              onPointerDown={(event) => dragControls.start(event)}
            >
              <div aria-hidden className="h-1 w-10 rounded-full bg-foreground/15" />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

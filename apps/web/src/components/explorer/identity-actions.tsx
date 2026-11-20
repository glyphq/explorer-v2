"use client";

import { GLYPH_DEEP_LINK_SCHEME } from "@glyph-oss/connect";
import { Button, buttonVariants, Modal } from "@heroui/react";
import { CopyIcon } from "@solar-icons/react/linear/copy";
import { PenIcon } from "@solar-icons/react/linear/pen";
import { QrCodeIcon } from "@solar-icons/react/linear/qr-code";
import { QRCodeSVG } from "qrcode.react";
import { type ReactNode, useCallback, useState } from "react";
import { sileo } from "sileo";

import { GlyphMark } from "@/components/glyph-mark";
import { shorten } from "@/lib/format";

function ActionTooltip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        className="pointer-events-none absolute top-full left-1/2 z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 font-medium text-background text-xs opacity-0 shadow-lg transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
        role="tooltip"
      >
        {label}
      </span>
    </span>
  );
}

export function IdentityActions({
  identity,
  onProfileAction,
  profileAction,
}: {
  identity: string;
  onProfileAction?: () => void;
  profileAction?: "claim" | "edit" | null;
}) {
  const [qrOpen, setQrOpen] = useState(false);

  const copyIdentity = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(identity);
      sileo.success({
        description: shorten(identity, 16, 8),
        title: "Identity copied",
      });
    } catch {
      sileo.error({
        description: "Clipboard access is unavailable.",
        title: "Could not copy identity",
      });
    }
  }, [identity]);

  const openQr = useCallback(() => setQrOpen(true), []);
  const sendLink = `${GLYPH_DEEP_LINK_SCHEME}://pay?to=${encodeURIComponent(identity)}`;

  return (
    <div className="flex items-center justify-center gap-1">
      <ActionTooltip label="Send via Glyph">
        <a
          aria-label="Send via Glyph"
          className={buttonVariants({
            isIconOnly: true,
            size: "sm",
            variant: "ghost",
          })}
          href={sendLink}
        >
          <GlyphMark className="size-4" />
        </a>
      </ActionTooltip>
      <ActionTooltip label="Copy identity">
        <Button
          aria-label="Copy identity"
          isIconOnly
          onPress={copyIdentity}
          size="sm"
          variant="ghost"
        >
          <CopyIcon className="size-4" />
        </Button>
      </ActionTooltip>
      <ActionTooltip label="Show QR code">
        <Button aria-label="Show QR code" isIconOnly onPress={openQr} size="sm" variant="ghost">
          <QrCodeIcon className="size-4" />
        </Button>
      </ActionTooltip>
      {profileAction && onProfileAction ? (
        <ActionTooltip label={profileAction === "edit" ? "Edit profile" : "Claim profile"}>
          <Button
            aria-label={profileAction === "edit" ? "Edit profile" : "Claim profile"}
            isIconOnly
            onPress={onProfileAction}
            size="sm"
            variant="ghost"
          >
            <PenIcon className="size-4" />
          </Button>
        </ActionTooltip>
      ) : null}

      <Modal isOpen={qrOpen} onOpenChange={setQrOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Account QR</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col items-center gap-5 py-2">
                <div className="rounded-2xl bg-foreground p-4 text-background">
                  <QRCodeSVG
                    bgColor="transparent"
                    fgColor="currentColor"
                    level="M"
                    marginSize={1}
                    size={208}
                    title="Account identity QR code"
                    value={identity}
                  />
                </div>
                <p className="max-w-72 break-all text-center font-mono text-muted text-xs">
                  {identity}
                </p>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

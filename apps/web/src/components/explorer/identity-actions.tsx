"use client";

import { GLYPH_DEEP_LINK_SCHEME } from "@glyph-oss/connect";
import { Button, buttonVariants, Modal } from "@heroui/react";
import { CopyIcon } from "@solar-icons/react/linear/copy";
import { QrCodeIcon } from "@solar-icons/react/linear/qr-code";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useState } from "react";
import { sileo } from "sileo";

import { ActionTooltip } from "@/components/explorer/action-tooltip";
import { ModalSheet } from "@/components/explorer/modal-sheet";
import { GlyphMark } from "@/components/glyph-mark";
import { shorten } from "@/lib/format";
import { isZeroIdentity } from "@/lib/transactions/special-hash";

export function IdentityActions({
  identity,
  showCopy = true,
}: {
  identity: string;
  showCopy?: boolean;
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
  const canSend = !isZeroIdentity(identity);

  return (
    <div className="flex items-center justify-center gap-1">
      {canSend ? (
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
      ) : null}
      {showCopy ? (
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
      ) : null}
      <ActionTooltip label="Show QR code">
        <Button aria-label="Show QR code" isIconOnly onPress={openQr} size="sm" variant="ghost">
          <QrCodeIcon className="size-4" />
        </Button>
      </ActionTooltip>

      <Modal isOpen={qrOpen} onOpenChange={setQrOpen}>
        <Modal.Backdrop>
          <Modal.Container
            className="modal-sheet modal-drag-sheet p-0 sm:p-0"
            placement="top"
            scroll="inside"
            size="md"
          >
            <Modal.Dialog className="max-h-[92dvh] w-full max-w-md rounded-none bg-transparent p-0">
              <ModalSheet onOpenChange={setQrOpen} open={qrOpen}>
                <Modal.Header>
                  <Modal.Heading>Identity QR</Modal.Heading>
                </Modal.Header>
                <Modal.Body className="flex flex-col items-center gap-5 py-2">
                  <div className="rounded-2xl bg-foreground p-4 text-background">
                    <QRCodeSVG
                      bgColor="transparent"
                      fgColor="currentColor"
                      level="M"
                      marginSize={1}
                      size={208}
                      title="Identity QR code"
                      value={identity}
                    />
                  </div>
                  <p className="max-w-72 break-all text-center font-mono text-muted text-xs">
                    {identity}
                  </p>
                </Modal.Body>
              </ModalSheet>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

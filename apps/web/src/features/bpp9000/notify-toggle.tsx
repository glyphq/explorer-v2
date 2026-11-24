"use client";

import { Bell, BellSlash } from "@gravity-ui/icons";
import { Button, Spinner } from "@heroui/react";
import { useCallback, useEffect } from "react";
import { sileo } from "sileo";

import { usePushNotifications } from "./use-push-notifications";

const IOS_INSTALL_COPY =
  "On iPhone or iPad, tap Share, then Add to Home Screen. Open Glyph from the icon and enable notifications there.";

export function NotifyToggle() {
  const { busy, clearError, error, status, subscribe, unsubscribe } = usePushNotifications();

  useEffect(() => {
    if (!error) {
      return;
    }
    sileo.error({ description: error, title: "Notifications unavailable" });
    clearError();
  }, [error, clearError]);

  const on = status === "on";
  const install = status === "install";
  const denied = status === "denied";

  let label = "Notify me";
  if (denied) {
    label = "Notifications blocked";
  } else if (install) {
    label = "Enable on iOS";
  } else if (on) {
    label = "Notifications on";
  }

  let title = "Get a push when computors agree on the hour's call.";
  if (denied) {
    title = "Allow notifications for this site in your browser settings, then reload.";
  } else if (install) {
    title = IOS_INSTALL_COPY;
  } else if (on) {
    title = "You will get a push when computors agree on the hour's call. Tap to turn off.";
  }

  const handlePress = useCallback(() => {
    if (install) {
      sileo.info({
        description: IOS_INSTALL_COPY,
        title: "Install Glyph first",
      });
      return;
    }
    if (on) {
      unsubscribe();
      return;
    }
    subscribe();
  }, [install, on, subscribe, unsubscribe]);

  if (status === "loading" || status === "unsupported" || status === "unavailable") {
    return null;
  }

  const Icon = denied || install ? BellSlash : Bell;

  return (
    <span title={title}>
      <Button
        aria-label={label}
        aria-pressed={on}
        className="h-8 gap-1.5 px-3 text-xs"
        isDisabled={busy || denied}
        onPress={handlePress}
        size="sm"
        variant="tertiary"
      >
        {busy ? <Spinner className="size-4" /> : <Icon className="size-4" />}
        <span className="hidden sm:inline">{label}</span>
      </Button>
    </span>
  );
}

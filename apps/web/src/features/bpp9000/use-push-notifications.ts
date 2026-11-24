"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const NOTIFICATIONS_ENDPOINT = "/api/notifications";
const IOS_USER_AGENT = /iPad|iPhone|iPod/;

export type PushStatus =
  | "loading"
  | "unsupported"
  | "unavailable"
  | "install"
  | "off"
  | "on"
  | "denied";

interface PushConfig {
  enabled: boolean;
  publicKey: string | null;
}

interface PushState {
  busy: boolean;
  error: string | null;
  status: PushStatus;
}

function supportsPush(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function isInstalled(): boolean {
  return (
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function initialStatus(config: PushConfig): PushStatus {
  if (!(config.enabled && config.publicKey)) {
    return "unavailable";
  }
  if (!supportsPush()) {
    return "unsupported";
  }
  const ios =
    IOS_USER_AGENT.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios && !isInstalled()) {
    return "install";
  }
  if (Notification.permission === "denied") {
    return "denied";
  }
  return "off";
}

async function readConfig(): Promise<PushConfig> {
  const response = await fetch(NOTIFICATIONS_ENDPOINT, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Notification settings are unavailable");
  }
  return (await response.json()) as PushConfig;
}

async function resolveStatus(
  config: PushConfig,
): Promise<{ status: PushStatus; subscription: PushSubscription | null }> {
  const status = initialStatus(config);
  if (status !== "off") {
    return { status, subscription: null };
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription && Notification.permission === "granted") {
    return { status: "on", subscription };
  }
  return { status: "off", subscription: null };
}

async function loadPushState(): Promise<{
  config: PushConfig;
  status: PushStatus;
  subscription: PushSubscription | null;
}> {
  const config = await readConfig();
  const { status, subscription } = await resolveStatus(config);
  return { config, status, subscription };
}

function decodeApplicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

export function usePushNotifications() {
  const [config, setConfig] = useState<PushConfig | null>(null);
  const requestInFlight = useRef(false);
  const [state, setState] = useState<PushState>({
    busy: false,
    error: null,
    status: "loading",
  });

  const update = useCallback((patch: Partial<PushState>) => {
    setState((previous) => ({ ...previous, ...patch }));
  }, []);

  const syncSubscription = useCallback(async (subscription: PushSubscription) => {
    await fetch(NOTIFICATIONS_ENDPOINT, {
      body: JSON.stringify(subscription.toJSON()),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const pushed = await loadPushState();
        if (cancelled) {
          return;
        }
        setConfig(pushed.config);
        update({ status: pushed.status });
        if (pushed.status === "on" && pushed.subscription) {
          // Re-register on every load so a lost row cannot orphan the device.
          syncSubscription(pushed.subscription).catch(() => undefined);
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Push notifications are unavailable";
          update({ error: message, status: "unavailable" });
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [syncSubscription, update]);

  const subscribe = useCallback(async () => {
    const publicKey = config?.publicKey;
    if (!publicKey || state.status !== "off" || requestInFlight.current) {
      return;
    }

    requestInFlight.current = true;
    update({ busy: true, error: null });
    let created: PushSubscription | null = null;
    try {
      // Must run inside the click gesture; Safari rejects a delayed prompt.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        update({
          busy: false,
          status: permission === "denied" ? "denied" : "off",
        });
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          applicationServerKey: decodeApplicationServerKey(publicKey),
          userVisibleOnly: true,
        });
        created = subscription;
      }

      const response = await fetch(NOTIFICATIONS_ENDPOINT, {
        body: JSON.stringify(subscription.toJSON()),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Could not save this device");
      }

      update({ status: "on" });
    } catch (error) {
      if (created) {
        await created.unsubscribe().catch(() => undefined);
      }
      const message = error instanceof Error ? error.message : "Push notifications are unavailable";
      update({ error: message, status: "off" });
    } finally {
      requestInFlight.current = false;
      update({ busy: false });
    }
  }, [config?.publicKey, state.status, update]);

  const unsubscribe = useCallback(async () => {
    if (requestInFlight.current) {
      return;
    }

    requestInFlight.current = true;
    update({ busy: true, error: null });
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch(NOTIFICATIONS_ENDPOINT, {
          body: JSON.stringify({ endpoint: subscription.endpoint }),
          headers: { "content-type": "application/json" },
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Could not update notification settings");
        }
        await subscription.unsubscribe();
      }
      update({ status: "off" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Push notifications are unavailable";
      update({ error: message });
    } finally {
      requestInFlight.current = false;
      update({ busy: false });
    }
  }, [update]);

  const clearError = useCallback(() => update({ error: null }), [update]);

  return {
    busy: state.busy,
    clearError,
    enabled: config?.enabled ?? false,
    error: state.error,
    status: state.status,
    subscribe,
    unsubscribe,
  };
}

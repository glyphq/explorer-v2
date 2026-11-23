"use client";

import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef } from "react";

interface RouteTransitionContextValue {
  navigate: (href: string) => void;
}

const RouteTransitionContext = createContext<RouteTransitionContextValue | null>(null);

function sameLocation(url: URL): boolean {
  return url.pathname === window.location.pathname && url.search === window.location.search;
}

export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pendingResolve = useRef<(() => void) | null>(null);

  useEffect(() => {
    const resolve = pendingResolve.current;
    if (!resolve) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      pendingResolve.current = null;
      resolve();
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  const navigate = useCallback(
    (href: string) => {
      const target = new URL(href, window.location.href);

      if (target.origin !== window.location.origin || sameLocation(target)) {
        return;
      }

      if (
        !document.startViewTransition ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        !document.querySelector(".vt-page-title") ||
        pendingResolve.current
      ) {
        router.push(href as Route);
        return;
      }

      const { promise, resolve } = Promise.withResolvers<void>();
      pendingResolve.current = resolve;

      const transition = document.startViewTransition(() => {
        router.push(href as Route);

        window.setTimeout(() => {
          if (pendingResolve.current === resolve) {
            pendingResolve.current = null;
            resolve();
          }
        }, 600);

        return promise;
      });

      void transition.finished.finally(() => {
        if (pendingResolve.current) {
          pendingResolve.current = null;
        }
      });
    },
    [router],
  );

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        !document.startViewTransition ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement)) {
        return;
      }
      if (
        target.dataset.noTransition !== undefined ||
        target.hasAttribute("download") ||
        (target.target && target.target !== "_self") ||
        target.getAttribute("rel")?.split(/\s+/).includes("external")
      ) {
        return;
      }

      const targetUrl = new URL(target.href, window.location.href);
      if (
        targetUrl.origin !== window.location.origin ||
        (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") ||
        sameLocation(targetUrl) ||
        (targetUrl.hash && targetUrl.pathname === window.location.pathname)
      ) {
        return;
      }

      event.preventDefault();
      navigate(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [navigate]);

  return (
    <RouteTransitionContext.Provider value={{ navigate }}>
      {children}
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition(): RouteTransitionContextValue {
  const context = useContext(RouteTransitionContext);
  if (!context) {
    throw new Error("useRouteTransition must be used within RouteTransitionProvider");
  }
  return context;
}

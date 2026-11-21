"use client";

import { AsciiReveal, type AsciiRevealHandle } from "ascii-reveal";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type SetPageLoading = (id: string, loading: boolean) => void;

const PageLoadingContext = createContext<SetPageLoading | null>(null);

export function PageReveal({
  children,
  origin = "top-left",
  pathname,
}: {
  children: ReactNode;
  origin?: "center" | "top-left";
  pathname: string;
}) {
  const reveal = useRef<AsciiRevealHandle>(null);
  const loadingSources = useRef(new Set<string>());
  const loadingRef = useRef(false);
  const revealedPath = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setSourceLoading = useCallback<SetPageLoading>((id, value) => {
    const sources = loadingSources.current;
    if (value) {
      sources.add(id);
    } else {
      sources.delete(id);
    }

    const next = sources.size > 0;
    loadingRef.current = next;
    setLoading(next);
  }, []);

  useEffect(() => {
    if (loading || loadingRef.current || revealedPath.current === pathname) {
      return;
    }

    let canceled = false;
    const frame = requestAnimationFrame(() => {
      if (canceled || loadingRef.current) {
        return;
      }

      revealedPath.current = pathname;
      void reveal.current?.reveal();
    });

    return () => {
      canceled = true;
      cancelAnimationFrame(frame);
    };
  }, [loading, pathname]);

  return (
    <PageLoadingContext.Provider value={setSourceLoading}>
      <AsciiReveal
        as="div"
        duration="fast"
        key={pathname}
        origin={origin}
        preset="dither"
        ref={reveal}
        revealOnMount={false}
      >
        {children}
      </AsciiReveal>
    </PageLoadingContext.Provider>
  );
}

export function usePageLoading(loading: boolean) {
  const setSourceLoading = useContext(PageLoadingContext);
  const id = useId();

  useEffect(() => {
    if (!setSourceLoading) {
      return;
    }

    setSourceLoading(id, loading);
    return () => setSourceLoading(id, false);
  }, [id, loading, setSourceLoading]);
}

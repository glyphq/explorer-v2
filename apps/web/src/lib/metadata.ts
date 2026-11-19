import type { Metadata } from "next";

export function sectionMetadata(title: string, description: string): Metadata {
  return {
    description,
    openGraph: { description, title },
    title,
    twitter: { description, title },
  };
}

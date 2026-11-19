import type { Metadata } from "next";

export function sectionMetadata(title: string, description: string, image: string): Metadata {
  const images = [
    {
      alt: `${title} · Glyph Explorer`,
      height: 630,
      url: `/og/${image}.png`,
      width: 1200,
    },
  ];

  return {
    description,
    openGraph: { description, images, title },
    title,
    twitter: { description, images, title },
  };
}

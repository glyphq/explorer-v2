import type { Metadata } from "next";

import { Bpp9000Terminal } from "@/features/bpp9000/bpp9000-terminal";

export const metadata: Metadata = {
  description:
    "A plain-language view of BPP-9000: the network's hourly Bitcoin call, computor alignment, and recent results.",
  openGraph: {
    description: "The network's hourly Bitcoin call, computor alignment, and recent results.",
    images: [
      {
        alt: "BPP-9000 · Glyph Explorer",
        height: 630,
        url: "/og/bpp9000.png",
        width: 1200,
      },
    ],
    title: "BPP-9000",
  },
  title: "BPP-9000",
  twitter: {
    description: "The network's hourly Bitcoin call, computor alignment, and recent results.",
    images: ["/og/bpp9000.png"],
    title: "BPP-9000",
  },
};

export default function Bpp9000Page() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8">
      <Bpp9000Terminal />
    </div>
  );
}

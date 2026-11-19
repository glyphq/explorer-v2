import type { Metadata } from "next";

import { PageHeader } from "@/components/explorer/page-header";
import { Bpp9000Terminal } from "@/features/bpp9000/bpp9000-terminal";

export const metadata: Metadata = {
  description:
    "A plain-language view of BPP-9000: the network's hourly Bitcoin call, computor alignment, and recent results.",
  openGraph: {
    description: "The network's hourly Bitcoin call, computor alignment, and recent results.",
    title: "BPP-9000",
  },
  title: "BPP-9000",
  twitter: {
    description: "The network's hourly Bitcoin call, computor alignment, and recent results.",
    title: "BPP-9000",
  },
};

export default function Bpp9000Page() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8">
      <PageHeader
        description="What Qubic's computors expect Bitcoin to do this hour, how many are aligned, and what happened to recent calls. Read-only, no wallet needed."
        title="BPP-9000"
      />
      <Bpp9000Terminal />
    </div>
  );
}

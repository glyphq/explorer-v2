import { mkdir, writeFile } from "node:fs/promises";

import { createOgImage } from "./og";

const cards = [
  {
    description: "Qubic ticks, transactions, epochs, accounts, events and assets.",
    slug: "glyph-explorer",
    title: "Glyph Explorer",
  },
  {
    description: "Transfers observed inside verified Qubic ticks.",
    slug: "transactions",
    title: "Transactions",
  },
  {
    description: "Effects, participants and attached events.",
    slug: "transaction",
    title: "Transaction",
  },
  {
    description: "Qubic accounts ranked by their latest indexed activity.",
    slug: "accounts",
    title: "Accounts",
  },
  {
    description: "Balance, activity and counterparties.",
    slug: "account",
    title: "Account",
  },
  {
    description: "Active Qubic exchange accounts and their on-chain identities.",
    slug: "exchanges",
    title: "Exchanges",
  },
  {
    description: "Every tick Glyph fetched from a Qubic peer, with quorum evidence and activity.",
    slug: "ticks",
    title: "Ticks",
  },
  {
    description: "Header, quorum evidence, transactions and events.",
    slug: "tick",
    title: "Tick",
  },
  {
    description: "Qubic epoch summaries with tick ranges and elected computors.",
    slug: "epochs",
    title: "Epochs",
  },
  {
    description: "Computor set and activity.",
    slug: "epoch",
    title: "Epoch",
  },
  {
    description: "Decoded Qubic logs with participants, transactions and ticks.",
    slug: "events",
    title: "Events",
  },
  {
    description: "Assets issued on Qubic and discovered by the Glyph index.",
    slug: "assets",
    title: "Assets",
  },
  {
    description: "The network's hourly Bitcoin call, computor alignment and recent results.",
    slug: "bpp9000",
    title: "BPP-9000",
  },
] as const;

await mkdir("public/og", { recursive: true });

for (const card of cards) {
  const response = createOgImage(card.title, card.description);
  const image = Buffer.from(await response.arrayBuffer());
  await writeFile(`public/og/${card.slug}.png`, image);
}

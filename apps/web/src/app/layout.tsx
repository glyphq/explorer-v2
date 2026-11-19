import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "../index.css";
import { AppShell } from "@/components/explorer/app-shell";
import Providers from "@/components/providers";
import PwaRegistration from "@/components/pwa-registration";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://explorer.glyphq.org";
const siteDescription =
  "Explore Qubic ticks, transactions, epochs, accounts, events and assets from Glyph's direct-peer index.";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  applicationName: "Glyph Explorer",
  description: siteDescription,
  icons: {
    apple: [
      {
        sizes: "180x180",
        type: "image/png",
        url: "/favicon/apple-touch-icon.png",
      },
    ],
    icon: [
      { sizes: "any", url: "/favicon.ico" },
      {
        sizes: "32x32",
        type: "image/png",
        url: "/favicon/favicon-32x32.png",
      },
      {
        sizes: "96x96",
        type: "image/png",
        url: "/favicon/favicon-96x96.png",
      },
    ],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(siteUrl),
  openGraph: {
    description: siteDescription,
    locale: "en_US",
    siteName: "Glyph Explorer",
    title: {
      default: "Glyph Explorer",
      template: "%s · Glyph Explorer",
    },
    type: "website",
    url: "/",
  },
  title: {
    default: "Glyph Explorer",
    template: "%s · Glyph Explorer",
  },
  twitter: {
    card: "summary_large_image",
    description: siteDescription,
    title: {
      default: "Glyph Explorer",
      template: "%s · Glyph Explorer",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-scroll-behavior="smooth" lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PwaRegistration />
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

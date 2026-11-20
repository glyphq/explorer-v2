import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "../index.css";
import { AppShell } from "@/components/explorer/app-shell";
import { ContractProvider } from "@/components/explorer/contract-provider";
import Providers from "@/components/providers";
import PwaRegistration from "@/components/pwa-registration";
import { contractSummaries } from "@/lib/contracts/registry";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  applicationName: SITE_NAME,
  description: SITE_DESCRIPTION,
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
  metadataBase: new URL(SITE_URL),
  openGraph: {
    description: SITE_DESCRIPTION,
    images: [
      {
        alt: SITE_NAME,
        height: 630,
        url: "/og/glyph-explorer.png",
        width: 1200,
      },
    ],
    locale: "en_US",
    siteName: SITE_NAME,
    title: {
      default: SITE_NAME,
      template: `%s · ${SITE_NAME}`,
    },
    type: "website",
    url: "/",
  },
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  twitter: {
    card: "summary_large_image",
    description: SITE_DESCRIPTION,
    images: ["/og/glyph-explorer.png"],
    title: {
      default: SITE_NAME,
      template: `%s · ${SITE_NAME}`,
    },
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { color: "#f4f4f4", media: "(prefers-color-scheme: light)" },
    { color: "#070707", media: "(prefers-color-scheme: dark)" },
  ],
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
        <ContractProvider contracts={contractSummaries}>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </ContractProvider>
      </body>
    </html>
  );
}

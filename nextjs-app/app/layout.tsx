import type { Metadata } from "next";
import { IBM_Plex_Sans, Instrument_Serif } from "next/font/google";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const displayFont = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Draft Queue MVP",
  description: "Pipeline dashboard for Ollama to WordPress draft generation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        <div className="page-frame">
          <SiteHeader />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}

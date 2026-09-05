import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const editorialSerif = Cormorant_Garamond({
  variable: "--font-editorial-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const socialImage = new URL("/og.png", `${protocol}://${host}`);

  return {
    title: { default: "Prathik Raman — Visual Journal", template: "%s — Prathik Raman" },
    description: "A photography-first visual journal of places, light, and moments noticed along the way.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Prathik Raman — Visual Journal",
      description: "Places I’ve been. Moments I noticed.",
      type: "website",
      images: [{ url: socialImage, width: 1731, height: 909, alt: "Prathik Raman — Visual Journal" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Prathik Raman — Visual Journal",
      description: "Places I’ve been. Moments I noticed.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${editorialSerif.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

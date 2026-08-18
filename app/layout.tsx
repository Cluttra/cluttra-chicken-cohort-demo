import type { Metadata } from "next";
import "./globals.css";
import "./chart.css";
import "./logo.css";

export const metadata: Metadata = {
  title: "Cluttra LLC Demo – Csirke kohorszszimulátor",
  description: "Interaktív heti tervezési modell brojler-, tojó- és tenyészcsirke-kohorszokhoz.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/cluttra-logo.png",
    shortcut: "/cluttra-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <body className="antialiased">{children}</body>
    </html>
  );
}

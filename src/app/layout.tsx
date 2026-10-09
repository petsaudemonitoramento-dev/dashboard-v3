import type { Metadata } from "next";

import "@fontsource/clear-sans/400.css";
import "@fontsource/clear-sans/500.css";
import "@fontsource/clear-sans/700.css";
import "./globals.css";
import "./brand-system.css";

export const metadata: Metadata = {
  applicationName: "MAE APS",
  title: "MAE APS",
  description: "Monitoramento, Atenção e Estratégia na APS — indicador C3.",
  icons: {
    icon: [
      { url: "/brands/mae-aps-favicon.svg", type: "image/svg+xml" },
      { url: "/brands/mae-aps-favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/brands/mae-aps-favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/brands/mae-aps-favicon-48x48.png", type: "image/png", sizes: "48x48" },
      { url: "/brands/mae-aps-android-icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/brands/mae-aps-android-icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
    apple: [
      { url: "/brands/mae-aps-apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

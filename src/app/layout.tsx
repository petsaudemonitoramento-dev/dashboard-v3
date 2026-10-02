import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  applicationName: "MAE APS",
  title: "MAE APS",
  description: "Monitoramento, Atenção e Estratégia na APS — indicador C3.",
  icons: {
    icon: [
      {
        url: "/brands/mae-aps-favicon.png",
        type: "image/png",
        sizes: "128x128",
      },
    ],
    shortcut: "/brands/mae-aps-favicon.png",
    apple: [
      {
        url: "/brands/mae-aps-favicon.png",
        type: "image/png",
        sizes: "128x128",
      },
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

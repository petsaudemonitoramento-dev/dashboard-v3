import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Cuidado na Gestação na APS",
  description: "Plataforma institucional de cuidado na gestação na APS.",
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

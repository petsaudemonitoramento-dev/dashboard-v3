import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cuidado na Gestação na APS",
  description: "Painel de gestão municipal para acompanhamento do cuidado na gestação e puerpério.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

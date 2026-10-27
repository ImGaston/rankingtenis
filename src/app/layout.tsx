import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Ranking Tenis Rivas", template: "%s · Ranking Tenis Rivas" },
  description:
    "Tus partidos del Ranking de Tenis de Rivas: rival, semana, propuesta de horario y envío del resultado.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#14532d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-fondo text-texto">{children}</body>
    </html>
  );
}

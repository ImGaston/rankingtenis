import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const descripcion =
  "Tus partidos del Ranking de Tenis de Rivas: rival, semana, propuesta de horario y envío del resultado.";

// Las previsualizaciones (WhatsApp, Telegram…) necesitan URLs absolutas para la imagen.
// En Vercel se usa el dominio de producción (variable de sistema) para no depender de
// que NEXT_PUBLIC_SITE_URL esté bien configurada allí.
const urlSitio = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(urlSitio),
  title: { default: "Ranking Tenis Rivas", template: "%s · Ranking Tenis Rivas" },
  description: descripcion,
  applicationName: "Ranking Tenis Rivas",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Ranking Tenis Rivas",
    title: "Ranking Tenis Rivas",
    description: descripcion,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ranking Tenis Rivas",
    description: descripcion,
  },
};

export const viewport: Viewport = {
  themeColor: "#ff1100",
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

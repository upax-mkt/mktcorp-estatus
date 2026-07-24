import type { Metadata } from "next";
import { CLASES_DE_FUENTES } from "@/temas/fuentes";
import "./globals.css";

export const metadata: Metadata = {
  title: "mktcorp-estatus",
  description: "Sistema de estatus en vivo de Marketing Corporativo para las salas de Grupo UPAX",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={CLASES_DE_FUENTES}>{children}</body>
    </html>
  );
}

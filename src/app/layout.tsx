import type { Metadata } from "next";
import { CLASES_DE_FUENTES } from "@/temas/fuentes";
import "./globals.css";
// El sistema visual compartido —neutros, radios, elevación, movimiento y las
// piezas comunes— después del reset, para que sus tokens ganen. Se importa
// aquí y no con @import dentro de globals.css porque una regla @import solo
// es válida ANTES de cualquier otra regla del archivo.
import "./sistema.css";

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

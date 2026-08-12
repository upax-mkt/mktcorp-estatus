import type { Metadata } from "next";
import { clasesDeFuentes } from "@/temas/fuentes";
import "./globals.css";
// El sistema visual compartido —neutros, radios, elevación, movimiento y las
// piezas comunes— después del reset, para que sus tokens ganen. Se importa
// aquí y no con @import dentro de globals.css porque una regla @import solo
// es válida ANTES de cualquier otra regla del archivo.
import "./sistema.css";

export const metadata: Metadata = {
  title: "Meeting Hub · Marketing Corp",
  description: "Sistema de estatus en vivo de Marketing Corporativo para las salas de Grupo UPAX",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      {/* SOLO OUTFIT (tarea 7, ronda 8) — antes las nueve/veinte familias del
          catálogo colgaban aquí, así que se cargaban en TODA página aunque
          casi ninguna las usara. Outfit es la única que de verdad hace falta
          en cualquier pantalla: es el `font-family` fijo de cada módulo de
          chrome (globals.css, hub, salas, cliente, agenda, entrar, deck,
          minuta…), no la tipografía de marca de una sala. La de marca —la
          que sí cambia por sala— la carga `ProveedorTema`, scoped a la suya
          (dos familias, no veinte); el Home no necesita ninguna aparte: el
          logotipo ES el nombre de cada tarjeta, no hay texto de marca que
          pintar (ver src/app/page.tsx). Detalle completo en el reporte de
          la tarea 7. */}
      <body className={clasesDeFuentes(['outfit'])}>{children}</body>
    </html>
  );
}

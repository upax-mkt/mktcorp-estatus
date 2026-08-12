import type { Metadata } from "next";
import { clasesDeFuentes } from "@/temas/fuentes";
import "./globals.css";
// El sistema visual compartido —neutros, radios, elevación, movimiento y las
// piezas comunes— después del reset, para que sus tokens ganen. Se importa
// aquí y no con @import dentro de globals.css porque una regla @import solo
// es válida ANTES de cualquier otra regla del archivo.
import "./sistema.css";

/**
 * LO QUE SE VE AL COMPARTIR UN ENLACE DE ESTA APP.
 *
 * Franco: *"cuando se comparte la url aparece todo este contenido que no está
 * bien: Meeting Hub · Marketing CorpSistema de estatus en vivo de Marketing
 * Corporativo para las salas de Grupo UPAX"*.
 *
 * Dos cosas iban mal y las dos venían de aquí:
 *
 * 1. **ESTE ERA EL ÚNICO SITIO CON METADATA DE TODA LA APP.** Da igual qué URL
 *    se comparta —el Home, la sala de una UDN, una reunión—: Slack, WhatsApp y
 *    LinkedIn enseñaban siempre este mismo título y esta misma descripción. La
 *    sala de NeraCode se previsualizaba como "Meeting Hub · Marketing Corp".
 *    Cada pantalla que se comparte define ahora la suya (`generateMetadata`).
 * 2. **EL TEXTO ESTABA ESCRITO HACIA DENTRO.** "Sistema de estatus en vivo de
 *    Marketing Corporativo para las salas de Grupo UPAX" describe la
 *    herramienta desde el lado de quien la opera. Quien recibe el enlace es el
 *    director de su UDN, y lo que necesita saber es qué va a encontrar.
 *
 * `metadataBase` es obligatorio para que la imagen de vista previa viaje como
 * URL absoluta: sin él, Next avisa y las redes no resuelven la imagen. Sale
 * del entorno para que un preview de Vercel no anuncie el dominio de
 * producción — `VERCEL_PROJECT_PRODUCTION_URL` la pone Vercel sola, así que el
 * cambio de dominio del 12-ago no obligó a tocar nada aquí.
 */
const ORIGEN =
  process.env.APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')

export const metadata: Metadata = {
  metadataBase: new URL(ORIGEN),
  title: {
    // Cada pantalla pone lo suyo y esto lo completa: "NeraCode · Meeting Hub".
    template: '%s · Meeting Hub',
    default: 'Meeting Hub · Marketing Corp',
  },
  description:
    'El espacio donde Marketing Corporativo y cada unidad de negocio siguen sus acuerdos, sus reuniones y sus materiales.',
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    siteName: 'Meeting Hub · Marketing Corp',
  },
  // Sin buscadores: aquí hay acuerdos y minutas de clientes. La sala es
  // pública porque su enlace se comparte, no para que se indexe.
  robots: { index: false, follow: false },
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

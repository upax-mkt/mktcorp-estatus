import { notFound } from 'next/navigation'
import { Deck } from '@/componentes/deck/Deck'
import { NC_JUNIO_2026 } from '@/fixtures/nc-junio-2026'
import { slugsDeSalas } from '@/temas'

export function generateStaticParams() {
  return slugsDeSalas().map((sala) => ({ sala }))
}

export default async function PaginaDemo({ params }: { params: Promise<{ sala: string }> }) {
  const { sala } = await params
  if (!slugsDeSalas().includes(sala)) notFound()
  return (
    <main style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
      <Deck decisiones={NC_JUNIO_2026} slugSala={sala} />
    </main>
  )
}

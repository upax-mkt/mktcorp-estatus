'use client'

import { slugsDeSalas, obtenerTema } from '@/temas'

export default function Home() {
  const salas = slugsDeSalas()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
      }}
    >
      <main
        style={{
          maxWidth: '600px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <h1 style={{ marginBottom: '1rem', fontSize: '2rem', fontWeight: 'bold' }}>
          mktcorp-estatus
        </h1>

        <p
          style={{
            marginBottom: '2rem',
            fontSize: '1rem',
            lineHeight: '1.6',
            color: 'var(--foreground)',
          }}
        >
          Sistema de estatus en vivo de Marketing Corporativo para las salas de Grupo UPAX.
        </p>

        <nav>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {salas.map((slug) => {
              const tema = obtenerTema(slug)
              return (
                <li key={slug}>
                  <a
                    href={`/demo/${slug}`}
                    style={{
                      display: 'inline-block',
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                      border: `1px solid var(--foreground)`,
                      borderRadius: '0.25rem',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                        'var(--foreground)'
                      ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--background)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                        'var(--background)'
                      ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--foreground)'
                    }}
                  >
                    {tema.nombre}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
      </main>
    </div>
  )
}

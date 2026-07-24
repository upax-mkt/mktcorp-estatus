import { slugsDeSalas, obtenerTema } from '@/temas'
import styles from './page.module.css'

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
                  <a href={`/demo/${slug}`} className={styles.enlaceSala}>
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

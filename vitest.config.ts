import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    /**
     * ⚠️ LOS WORKTREES DE GIT VIVEN DENTRO DEL PROYECTO Y ENVENENAN LA SUITE.
     *
     * `.claude/worktrees/<nombre>` es una copia completa del repo anclada a
     * OTRO commit. Sin esta exclusión vitest la recorre como si fuera código
     * de aquí: el 16-ago la suite pasó de 1.941 a **3.849 tests** —cada uno
     * corriendo dos veces— y aparecieron 3 fallos que no eran de nadie.
     *
     * Y son fallos ENGAÑOSOS, no solo ruido: el alias `@` de aquí abajo
     * resuelve a `./src` de ESTE árbol, así que los tests VIEJOS del worktree
     * se ejecutan contra el código NUEVO. Un test de hace tres semanas
     * "falla" describiendo una interfaz que ya cambió a propósito, y cuesta
     * un rato entender que no hay nada roto.
     *
     * Se excluye el directorio, no un worktree concreto: el siguiente que
     * alguien cree tiene que nacer ya fuera del alcance.
     */
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.claude/worktrees/**'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
})

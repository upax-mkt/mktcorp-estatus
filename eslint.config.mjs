import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      /*
       * El guion bajo delante YA significa "esto se descarta a propósito".
       *
       * Aparecía en dos formas legítimas y las dos avisaban en cada `lint`:
       * quitar una clave al desestructurar —`({ incluir: _incluir, ...resto })`,
       * que es la manera idiomática de omitir un campo— y un parámetro que
       * una firma exige pero la implementación no usa.
       *
       * Un aviso que sale siempre y que nunca hay que atender enseña a
       * ignorar la salida del linter entera, y entonces el aviso que sí
       * importa pasa desapercibido. La regla se hace explícita en vez de
       * convivir con ruido permanente.
       */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    /*
     * ⚠️ LOS WORKTREES DE GIT VIVEN DENTRO DEL PROYECTO.
     *
     * `.claude/worktrees/<nombre>` es una copia completa del repo anclada a
     * otro commit. Los patrones de arriba son RELATIVOS a la raíz, así que
     * `.next/**` no alcanza al `.next` de dentro de un worktree: el 16-ago,
     * en cuanto uno de ellos se compiló, `eslint` empezó a analizar sus
     * `chunks` de turbopack y devolvió cientos de errores sobre código
     * generado que nadie escribió.
     *
     * Es el mismo problema que ya se cerró en `vitest.config.ts`, donde la
     * suite pasó de 1.941 a 3.849 tests por la misma razón. Se ignora el
     * directorio entero para que el siguiente worktree nazca ya fuera.
     */
    ".claude/**",
  ]),
]);

export default eslintConfig;

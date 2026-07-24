import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { Tema } from '@/temas/tipos'
import type { Inventario } from './inventario'
import { EsquemaDecision, parsearDecision, type DecisionSlide } from '@/decision/esquema'
import { construirPrompt } from './prompt'

export interface ClienteDecision {
  messages: { parse: (args: unknown) => Promise<{ parsed_output: unknown; stop_reason?: string }> }
}

export function crearClientePorDefecto(): ClienteDecision {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Falta ANTHROPIC_API_KEY para la etapa de decisión del motor')
  }
  return new Anthropic() as unknown as ClienteDecision
}

export async function decidir(inv: Inventario, tema: Tema, cliente: ClienteDecision): Promise<DecisionSlide> {
  const { system, user } = construirPrompt(inv, tema)
  const resp = await cliente.messages.parse({
    model: 'claude-opus-4-8',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: zodOutputFormat(EsquemaDecision) },
    system,
    messages: [{ role: 'user', content: user }],
  })
  if (!resp.parsed_output) {
    throw new Error(`El modelo no devolvió una decisión (stop_reason: ${resp.stop_reason ?? 'desconocido'})`)
  }
  return parsearDecision(resp.parsed_output)   // candado: revalida contra el esquema estricto
}

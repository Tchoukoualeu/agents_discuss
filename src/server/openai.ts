import { z } from 'zod'

const openAiEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'Missing OPENAI_API_KEY'),
  OPENAI_MODEL: z.string().min(1).optional(),
})

export function getOpenAiConfig() {
  const parsed = openAiEnvSchema.safeParse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  })
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'env'}: ${i.message}`)
      .join('\n')
    throw new Error(message)
  }
  return {
    model: parsed.data.OPENAI_MODEL ?? 'gpt-4o-mini',
  }
}


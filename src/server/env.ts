import { z } from 'zod'

const serverEnvSchema = z.object({
  MONGODB_URI: z.string().min(1, 'Missing MONGODB_URI (or MLAB_URI)'),
  MONGODB_DB: z.string().min(1).optional(),
})

export function getServerEnv() {
  // TanStack Start server functions run on the server.
  // We validate eagerly so DB errors are obvious.
  const mongoUri = process.env.MONGODB_URI ?? process.env.MLAB_URI
  const mongoDb = process.env.MONGODB_DB ?? process.env.MLAB_DB

  const parsed = serverEnvSchema.safeParse({
    MONGODB_URI: mongoUri,
    MONGODB_DB: mongoDb,
  })

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'env'}: ${i.message}`)
      .join('\n')
    throw new Error(message)
  }

  return parsed.data
}


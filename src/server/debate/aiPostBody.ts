import { z } from 'zod'

/**
 * @tanstack/ai-react POSTs `{ messages, data }` where custom fields from
 * `connect(messages, { deviceId })` live under `data`, not the top level.
 */
export const deviceIdFromAiPostBodySchema = z
  .object({
    deviceId: z.string().min(1).optional(),
    data: z.object({ deviceId: z.string().min(1).optional() }).optional(),
  })
  .passthrough()
  .transform((b) => b.deviceId ?? b.data?.deviceId)
  .pipe(z.string().min(1))

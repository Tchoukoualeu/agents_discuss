import { z } from 'zod'

export const agentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  persona: z.string().min(1),
  color: z.string().min(1),
  avatar: z.string().min(1),
})

export type DebateAgent = z.infer<typeof agentSchema>

export const messageSchema = z.object({
  id: z.string().min(1),
  agentId: z.string().min(1),
  round: z.number().int().min(1),
  content: z.string().min(1),
  timestamp: z.coerce.date(),
})

export type DebateMessage = z.infer<typeof messageSchema>

export const debateStatusSchema = z.enum(['in-progress', 'completed'])

export const debateSchema = z.object({
  debateId: z.string().min(1),
  deviceId: z.string().min(1),
  question: z.string().min(15),
  numberOfAgents: z.number().int().min(2).max(5),
  numberOfRounds: z.number().int().min(2).max(8),
  agents: z.array(agentSchema).min(2).max(5),
  messages: z.array(messageSchema),
  finalAnswer: z.string().optional(),
  keyInsights: z.union([z.array(z.string()), z.string()]).optional(),
  status: debateStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type DebateDoc = z.infer<typeof debateSchema>

export const createDebateInputSchema = z.object({
  deviceId: z.string().min(1),
  question: z.string().min(15),
  numberOfAgents: z.number().int().min(2).max(5),
  numberOfRounds: z.number().int().min(2).max(8).default(4),
  customizePersonas: z.boolean().optional(),
  agents: z
    .array(
      z.object({
        name: z.string().min(1),
        persona: z.string().min(1),
      }),
    )
    .optional(),
})

export const listDebatesInputSchema = z.object({
  deviceId: z.string().min(1),
  q: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(), // ISO date cursor
})

export const getDebateInputSchema = z.object({
  deviceId: z.string().min(1),
  debateId: z.string().min(1),
})

export const deleteDebateInputSchema = z.object({
  deviceId: z.string().min(1),
  debateId: z.string().min(1),
})

export const clearDebatesInputSchema = z.object({
  deviceId: z.string().min(1),
})

export const updateQuestionInputSchema = z.object({
  deviceId: z.string().min(1),
  debateId: z.string().min(1),
  question: z.string().min(15),
})

export const addMessagesInputSchema = z.object({
  deviceId: z.string().min(1),
  debateId: z.string().min(1),
  messages: z.array(
    z.object({
      id: z.string().min(1),
      agentId: z.string().min(1),
      round: z.number().int().min(1),
      content: z.string().min(1),
      timestamp: z.coerce.date(),
    }),
  ),
  status: debateStatusSchema.optional(),
  finalAnswer: z.string().optional(),
  keyInsights: z.union([z.array(z.string()), z.string()]).optional(),
})


import { NextResponse } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'

import { getMongoDb } from '#/server/db/mongo'
import { buildAgents } from '#/server/debates/personas'

const createSchema = z.object({
  deviceId: z.string().min(1),
  question: z.string().min(15),
  numberOfAgents: z.number().int().min(2).max(5),
  numberOfRounds: z.number().int().min(2).max(8),
  agents: z
    .array(z.object({ name: z.string().min(1), persona: z.string().min(1) }))
    .optional(),
})

const listSchema = z.object({
  deviceId: z.string().min(1),
  q: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export async function POST(req: Request) {
  const input = createSchema.parse(await req.json())
  const db = await getMongoDb()
  const debateId = nanoid(10)
  const agents = buildAgents(input.numberOfAgents, input.agents)
  const now = new Date()

  await db.collection('debates').insertOne({
    debateId,
    deviceId: input.deviceId,
    question: input.question.trim(),
    numberOfAgents: input.numberOfAgents,
    numberOfRounds: input.numberOfRounds,
    agents,
    messages: [],
    status: 'in-progress',
    createdAt: now,
    updatedAt: now,
  })

  return NextResponse.json({ debateId })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const input = listSchema.parse({
    deviceId: url.searchParams.get('deviceId'),
    q: url.searchParams.get('q') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  })

  const filter: Record<string, unknown> = { deviceId: input.deviceId }
  if (input.q?.trim()) {
    filter.question = { $regex: input.q.trim(), $options: 'i' }
  }
  if (input.cursor) {
    const d = new Date(input.cursor)
    if (!Number.isNaN(d.getTime())) filter.createdAt = { $lt: d }
  }

  const db = await getMongoDb()
  const items = await db
    .collection('debates')
    .find(filter, {
      projection: {
        _id: 0,
        debateId: 1,
        question: 1,
        numberOfAgents: 1,
        numberOfRounds: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        finalAnswer: 1,
      },
    })
    .sort({ createdAt: -1 })
    .limit(input.limit)
    .toArray()

  const nextCursor =
    items.length === input.limit
      ? new Date((items[items.length - 1] as any).createdAt).toISOString()
      : null

  return NextResponse.json({ items, nextCursor })
}


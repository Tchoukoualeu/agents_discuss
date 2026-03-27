import { nanoid } from 'nanoid'
import { chat, toServerSentEventsResponse, type StreamChunk } from '@tanstack/ai'
import { openaiText } from '@tanstack/ai-openai'

import { deviceIdFromAiPostBodySchema } from '#/server/debate/aiPostBody'
import { getMongoDb } from '#/server/db/mongo'
import { getOpenAiConfig } from '#/server/openai'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ debateId: string }> },
) {
  const deviceId = deviceIdFromAiPostBodySchema.parse(await req.json())
  const { debateId } = await params

  const db = await getMongoDb()
  const debate: any = await db
    .collection('debates')
    .findOne({ deviceId, debateId }, { projection: { _id: 0 } })
  if (!debate) throw new Error('Debate not found')

  const agents: any[] = debate.agents ?? []
  const messages: any[] = debate.messages ?? []
  const { model } = getOpenAiConfig()
  const runId = `synth-${debateId}-${nanoid(6)}`
  const messageId = `final-${debateId}-${nanoid(6)}`

  async function* stream(): AsyncGenerator<StreamChunk> {
    yield { type: 'RUN_STARTED', timestamp: Date.now(), runId, model }
    yield { type: 'CUSTOM', timestamp: Date.now(), name: 'debateforge.synthesis', value: { messageId } }
    yield { type: 'TEXT_MESSAGE_START', timestamp: Date.now(), messageId, role: 'assistant', model }

    const transcript = messages
      .slice(-60)
      .map((m) => {
        const agent = agents.find((a) => a.id === m.agentId)
        const name = agent?.name ?? m.agentId
        return `Round ${m.round} — ${name}:\n${String(m.content ?? '').trim()}`
      })
      .join('\n\n')

    const user = [
      `System instructions:`,
      `You are the debate synthesizer.`,
      `Goal: produce a single best consolidated answer, plus key insights/trade-offs.`,
      `Style: clear structure, actionable, truthful about uncertainty.`,
      ``,
      `Question/topic:`,
      debate.question,
      ``,
      `Debate transcript:`,
      transcript || '(empty)',
      ``,
      `Now produce:`,
      `1) Best Answer (markdown)`,
      `2) Key Insights & Trade-offs (bullets)`,
    ].join('\n')

    let fullText = ''
    const aiStream = chat({
      adapter: openaiText(model as any),
      messages: [
        { role: 'user', content: user },
      ],
    })

    for await (const chunk of aiStream) {
      if (chunk.type === 'TEXT_MESSAGE_CONTENT') {
        fullText += chunk.delta
        yield { ...chunk, messageId, model, timestamp: Date.now() }
      }
    }

    yield { type: 'TEXT_MESSAGE_END', timestamp: Date.now(), messageId, model }

    await db.collection<any>('debates').updateOne(
      { deviceId, debateId },
      { $set: { finalAnswer: fullText.trim(), status: 'completed', updatedAt: new Date() } },
    )

    yield { type: 'RUN_FINISHED', timestamp: Date.now(), runId, model, finishReason: 'stop' }
  }

  return toServerSentEventsResponse(stream())
}


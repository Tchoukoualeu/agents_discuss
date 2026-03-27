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
  if (debate.status === 'completed') throw new Error('Debate is completed')

  const agents: any[] = debate.agents ?? []
  const numberOfRounds: number = debate.numberOfRounds ?? 4
  const existingMessages: any[] = debate.messages ?? []
  const currentMaxRound = existingMessages.reduce(
    (m, x) => Math.max(m, Number(x.round ?? 0)),
    0,
  )
  const countInMax = existingMessages.filter((m) => m.round === currentMaxRound).length
  const nextRound = countInMax >= agents.length ? currentMaxRound + 1 : currentMaxRound + 1
  if (nextRound > numberOfRounds) throw new Error('No rounds remaining')

  const { model } = getOpenAiConfig()
  const runId = `round-${debateId}-${nextRound}-${nanoid(6)}`

  async function* stream(): AsyncGenerator<StreamChunk> {
    yield { type: 'RUN_STARTED', timestamp: Date.now(), runId, model }

    const recentTranscript = (existingMessages ?? [])
      .slice(-20)
      .map((m) => {
        const agent = agents.find((a) => a.id === m.agentId)
        const name = agent?.name ?? m.agentId
        return `Round ${m.round} — ${name}:\n${String(m.content ?? '').trim()}`
      })
      .join('\n\n')

    for (const agent of agents) {
      const messageId = `m-${agent.id}-r${nextRound}-${nanoid(6)}`
      let fullText = ''

      yield {
        type: 'CUSTOM',
        timestamp: Date.now(),
        name: 'debateforge.agent',
        value: {
          messageId,
          agentId: agent.id,
          agentName: agent.name,
          round: nextRound,
        },
      }

      yield {
        type: 'TEXT_MESSAGE_START',
        timestamp: Date.now(),
        messageId,
        role: 'assistant',
        model,
      }

      const user = [
        `System instructions:`,
        `You are debating as: ${agent.name}.`,
        `Persona: ${agent.persona}`,
        `Rules:`,
        `- Stay in character.`,
        `- Be thoughtful and specific.`,
        `- Reference prior points when relevant.`,
        `- Challenge weak assumptions and offer alternatives.`,
        `- Keep it concise but substantive.`,
        ``,
        `Question/topic:`,
        debate.question,
        ``,
        `This is round ${nextRound} of ${numberOfRounds}.`,
        ``,
        recentTranscript ? `Recent transcript:\n${recentTranscript}` : '',
        ``,
        `Write your round ${nextRound} contribution now.`,
      ]
        .filter(Boolean)
        .join('\n')

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
        ({
          $push: {
            messages: {
              id: messageId,
              agentId: agent.id,
              round: nextRound,
              content: fullText.trim(),
              timestamp: new Date(),
            },
          },
          $set: { updatedAt: new Date() },
        } as any),
      )
    }

    yield { type: 'RUN_FINISHED', timestamp: Date.now(), runId, model, finishReason: 'stop' }
  }

  return toServerSentEventsResponse(stream())
}


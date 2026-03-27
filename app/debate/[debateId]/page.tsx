'use client'

import Link from 'next/link'
import { Streamdown } from 'streamdown'
import { use, useEffect, useMemo, useRef, useState } from 'react'
import type { StreamChunk } from '@tanstack/ai'
import { fetchServerSentEvents } from '@tanstack/ai-react'
import { useQuery } from '@tanstack/react-query'

import { getDeviceId } from '#/lib/deviceId'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export default function DebateRoomPage({
  params,
}: {
  params: Promise<{ debateId: string }>
}) {
  const { debateId } = use(params)
  const deviceId = getDeviceId()

  const debateQuery = useQuery({
    queryKey: ['debates', 'detail', debateId],
    queryFn: async () => {
      const url = new URL(`/api/debates/${debateId}`, window.location.origin)
      url.searchParams.set('deviceId', deviceId)
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(await res.text())
      return (await res.json()) as any
    },
  })

  const [autoRun, setAutoRun] = useState(false)
  const [paused, setPaused] = useState(false)
  const [streaming, setStreaming] = useState<{
    byMessageId: Record<
      string,
      { agentId: string; agentName: string; round: number; content: string }
    >
    order: string[]
    isRunning: boolean
    error?: string
  }>({ byMessageId: {}, order: [], isRunning: false })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const streamingChars = useMemo(
    () =>
      streaming.order.reduce(
        (n, id) => n + (streaming.byMessageId[id]?.content?.length ?? 0),
        0,
      ),
    [streaming.byMessageId, streaming.order],
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [
    debateQuery.data?.messages?.length,
    streaming.order.length,
    streamingChars,
  ])

  const currentRound = useMemo(() => {
    const msgs: Array<any> = debateQuery.data?.messages ?? []
    const maxRound = msgs.reduce((m, x) => Math.max(m, Number(x.round ?? 0)), 0)
    const agentsCount = debateQuery.data?.agents?.length ?? 0
    if (!agentsCount) return 0
    const inCurrent = msgs.filter((m) => m.round === maxRound).length
    return inCurrent >= agentsCount ? maxRound : maxRound
  }, [debateQuery.data?.messages, debateQuery.data?.agents?.length])

  const totalRounds = debateQuery.data?.numberOfRounds ?? 0
  const progressPct =
    totalRounds > 0 ? clamp((currentRound / totalRounds) * 100, 0, 100) : 0

  async function runNextRound() {
    if (!debateQuery.data) return
    if (debateQuery.data.status === 'completed') return
    if (currentRound >= debateQuery.data.numberOfRounds) return

    setStreaming({ byMessageId: {}, order: [], isRunning: true })
    try {
      const connection = fetchServerSentEvents(`/api/debate/${debateId}/round`)
      const stream = connection.connect([], { deviceId })
      for await (const chunk of stream) {
        const c = chunk as StreamChunk
        if (c.type === 'CUSTOM' && c.name === 'debateforge.agent') {
          const value: any = c.value
          setStreaming((prev) => {
            const exists = prev.byMessageId[value.messageId]
            const byMessageId = { ...prev.byMessageId }
            byMessageId[value.messageId] = {
              agentId: value.agentId,
              agentName: value.agentName,
              round: value.round,
              content: exists?.content ?? '',
            }
            const order = prev.order.includes(value.messageId)
              ? prev.order
              : [...prev.order, value.messageId]
            return { ...prev, byMessageId, order }
          })
        }
        if (c.type === 'TEXT_MESSAGE_CONTENT') {
          setStreaming((prev) => {
            const existing = prev.byMessageId[c.messageId]
            if (!existing) return prev
            const byMessageId = { ...prev.byMessageId }
            byMessageId[c.messageId] = {
              ...existing,
              content: existing.content + c.delta,
            }
            return { ...prev, byMessageId }
          })
        }
      }
    } catch (err) {
      setStreaming((prev) => ({ ...prev, error: (err as Error).message }))
    } finally {
      setStreaming((prev) => ({ ...prev, isRunning: false }))
      await debateQuery.refetch()
    }
  }

  useEffect(() => {
    if (!autoRun) return
    if (paused) return
    if (streaming.isRunning) return
    if (!debateQuery.data) return
    if (debateQuery.data.status === 'completed') return
    if (currentRound >= (debateQuery.data.numberOfRounds ?? 0)) return
    const id = window.setTimeout(() => void runNextRound(), 600)
    return () => window.clearTimeout(id)
  }, [autoRun, paused, streaming.isRunning, debateQuery.data, currentRound])

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="island-kicker mb-2">Debate Room</p>
            <h1 className="display-title mb-2 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
              Debate{' '}
              <span className="text-[var(--lagoon-deep)]">{debateId}</span>
            </h1>
            <p className="m-0 text-sm leading-7 text-[var(--sea-ink-soft)]">
              Round {Math.min(currentRound + 1, totalRounds || 1)} of{' '}
              {totalRounds || '—'} • {debateQuery.data?.agents?.length ?? 0}{' '}
              agents
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink)]">
              <input
                type="checkbox"
                checked={autoRun}
                onChange={(e) => setAutoRun(e.target.checked)}
              />
              Auto-run
            </label>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)]"
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              disabled={
                streaming.isRunning || debateQuery.data?.status === 'completed'
              }
              onClick={() => void runNextRound()}
              className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-4 py-2 text-sm font-semibold text-[var(--lagoon-deep)] transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)] disabled:opacity-60"
            >
              {streaming.isRunning ? 'Running…' : 'Run Next Round'}
            </button>
            <Link
              href={`/debate/${debateId}/results`}
              className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)]"
            >
              Results
            </Link>
          </div>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--lagoon),#7ed3bf)] transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border border-[var(--line)] bg-white/30 p-4 dark:bg-black/10">
            <div className="mt-4 h-[min(calc(100dvh-13rem),100rem)] overflow-y-auto rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.35)] dark:bg-[rgba(0,0,0,0.12)]">
              <div className="p-4">
                {(debateQuery.data?.messages ?? []).map((m: any) => {
                  const agent = (debateQuery.data?.agents as any[])?.find(
                    (a) => a.id === m.agentId,
                  )
                  return (
                    <div key={m.id} className="mb-3 flex gap-3">
                      <div className="mt-0.5 h-9 w-9 shrink-0 rounded-2xl border border-[var(--line)] bg-white/60 text-center text-lg leading-9 dark:bg-black/20">
                        {agent?.avatar ?? '🤖'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="text-sm font-bold"
                            style={{ color: agent?.color }}
                          >
                            {agent?.name ?? m.agentId}
                          </span>
                          <span className="rounded-full border border-[var(--line)] bg-white/60 px-2 py-0.5 text-xs font-semibold text-[var(--sea-ink-soft)] dark:bg-black/10">
                            Round {m.round}
                          </span>
                        </div>
                        <div className="prose prose-sm mt-2 max-w-none dark:prose-invert">
                          <Streamdown>{String(m.content)}</Streamdown>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {streaming.isRunning || streaming.order.length ? (
                  <div className="mt-6 min-h-[min(52vh,42rem)] rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.45)] p-4 dark:bg-[rgba(0,0,0,0.14)]">
                    <p className="island-kicker mb-3">Streaming…</p>
                    {streaming.isRunning && !streaming.order.length ? (
                      <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
                        Waiting for agents…
                      </p>
                    ) : null}
                    {streaming.order.map((id) => {
                      const sm = streaming.byMessageId[id]
                      if (!sm) return null
                      const agent = (debateQuery.data?.agents as any[])?.find(
                        (a) => a.id === sm.agentId,
                      )
                      return (
                        <div key={id} className="mb-3 flex gap-3 opacity-95">
                          <div className="mt-0.5 h-9 w-9 shrink-0 rounded-2xl border border-[var(--line)] bg-white/60 text-center text-lg leading-9 dark:bg-black/20">
                            {agent?.avatar ?? '🤖'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="text-sm font-bold"
                                style={{ color: agent?.color }}
                              >
                                {sm.agentName}
                              </span>
                              <span className="rounded-full border border-[var(--line)] bg-white/60 px-2 py-0.5 text-xs font-semibold text-[var(--sea-ink-soft)] dark:bg-black/10">
                                Round {sm.round}
                              </span>
                            </div>
                            <div className="prose prose-sm mt-2 max-w-none dark:prose-invert">
                              <Streamdown>{sm.content || '…'}</Streamdown>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {streaming.error ? (
                      <p className="m-0 text-sm font-semibold text-red-700 dark:text-red-300">
                        {streaming.error}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-[var(--line)] bg-white/30 p-4 dark:bg-black/10">
            <p className="island-kicker mb-3">Agents</p>
            <div className="grid gap-3">
              {(debateQuery.data?.agents ?? []).map((a: any) => (
                <div
                  key={a.id}
                  className="rounded-2xl border border-[var(--line)] bg-white/50 p-3 dark:bg-black/10"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{a.avatar}</span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: a.color }}
                    >
                      {a.name}
                    </span>
                  </div>
                  <p className="m-0 mt-1 text-sm leading-6 text-[var(--sea-ink-soft)]">
                    {a.persona}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}

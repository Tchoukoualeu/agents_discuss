'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { getDeviceId } from '#/lib/deviceId'

export default function HistoryPage() {
  const [q, setQ] = useState('')
  const qc = useQueryClient()

  const historyQuery = useInfiniteQuery({
    queryKey: ['debates', 'list', { q }],
    queryFn: async ({ pageParam }) => {
      const deviceId = getDeviceId()
      const url = new URL('/api/debates', window.location.origin)
      url.searchParams.set('deviceId', deviceId)
      if (q) url.searchParams.set('q', q)
      if (pageParam) url.searchParams.set('cursor', String(pageParam))
      url.searchParams.set('limit', '20')
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(await res.text())
      return (await res.json()) as { items: any[]; nextCursor: string | null }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })

  const deleteMutation = useMutation({
    mutationFn: async (debateId: string) => {
      const deviceId = getDeviceId()
      const url = new URL(`/api/debates/${debateId}`, window.location.origin)
      url.searchParams.set('deviceId', deviceId)
      const res = await fetch(url.toString(), { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      return await res.json()
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['debates'] })
    },
  })

  const items = useMemo(
    () => historyQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [historyQuery.data],
  )

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="island-kicker mb-2">DebateForge</p>
            <h1 className="display-title mb-1 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
              Your Debate History
            </h1>
            <p className="m-0 max-w-2xl text-sm leading-7 text-[var(--sea-ink-soft)]">
              Debates are saved to MongoDB and tied to this browser/session (no
              accounts yet).
            </p>
          </div>

          <Link
            href="/"
            className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)]"
          >
            Start a New Debate
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by keyword in the question…"
            className="w-full max-w-lg rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-6 grid gap-3">
          {!items.length && !historyQuery.isLoading ? (
            <div className="rounded-2xl border border-[var(--line)] bg-white/30 p-6 text-sm text-[var(--sea-ink-soft)] dark:bg-black/10">
              No debates yet. Start one from the home page.
            </div>
          ) : null}

          {items.map((d: any) => (
            <article
              key={d.debateId}
              className="rounded-2xl border border-[var(--line)] bg-white/30 p-5 shadow-[0_1px_0_var(--inset-glint)_inset] dark:bg-black/10"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="m-0 text-base font-semibold text-[var(--sea-ink)]">
                    <Link
                      href={`/debate/${d.debateId}`}
                      className="no-underline hover:underline"
                    >
                      {String(d.question).slice(0, 120)}
                      {String(d.question).length > 120 ? '…' : ''}
                    </Link>
                  </h2>
                  <p className="m-0 mt-1 text-sm text-[var(--sea-ink-soft)]">
                    {d.numberOfAgents} agents • {d.numberOfRounds} rounds •{' '}
                    <span className="font-semibold">
                      {d.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                    {' • '}
                    {new Date(d.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={
                      d.status === 'completed'
                        ? `/debate/${d.debateId}/results`
                        : `/debate/${d.debateId}`
                    }
                    className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-4 py-2 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
                  >
                    {d.status === 'completed' ? 'View Results' : 'Resume'}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete this debate?')) {
                        deleteMutation.mutate(d.debateId)
                      }
                    }}
                    className="rounded-full border border-[rgba(160,40,40,0.25)] bg-[rgba(160,40,40,0.08)] px-4 py-2 text-sm font-semibold text-[rgba(120,20,20,0.95)] transition hover:-translate-y-0.5 hover:bg-[rgba(160,40,40,0.12)] disabled:opacity-60 dark:text-[rgba(255,200,200,0.95)]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {historyQuery.hasNextPage ? (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => historyQuery.fetchNextPage()}
              className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)] disabled:opacity-60"
            >
              Load more
            </button>
          </div>
        ) : null}
      </section>
    </main>
  )
}


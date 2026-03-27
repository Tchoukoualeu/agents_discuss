'use client'

import Link from 'next/link'
import { Streamdown } from 'streamdown'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getDeviceId } from '#/lib/deviceId'

export default function ResultsPage({
  params,
}: {
  params: { debateId: string }
}) {
  const debateId = params.debateId
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

  const exportMarkdown = useMemo(() => {
    const d: any = debateQuery.data
    if (!d) return ''
    const lines: string[] = []
    lines.push(`# DebateForge`)
    lines.push(``)
    lines.push(`## Question`)
    lines.push(d.question ?? '')
    lines.push(``)
    lines.push(`## Best Answer`)
    lines.push(d.finalAnswer ?? '_Not synthesized yet._')
    lines.push(``)
    lines.push(`## Transcript`)
    const agentsById = new Map<string, any>(
      (d.agents ?? []).map((a: any) => [a.id, a]),
    )
    for (const m of d.messages ?? []) {
      const a = agentsById.get(m.agentId)
      lines.push(`### Round ${m.round} — ${a?.name ?? m.agentId}`)
      lines.push(String(m.content ?? ''))
      lines.push(``)
    }
    return lines.join('\n')
  }, [debateQuery.data])

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">Results</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Synthesis
        </h1>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(exportMarkdown)}
            disabled={!exportMarkdown}
            className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)] disabled:opacity-60"
          >
            Copy / Export Markdown
          </button>
          <Link
            href={`/debate/${debateId}`}
            className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
          >
            Back to Debate
          </Link>
          <Link
            href="/history"
            className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)]"
          >
            Back to History
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/30 p-5 dark:bg-black/10">
          <p className="island-kicker mb-2">Best Answer</p>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <Streamdown>{String(debateQuery.data?.finalAnswer ?? '')}</Streamdown>
          </div>
        </div>
      </section>
    </main>
  )
}


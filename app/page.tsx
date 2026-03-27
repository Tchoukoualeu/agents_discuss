'use client'

import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { z } from 'zod'

import { getDeviceId } from '#/lib/deviceId'

const formSchema = z.object({
  question: z.string().min(15, 'Please enter at least 15 characters.'),
  numberOfAgents: z.number().int().min(2).max(5),
  numberOfRounds: z.number().int().min(2).max(8),
  customizePersonas: z.boolean(),
  agents: z.array(z.object({ name: z.string(), persona: z.string() })),
})

type FormValues = z.infer<typeof formSchema>

export default function HomePage() {
  const router = useRouter()

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const deviceId = getDeviceId()
      const parsed = formSchema.parse(values)

      const res = await fetch('/api/debates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          question: parsed.question.trim(),
          numberOfAgents: parsed.numberOfAgents,
          numberOfRounds: parsed.numberOfRounds,
          agents: parsed.customizePersonas
            ? parsed.agents.slice(0, parsed.numberOfAgents).map((a) => ({
                name: a.name.trim() || 'Agent',
                persona: a.persona.trim() || 'A helpful debate participant.',
              }))
            : undefined,
        }),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to create debate')
      }
      const json = (await res.json()) as any
      if (!json?.debateId) throw new Error('No debateId returned')
      return String(json.debateId)
    },
    onSuccess: (debateId) => router.push(`/debate/${debateId}`),
  })

  const form = useForm({
    defaultValues: {
      question: '',
      numberOfAgents: 3,
      numberOfRounds: 4,
      customizePersonas: false,
      agents: [
        { name: '', persona: '' },
        { name: '', persona: '' },
        { name: '', persona: '' },
        { name: '', persona: '' },
        { name: '', persona: '' },
      ],
    } as FormValues,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value)
    },
  })

  return (
    <main className="page-wrap px-4 pb-10 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">DebateForge</p>
        <h1 className="display-title mb-4 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Forge the best answer through debate.
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Enter a question, pick 2–5 agents, set 2–8 rounds, and watch the
          arguments converge into a single synthesis.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void form.handleSubmit()
          }}
          className="grid gap-6"
        >
          <form.Field
            name="question"
            validators={{
              onChange: ({ value }) =>
                value.trim().length >= 15 ? undefined : 'Min 15 characters.',
            }}
          >
            {(field) => (
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-[var(--sea-ink)]">
                  What is your question or topic?
                </label>
                <textarea
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  rows={5}
                  placeholder="e.g. Should we adopt event sourcing for our next product?"
                  className="w-full resize-y rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm leading-6 text-[var(--sea-ink)] shadow-[0_1px_0_var(--inset-glint)_inset] outline-none focus:border-[rgba(50,143,151,0.45)]"
                />
                {field.state.meta.isTouched && field.state.meta.errors?.length ? (
                  <p className="m-0 text-sm font-semibold text-red-700 dark:text-red-300">
                    {field.state.meta.errors.join(', ')}
                  </p>
                ) : null}
              </div>
            )}
          </form.Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="numberOfAgents">
              {(field) => (
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-[var(--sea-ink)]">
                    Number of Agents
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={2}
                      max={5}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(+e.target.value)}
                      className="w-full"
                    />
                    <input
                      type="number"
                      min={2}
                      max={5}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(+e.target.value)}
                      className="w-20 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}
            </form.Field>

            <form.Field name="numberOfRounds">
              {(field) => (
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-[var(--sea-ink)]">
                    Number of Rounds
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={2}
                      max={8}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(+e.target.value)}
                      className="w-full"
                    />
                    <input
                      type="number"
                      min={2}
                      max={8}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(+e.target.value)}
                      className="w-20 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="customizePersonas">
            {(field) => (
              <label className="flex items-center gap-3 text-sm font-semibold text-[var(--sea-ink)]">
                <input
                  type="checkbox"
                  checked={field.state.value}
                  onChange={(e) => field.handleChange(e.target.checked)}
                  className="h-4 w-4"
                />
                Let me customize agent personas
              </label>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => ({
              customize: state.values.customizePersonas,
              count: state.values.numberOfAgents,
            })}
          >
            {({ customize, count }) =>
              customize ? (
                <section className="island-shell rounded-2xl p-4 sm:p-5">
                  <p className="island-kicker mb-3">Agent Personas</p>
                  <div className="grid gap-3">
                    {Array.from({ length: count }).map((_, idx) => (
                      <div key={idx} className="grid gap-2 sm:grid-cols-2">
                        <form.Field name={`agents[${idx}].name`}>
                          {(field) => (
                            <input
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              placeholder={`Agent ${idx + 1} name`}
                              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm"
                            />
                          )}
                        </form.Field>
                        <form.Field name={`agents[${idx}].persona`}>
                          {(field) => (
                            <input
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              placeholder="Persona (one sentence)"
                              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm"
                            />
                          )}
                        </form.Field>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null
            }
          </form.Subscribe>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-6 py-3 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)] disabled:opacity-60"
            >
              {mutation.isPending ? 'Starting…' : 'Start Debate'}
            </button>

            {mutation.isError ? (
              <p className="m-0 text-sm font-semibold text-red-700 dark:text-red-300">
                {(mutation.error as Error).message}
              </p>
            ) : null}
          </div>
        </form>
      </section>
    </main>
  )
}


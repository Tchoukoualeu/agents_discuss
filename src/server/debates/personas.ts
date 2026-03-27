import type { DebateAgent } from './schema'

const DEFAULT_PERSONAS: Array<Pick<DebateAgent, 'name' | 'persona' | 'color' | 'avatar'>> =
  [
    {
      name: 'The Analyst',
      persona:
        'Breaks problems into assumptions, evaluates evidence, and highlights uncertainty.',
      color: '#328f97',
      avatar: '🧠',
    },
    {
      name: 'The Skeptic',
      persona:
        'Challenges claims, probes edge cases, and points out hidden trade-offs.',
      color: '#2f6a4a',
      avatar: '🛡️',
    },
    {
      name: 'The Builder',
      persona:
        'Focuses on pragmatic implementation steps, constraints, and actionable plans.',
      color: '#4fb8b2',
      avatar: '🧰',
    },
    {
      name: 'The Storyteller',
      persona:
        'Frames ideas with clear examples, analogies, and audience-friendly explanations.',
      color: '#7a5cff',
      avatar: '🗣️',
    },
    {
      name: 'The Ethicist',
      persona:
        'Prioritizes safety, fairness, and broader impacts; flags potential harms and mitigations.',
      color: '#c26b2f',
      avatar: '⚖️',
    },
  ]

export function buildAgents(count: number, custom?: Array<{ name: string; persona: string }>) {
  const agentsBase = DEFAULT_PERSONAS.slice(0, count)
  return agentsBase.map((base, idx) => {
    const maybeCustom = custom?.[idx]
    return {
      id: `a${idx + 1}`,
      name: maybeCustom?.name?.trim() || base.name,
      persona: maybeCustom?.persona?.trim() || base.persona,
      color: base.color,
      avatar: base.avatar,
    }
  })
}


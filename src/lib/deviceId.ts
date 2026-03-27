import { nanoid } from 'nanoid'

const KEY = 'debateforge_device_id'

export function getDeviceId() {
  if (typeof window === 'undefined') return 'server'
  const existing = window.localStorage.getItem(KEY)
  if (existing) return existing
  const next = nanoid(12)
  window.localStorage.setItem(KEY, next)
  return next
}


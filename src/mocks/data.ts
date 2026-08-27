import type { Session } from '../api/types'

export const sessionsStore: Session[] = [
  {
    id: '1',
    title: 'Onboarding Kickoff',
    status: 'Scheduled',
    startsAt: '2026-09-02T10:00:00.000Z',
  },
  {
    id: '2',
    title: 'React Fundamentals Review',
    status: 'Completed',
    startsAt: '2026-08-10T14:00:00.000Z',
  },
  {
    id: '3',
    title: 'Legacy API Migration Sync',
    status: 'Cancelled',
    startsAt: '2026-08-15T09:00:00.000Z',
  },
]

let nextId = sessionsStore.length + 1

export function nextSessionId(): string {
  const id = String(nextId)
  nextId += 1
  return id
}

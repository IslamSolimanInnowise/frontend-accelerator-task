export const SESSION_STATUSES = ['Scheduled', 'Completed', 'Cancelled'] as const

export type SessionStatus = (typeof SESSION_STATUSES)[number]

export interface Session {
  id: string
  title: string
  status: SessionStatus
  startsAt: string
}

export interface CreateSessionInput {
  title: string
  startsAt: string
}

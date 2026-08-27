import { http, HttpResponse } from 'msw'
import type { CreateSessionInput, Session } from '../api/types'
import { nextSessionId, sessionsStore } from './data'

// Deliberate, documented inducible failure (Assumption A5): the list endpoint
// fails on the first call after each module load, then succeeds on every
// subsequent call, so the loading -> error -> retry -> success path is
// demonstrable without a real backend. This is expected behavior, not a bug.
let listFetchCount = 0

function isFutureDate(value: string): boolean {
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now()
}

export const handlers = [
  http.get('/api/sessions', () => {
    listFetchCount += 1
    if (listFetchCount === 1) {
      return HttpResponse.json(
        { message: 'Failed to load sessions. Please try again.' },
        { status: 500 },
      )
    }
    return HttpResponse.json(sessionsStore)
  }),

  http.post('/api/sessions', async ({ request }) => {
    const input = (await request.json()) as CreateSessionInput
    const title = input.title?.trim() ?? ''

    if (title.length < 3 || title.length > 80) {
      return HttpResponse.json(
        { message: 'Title must be between 3 and 80 characters.' },
        { status: 400 },
      )
    }

    if (!input.startsAt || !isFutureDate(input.startsAt)) {
      return HttpResponse.json(
        { message: 'Start date/time must be in the future.' },
        { status: 400 },
      )
    }

    const session: Session = {
      id: nextSessionId(),
      title,
      status: 'Scheduled',
      startsAt: input.startsAt,
    }
    sessionsStore.push(session)

    return HttpResponse.json(session, { status: 201 })
  }),
]

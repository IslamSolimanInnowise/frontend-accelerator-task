import type { CreateSessionInput, Session } from './types'

const SESSIONS_URL = '/api/sessions'

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string }
    if (body?.message) {
      return body.message
    }
  } catch {
    // response body was not JSON; fall through to the generic message
  }
  return `Request failed with status ${response.status}`
}

async function requestSessions(): Promise<Session[]> {
  const response = await fetch(SESSIONS_URL)
  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
  return (await response.json()) as Session[]
}

// Concurrent list loads share one in-flight request. React's <StrictMode>
// (src/main.tsx) double-invokes the mount effect in dev, which otherwise issues
// two identical requests for a single user-visible load; the first response
// then lands in an already-cancelled effect closure and is discarded, so only
// the second one reaches the UI. Sharing the request keeps one load attempt
// equal to one response — which is also what makes the mock boundary's
// inducible first-load failure (src/mocks/handlers.ts) observable in the
// browser. The entry is cleared once the request settles, so a retry always
// issues a fresh request.
let inFlightSessions: Promise<Session[]> | null = null

export function fetchSessions(): Promise<Session[]> {
  if (inFlightSessions) {
    return inFlightSessions
  }

  const request = requestSessions().finally(() => {
    if (inFlightSessions === request) {
      inFlightSessions = null
    }
  })
  inFlightSessions = request

  return request
}

export async function createSession(input: CreateSessionInput): Promise<Session> {
  const response = await fetch(SESSIONS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
  return (await response.json()) as Session
}

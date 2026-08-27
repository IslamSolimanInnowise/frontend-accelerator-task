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

export async function fetchSessions(): Promise<Session[]> {
  const response = await fetch(SESSIONS_URL)
  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
  return (await response.json()) as Session[]
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

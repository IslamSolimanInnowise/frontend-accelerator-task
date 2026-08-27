import type { Session } from '../../api/types'

interface SessionsListProps {
  sessions: Session[]
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatStartsAt(startsAt: string): string {
  return dateTimeFormatter.format(new Date(startsAt))
}

function SessionsList({ sessions }: SessionsListProps) {
  if (sessions.length === 0) {
    return <p className="sessions-empty">No sessions match the current filter.</p>
  }

  return (
    <ul className="sessions-list">
      {sessions.map((session) => (
        <li key={session.id} className="session-card">
          <h3>{session.title}</h3>
          <p className="session-status">{session.status}</p>
          <p className="session-time">{formatStartsAt(session.startsAt)}</p>
        </li>
      ))}
    </ul>
  )
}

export default SessionsList

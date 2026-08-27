import { useEffect, useState } from 'react'
import { fetchSessions } from '../../api/sessionsApi'
import type { Session } from '../../api/types'
import CreateSessionForm from './CreateSessionForm'
import SessionsList from './SessionsList'
import StatusFilter from './StatusFilter'
import type { StatusFilterValue } from './StatusFilter'

type LoadState = 'loading' | 'success' | 'error'

function SessionsWorkspace() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('All')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    fetchSessions()
      .then((data) => {
        if (cancelled) return
        setSessions(data)
        setLoadState('success')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load sessions.')
        setLoadState('error')
      })

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  function handleRetry() {
    setLoadState('loading')
    setErrorMessage(null)
    setReloadToken((token) => token + 1)
  }

  function handleCreated(session: Session) {
    setSessions((current) => [...current, session])
    setIsFormOpen(false)
  }

  const visibleSessions =
    statusFilter === 'All' ? sessions : sessions.filter((session) => session.status === statusFilter)

  return (
    <section className="sessions-workspace">
      <header className="sessions-workspace-header">
        <h1>Training Sessions</h1>
        <button type="button" onClick={() => setIsFormOpen((open) => !open)}>
          {isFormOpen ? 'Close' : 'New session'}
        </button>
      </header>

      {isFormOpen && <CreateSessionForm onCreated={handleCreated} onCancel={() => setIsFormOpen(false)} />}

      <StatusFilter value={statusFilter} onChange={setStatusFilter} />

      {loadState === 'loading' && <p role="status">Loading sessions…</p>}

      {loadState === 'error' && (
        <div role="alert" className="sessions-error">
          <p>{errorMessage}</p>
          <button type="button" onClick={handleRetry}>
            Retry
          </button>
        </div>
      )}

      {loadState === 'success' && <SessionsList sessions={visibleSessions} />}
    </section>
  )
}

export default SessionsWorkspace

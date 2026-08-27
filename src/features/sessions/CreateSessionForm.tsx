import { useState } from 'react'
import type { FormEvent } from 'react'
import { createSession } from '../../api/sessionsApi'
import type { Session } from '../../api/types'

interface CreateSessionFormProps {
  onCreated: (session: Session) => void
  onCancel: () => void
}

interface FieldErrors {
  title?: string
  startsAt?: string
}

function validateTitle(title: string): string | undefined {
  const trimmed = title.trim()
  if (trimmed.length < 3 || trimmed.length > 80) {
    return 'Title must be between 3 and 80 characters.'
  }
  return undefined
}

function validateStartsAt(startsAt: string): string | undefined {
  if (!startsAt) {
    return 'Date and time are required.'
  }
  const parsed = new Date(startsAt)
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
    return 'Date and time must be in the future.'
  }
  return undefined
}

function CreateSessionForm({ onCreated, onCancel }: CreateSessionFormProps) {
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const titleError = validateTitle(title)
    const startsAtError = validateStartsAt(startsAt)

    if (titleError || startsAtError) {
      setFieldErrors({ title: titleError, startsAt: startsAtError })
      return
    }

    setFieldErrors({})
    setSubmitError(null)
    setIsSubmitting(true)

    try {
      const created = await createSession({
        title: title.trim(),
        startsAt: new Date(startsAt).toISOString(),
      })
      onCreated(created)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create session.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="create-session-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="session-title">Title</label>
        <input
          id="session-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={isSubmitting}
        />
        {fieldErrors.title && <p role="alert">{fieldErrors.title}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="session-starts-at">Date and time</label>
        <input
          id="session-starts-at"
          type="datetime-local"
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
          disabled={isSubmitting}
        />
        {fieldErrors.startsAt && <p role="alert">{fieldErrors.startsAt}</p>}
      </div>

      {submitError && (
        <p role="alert" className="form-error">
          {submitError}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create session'}
        </button>
        <button type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export default CreateSessionForm

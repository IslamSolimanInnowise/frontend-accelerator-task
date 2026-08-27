import { SESSION_STATUSES } from '../../api/types'
import type { SessionStatus } from '../../api/types'

export type StatusFilterValue = SessionStatus | 'All'

interface StatusFilterProps {
  value: StatusFilterValue
  onChange: (value: StatusFilterValue) => void
}

function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="status-filter" role="group" aria-label="Filter sessions by status">
      <button
        type="button"
        className={value === 'All' ? 'active' : undefined}
        aria-pressed={value === 'All'}
        onClick={() => onChange('All')}
      >
        All
      </button>
      {SESSION_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          className={value === status ? 'active' : undefined}
          aria-pressed={value === status}
          onClick={() => onChange(status)}
        >
          {status}
        </button>
      ))}
    </div>
  )
}

export default StatusFilter

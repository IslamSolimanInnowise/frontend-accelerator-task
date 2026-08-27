import { StrictMode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import SessionsWorkspace from './SessionsWorkspace'

// Mirrors how src/main.tsx actually renders the app: React's <StrictMode>
// double-invokes the mount effect in dev, so the induced first-load failure
// (Assumption A5) must still be observable.
describe('SessionsWorkspace under StrictMode', () => {
  it('shows the induced load failure and recovers on retry despite the double-invoked mount effect', async () => {
    const user = userEvent.setup()
    render(
      <StrictMode>
        <SessionsWorkspace />
      </StrictMode>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load sessions/i)

    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Onboarding Kickoff')).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import SessionsWorkspace from './SessionsWorkspace'

describe('SessionsWorkspace', () => {
  it('loads sessions and filters them by status', async () => {
    const user = userEvent.setup()
    render(<SessionsWorkspace />)

    // The first list fetch is a deliberate induced failure (Assumption A5);
    // retry once to reach the loaded state.
    const retryButton = await screen.findByRole('button', { name: /retry/i })
    await user.click(retryButton)

    expect(await screen.findByText('Onboarding Kickoff')).toBeInTheDocument()
    expect(screen.getByText('React Fundamentals Review')).toBeInTheDocument()
    expect(screen.getByText('Legacy API Migration Sync')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Completed' }))

    expect(screen.getByText('React Fundamentals Review')).toBeInTheDocument()
    expect(screen.queryByText('Onboarding Kickoff')).not.toBeInTheDocument()
    expect(screen.queryByText('Legacy API Migration Sync')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'All' }))

    expect(screen.getByText('Onboarding Kickoff')).toBeInTheDocument()
    expect(screen.getByText('Legacy API Migration Sync')).toBeInTheDocument()
  })
})

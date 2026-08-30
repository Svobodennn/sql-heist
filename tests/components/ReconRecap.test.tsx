import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ReconRecap } from '@/features/game/components/ReconRecap'

afterEach(cleanup)

describe('<ReconRecap>', () => {
  it('keeps the advertised schema available from a compact disclosure', () => {
    render(
      <ReconRecap
        appName="Meridian Holdings"
        visibleSchema={[{ table: 'users', columns: ['id', 'username', 'is_admin'] }]}
      />,
    )

    const summary = screen.getByText(/Recon recap/i).closest('summary')
    expect(summary).not.toBeNull()
    fireEvent.click(summary!)

    expect(screen.getByText('users')).toBeTruthy()
    expect(screen.getByText('username')).toBeTruthy()
    expect(screen.getByText('is_admin')).toBeTruthy()
  })
})

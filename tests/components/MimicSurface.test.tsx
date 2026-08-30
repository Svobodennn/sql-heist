import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CASES } from '@/features/game/cases'
import { MimicSurface, mimicUrl } from '@/features/game/components/MimicSurface'

afterEach(cleanup)

describe('<MimicSurface>', () => {
  it('maps every case to a distinct HTTPS target host', () => {
    expect(mimicUrl('the-front-door', 'Meridian Holdings', 'login-form')).toBe(
      'https://portal.meridian-holdings.com/staff/login',
    )
    expect(mimicUrl('the-quiet-room', 'Meridian Recovery & Security', 'url-param')).toBe(
      'https://recovery.meridian-security.com/requests/verify?token=',
    )
    expect(mimicUrl('the-vault', 'Meridian Vault Control', 'profile-lookup')).toBe(
      'https://access.meridian-vault.com/badges/profile',
    )
  })

  it('keeps the engine-facing field ids while applying the case presentation', () => {
    const gameCase = CASES[0]
    const objective = gameCase.objectives[0]
    const values = Object.fromEntries(objective.fields.map((field) => [field.name, '']))

    const view = render(
      <MimicSurface
        caseId={gameCase.id}
        surface={objective.surface}
        appName={gameCase.target.appName}
        fields={objective.fields}
        values={values}
        interactive
      />,
    )

    expect(view.container.querySelector('form')?.getAttribute('data-target')).toBe('holdings')
    expect(view.container.querySelector('#field-username')).not.toBeNull()
    expect(view.container.querySelector('#field-password')).not.toBeNull()
    expect(screen.getByText('portal.meridian-holdings.com')).toBeTruthy()
  })
})

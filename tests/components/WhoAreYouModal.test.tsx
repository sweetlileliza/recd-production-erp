// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WhoAreYouModal } from '../../src/components/WhoAreYouModal'
import type { TeamMember } from '../../src/types'

describe('<WhoAreYouModal />', () => {
  const mockTeamMembers: TeamMember[] = [
    {
      id: 'tm-1',
      name: 'Alice Wonder',
      discordHandle: '@alicew',
      specialty: 'Keyframe',
      isArtist: true,
      isVoiceActor: false,
      role: 'crew',
      updatedAt: '2026-01-01',
    },
    {
      id: 'tm-2',
      name: 'Bob Builder',
      discordHandle: '@bobvoice',
      specialty: 'Voice',
      isArtist: false,
      isVoiceActor: true,
      role: 'crew',
      updatedAt: '2026-01-01',
    },
  ]

  it('renders Avan, Tom and crew member list', () => {
    render(
      <WhoAreYouModal
        teamMembers={mockTeamMembers}
        onSelectUser={vi.fn()}
        onVerifyProducer={vi.fn()}
        onVerifyDirector={vi.fn()}
        onAddNewMember={vi.fn()}
      />
    )

    expect(screen.getByText('Avan')).toBeInTheDocument()
    expect(screen.getByText('Tom')).toBeInTheDocument()
    expect(screen.getByText('Alice Wonder')).toBeInTheDocument()
    expect(screen.getByText('Bob Builder')).toBeInTheDocument()
  })

  it('verifies producer passcode and logs in as Avan on success', async () => {
    const handleSelectUser = vi.fn()
    const handleVerifyProducer = vi.fn().mockResolvedValue(true)

    render(
      <WhoAreYouModal
        teamMembers={mockTeamMembers}
        onSelectUser={handleSelectUser}
        onVerifyProducer={handleVerifyProducer}
        onVerifyDirector={vi.fn()}
        onAddNewMember={vi.fn()}
      />
    )

    // Click Avan
    fireEvent.click(screen.getByText('Avan'))

    const passInput = screen.getByPlaceholderText(/Enter producer passcode\.\.\./i)
    fireEvent.change(passInput, { target: { value: 'secret123' } })

    const unlockBtn = screen.getByRole('button', { name: /Unlock Avan/i })
    fireEvent.click(unlockBtn)

    await waitFor(() => {
      expect(handleVerifyProducer).toHaveBeenCalledWith('secret123')
      expect(handleSelectUser).toHaveBeenCalledWith({
        role: 'producer',
        name: 'Avan',
      })
    })
  })

  it('shows error message if passcode is invalid', async () => {
    const handleSelectUser = vi.fn()
    const handleVerifyDirector = vi.fn().mockResolvedValue(false)

    render(
      <WhoAreYouModal
        teamMembers={mockTeamMembers}
        onSelectUser={handleSelectUser}
        onVerifyProducer={vi.fn()}
        onVerifyDirector={handleVerifyDirector}
        onAddNewMember={vi.fn()}
      />
    )

    // Click Tom
    fireEvent.click(screen.getByText('Tom'))

    const passInput = screen.getByPlaceholderText(/Enter director passcode\.\.\./i)
    fireEvent.change(passInput, { target: { value: 'wrongpass' } })

    const unlockBtn = screen.getByRole('button', { name: /Unlock Tom/i })
    fireEvent.click(unlockBtn)

    await waitFor(() => {
      expect(screen.getByText(/Incorrect passcode\. Try again\./i)).toBeInTheDocument()
      expect(handleSelectUser).not.toHaveBeenCalled()
    })
  })

  it('filters crew members with search input and selects member on click', () => {
    const handleSelectUser = vi.fn()

    render(
      <WhoAreYouModal
        teamMembers={mockTeamMembers}
        onSelectUser={handleSelectUser}
        onVerifyProducer={vi.fn()}
        onVerifyDirector={vi.fn()}
        onAddNewMember={vi.fn()}
      />
    )

    const searchInput = screen.getByPlaceholderText(/Filter crew members\.\.\./i)
    fireEvent.change(searchInput, { target: { value: 'Alice' } })

    expect(screen.getByText('Alice Wonder')).toBeInTheDocument()
    expect(screen.queryByText('Bob Builder')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Alice Wonder'))

    expect(handleSelectUser).toHaveBeenCalledWith({
      role: 'team_member',
      name: 'Alice Wonder',
      isArtist: true,
      isVoiceActor: false,
      teamMemberId: 'tm-1',
    })
  })

  it('closes on Escape key when onClose is provided', () => {
    const handleClose = vi.fn()

    render(
      <WhoAreYouModal
        teamMembers={mockTeamMembers}
        onSelectUser={vi.fn()}
        onVerifyProducer={vi.fn()}
        onVerifyDirector={vi.fn()}
        onAddNewMember={vi.fn()}
        onClose={handleClose}
      />
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalled()
  })
})

// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VoiceCastingTab } from '../../src/components/VoiceCastingTab'
import type { Project, VoiceRole } from '../../src/types'

describe('<VoiceCastingTab />', () => {
  const mockRoles: VoiceRole[] = [
    {
      id: 'vc-1',
      characterName: 'Captain Hook',
      voiceActor: 'John Smith',
      status: 'pending',
      notes: 'Deep pirate voice needed',
      auditionLink: '',
      linesLink: '',
      updatedAt: '2026-01-01',
    },
  ]

  const mockProject: Project = {
    id: 'proj-1',
    title: 'Neverland Adventure',
    director: 'Tom',
    resolution: '1920x1080',
    status: 'active',
    createdAt: '',
    updatedAt: '',
    initialSetup: {} as any,
    shots: [],
    voiceCasting: mockRoles,
    postProduction: {} as any,
  }

  it('renders existing voice roles', () => {
    render(
      <VoiceCastingTab
        project={mockProject}
        onUpdateVoiceCasting={vi.fn()}
        currentRole="director"
        canEdit={true}
        availableVoiceActors={['John Smith', 'Mary Jane']}
      />
    )

    expect(screen.getByDisplayValue('Captain Hook')).toBeInTheDocument()
    expect(screen.getByDisplayValue('John Smith')).toBeInTheDocument()
    expect(screen.getByText(/Pending/i)).toBeInTheDocument()
  })

  it('cycles voice actor status on click', () => {
    render(
      <VoiceCastingTab
        project={mockProject}
        onUpdateVoiceCasting={vi.fn()}
        currentRole="director"
        canEdit={true}
      />
    )

    const cycleButton = screen.getByTitle('Click to cycle status')
    expect(screen.getByText(/Pending/i)).toBeInTheDocument()

    // pending -> auditioned
    fireEvent.click(cycleButton)
    expect(cycleButton).toHaveTextContent('Auditioned')

    // auditioned -> cast
    fireEvent.click(cycleButton)
    expect(cycleButton).toHaveTextContent('Cast')
  })

  it('adds a new voice role when Add Role is clicked', () => {
    render(
      <VoiceCastingTab
        project={mockProject}
        onUpdateVoiceCasting={vi.fn()}
        currentRole="director"
        canEdit={true}
      />
    )

    const addBtn = screen.getByRole('button', { name: /Add Role/i })
    fireEvent.click(addBtn)

    const characterInputs = screen.getAllByPlaceholderText(/e\.g\. Baba Chops/i)
    expect(characterInputs.length).toBe(2)
  })

  it('calls onUpdateVoiceCasting when Save Cast button is clicked', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined)

    render(
      <VoiceCastingTab
        project={mockProject}
        onUpdateVoiceCasting={handleSave}
        currentRole="director"
        canEdit={true}
      />
    )

    const nameInput = screen.getByDisplayValue('Captain Hook')
    fireEvent.change(nameInput, { target: { value: 'Captain Hook (Updated)' } })

    const saveBtn = screen.getByRole('button', { name: /Save Cast/i })
    fireEvent.click(saveBtn)

    expect(handleSave).toHaveBeenCalledTimes(1)
    const savedRoles = handleSave.mock.calls[0][0]
    expect(savedRoles[0].characterName).toBe('Captain Hook (Updated)')
  })
})

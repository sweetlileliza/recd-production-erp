// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InitialSetupTab } from '../../src/components/InitialSetupTab'
import type { Project, InitialSetup } from '../../src/types'

describe('<InitialSetupTab />', () => {
  const mockInitialSetup: InitialSetup = {
    storyPitch: { title: 'Story Pitch', status: 'not_started', notes: 'Initial pitch draft', link: 'https://docs.google.com/pitch', updatedAt: '2026-01-01' },
    melodyStyle: { title: 'Melody Style', status: 'not_started', notes: '', link: '', updatedAt: '2026-01-01' },
    writing: { title: 'Writing / Lyrics', status: 'in_progress', notes: 'Rhymes completed', link: '', updatedAt: '2026-01-01' },
    pianodemo: { title: 'Piano Demo', status: 'not_started', notes: '', link: '', updatedAt: '2026-01-01' },
    scratchTrack: { title: 'Scratch Track', status: 'not_started', notes: '', link: '', updatedAt: '2026-01-01' },
  }

  const mockProject: Project = {
    id: 'proj-1',
    title: 'Test Production',
    director: 'Tom',
    resolution: '3840x2160',
    status: 'active',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-02',
    initialSetup: mockInitialSetup,
    shots: [],
    voiceCasting: [],
    postProduction: {} as any,
  }

  it('renders all 5 initial setup stages', () => {
    render(
      <InitialSetupTab
        project={mockProject}
        onUpdateSetup={vi.fn()}
        currentRole="director"
      />
    )

    expect(screen.getByText('1. Story Pitch')).toBeInTheDocument()
    expect(screen.getByText('2. Melody Style & Reference')).toBeInTheDocument()
    expect(screen.getByText('3. Writing / Lyrics Script')).toBeInTheDocument()
    expect(screen.getByText('4. Piano Demo')).toBeInTheDocument()
    expect(screen.getByText('5. Scratch Track')).toBeInTheDocument()
  })

  it('displays existing notes and link values in form fields', () => {
    render(
      <InitialSetupTab
        project={mockProject}
        onUpdateSetup={vi.fn()}
        currentRole="director"
      />
    )

    expect(screen.getByDisplayValue('Initial pitch draft')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://docs.google.com/pitch')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Rhymes completed')).toBeInTheDocument()
  })

  it('updates textarea and calls onUpdateSetup when Save Setup Changes is clicked', async () => {
    const handleUpdateSetup = vi.fn().mockResolvedValue(undefined)

    render(
      <InitialSetupTab
        project={mockProject}
        onUpdateSetup={handleUpdateSetup}
        currentRole="director"
      />
    )

    // Edit notes for story pitch
    const pitchTextarea = screen.getByDisplayValue('Initial pitch draft')
    fireEvent.change(pitchTextarea, { target: { value: 'Updated pitch notes for team' } })

    const saveButton = screen.getByRole('button', { name: /Save Setup Changes/i })
    fireEvent.click(saveButton)

    expect(handleUpdateSetup).toHaveBeenCalledTimes(1)
    const calledWith = handleUpdateSetup.mock.calls[0][0]
    expect(calledWith.storyPitch.notes).toBe('Updated pitch notes for team')
  })
})

// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ArtTrackerTab } from '../../src/components/ArtTrackerTab'
import type { Project } from '../../src/types'

describe('<ArtTrackerTab />', () => {
  const mockProject: Project = {
    id: 'proj-1',
    title: 'Test Song Project',
    director: 'Avan',
    resolution: '1920x1080',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    initialSetup: {} as any,
    postProduction: {} as any,
    shots: [
      {
        id: 'shot-1',
        shotNumber: 1,
        sceneIntro: 'Normal Shot Intro',
        isAnimated: false,
        assignedArtist: 'Alice',
        customPrice: 0,
        updatedAt: '2026-01-01T00:00:00.000Z',
        panels: [
          {
            id: 'p-1',
            panelLetter: 'A',
            panelCode: '1A',
            type: 'COMPLEX BASE',
            price: 36,
            scriptSegment: 'Hello world lyric',
            directionNotes: 'Hero looks forward',
            status: 'Not Started',
            sketchOk: false,
            driveLink: '',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      {
        id: 'shot-2',
        shotNumber: 2,
        sceneIntro: 'Animation Shot Intro',
        isAnimated: true,
        assignedArtist: 'Bob',
        customPrice: 150,
        updatedAt: '2026-01-01T00:00:00.000Z',
        panels: [
          {
            id: 'p-2',
            panelLetter: 'A',
            panelCode: '2A',
            type: 'ANIMATED',
            price: 0,
            scriptSegment: 'Animated dance segment',
            directionNotes: 'Smooth 24fps character spin',
            status: 'Rough sketch WIP',
            sketchOk: true,
            driveLink: '',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    ],
  }

  it('renders normal shots with cycle status button and panel details', () => {
    const handleUpdatePanel = vi.fn()
    const handleUpdateShot = vi.fn()

    render(
      <ArtTrackerTab
        project={mockProject}
        onUpdateShot={handleUpdateShot}
        onUpdatePanel={handleUpdatePanel}
        onBulkAssign={vi.fn()}
        availableArtists={[{ name: 'Alice', email: 'alice@example.com' }]}
        currentRole="director"
        activeArtistName="Alice"
        canAssign={true}
      />
    )

    // Panel 1A details should be present
    expect(screen.getByText('1A')).toBeInTheDocument()
    expect(screen.getByText(/“Hello world lyric”/i)).toBeInTheDocument()
    expect(screen.getByText('Hero looks forward')).toBeInTheDocument()
    expect(screen.getByText('COMPLEX BASE')).toBeInTheDocument()
    expect(screen.getByText('$36')).toBeInTheDocument()

    // Normal shot status should be a cycle button
    const cycleBtn = screen.getByRole('button', { name: 'Not Started' })
    expect(cycleBtn).toBeInTheDocument()
    fireEvent.click(cycleBtn)
    expect(handleUpdatePanel).toHaveBeenCalledWith('shot-1', 'p-1', { status: 'Sketched' })
  })

  it('renders animation shots with panel, script, direction notes, Type as animation, and status as a text box', () => {
    const handleUpdatePanel = vi.fn()
    const handleUpdateShot = vi.fn()

    render(
      <ArtTrackerTab
        project={mockProject}
        onUpdateShot={handleUpdateShot}
        onUpdatePanel={handleUpdatePanel}
        onBulkAssign={vi.fn()}
        availableArtists={[{ name: 'Bob', email: 'bob@example.com' }]}
        currentRole="director"
        activeArtistName="Bob"
        canAssign={true}
      />
    )

    // Panel 2A details should be present
    expect(screen.getByText('2A')).toBeInTheDocument()
    expect(screen.getByText(/“Animated dance segment”/i)).toBeInTheDocument()
    expect(screen.getByText('Smooth 24fps character spin')).toBeInTheDocument()

    // Type should be ANIMATION
    expect(screen.getByText('ANIMATION')).toBeInTheDocument()

    // Status should be a text box (input), not a cycle button
    const statusInput = screen.getByDisplayValue('Rough sketch WIP')
    expect(statusInput).toBeInTheDocument()
    expect(statusInput.tagName.toLowerCase()).toBe('input')

    // Editing status text box updates panel and shot
    fireEvent.change(statusInput, { target: { value: 'In-betweening finished' } })
    fireEvent.blur(statusInput)

    expect(handleUpdatePanel).toHaveBeenCalledWith('shot-2', 'p-2', { status: 'In-betweening finished' })
    expect(handleUpdateShot).toHaveBeenCalledWith('shot-2', { latestAnimationUpdate: 'In-betweening finished' })
  })

  it('shows open link button when animation status is a URL', () => {
    const projectWithUrl: Project = {
      ...mockProject,
      shots: [
        {
          ...mockProject.shots[1],
          panels: [
            {
              ...mockProject.shots[1].panels[0],
              status: 'https://discord.com/channels/123/456',
            },
          ],
        },
      ],
    }

    render(
      <ArtTrackerTab
        project={projectWithUrl}
        onUpdateShot={vi.fn()}
        onUpdatePanel={vi.fn()}
        onBulkAssign={vi.fn()}
        availableArtists={[]}
        currentRole="director"
        activeArtistName="Bob"
        canAssign={true}
      />
    )

    const link = screen.getByTitle('Open link in new tab')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://discord.com/channels/123/456')
  })
})

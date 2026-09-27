// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectOverview } from '../../src/components/ProjectOverview'
import type { Project } from '../../src/types'

describe('<ProjectOverview />', () => {
  const mockProjects: Project[] = [
    {
      id: 'proj-1',
      title: 'Zelda Musical Ep 1',
      director: 'Tom',
      resolution: '3840x2160',
      status: 'active',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-02',
      initialSetup: {} as any,
      shots: [
        {
          id: 's-1',
          shotNumber: 1,
          sceneIntro: '',
          isAnimated: false,
          assignedArtist: 'Artist 1',
          updatedAt: '',
          panels: [
            { id: 'p-1', panelLetter: 'A', panelCode: '1A', type: 'COMPLEX BASE', price: 36, scriptSegment: '', directionNotes: '', status: 'Completed', sketchOk: true, driveLink: '', updatedAt: '' },
            { id: 'p-2', panelLetter: 'B', panelCode: '1B', type: 'SIMPLE BASE', price: 18, scriptSegment: '', directionNotes: '', status: 'Not Started', sketchOk: false, driveLink: '', updatedAt: '' },
          ],
        },
      ],
      voiceCasting: [],
      postProduction: { audioFinalMix: {} as any, videoFinalMix: {} as any, isReleased: false },
    },
    {
      id: 'proj-2',
      title: 'Mario Musical Ep 2',
      director: 'Sarah',
      resolution: '1920x1080',
      status: 'released',
      createdAt: '2026-01-03',
      updatedAt: '2026-01-04',
      initialSetup: {} as any,
      shots: [],
      voiceCasting: [],
      postProduction: { audioFinalMix: {} as any, videoFinalMix: {} as any, isReleased: true },
    },
  ]

  it('renders studio overview header and metrics', () => {
    render(
      <ProjectOverview
        projects={mockProjects}
        onSelectProject={vi.fn()}
        onOpenNewProject={vi.fn()}
        onDeleteProject={vi.fn()}
        currentRole="producer"
      />
    )

    expect(screen.getByText('Studio Overview')).toBeInTheDocument()
    expect(screen.getByText('PRODUCER')).toBeInTheDocument()
    // 1 active, (1 done)
    expect(screen.getByText('(1 done)')).toBeInTheDocument()
    // Budget $54 (36 + 18)
    expect(screen.getAllByText('$54').length).toBeGreaterThan(0)
  })

  it('renders project cards with title and director', () => {
    render(
      <ProjectOverview
        projects={mockProjects}
        onSelectProject={vi.fn()}
        onOpenNewProject={vi.fn()}
        onDeleteProject={vi.fn()}
        currentRole="producer"
      />
    )

    expect(screen.getByText('Zelda Musical Ep 1')).toBeInTheDocument()
    expect(screen.getByText('Mario Musical Ep 2')).toBeInTheDocument()
    expect(screen.getByText(/Dir: Tom/i)).toBeInTheDocument()
    expect(screen.getByText(/Dir: Sarah/i)).toBeInTheDocument()
  })

  it('calls onSelectProject when a project card is clicked', () => {
    const handleSelect = vi.fn()

    render(
      <ProjectOverview
        projects={mockProjects}
        onSelectProject={handleSelect}
        onOpenNewProject={vi.fn()}
        onDeleteProject={vi.fn()}
        currentRole="director"
      />
    )

    const card = screen.getByText('Zelda Musical Ep 1')
    fireEvent.click(card)

    expect(handleSelect).toHaveBeenCalledWith(mockProjects[0])
  })

  it('calls onDeleteProject when delete icon is clicked', () => {
    const handleDelete = vi.fn()

    render(
      <ProjectOverview
        projects={mockProjects}
        onSelectProject={vi.fn()}
        onOpenNewProject={vi.fn()}
        onDeleteProject={handleDelete}
        currentRole="producer"
      />
    )

    const deleteButtons = screen.getAllByTitle('Delete Project (Admin)')
    expect(deleteButtons.length).toBeGreaterThan(0)
    fireEvent.click(deleteButtons[0])

    expect(handleDelete).toHaveBeenCalledWith('proj-1', expect.anything())
  })

  it('renders + New Project button for producer role and triggers onOpenNewProject', () => {
    const handleNew = vi.fn()

    render(
      <ProjectOverview
        projects={mockProjects}
        onSelectProject={vi.fn()}
        onOpenNewProject={handleNew}
        onDeleteProject={vi.fn()}
        currentRole="producer"
      />
    )

    const newBtn = screen.getByRole('button', { name: /\+ New Project/i })
    fireEvent.click(newBtn)

    expect(handleNew).toHaveBeenCalled()
  })
})

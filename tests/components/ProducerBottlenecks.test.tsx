// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProducerBottlenecks } from '../../src/components/ProducerBottlenecks'
import type { Project, BottleneckItem } from '../../src/types'

describe('<ProducerBottlenecks />', () => {
  const mockBottlenecks: BottleneckItem[] = [
    {
      id: 'btnk-1',
      projectId: 'proj-1',
      projectTitle: 'Zelda Ep 1',
      type: 'unassigned_shot',
      severity: 'high',
      responsibleParty: 'Director / Producer',
      title: 'Shot 2 is Unassigned',
      details: 'Shot contains 2 panels ($54). Needs assignment.',
      lastUpdated: '2026-01-01',
      daysInactive: 10,
    },
    {
      id: 'btnk-2',
      projectId: 'proj-1',
      projectTitle: 'Zelda Ep 1',
      type: 'artist_lagging',
      severity: 'medium',
      responsibleParty: 'Artist (Alice)',
      title: 'Shot 1 Inactivity',
      details: '1 panel remaining. Inactive for 4 days.',
      lastUpdated: '2026-01-02',
      daysInactive: 4,
    },
  ]

  const mockProjects: Project[] = [
    {
      id: 'proj-1',
      title: 'Zelda Ep 1',
      director: 'Tom',
      resolution: '3840x2160',
      status: 'active',
      createdAt: '',
      updatedAt: '',
      initialSetup: {} as any,
      shots: [
        {
          id: 's-1',
          shotNumber: 1,
          assignedArtist: 'Alice',
          isAnimated: false,
          updatedAt: '',
          sceneIntro: '',
          panels: [
            { id: 'p1', panelLetter: 'A', panelCode: '1A', type: 'COMPLEX BASE', price: 36, status: 'Completed', sketchOk: true, driveLink: '', scriptSegment: '', directionNotes: '', updatedAt: '' },
          ],
        },
      ],
      voiceCasting: [],
      postProduction: {} as any,
    },
  ]

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          count: mockBottlenecks.length,
          highSeverityCount: 1,
          bottlenecks: mockBottlenecks,
        }),
      })
    )
  })

  it('fetches and displays bottleneck items from API', async () => {
    render(
      <ProducerBottlenecks
        onClose={vi.fn()}
        onSelectProject={vi.fn()}
        projects={mockProjects}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Shot 2 is Unassigned')).toBeInTheDocument()
      expect(screen.getByText('Shot 1 Inactivity')).toBeInTheDocument()
    })
  })

  it('calculates artist payouts breakdown correctly', async () => {
    render(
      <ProducerBottlenecks
        onClose={vi.fn()}
        onSelectProject={vi.fn()}
        projects={mockProjects}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('$36')).toBeInTheDocument()
    })
  })

  it('filters bottlenecks when filter buttons are clicked', async () => {
    render(
      <ProducerBottlenecks
        onClose={vi.fn()}
        onSelectProject={vi.fn()}
        projects={mockProjects}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Shot 2 is Unassigned')).toBeInTheDocument()
    })

    // Filter to only ARTIST
    const artistFilterBtn = screen.getByRole('button', { name: /Artist Lag/i })
    fireEvent.click(artistFilterBtn)

    expect(screen.getByText('Shot 1 Inactivity')).toBeInTheDocument()
    expect(screen.queryByText('Shot 2 is Unassigned')).not.toBeInTheDocument()
  })

  it('selects project and closes modal when Jump button is clicked', async () => {
    const handleSelectProject = vi.fn()
    const handleClose = vi.fn()

    render(
      <ProducerBottlenecks
        onClose={handleClose}
        onSelectProject={handleSelectProject}
        projects={mockProjects}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Shot 2 is Unassigned')).toBeInTheDocument()
    })

    const jumpButtons = screen.getAllByRole('button', { name: /Jump/i })
    fireEvent.click(jumpButtons[0])

    expect(handleSelectProject).toHaveBeenCalledWith(mockProjects[0])
    expect(handleClose).toHaveBeenCalled()
  })

  it('closes on Escape key press', () => {
    const handleClose = vi.fn()

    render(
      <ProducerBottlenecks
        onClose={handleClose}
        onSelectProject={vi.fn()}
        projects={mockProjects}
      />
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalled()
  })
})

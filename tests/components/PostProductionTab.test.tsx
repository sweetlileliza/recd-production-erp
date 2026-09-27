// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PostProductionTab } from '../../src/components/PostProductionTab'
import type { Project, PostProduction } from '../../src/types'

describe('<PostProductionTab />', () => {
  const mockPostProduction: PostProduction = {
    audioFinalMix: { completed: false, notes: '', link: '', updatedAt: '' },
    videoFinalMix: { completed: false, notes: '', link: '', updatedAt: '' },
    isReleased: false,
    releasedAt: '',
    releaseUrl: '',
  }

  const mockProject: Project = {
    id: 'proj-1',
    title: 'Epic Finale Short',
    director: 'Tom',
    resolution: '3840x2160',
    status: 'active',
    createdAt: '',
    updatedAt: '',
    initialSetup: {} as any,
    shots: [],
    voiceCasting: [],
    postProduction: mockPostProduction,
  }

  it('renders Audio Final Mix and Video Final Mix controls', () => {
    render(
      <PostProductionTab
        project={mockProject}
        onUpdatePostProduction={vi.fn()}
        currentRole="director"
        canEdit={true}
      />
    )

    expect(screen.getByRole('heading', { name: /Audio Final Mix/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Video Final Mix/i })).toBeInTheDocument()
    expect(screen.getByText(/Post-Production & Final Master Mix/i)).toBeInTheDocument()
  })

  it('calls onUpdatePostProduction when save button is clicked', async () => {
    const handleUpdate = vi.fn().mockResolvedValue(undefined)

    render(
      <PostProductionTab
        project={mockProject}
        onUpdatePostProduction={handleUpdate}
        currentRole="director"
        canEdit={true}
      />
    )

    const saveButton = screen.getByRole('button', { name: /Save Links/i })
    fireEvent.click(saveButton)

    expect(handleUpdate).toHaveBeenCalledWith(mockPostProduction)
  })

  it('renders released banner and allows reopen when project is released', () => {
    const releasedProject: Project = {
      ...mockProject,
      status: 'released',
      postProduction: {
        ...mockPostProduction,
        isReleased: true,
        releasedAt: '2026-06-01T12:00:00Z',
        releaseUrl: 'https://youtube.com/watch?v=abc',
      },
    }

    const handleUpdate = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <PostProductionTab
        project={releasedProject}
        onUpdatePostProduction={handleUpdate}
        currentRole="director"
        canEdit={true}
      />
    )

    expect(screen.getByText('RELEASED')).toBeInTheDocument()
    expect(screen.getByText(/Watch Video/i)).toBeInTheDocument()

    const reopenBtn = screen.getByRole('button', { name: /Reopen/i })
    fireEvent.click(reopenBtn)

    expect(handleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        isReleased: false,
      })
    )
  })
})

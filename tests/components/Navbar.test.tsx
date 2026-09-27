// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Navbar } from '../../src/components/Navbar'
import type { Project, CurrentUser } from '../../src/types'

describe('<Navbar />', () => {
  const mockProjects: Project[] = [
    {
      id: 'proj-1',
      title: 'Episode 1: The Beginning',
      director: 'Tom',
      resolution: '1920x1080',
      status: 'active',
      createdAt: '',
      updatedAt: '',
      initialSetup: {} as any,
      shots: [],
      voiceCasting: [],
      postProduction: {} as any,
    },
    {
      id: 'proj-2',
      title: 'Episode 2: The Finale',
      director: 'Sarah',
      resolution: '1920x1080',
      status: 'released',
      createdAt: '',
      updatedAt: '',
      initialSetup: {} as any,
      shots: [],
      voiceCasting: [],
      postProduction: {} as any,
    },
  ]

  const mockUser: CurrentUser = {
    role: 'producer',
    name: 'Avan',
  }

  it('renders branding title and logo', () => {
    render(
      <Navbar
        projects={mockProjects}
        activeProject={null}
        onSelectProject={vi.fn()}
        currentUser={mockUser}
        onOpenWhoAreYou={vi.fn()}
        onOpenTeamRoster={vi.fn()}
        onOpenNewProject={vi.fn()}
        onOpenBottlenecks={vi.fn()}
        onOpenDiscordBot={vi.fn()}
        bottleneckCount={3}
      />
    )

    expect(screen.getByText(/Video Tracker/i)).toBeInTheDocument()
    expect(screen.getByText('ERP')).toBeInTheDocument()
  })

  it('displays user role badge and name', () => {
    render(
      <Navbar
        projects={mockProjects}
        activeProject={null}
        onSelectProject={vi.fn()}
        currentUser={mockUser}
        onOpenWhoAreYou={vi.fn()}
        onOpenTeamRoster={vi.fn()}
        onOpenNewProject={vi.fn()}
        onOpenBottlenecks={vi.fn()}
        onOpenDiscordBot={vi.fn()}
        bottleneckCount={0}
      />
    )

    expect(screen.getByText(/Avan/i)).toBeInTheDocument()
    expect(screen.getByText(/Producer/i)).toBeInTheDocument()
  })

  it('switches projects when project dropdown changes', () => {
    const handleSelectProject = vi.fn()

    render(
      <Navbar
        projects={mockProjects}
        activeProject={null}
        onSelectProject={handleSelectProject}
        currentUser={mockUser}
        onOpenWhoAreYou={vi.fn()}
        onOpenTeamRoster={vi.fn()}
        onOpenNewProject={vi.fn()}
        onOpenBottlenecks={vi.fn()}
        onOpenDiscordBot={vi.fn()}
        bottleneckCount={0}
      />
    )

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'proj-1' } })

    expect(handleSelectProject).toHaveBeenCalledWith(mockProjects[0])
  })

  it('triggers action callbacks when toolbar buttons are clicked', () => {
    const handleOpenNewProject = vi.fn()
    const handleOpenBottlenecks = vi.fn()
    const handleOpenTeamRoster = vi.fn()
    const handleOpenDiscordBot = vi.fn()
    const handleOpenWhoAreYou = vi.fn()

    render(
      <Navbar
        projects={mockProjects}
        activeProject={null}
        onSelectProject={vi.fn()}
        currentUser={mockUser}
        onOpenWhoAreYou={handleOpenWhoAreYou}
        onOpenTeamRoster={handleOpenTeamRoster}
        onOpenNewProject={handleOpenNewProject}
        onOpenBottlenecks={handleOpenBottlenecks}
        onOpenDiscordBot={handleOpenDiscordBot}
        bottleneckCount={5}
      />
    )

    // New Project button
    const newProjButton = screen.getByText('New Project')
    fireEvent.click(newProjButton)
    expect(handleOpenNewProject).toHaveBeenCalled()

    // Bottlenecks button (shows badge with count 5)
    const bottlenecksButton = screen.getByTitle('Studio Bottlenecks & Inactivity Alerts')
    expect(screen.getByText('5')).toBeInTheDocument()
    fireEvent.click(bottlenecksButton)
    expect(handleOpenBottlenecks).toHaveBeenCalled()

    // Team Roster button
    const teamButton = screen.getByTitle('Manage artists and voice actors roster')
    fireEvent.click(teamButton)
    expect(handleOpenTeamRoster).toHaveBeenCalled()

    // Discord Bot button
    const discordButton = screen.getByTitle('Discord Live Webhook Sync')
    fireEvent.click(discordButton)
    expect(handleOpenDiscordBot).toHaveBeenCalled()

    // Who Are You user trigger
    const userButton = screen.getByTitle('Click to switch user identity')
    fireEvent.click(userButton)
    expect(handleOpenWhoAreYou).toHaveBeenCalled()
  })
})

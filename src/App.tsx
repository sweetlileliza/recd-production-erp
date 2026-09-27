import { useState, useEffect } from 'react'
import {
  FileCode,
  LayoutGrid,
  Headphones,
  Sliders,
  ChevronLeft,
  DollarSign,
  Palette,
} from 'lucide-react'
import type {
  Project,
  Shot,
  Panel,
  InitialSetup,
  VoiceRole,
  PostProduction,
  TeamMember,
  CurrentUser,
} from './types'
import { Navbar } from './components/Navbar'
import { ProjectOverview } from './components/ProjectOverview'
import { PreProductionAndScriptTab } from './components/PreProductionAndScriptTab'
import { ArtTrackerTab } from './components/ArtTrackerTab'
import { VoiceCastingTab } from './components/VoiceCastingTab'
import { PostProductionTab } from './components/PostProductionTab'
import { ProducerBottlenecks } from './components/ProducerBottlenecks'
import { DiscordBotModal } from './components/DiscordBotModal'
import { NewProjectModal } from './components/NewProjectModal'
import { WhoAreYouModal } from './components/WhoAreYouModal'
import { TeamRosterModal } from './components/TeamRosterModal'

type TabKey = 'script' | 'tracker' | 'voice' | 'post'

export function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('tracker')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  // User Identity State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    try {
      const saved = localStorage.getItem('recd_studio_current_user')
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error('Failed to parse saved user:', e)
    }
    return null
  })

  // Modals
  const [showWhoAreYou, setShowWhoAreYou] = useState<boolean>(false)
  const [showTeamRoster, setShowTeamRoster] = useState<boolean>(false)
  const [showNewProjectModal, setShowNewProjectModal] = useState<boolean>(false)
  const [showBottlenecksModal, setShowBottlenecksModal] = useState<boolean>(false)
  const [showDiscordBotModal, setShowDiscordBotModal] = useState<boolean>(false)
  const [bottleneckCount, setBottleneckCount] = useState<number>(0)

  // Fetch all projects, team members, bottlenecks from backend
  const loadData = async () => {
    try {
      const [projRes, teamRes, btnkRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/team'),
        fetch('/api/bottlenecks'),
      ])

      if (projRes.ok) {
        const projData = await projRes.json()
        setProjects(projData)

        setActiveProject((currentActive) => {
          if (!currentActive) return null
          const fresh = projData.find((p: Project) => p.id === currentActive.id)
          return fresh || currentActive
        })
      }

      if (teamRes.ok) {
        const teamData = await teamRes.json()
        setTeamMembers(teamData)
      }

      if (btnkRes.ok) {
        const btnkData = await btnkRes.json()
        setBottleneckCount(btnkData.highSeverityCount || btnkData.count || 0)
      }
    } catch (err) {
      console.error('Failed to load studio data:', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // If no user identity is set, prompt "Who are you?" on initial mount
  useEffect(() => {
    if (!currentUser) {
      setShowWhoAreYou(true)
    }
  }, [currentUser])

  // Handle user identity selection
  const handleSelectUser = (user: CurrentUser) => {
    setCurrentUser(user)
    try {
      localStorage.setItem('recd_studio_current_user', JSON.stringify(user))
    } catch (e) {
      console.error('Failed to save user in storage:', e)
    }
    setShowWhoAreYou(false)

    // Set intelligent default tab based on role
    if (user.role === 'team_member') {
      if (user.isArtist) {
        setActiveTab('tracker')
      } else if (user.isVoiceActor) {
        setActiveTab('voice')
      }
    } else {
      setActiveTab('tracker')
    }
  }

  // Passcode verification for Avan (Producer)
  const handleVerifyProducer = async (passcode: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      })
      return res.ok
    } catch (err) {
      console.error('Producer passcode check failed:', err)
      return false
    }
  }

  // Passcode verification for Tom (Director)
  const handleVerifyDirector = async (passcode: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/director/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      })
      return res.ok
    } catch (err) {
      console.error('Director passcode check failed:', err)
      return false
    }
  }

  // Team Member Management (Roster)
  const handleAddTeamMember = async (member: Partial<TeamMember>): Promise<TeamMember | null> => {
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      })
      if (res.ok) {
        const created = await res.json()
        await loadData()
        return created
      }
    } catch (err) {
      console.error('Error adding team member:', err)
    }
    return null
  }

  const handleUpdateTeamMember = async (id: string, updates: Partial<TeamMember>) => {
    try {
      const res = await fetch(`/api/team/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        await loadData()
      }
    } catch (err) {
      console.error('Error updating team member:', err)
    }
  }

  const handleDeleteTeamMember = async (id: string) => {
    try {
      const res = await fetch(`/api/team/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await loadData()
      }
    } catch (err) {
      console.error('Error deleting team member:', err)
    }
  }

  // Project Creation
  const handleCreateProject = async (data: any) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const newProj = await res.json()
        await loadData()
        setActiveProject(newProj)
        setActiveTab('script')
      }
    } catch (err) {
      console.error('Error creating project:', err)
    }
  }

  // Project Deletion
  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Delete this project permanently from RECD Studios?')) return
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (res.ok) {
        if (activeProject?.id === id) setActiveProject(null)
        await loadData()
      }
    } catch (err) {
      console.error('Error deleting project:', err)
    }
  }

  // Pre-production Setup Update
  const handleUpdateSetup = async (initialSetup: InitialSetup) => {
    if (!activeProject) return

    setActiveProject((prev) => (prev ? { ...prev, initialSetup } : null))
    setProjects((prevProjects) =>
      prevProjects.map((p) => (p.id === activeProject.id ? { ...p, initialSetup } : p))
    )

    try {
      const res = await fetch(`/api/projects/${activeProject.id}/initial-setup`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialSetup }),
      })
      if (res.ok) {
        const result = await res.json()
        if (result) {
          setActiveProject((prev) => (prev ? { ...prev, initialSetup: result } : null))
        }
      }
    } catch (err) {
      console.error('Error updating initial setup:', err)
    }
  }

  // Save Shots from Script Maker
  const handleSaveShots = async (shots: Shot[]) => {
    if (!activeProject) return
    setActiveProject((prev) => (prev ? { ...prev, shots } : null))
    setProjects((prevProjects) =>
      prevProjects.map((p) => (p.id === activeProject.id ? { ...p, shots } : p))
    )

    try {
      const res = await fetch(`/api/projects/${activeProject.id}/shots`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shots }),
      })
      if (res.ok) {
        await loadData()
      }
    } catch (err) {
      console.error('Error saving shots:', err)
    }
  }

  // Update Single Shot
  const handleUpdateShot = async (shotId: string, updates: Partial<Shot>) => {
    if (!activeProject) return

    // 1. Optimistically update activeProject immediately
    setActiveProject((prev) => {
      if (!prev) return null
      const updatedShots = prev.shots?.map((s) => (s.id === shotId ? { ...s, ...updates } : s))
      return { ...prev, shots: updatedShots }
    })

    // 2. Optimistically update projects list immediately
    setProjects((prevProjects) =>
      prevProjects.map((p) => {
        if (p.id !== activeProject.id) return p
        const updatedShots = p.shots?.map((s) => (s.id === shotId ? { ...s, ...updates } : s))
        return { ...p, shots: updatedShots }
      })
    )

    try {
      const res = await fetch(`/api/projects/${activeProject.id}/shots/${shotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const updatedShot = await res.json()
        setActiveProject((prev) => {
          if (!prev) return null
          const updatedShots = prev.shots?.map((s) => (s.id === shotId ? { ...s, ...updatedShot } : s))
          return { ...prev, shots: updatedShots }
        })
        setProjects((prevProjects) =>
          prevProjects.map((p) => {
            if (p.id !== activeProject.id) return p
            const updatedShots = p.shots?.map((s) => (s.id === shotId ? { ...s, ...updatedShot } : s))
            return { ...p, shots: updatedShots }
          })
        )
      }
    } catch (err) {
      console.error('Error updating shot:', err)
    }
  }

  // Update Single Panel
  const handleUpdatePanel = async (shotId: string, panelId: string, updates: Partial<Panel>) => {
    if (!activeProject) return

    // 1. Optimistically update activeProject immediately
    setActiveProject((prev) => {
      if (!prev) return null
      const updatedShots = prev.shots?.map((s) => {
        if (s.id !== shotId) return s
        const updatedPanels = s.panels?.map((p) => (p.id === panelId ? { ...p, ...updates } : p))
        return { ...s, panels: updatedPanels }
      })
      return { ...prev, shots: updatedShots }
    })

    // 2. Optimistically update projects list immediately
    setProjects((prevProjects) =>
      prevProjects.map((p) => {
        if (p.id !== activeProject.id) return p
        const updatedShots = p.shots?.map((s) => {
          if (s.id !== shotId) return s
          const updatedPanels = s.panels?.map((panel) => (panel.id === panelId ? { ...panel, ...updates } : panel))
          return { ...s, panels: updatedPanels }
        })
        return { ...p, shots: updatedShots }
      })
    )

    try {
      const res = await fetch(`/api/projects/${activeProject.id}/shots/${shotId}/panels/${panelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.panel) {
          setActiveProject((prev) => {
            if (!prev) return null
            const updatedShots = prev.shots?.map((s) => {
              if (s.id !== shotId) return s
              const updatedPanels = s.panels?.map((p) => (p.id === panelId ? { ...p, ...data.panel } : p))
              return { ...s, panels: updatedPanels }
            })
            return { ...prev, shots: updatedShots }
          })
          setProjects((prevProjects) =>
            prevProjects.map((p) => {
              if (p.id !== activeProject.id) return p
              const updatedShots = p.shots?.map((s) => {
                if (s.id !== shotId) return s
                const updatedPanels = s.panels?.map((panel) => (panel.id === panelId ? { ...panel, ...data.panel } : panel))
                return { ...s, panels: updatedPanels }
              })
              return { ...p, shots: updatedShots }
            })
          )
        }
      }
    } catch (err) {
      console.error('Error updating panel:', err)
    }
  }

  // Artist Opt In
  const handleArtistOptIn = async (shotId: string, artistName: string) => {
    if (!activeProject) return

    setActiveProject((prev) => {
      if (!prev) return null
      const updatedShots = prev.shots?.map((s) => {
        if (s.id !== shotId) return s
        const currentOptIns = s.artistOptIns || []
        const nextOptIns = currentOptIns.includes(artistName)
          ? currentOptIns.filter((n) => n !== artistName)
          : [...currentOptIns, artistName]
        return { ...s, artistOptIns: nextOptIns }
      })
      return { ...prev, shots: updatedShots }
    })

    try {
      const res = await fetch(`/api/projects/${activeProject.id}/shots/${shotId}/opt-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistName }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.artistOptIns) {
          setActiveProject((prev) => {
            if (!prev) return null
            const updatedShots = prev.shots?.map((s) =>
              s.id === shotId ? { ...s, artistOptIns: data.artistOptIns } : s
            )
            return { ...prev, shots: updatedShots }
          })
        }
      }
    } catch (err) {
      console.error('Error opting in:', err)
    }
  }

  // Bulk Assign shots to an artist
  const handleBulkAssign = async (shotIds: string[], artistName: string, deadline?: string) => {
    if (!activeProject) return

    setActiveProject((prev) => {
      if (!prev) return null
      const updatedShots = prev.shots?.map((s) => {
        if (!shotIds.includes(s.id)) return s
        const updatedPanels = s.panels?.map((p) => ({ ...p, artist: artistName }))
        return {
          ...s,
          assignedArtist: artistName,
          ...(deadline ? { deadline } : {}),
          panels: updatedPanels,
        }
      })
      return { ...prev, shots: updatedShots }
    })

    setProjects((prevProjects) =>
      prevProjects.map((p) => {
        if (p.id !== activeProject.id) return p
        const updatedShots = p.shots?.map((s) => {
          if (!shotIds.includes(s.id)) return s
          const updatedPanels = s.panels?.map((panel) => ({ ...panel, artist: artistName }))
          return {
            ...s,
            assignedArtist: artistName,
            ...(deadline ? { deadline } : {}),
            panels: updatedPanels,
          }
        })
        return { ...p, shots: updatedShots }
      })
    )

    try {
      const res = await fetch(`/api/projects/${activeProject.id}/shots/bulk-assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotIds, artistName, deadline }),
      })
      if (res.ok) {
        // Background refresh without blocking active UI
        fetch('/api/projects')
          .then((r) => r.json())
          .then((projs) => setProjects(projs))
          .catch(() => {})
      }
    } catch (err) {
      console.error('Error bulk assigning:', err)
    }
  }

  // Bulk Set Drive Folders for shots
  const handleBulkSetFolders = async (payload: { baseFolderUrl?: string; folderMappings?: Record<string, string> }) => {
    if (!activeProject) return
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/shots/bulk-folders`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        await loadData()
      }
    } catch (err) {
      console.error('Error bulk setting shot folders:', err)
    }
  }

  // Update Project metadata (e.g., refDocUrl)
  const handleUpdateProject = async (updates: Partial<Project>) => {
    if (!activeProject) return

    setActiveProject((prev) => (prev ? { ...prev, ...updates } : null))
    setProjects((prevProjects) =>
      prevProjects.map((p) => (p.id === activeProject.id ? { ...p, ...updates } : p))
    )

    try {
      const res = await fetch(`/api/projects/${activeProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const updated = await res.json()
        setActiveProject((prev) => (prev ? { ...prev, ...updated } : null))
        setProjects((prevProjects) =>
          prevProjects.map((p) => (p.id === activeProject.id ? { ...p, ...updated } : p))
        )
      }
    } catch (err) {
      console.error('Error updating project:', err)
    }
  }

  // Save Artist Preferences (max shots, 1st-5th ranked choices, avoid list)
  const handleSaveArtistPreferences = async (preference: {
    artistName: string
    maxShots: number
    preferredShots: number[]
    avoidShots: number[]
    notes?: string
  }) => {
    if (!activeProject) return
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/artist-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preference),
      })
      if (res.ok) {
        await loadData()
      }
    } catch (err) {
      console.error('Error saving artist preferences:', err)
    }
  }

  // Voice Casting Update
  const handleUpdateVoiceCasting = async (voiceCasting: VoiceRole[]) => {
    if (!activeProject) return
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/voice-casting`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceCasting }),
      })
      if (res.ok) {
        await loadData()
      }
    } catch (err) {
      console.error('Error updating voice casting:', err)
    }
  }

  // Post Production Update
  const handleUpdatePostProduction = async (updates: Partial<PostProduction> & { isReleased?: boolean }) => {
    if (!activeProject) return
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/post-production`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        await loadData()
      }
    } catch (err) {
      console.error('Error updating post-production:', err)
    }
  }

  // Active role strings & capabilities
  const currentRole = currentUser?.role || 'team_member'
  const isAvan = currentUser?.role === 'producer'
  const isTom = currentUser?.role === 'director'
  const isArtist = Boolean(currentUser?.isArtist)
  const isVoiceActor = Boolean(currentUser?.isVoiceActor)
  const isBoth = isArtist && isVoiceActor
  const activeUserName = currentUser?.name || 'Guest'

  const canEditScript = isAvan || isTom
  const canAssignArtists = isAvan || isTom

  // Derived lists for dropdowns / autocomplete
  const availableArtists = teamMembers
    .filter((m) => m.isArtist)
    .map((m) => ({ name: m.name, email: m.email || '', specialty: m.specialty }))

  const availableVoiceActors = teamMembers
    .filter((m) => m.isVoiceActor)
    .map((m) => m.name)

  // Compute artist statistics for active artist in active project
  let artistAssignedShots = 0
  let artistAssignedPanels = 0
  let artistCompletedPanels = 0
  let artistTotalEarnings = 0

  if (activeProject && isArtist) {
    activeProject.shots?.forEach((s) => {
      if (s.assignedArtist?.toLowerCase() === activeUserName.toLowerCase()) {
        artistAssignedShots++
        if (s.isAnimated && s.customPrice) artistTotalEarnings += Number(s.customPrice) || 0
        s.panels?.forEach((p) => {
          artistAssignedPanels++
          artistTotalEarnings += Number(p.price) || 0
          if (p.status === 'Completed') artistCompletedPanels++
        })
      }
    })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Universal Discord-Dark Studio Header */}
      <Navbar
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(proj) => {
          setActiveProject(proj)
          if (proj) {
            setActiveTab(isArtist ? 'tracker' : isVoiceActor ? 'voice' : 'tracker')
          }
        }}
        currentUser={currentUser}
        onOpenWhoAreYou={() => setShowWhoAreYou(true)}
        onOpenTeamRoster={() => setShowTeamRoster(true)}
        onOpenNewProject={() => setShowNewProjectModal(true)}
        onOpenBottlenecks={() => setShowBottlenecksModal(true)}
        onOpenDiscordBot={() => setShowDiscordBotModal(true)}
        bottleneckCount={bottleneckCount}
      />

      {/* Main Workspace Area (Tighter padding & compact layout) */}
      <main style={{ flex: 1, paddingBottom: '24px' }}>
        {!activeProject ? (
          /* Dashboard View */
          <ProjectOverview
            projects={projects}
            onSelectProject={(proj) => {
              setActiveProject(proj)
              setActiveTab(isArtist ? 'tracker' : isVoiceActor ? 'voice' : 'tracker')
            }}
            onOpenNewProject={() => setShowNewProjectModal(true)}
            onDeleteProject={handleDeleteProject}
            currentRole={isAvan ? 'producer' : isTom ? 'director' : 'crew'}
          />
        ) : (
          /* Project Workspace */
          <div>
            {/* Project Subheader & Navigation (Compact height: 36px) */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-medium)',
                position: 'sticky',
                top: '42px',
                zIndex: 80,
              }}
            >
              <div
                style={{
                  maxWidth: '1240px',
                  margin: '0 auto',
                  padding: '5px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                {/* Left: Back to Projects, Title & Director */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setActiveProject(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      color: 'var(--text-dim)',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      padding: '2px 5px',
                      borderRadius: 'var(--radius-xs)',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <ChevronLeft size={12} /> Projects
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-header)' }}>
                      {activeProject.title}
                    </span>
                    {activeProject.status === 'released' && (
                      <span className="badge badge-green" style={{ fontSize: '9px' }}>
                        Released
                      </span>
                    )}
                    <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                      &bull; Dir: <strong style={{ color: 'var(--text-muted)' }}>{activeProject.director}</strong>
                    </span>
                  </div>
                </div>

                {/* Right: 4 Compact Combined Tabs */}
                <nav style={{ display: 'flex', gap: '3px' }}>
                  <button
                    onClick={() => setActiveTab('script')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      background: activeTab === 'script' ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                      color: activeTab === 'script' ? '#fff' : 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                      height: '24px',
                    }}
                  >
                    <FileCode size={11} />
                    <span>Pre-Production & Script</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('tracker')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      background: activeTab === 'tracker' ? 'var(--color-green)' : 'var(--bg-tertiary)',
                      color: activeTab === 'tracker' ? '#fff' : 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                      height: '24px',
                    }}
                  >
                    <LayoutGrid size={11} />
                    <span>Art Tracker</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('voice')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      background: activeTab === 'voice' ? 'var(--color-cyan)' : 'var(--bg-tertiary)',
                      color: activeTab === 'voice' ? '#fff' : 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                      height: '24px',
                    }}
                  >
                    <Headphones size={11} />
                    <span>Voice Casting</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('post')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      background: activeTab === 'post' ? 'var(--color-yellow)' : 'var(--bg-tertiary)',
                      color: activeTab === 'post' ? '#000' : 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                      height: '24px',
                    }}
                  >
                    <Sliders size={11} />
                    <span>Post-Production</span>
                  </button>
                </nav>
              </div>

              {/* Personalized Quick Bar if user is an Artist */}
              {isArtist && (
                <div
                  style={{
                    background: 'var(--color-purple-soft)',
                    borderTop: '1px solid rgba(155, 89, 182, 0.25)',
                    padding: '4px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '10.5px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Palette size={12} color="var(--color-purple)" />
                    <span>
                      Artist Workspace: <strong style={{ color: 'var(--text-header)' }}>{activeUserName}</strong>
                    </span>
                    <span style={{ color: 'var(--text-dim)' }}>
                      &bull; Assigned: {artistAssignedShots} shots ({artistCompletedPanels}/{artistAssignedPanels} panels completed)
                    </span>
                    {isBoth && (
                      <span className="badge badge-amber" style={{ fontSize: '9px', marginLeft: '4px' }}>
                        Dual-Role (Also Voice Actor)
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <DollarSign size={11} color="var(--color-green)" />
                    <span>Shot Payout Total:</span>
                    <strong style={{ color: 'var(--color-green)' }}>${artistTotalEarnings}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Active Tab Workspace Container (Tighter padding: 10px 14px) */}
            <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '10px 14px' }}>
              {activeTab === 'script' && (
                <PreProductionAndScriptTab
                  project={activeProject}
                  onUpdateSetup={handleUpdateSetup}
                  onSaveShots={handleSaveShots}
                  currentRole={currentRole}
                  canEdit={canEditScript}
                />
              )}

              {activeTab === 'tracker' && (
                <ArtTrackerTab
                  project={activeProject}
                  onUpdateShot={handleUpdateShot}
                  onUpdatePanel={handleUpdatePanel}
                  onArtistOptIn={handleArtistOptIn}
                  onBulkAssign={handleBulkAssign}
                  onBulkSetFolders={handleBulkSetFolders}
                  onUpdateProject={handleUpdateProject}
                  onSaveArtistPreferences={handleSaveArtistPreferences}
                  availableArtists={availableArtists}
                  currentRole={currentRole}
                  isArtist={isArtist}
                  activeArtistName={activeUserName}
                  canAssign={canAssignArtists}
                />
              )}

              {activeTab === 'voice' && (
                <VoiceCastingTab
                  project={activeProject}
                  onUpdateVoiceCasting={handleUpdateVoiceCasting}
                  currentRole={currentRole}
                  canEdit={canEditScript}
                  availableVoiceActors={availableVoiceActors}
                  activeActorName={activeUserName}
                />
              )}

              {activeTab === 'post' && (
                <PostProductionTab
                  project={activeProject}
                  onUpdatePostProduction={handleUpdatePostProduction}
                  currentRole={currentRole}
                  canEdit={canEditScript}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* "Who Are You?" Modal (Initial gate or Identity Switcher) */}
      {showWhoAreYou && (
        <WhoAreYouModal
          teamMembers={teamMembers}
          onSelectUser={handleSelectUser}
          onVerifyProducer={handleVerifyProducer}
          onVerifyDirector={handleVerifyDirector}
          onAddNewMember={handleAddTeamMember}
          onClose={() => setShowWhoAreYou(false)}
        />
      )}

      {/* Avan Producer: Team Roster & Crew Management Interface */}
      {showTeamRoster && (
        <TeamRosterModal
          onClose={() => setShowTeamRoster(false)}
          teamMembers={teamMembers}
          onAddMember={handleAddTeamMember}
          onUpdateMember={handleUpdateTeamMember}
          onDeleteMember={handleDeleteTeamMember}
        />
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onCreate={handleCreateProject}
        />
      )}

      {/* Bottlenecks Modal */}
      {showBottlenecksModal && (
        <ProducerBottlenecks
          onClose={() => setShowBottlenecksModal(false)}
          onSelectProject={(proj) => {
            setActiveProject(proj)
            setActiveTab('tracker')
          }}
          projects={projects}
        />
      )}

      {/* Discord Bot Feed Modal */}
      {showDiscordBotModal && (
        <DiscordBotModal onClose={() => setShowDiscordBotModal(false)} />
      )}
    </div>
  )
}

export default App

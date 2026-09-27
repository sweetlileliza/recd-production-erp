import { AlertTriangle, Bot, Plus, Users, ChevronDown } from 'lucide-react'
import type { Project, CurrentUser } from '../types'

interface NavbarProps {
  projects: Project[]
  activeProject: Project | null
  onSelectProject: (proj: Project | null) => void
  currentUser: CurrentUser | null
  onOpenWhoAreYou: () => void
  onOpenTeamRoster: () => void
  onOpenNewProject: () => void
  onOpenBottlenecks: () => void
  onOpenDiscordBot: () => void
  bottleneckCount: number
}

export const Navbar = ({
  projects,
  activeProject,
  onSelectProject,
  currentUser,
  onOpenWhoAreYou,
  onOpenTeamRoster,
  onOpenNewProject,
  onOpenBottlenecks,
  onOpenDiscordBot,
  bottleneckCount,
}: NavbarProps) => {
  const isProducer = currentUser?.role === 'producer'
  const isDirector = currentUser?.role === 'director'
  const isBoth = currentUser?.isArtist && currentUser?.isVoiceActor

  return (
    <header
      style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 14px',
        height: '42px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Brand & Project Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          onClick={() => onSelectProject(null)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          title="Return to Video Tracker ERP Dashboard"
        >
          <img
            src="/recd-logo.png"
            alt="RECD Logo"
            style={{ width: '24px', height: '24px', objectFit: 'contain' }}
          />
          <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.3px', color: 'var(--text-header)' }}>
            Video Tracker <span style={{ color: 'var(--color-primary)' }}>ERP</span>
          </span>
        </div>

        {/* Compact Project Switcher */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <select
            value={activeProject ? activeProject.id : ''}
            onChange={(e) => {
              const found = projects.find((p) => p.id === e.target.value)
              onSelectProject(found || null)
            }}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-main)',
              padding: '3px 22px 3px 8px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '11px',
              fontWeight: 600,
              appearance: 'none',
              cursor: 'pointer',
              height: '26px',
              maxWidth: '190px',
            }}
          >
            <option value="">All Projects Overview</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} {p.status === 'released' ? '✓' : ''}
              </option>
            ))}
          </select>
          <ChevronDown
            size={11}
            style={{ position: 'absolute', right: '6px', pointerEvents: 'none', color: 'var(--text-dim)' }}
          />
        </div>
      </div>

      {/* Center: Current User Identity Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          onClick={onOpenWhoAreYou}
          title="Click to switch user identity"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-tertiary)',
            padding: '2px 8px 2px 4px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-medium)',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-medium)'
          }}
        >
          {/* Avatar Dot */}
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: 'var(--radius-full)',
              background: isProducer
                ? 'var(--color-yellow)'
                : isDirector
                ? 'var(--color-primary)'
                : isBoth
                ? 'linear-gradient(135deg, #c084fc, #00a8fc)'
                : currentUser?.isArtist
                ? 'var(--color-purple)'
                : 'var(--color-cyan)',
              color: isProducer ? '#000' : '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 800,
              position: 'relative',
            }}
          >
            {currentUser?.name ? currentUser.name.slice(0, 1).toUpperCase() : '?'}
            <span
              style={{
                position: 'absolute',
                bottom: '-1px',
                right: '-1px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--color-green)',
                border: '1px solid var(--bg-tertiary)',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-header)' }}>
              {currentUser?.name || 'Guest'}
            </span>

            {isProducer && (
              <span className="badge badge-amber" style={{ fontSize: '9px' }}>
                Producer
              </span>
            )}
            {isDirector && (
              <span className="badge badge-blue" style={{ fontSize: '9px' }}>
                Showrunner & Dir
              </span>
            )}
            {currentUser?.role === 'team_member' && (
              <span
                className="badge"
                style={{
                  fontSize: '9px',
                  background: isBoth
                    ? 'rgba(192, 132, 252, 0.2)'
                    : currentUser.isArtist
                    ? 'var(--color-purple-soft)'
                    : 'var(--color-cyan-soft)',
                  color: isBoth ? '#e2e8f0' : currentUser.isArtist ? '#c084fc' : '#00a8fc',
                }}
              >
                {isBoth ? 'Artist & Voice' : currentUser.isArtist ? 'Artist' : 'Voice'}
              </span>
            )}
          </div>

          <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginLeft: '4px' }}>
            (Switch)
          </span>
        </div>

        {/* If Avan (Producer), show Manage Roster button */}
        {isProducer && (
          <button
            onClick={onOpenTeamRoster}
            title="Manage artists and voice actors roster"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: 'var(--radius-xs)',
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--color-yellow)',
              fontSize: '11px',
              fontWeight: 600,
              height: '26px',
            }}
          >
            <Users size={12} />
            <span>Studio Roster</span>
          </button>
        )}
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Producer can create new project */}
        {isProducer && (
          <button
            onClick={onOpenNewProject}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '3px 8px',
              borderRadius: 'var(--radius-xs)',
              background: 'var(--color-primary)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 600,
              height: '26px',
            }}
          >
            <Plus size={12} />
            <span>New Project</span>
          </button>
        )}

        {/* Bottlenecks Button */}
        <button
          onClick={onOpenBottlenecks}
          title="Studio Bottlenecks & Inactivity Alerts"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border-subtle)',
            background: bottleneckCount > 0 ? 'var(--color-red-soft)' : 'var(--bg-tertiary)',
            color: bottleneckCount > 0 ? 'var(--color-red)' : 'var(--text-muted)',
            fontSize: '11px',
            fontWeight: 600,
            height: '26px',
          }}
        >
          <AlertTriangle size={12} />
          <span>Bottlenecks</span>
          {bottleneckCount > 0 && (
            <span
              style={{
                background: 'var(--color-red)',
                color: '#fff',
                borderRadius: 'var(--radius-full)',
                padding: '0 4px',
                fontSize: '9px',
                fontWeight: 800,
              }}
            >
              {bottleneckCount}
            </span>
          )}
        </button>

        {/* Discord Bot Config */}
        <button
          onClick={onOpenDiscordBot}
          title="Discord Live Webhook Sync"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: 'var(--radius-xs)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            fontSize: '11px',
            fontWeight: 600,
            height: '26px',
          }}
        >
          <Bot size={12} color="var(--color-primary)" />
          <span>Bot Sync</span>
        </button>
      </div>
    </header>
  )
}

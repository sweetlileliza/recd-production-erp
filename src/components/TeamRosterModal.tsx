import { useState, useEffect } from 'react'
import { X, Users, UserPlus, Palette, Mic, Trash2, Check, Search, ShieldCheck } from 'lucide-react'
import type { TeamMember } from '../types'

interface TeamRosterModalProps {
  onClose: () => void
  teamMembers: TeamMember[]
  onAddMember: (member: Partial<TeamMember>) => Promise<TeamMember | null>
  onUpdateMember: (id: string, updates: Partial<TeamMember>) => Promise<void>
  onDeleteMember: (id: string) => Promise<void>
}

export const TeamRosterModal = ({
  onClose,
  teamMembers,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
}: TeamRosterModalProps) => {
  const [filterRole, setFilterRole] = useState<'all' | 'artists' | 'voice' | 'both'>('all')
  const [search, setSearch] = useState('')

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Add new member form states
  const [name, setName] = useState('')
  const [isArtist, setIsArtist] = useState(true)
  const [isVoiceActor, setIsVoiceActor] = useState(false)
  const [email, setEmail] = useState('')
  const [discordHandle, setDiscordHandle] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setIsSaving(true)
    const success = await onAddMember({
      name: name.trim(),
      isArtist,
      isVoiceActor,
      email: email.trim(),
      discordHandle: discordHandle.trim(),
    })
    setIsSaving(false)
    if (success) {
      setName('')
      setEmail('')
      setDiscordHandle('')
      setIsArtist(true)
      setIsVoiceActor(false)
    }
  }

  const filtered = teamMembers.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.discordHandle?.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false
    if (filterRole === 'artists') return m.isArtist
    if (filterRole === 'voice') return m.isVoiceActor
    if (filterRole === 'both') return m.isArtist && m.isVoiceActor
    return true
  })

  const totalMembers = teamMembers.length
  const totalArtists = teamMembers.filter((m) => m.isArtist).length
  const totalVoiceActors = teamMembers.filter((m) => m.isVoiceActor).length
  const totalBoth = teamMembers.filter((m) => m.isArtist && m.isVoiceActor).length

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{
          maxWidth: '780px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          padding: 0,
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: 'var(--bg-tertiary)',
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="var(--color-yellow)" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-header)' }}>
                  Studio Crew & Cast Management
                </span>
                <span className="badge badge-amber" style={{ fontSize: '9.5px' }}>
                  <ShieldCheck size={10} /> Avan (Producer)
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-dim)', padding: '4px', borderRadius: 'var(--radius-xs)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick Stats Bar */}
        <div
          style={{
            background: 'var(--bg-primary)',
            padding: '8px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '11px',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>
            Total Roster: <strong style={{ color: 'var(--text-header)' }}>{totalMembers}</strong>
          </span>
          <span style={{ color: 'var(--border-subtle)' }}>|</span>
          <span style={{ color: 'var(--color-purple)' }}>
            Artists: <strong>{totalArtists}</strong>
          </span>
          <span style={{ color: 'var(--border-subtle)' }}>|</span>
          <span style={{ color: 'var(--color-cyan)' }}>
            Voice Actors: <strong>{totalVoiceActors}</strong>
          </span>
          <span style={{ color: 'var(--border-subtle)' }}>|</span>
          <span style={{ color: '#e2e8f0' }}>
            Both Artist & Voice: <strong>{totalBoth}</strong>
          </span>
        </div>

        <div style={{ padding: '14px 18px', maxHeight: '72vh', overflowY: 'auto' }}>
          {/* Add New Crew Member Section */}
          <div
            style={{
              background: 'var(--bg-tertiary)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-medium)',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <UserPlus size={14} color="var(--color-primary)" />
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-header)' }}>
                Add New Artist or Voice Actor
              </span>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '2px' }}>Full Name *</div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. avan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', height: '26px' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '2px' }}>Discord Tag</div>
                  <input
                    type="text"
                    placeholder="e.g. @sam_recd"
                    value={discordHandle}
                    onChange={(e) => setDiscordHandle(e.target.value)}
                    style={{ width: '100%', height: '26px' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '2px' }}>Email (Optional)</div>
                  <input
                    type="email"
                    placeholder="sam@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', height: '26px' }}
                  />
                </div>
              </div>

              {/* Roles selection checkboxes (can check both!) */}
              <div
                style={{
                  background: 'var(--bg-primary)',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-header)' }}>
                    Capabilities:
                  </span>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      color: isArtist ? '#c084fc' : 'var(--text-muted)',
                      fontWeight: isArtist ? 700 : 500,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isArtist}
                      onChange={(e) => setIsArtist(e.target.checked)}
                    />
                    <Palette size={12} />
                    <span>Artist (Storyboard, Lineart, Color)</span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      color: isVoiceActor ? '#00a8fc' : 'var(--text-muted)',
                      fontWeight: isVoiceActor ? 700 : 500,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isVoiceActor}
                      onChange={(e) => setIsVoiceActor(e.target.checked)}
                    />
                    <Mic size={12} />
                    <span>Voice Actor (Singing, Character Dialogue)</span>
                  </label>
                </div>

                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                  {isArtist && isVoiceActor ? (
                    <strong style={{ color: 'var(--color-yellow)' }}>✓ Dual-Role Individual (Both)</strong>
                  ) : (
                    <span>Single-role</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="submit"
                  disabled={isSaving || !name.trim() || (!isArtist && !isVoiceActor)}
                  style={{
                    background: 'var(--color-primary)',
                    color: '#fff',
                    padding: '0 14px',
                    height: '26px',
                    borderRadius: 'var(--radius-xs)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Check size={11} />
                  <span>{isSaving ? 'Adding...' : 'Add to Roster'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Roster Table Filter & Search Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['all', 'artists', 'voice', 'both'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterRole(tab)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    background: filterRole === tab ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                    color: filterRole === tab ? '#fff' : 'var(--text-dim)',
                    border: '1px solid var(--border-subtle)',
                    textTransform: 'capitalize',
                  }}
                >
                  {tab === 'both' ? 'Both Roles' : tab}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '220px' }}>
              <Search
                size={11}
                style={{ position: 'absolute', left: '7px', top: '7px', color: 'var(--text-dim)' }}
              />
              <input
                type="text"
                placeholder="Search roster..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', height: '25px', paddingLeft: '24px', fontSize: '10.5px' }}
              />
            </div>
          </div>

          {/* Roster Members Table */}
          <div
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--bg-primary)',
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--text-dim)',
                    textAlign: 'left',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '6px 10px' }}>Member & Discord</th>
                  <th style={{ padding: '6px 10px' }}>Roles (Toggleable)</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const isBoth = m.isArtist && m.isVoiceActor
                  return (
                    <tr
                      key={m.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: 'var(--bg-secondary)',
                      }}
                    >
                      <td style={{ padding: '6px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ color: 'var(--text-header)' }}>{m.name}</strong>
                          {m.discordHandle && (
                            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                              {m.discordHandle}
                            </span>
                          )}
                        </div>
                        {m.email && (
                          <div style={{ fontSize: '9.5px', color: 'var(--text-dim)' }}>{m.email}</div>
                        )}
                      </td>

                      {/* Interactive In-Place Role Toggles */}
                      <td style={{ padding: '6px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              cursor: 'pointer',
                              fontSize: '10.5px',
                              color: m.isArtist ? '#c084fc' : 'var(--text-dim)',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={m.isArtist}
                              onChange={(e) => onUpdateMember(m.id, { isArtist: e.target.checked })}
                            />
                            <span>Artist</span>
                          </label>

                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              cursor: 'pointer',
                              fontSize: '10.5px',
                              color: m.isVoiceActor ? '#00a8fc' : 'var(--text-dim)',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={m.isVoiceActor}
                              onChange={(e) => onUpdateMember(m.id, { isVoiceActor: e.target.checked })}
                            />
                            <span>Voice</span>
                          </label>

                          {isBoth && (
                            <span className="badge badge-amber" style={{ fontSize: '9px' }}>
                              Both
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            if (window.confirm(`Remove ${m.name} from studio roster?`)) {
                              onDeleteMember(m.id)
                            }
                          }}
                          title="Delete member"
                          style={{
                            color: 'var(--text-dim)',
                            padding: '3px',
                            borderRadius: 'var(--radius-xs)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--color-red)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-dim)'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  )
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      No members match filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            background: 'var(--bg-tertiary)',
            padding: '8px 18px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '10.5px',
            color: 'var(--text-dim)',
          }}
        >
          <span>Changes are saved immediately to the RECD Studio database</span>
          <button
            onClick={onClose}
            style={{
              padding: '4px 12px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-header)',
              borderRadius: 'var(--radius-xs)',
              fontWeight: 600,
            }}
          >
            Close Roster
          </button>
        </div>
      </div>
    </div>
  )
}

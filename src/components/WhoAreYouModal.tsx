import { useState, useEffect } from 'react'
import { Palette, Mic, Lock, Search, Plus, Check, ShieldAlert, X } from 'lucide-react'
import type { TeamMember, CurrentUser } from '../types'

interface WhoAreYouModalProps {
  teamMembers: TeamMember[]
  onSelectUser: (user: CurrentUser) => void
  onVerifyProducer: (passcode: string) => Promise<boolean>
  onVerifyDirector: (passcode: string) => Promise<boolean>
  onAddNewMember: (member: Partial<TeamMember>) => Promise<TeamMember | null>
  onClose?: () => void
}

export const WhoAreYouModal = ({
  teamMembers,
  onSelectUser,
  onVerifyProducer,
  onVerifyDirector,
  onAddNewMember,
  onClose,
}: WhoAreYouModalProps) => {
  const [selectedRole, setSelectedRole] = useState<'producer' | 'director' | 'crew' | null>(null)
  const [passcode, setPasscode] = useState('')
  const [passcodeError, setPasscodeError] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Escape key closes modal if allowed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onClose) onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Quick self-registration for new artists/actors
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIsArtist, setNewIsArtist] = useState(true)
  const [newIsVoiceActor, setNewIsVoiceActor] = useState(false)
  const [newDiscord, setNewDiscord] = useState('')
  const [isSubmittingNew, setIsSubmittingNew] = useState(false)

  const handleProducerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsVerifying(true)
    setPasscodeError(false)
    const success = await onVerifyProducer(passcode)
    setIsVerifying(false)
    if (success) {
      onSelectUser({
        role: 'producer',
        name: 'Avan',
      })
    } else {
      setPasscodeError(true)
    }
  }

  const handleDirectorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsVerifying(true)
    setPasscodeError(false)
    const success = await onVerifyDirector(passcode)
    setIsVerifying(false)
    if (success) {
      onSelectUser({
        role: 'director',
        name: 'Tom',
      })
    } else {
      setPasscodeError(true)
    }
  }

  const handleSelectCrewMember = (member: TeamMember) => {
    onSelectUser({
      role: 'team_member',
      name: member.name,
      isArtist: member.isArtist,
      isVoiceActor: member.isVoiceActor,
      teamMemberId: member.id,
    })
  }

  const handleCreateAndJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setIsSubmittingNew(true)
    const created = await onAddNewMember({
      name: newName.trim(),
      isArtist: newIsArtist,
      isVoiceActor: newIsVoiceActor,
      discordHandle: newDiscord.trim(),
    })
    setIsSubmittingNew(false)
    if (created) {
      handleSelectCrewMember(created)
    }
  }

  const filteredMembers = teamMembers.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.discordHandle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="modal-overlay" style={{ background: 'rgba(10, 11, 14, 0.88)' }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '560px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          padding: '0',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Discord-style Header */}
        <div
          style={{
            background: 'var(--bg-tertiary)',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <img
              src="/recd-logo.png"
              alt="RECD Logo"
              style={{ width: '28px', height: '28px', objectFit: 'contain' }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-header)' }}>
                  Video Tracker ERP
                </span>
                <span className="badge badge-blue">STUDIO ACCESS</span>
              </div>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              title="Close (Esc)"
              style={{ color: 'var(--text-dim)', padding: '4px', borderRadius: 'var(--radius-xs)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-header)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div style={{ padding: '14px 16px', maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Main Leadership Options (Avan & Tom) */}
          <div style={{ marginBottom: '14px' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '7px',
              }}
            >
              Dashboard Editors (Password Protected)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {/* Producer: Avan */}
              <div
                onClick={() => {
                  setSelectedRole('producer')
                  setPasscode('')
                  setPasscodeError(false)
                }}
                style={{
                  background: selectedRole === 'producer' ? 'var(--bg-hover)' : 'var(--bg-primary)',
                  border: `1px solid ${selectedRole === 'producer' ? 'var(--color-amber)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '9px 11px',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-yellow-soft)',
                    color: 'var(--color-yellow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  A
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <strong style={{ fontSize: '11.5px' }}>Avan</strong>
                    <Lock size={10} color="var(--color-yellow)" />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Studio Producer</div>
                </div>
              </div>

              {/* Director: Tom */}
              <div
                onClick={() => {
                  setSelectedRole('director')
                  setPasscode('')
                  setPasscodeError(false)
                }}
                style={{
                  background: selectedRole === 'director' ? 'var(--bg-hover)' : 'var(--bg-primary)',
                  border: `1px solid ${selectedRole === 'director' ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '9px 11px',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(88, 101, 242, 0.15)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  T
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <strong style={{ fontSize: '11.5px' }}>Tom</strong>
                    <Lock size={10} color="var(--color-primary)" />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Showrunner & Head Director</div>
                </div>
              </div>
            </div>

            {/* Password Prompts for Avan or Tom */}
            {selectedRole === 'producer' && (
              <form
                onSubmit={handleProducerSubmit}
                style={{
                  marginTop: '8px',
                  background: 'var(--bg-tertiary)',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: 'var(--color-yellow)', marginBottom: '2px', fontWeight: 600 }}>
                    Enter Producer (Avan) Passcode:
                  </div>
                  <input
                    type="password"
                    autoFocus
                    placeholder="Enter producer passcode..."
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    style={{ width: '100%', height: '26px' }}
                  />
                  {passcodeError && (
                    <div style={{ fontSize: '9.5px', color: 'var(--color-red)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <ShieldAlert size={10} /> Incorrect passcode. Try again.
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isVerifying || !passcode}
                  style={{
                    background: 'var(--color-yellow)',
                    color: '#000',
                    fontWeight: 700,
                    height: '26px',
                    padding: '0 10px',
                    borderRadius: 'var(--radius-xs)',
                    alignSelf: 'flex-end',
                  }}
                >
                  {isVerifying ? 'Checking...' : 'Unlock Avan'}
                </button>
              </form>
            )}

            {selectedRole === 'director' && (
              <form
                onSubmit={handleDirectorSubmit}
                style={{
                  marginTop: '8px',
                  background: 'var(--bg-tertiary)',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: 'var(--color-primary)', marginBottom: '2px', fontWeight: 600 }}>
                    Enter Director (Tom) Passcode:
                  </div>
                  <input
                    type="password"
                    autoFocus
                    placeholder="Enter director passcode..."
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    style={{ width: '100%', height: '26px' }}
                  />
                  {passcodeError && (
                    <div style={{ fontSize: '9.5px', color: 'var(--color-red)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <ShieldAlert size={10} /> Incorrect passcode. Try again.
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isVerifying || !passcode}
                  style={{
                    background: 'var(--color-primary)',
                    color: '#fff',
                    fontWeight: 700,
                    height: '26px',
                    padding: '0 10px',
                    borderRadius: 'var(--radius-xs)',
                    alignSelf: 'flex-end',
                  }}
                >
                  {isVerifying ? 'Checking...' : 'Unlock Tom'}
                </button>
              </form>
            )}
          </div>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '12px 0 8px',
              fontSize: '10px',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              fontWeight: 800,
              letterSpacing: '0.5px',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            <span>Choose Crew Profile</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          </div>

          {/* Search crew members */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <Search
              size={11}
              style={{ position: 'absolute', left: '8px', top: '7px', color: 'var(--text-dim)' }}
            />
            <input
              type="text"
              placeholder="Filter crew members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '24px',
                height: '26px',
                background: 'var(--bg-tertiary)',
                fontSize: '11px',
              }}
            />
          </div>

          {/* Crew Members List */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              maxHeight: '220px',
              overflowY: 'auto',
              paddingRight: '2px',
            }}
          >
            {filteredMembers.map((member) => {
              const isBoth = member.isArtist && member.isVoiceActor
              return (
                <div
                  key={member.id || member.name}
                  onClick={() => handleSelectCrewMember(member)}
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '5px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover)'
                    e.currentTarget.style.borderColor = 'var(--color-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-primary)'
                    e.currentTarget.style.borderColor = 'var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: 'var(--radius-full)',
                        background: isBoth
                          ? 'linear-gradient(135deg, #c084fc, #00a8fc)'
                          : member.isArtist
                          ? 'var(--color-purple-soft)'
                          : 'var(--color-cyan-soft)',
                        color: isBoth ? '#fff' : member.isArtist ? '#c084fc' : '#00a8fc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {member.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-header)' }}>
                          {member.name}
                        </span>
                        {member.discordHandle && (
                          <span style={{ fontSize: '9.5px', color: 'var(--text-dim)' }}>
                            {member.discordHandle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Role Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                    {isBoth ? (
                      <span
                        className="badge"
                        style={{
                          background: 'linear-gradient(135deg, rgba(192, 132, 252, 0.2), rgba(0, 168, 252, 0.2))',
                          border: '1px solid rgba(192, 132, 252, 0.4)',
                          color: '#e2e8f0',
                          fontSize: '8.5px',
                        }}
                      >
                        <Palette size={8} /> + <Mic size={8} /> Artist & Voice
                      </span>
                    ) : member.isArtist ? (
                      <span className="badge badge-purple" style={{ fontSize: '8.5px' }}>
                        <Palette size={8} /> Artist
                      </span>
                    ) : (
                      <span className="badge badge-blue" style={{ fontSize: '8.5px' }}>
                        <Mic size={8} /> Voice Actor
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            {filteredMembers.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '12px',
                  color: 'var(--text-dim)',
                  fontSize: '10.5px',
                }}
              >
                No crew member found matching "{searchQuery}".
              </div>
            )}
          </div>

          {/* Quick self-join button if not listed */}
          <div style={{ marginTop: '10px' }}>
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                style={{
                  width: '100%',
                  padding: '5px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px dashed var(--border-subtle)',
                  color: 'var(--text-muted)',
                  fontSize: '10.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.color = 'var(--text-header)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }}
              >
                <Plus size={11} />
                <span>Not on the list? Add yourself as a new artist or voice actor</span>
              </button>
            ) : (
              <form
                onSubmit={handleCreateAndJoin}
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-medium)',
                }}
              >
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-header)', marginBottom: '6px' }}>
                  Register Your Name & Roles:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                  <div>
                    <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', marginBottom: '2px' }}>Your Name *</div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maya Lin"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      style={{ width: '100%', height: '24px' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', marginBottom: '2px' }}>Discord Tag</div>
                    <input
                      type="text"
                      placeholder="e.g. @maya_art"
                      value={newDiscord}
                      onChange={(e) => setNewDiscord(e.target.value)}
                      style={{ width: '100%', height: '24px' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', marginBottom: '3px' }}>
                    What roles do you do? (Can select both!):
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '10.5px' }}>
                      <input
                        type="checkbox"
                        checked={newIsArtist}
                        onChange={(e) => setNewIsArtist(e.target.checked)}
                      />
                      <Palette size={10} color="var(--color-purple)" />
                      <span>Artist (Lineart, Color)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '10.5px' }}>
                      <input
                        type="checkbox"
                        checked={newIsVoiceActor}
                        onChange={(e) => setNewIsVoiceActor(e.target.checked)}
                      />
                      <Mic size={10} color="var(--color-cyan)" />
                      <span>Voice Actor (Vocals, Lines)</span>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    style={{
                      padding: '3px 7px',
                      background: 'transparent',
                      color: 'var(--text-dim)',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '10.5px',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNew || !newName.trim() || (!newIsArtist && !newIsVoiceActor)}
                    style={{
                      padding: '3px 10px',
                      background: 'var(--color-primary)',
                      color: '#fff',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '10.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Check size={10} />
                    <span>{isSubmittingNew ? 'Saving...' : 'Join & Enter'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

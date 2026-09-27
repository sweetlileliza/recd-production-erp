import { useState } from 'react'
import { Plus, Trash2, ExternalLink, Save, Headphones, Mic } from 'lucide-react'
import type { Project, VoiceRole, VoiceActorStatus } from '../types'
import { formatEST } from '../utils/formatDate'

interface VoiceCastingTabProps {
  project: Project
  onUpdateVoiceCasting: (roles: VoiceRole[]) => Promise<void>
  currentRole: string
  canEdit: boolean
  availableVoiceActors?: string[]
  activeActorName?: string
}

export const VoiceCastingTab = ({
  project,
  onUpdateVoiceCasting,
  canEdit,
  availableVoiceActors = [],
  activeActorName,
}: VoiceCastingTabProps) => {
  const [roles, setRoles] = useState<VoiceRole[]>(project.voiceCasting || [])
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const statusCycle: VoiceActorStatus[] = ['pending', 'auditioned', 'cast', 'lines_received', 'mixed']

  const cycleVoiceStatus = (id: string) => {
    if (!canEdit) return
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const currentIdx = statusCycle.indexOf(r.status)
        const nextIdx = (currentIdx + 1) % statusCycle.length
        return {
          ...r,
          status: statusCycle[nextIdx],
          updatedAt: new Date().toISOString(),
        }
      })
    )
  }

  const addRole = () => {
    if (!canEdit) return
    const newRole: VoiceRole = {
      id: `vc-${Date.now()}`,
      characterName: '',
      voiceActor: '',
      status: 'pending',
      notes: '',
      auditionLink: '',
      linesLink: '',
      updatedAt: new Date().toISOString(),
    }
    setRoles([...roles, newRole])
  }

  const deleteRole = (id: string) => {
    if (!canEdit) return
    if (!window.confirm('Remove this voice role?')) return
    setRoles(roles.filter((r) => r.id !== id))
  }

  const updateRole = (id: string, field: keyof VoiceRole, value: any) => {
    setRoles((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value, updatedAt: new Date().toISOString() } : r))
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    await onUpdateVoiceCasting(roles)
    setIsSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2500)
  }

  const formatTimestamp = (iso?: string) => {
    return formatEST(iso)
  }

  const myRolesCount = activeActorName
    ? roles.filter((r) => r.voiceActor?.toLowerCase() === activeActorName.toLowerCase()).length
    : 0

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Voice Actors Datalist for fast autocomplete */}
      <datalist id="roster-voice-actors">
        {availableVoiceActors.map((va) => (
          <option key={va} value={va} />
        ))}
      </datalist>

      {/* Actor personalized banner if logged in as voice actor */}
      {activeActorName && myRolesCount > 0 && (
        <div
          style={{
            background: 'var(--color-cyan-soft)',
            border: '1px solid rgba(0, 168, 252, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mic size={13} color="var(--color-cyan)" />
            <span>
              Voice Actor Dashboard: <strong>{activeActorName}</strong> &bull; You have{' '}
              <strong>{myRolesCount}</strong> character role(s) assigned in this project!
            </span>
          </div>
        </div>
      )}

      {/* Tab Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-secondary)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-medium)',
          marginBottom: '10px',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="badge badge-blue">Voice Casting Roster</span>
            <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
              {roles.length} Character Roles &bull; {roles.filter((r) => r.status === 'mixed').length} Mixed
            </span>
          </div>
          <h2 style={{ fontSize: '12.5px', fontWeight: 800, marginTop: '2px', color: 'var(--text-header)' }}>
            Voice Actors Casting & Dialogue Pipeline
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {canEdit && (
            <>
              <button
                onClick={addRole}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-header)',
                  fontSize: '11px',
                  fontWeight: 600,
                  height: '26px',
                }}
              >
                <Plus size={12} /> Add Role
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-xs)',
                  background: saveSuccess ? 'var(--color-green)' : 'var(--color-primary)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  height: '26px',
                }}
              >
                <Save size={12} />
                <span>{isSaving ? 'Saving...' : saveSuccess ? '✓ Saved' : 'Save Cast'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Roles List */}
      {roles.length === 0 ? (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px dashed var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '24px 16px',
            textAlign: 'center',
          }}
        >
          <Headphones size={22} color="var(--text-dim)" style={{ marginBottom: '6px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>
            No voice roles added yet.
          </p>
          {canEdit && (
            <button
              onClick={addRole}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--color-primary)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '11px',
              }}
            >
              + Add Character Role
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {roles.map((role) => {
            const isMixed = role.status === 'mixed'
            const isMyRole =
              activeActorName && role.voiceActor?.toLowerCase() === activeActorName.toLowerCase()

            return (
              <div
                key={role.id}
                style={{
                  background: 'var(--bg-secondary)',
                  border: isMyRole
                    ? '1px solid var(--color-cyan)'
                    : isMixed
                      ? '1px solid rgba(35, 165, 90, 0.4)'
                      : '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 2fr 1.6fr 24px',
                    gap: '8px',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  {/* Character Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '2px' }}>
                      CHARACTER
                    </label>
                    <input
                      type="text"
                      value={role.characterName}
                      disabled={!canEdit}
                      placeholder="e.g. Baba Chops, Touille..."
                      onChange={(e) => updateRole(role.id, 'characterName', e.target.value)}
                      style={{ width: '100%', fontWeight: 700, fontSize: '11.5px', height: '26px' }}
                    />
                  </div>

                  {/* Voice Actor Name with Autocomplete */}
                  <div>
                    <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '2px' }}>
                      VOICE ACTOR (ROSTER)
                    </label>
                    <input
                      type="text"
                      list="roster-voice-actors"
                      value={role.voiceActor}
                      disabled={!canEdit}
                      placeholder="Type or pick from studio roster..."
                      onChange={(e) => updateRole(role.id, 'voiceActor', e.target.value)}
                      style={{ width: '100%', fontSize: '11px', height: '26px' }}
                    />
                  </div>

                  {/* CLICK-TO-CYCLE STATUS BUTTON */}
                  <div>
                    <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '2px' }}>
                      STATUS (CLICK TO CYCLE)
                    </label>
                    <button
                      onClick={() => cycleVoiceStatus(role.id)}
                      disabled={!canEdit}
                      title="Click to cycle status"
                      className={`status-cycle-btn ${role.status === 'mixed'
                          ? 'status-completed'
                          : role.status === 'lines_received'
                            ? 'status-lined'
                            : role.status === 'cast'
                              ? 'status-colored'
                              : role.status === 'auditioned'
                                ? 'status-sketched'
                                : 'status-not-started'
                        }`}
                      style={{ width: '100%', justifyContent: 'center', height: '26px' }}
                    >
                      {role.status === 'mixed' && 'Mixed'}
                      {role.status === 'lines_received' && 'Lines Received'}
                      {role.status === 'cast' && 'Cast'}
                      {role.status === 'auditioned' && 'Auditioned'}
                      {role.status === 'pending' && 'Pending'}
                    </button>
                  </div>

                  {/* Delete Button */}
                  <div>
                    {canEdit && (
                      <button
                        onClick={() => deleteRole(role.id)}
                        title="Delete Role"
                        style={{ color: 'var(--text-dim)', padding: '2px' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-red)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Cloud Drive Links: Auditions & Final Lines */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    padding: '6px 8px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {/* Audition Link */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontSize: '9.5px', color: 'var(--text-dim)', fontWeight: 700 }}>
                        AUDITION TAKE DRIVE LINK
                      </span>
                      {role.auditionLink && (
                        <a
                          href={role.auditionLink}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: '9.5px',
                            color: 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          Listen <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="https://drive.google.com/auditions/..."
                      value={role.auditionLink || ''}
                      onChange={(e) => updateRole(role.id, 'auditionLink', e.target.value)}
                      style={{ width: '100%', height: '24px', fontSize: '10.5px' }}
                    />
                  </div>

                  {/* Final Lines Link */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontSize: '9.5px', color: 'var(--text-dim)', fontWeight: 700 }}>
                        FINAL WAV/MASTER LINES LINK
                      </span>
                      {role.linesLink && (
                        <a
                          href={role.linesLink}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: '9.5px',
                            color: 'var(--color-green)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          Download <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="https://drive.google.com/lines/..."
                      value={role.linesLink || ''}
                      onChange={(e) => updateRole(role.id, 'linesLink', e.target.value)}
                      style={{ width: '100%', height: '24px', fontSize: '10.5px' }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    marginTop: '4px',
                    fontSize: '9.5px',
                    color: 'var(--text-dim)',
                  }}
                >
                  {role.updatedAt && <span>Updated: {formatTimestamp(role.updatedAt)}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

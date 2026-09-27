import { useState } from 'react'
import { ExternalLink, Save, Music, FileText, Mic, Piano, Sparkles } from 'lucide-react'
import type { Project, InitialSetup, SetupStepStatus } from '../types'

interface InitialSetupTabProps {
  project: Project
  onUpdateSetup: (updatedSetup: InitialSetup) => Promise<void>
  currentRole: string
}

export const InitialSetupTab = ({ project, onUpdateSetup }: InitialSetupTabProps) => {
  const [setupData, setSetupData] = useState<InitialSetup>(project.initialSetup)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const steps: { key: keyof InitialSetup; label: string; icon: any; placeholder: string; linkPlaceholder: string }[] = [
    {
      key: 'storyPitch',
      label: '1. Story Pitch',
      icon: Sparkles,
      placeholder: 'Core premise, character arc, visual hook, and comedic/dramatic turning points...',
      linkPlaceholder: 'https://docs.google.com/document/d/...',
    },
    {
      key: 'melodyStyle',
      label: '2. Melody Style & Reference',
      icon: Music,
      placeholder: 'Musical genre, tempo, instruments, tone (e.g. dramatic musical theater, 80s rock, minor waltz)...',
      linkPlaceholder: 'https://soundcloud.com/... or Spotify link',
    },
    {
      key: 'writing',
      label: '3. Writing / Lyrics Script',
      icon: FileText,
      placeholder: 'Drafted dialogue, song lyrics, rhyme scheme, beats and timing markers...',
      linkPlaceholder: 'https://docs.google.com/document/lyrics...',
    },
    {
      key: 'pianodemo',
      label: '4. Piano Demo',
      icon: Piano,
      placeholder: 'Piano track chords, tempo reference, rough vocal guide melody...',
      linkPlaceholder: 'https://drive.google.com/file/pianodemo...',
    },
    {
      key: 'scratchTrack',
      label: '5. Scratch Track',
      icon: Mic,
      placeholder: 'Full scratch vocal guide with click track. Essential for artists to time out their animation shots...',
      linkPlaceholder: 'https://drive.google.com/file/scratchtrack...',
    },
  ]

  const handleChange = (key: keyof InitialSetup, field: string, value: any) => {
    setSetupData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    await onUpdateSetup(setupData)
    setIsSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return 'Not yet updated'
    const date = new Date(isoString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Tab Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          background: 'var(--bg-surface)',
          padding: '20px 24px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Initial Setup & Creative Pipeline</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Managed by Director. Establishes the music, writing, and scratch track before art production starts.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: 'var(--radius-sm)',
            background: saveSuccess ? 'var(--color-green)' : 'var(--color-amber)',
            color: '#000',
            fontWeight: 700,
            fontSize: '0.88rem',
            transition: 'background 0.3s',
          }}
        >
          <Save size={16} />
          {isSaving ? 'Saving...' : saveSuccess ? 'Saved Successfully!' : 'Save Setup Changes'}
        </button>
      </div>

      {/* 5 Steps Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {steps.map((step) => {
          const item = setupData[step.key]
          const Icon = step.icon

          return (
            <div
              key={step.key}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {/* Header row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-amber)',
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>{step.label}</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Last updated: <span style={{ color: 'var(--text-muted)' }}>{formatTimestamp(item.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Status Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <select
                    value={item.status}
                    onChange={(e) => handleChange(step.key, 'status', e.target.value as SetupStepStatus)}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      color:
                        item.status === 'completed'
                          ? 'var(--color-green)'
                          : item.status === 'in_progress'
                          ? 'var(--color-amber)'
                          : 'var(--text-dim)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Reference Link Input */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                    FILE / REFERENCE URL
                  </label>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                      }}
                    >
                      Open Link <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  value={item.link}
                  placeholder={step.linkPlaceholder}
                  onChange={(e) => handleChange(step.key, 'link', e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              {/* Notes / Description Textarea */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '6px' }}>
                  DIRECTOR NOTES & CONTEXT
                </label>
                <textarea
                  rows={3}
                  value={item.notes}
                  placeholder={step.placeholder}
                  onChange={(e) => handleChange(step.key, 'notes', e.target.value)}
                  style={{ width: '100%', resize: 'vertical', fontSize: '0.85rem', lineHeight: 1.6 }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

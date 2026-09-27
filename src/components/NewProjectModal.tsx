import { useState, useEffect } from 'react'
import { Film, X } from 'lucide-react'

interface NewProjectModalProps {
  onClose: () => void
  onCreate: (projectData: {
    title: string
    director: string
    resolution: string
    targetDeadline: string
    refDocUrl: string
  }) => Promise<void>
}

export const NewProjectModal = ({ onClose, onCreate }: NewProjectModalProps) => {
  const [title, setTitle] = useState('')
  const [director, setDirector] = useState('')
  const [resolution, setResolution] = useState('3840x2160 (DOUBLE 1080P)')
  const [targetDeadline, setTargetDeadline] = useState('')
  const [refDocUrl, setRefDocUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    await onCreate({
      title,
      director: director.trim() || 'Director',
      resolution,
      targetDeadline,
      refDocUrl,
    })
    setIsSubmitting(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', padding: '28px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--color-amber)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Film size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Start New Studio Project</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                Set up initial metadata and creative pipeline
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ color: 'var(--text-dim)', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '6px' }}>
              PROJECT TITLE *
            </label>
            <input
              type="text"
              placeholder="e.g. Fake Depressed, Night of the Living Bread..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              style={{ width: '100%', fontSize: '0.9rem' }}
            />
          </div>

          {/* Director */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '6px' }}>
              DIRECTOR NAME
            </label>
            <input
              type="text"
              placeholder="e.g. recd"
              value={director}
              onChange={(e) => setDirector(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          {/* Resolution & Deadline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '6px' }}>
                RESOLUTION
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem' }}
              >
                <option value="3840x2160 (DOUBLE 1080P)">3840x2160 (DOUBLE 1080P)</option>
                <option value="1920x1080 (1080P HD)">1920x1080 (1080P HD)</option>
                <option value="4096x2160 (4K DCI)">4096x2160 (4K DCI)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '6px' }}>
                TARGET DEADLINE
              </label>
              <input
                type="date"
                value={targetDeadline}
                onChange={(e) => setTargetDeadline(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem' }}
              />
            </div>
          </div>

          {/* Reference Doc URL */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '6px' }}>
              REFERENCE DOC URL (Optional)
            </label>
            <input
              type="text"
              placeholder="https://docs.google.com/document/d/..."
              value={refDocUrl}
              onChange={(e) => setRefDocUrl(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-amber)',
                color: '#000',
                fontSize: '0.85rem',
                fontWeight: 800,
              }}
            >
              {isSubmitting ? 'Creating...' : 'Initialize Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

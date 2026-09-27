import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Film, Radio, ExternalLink, Save, PartyPopper, Play, RotateCcw } from 'lucide-react'
import type { Project, PostProduction } from '../types'
import { formatEST } from '../utils/formatDate'

interface PostProductionTabProps {
  project: Project
  onUpdatePostProduction: (data: Partial<PostProduction> & { isReleased?: boolean }) => Promise<void>
  currentRole: string
  canEdit: boolean
}

export const PostProductionTab = ({ project, onUpdatePostProduction, canEdit }: PostProductionTabProps) => {
  const [postData, setPostData] = useState<PostProduction>(project.postProduction)
  const [releaseUrl, setReleaseUrl] = useState(project.postProduction.releaseUrl || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showReleaseModal, setShowReleaseModal] = useState(false)

  // Escape key closes release modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showReleaseModal) {
        setShowReleaseModal(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showReleaseModal])

  const handleToggleAudio = () => {
    if (!canEdit) return
    setPostData((prev) => ({
      ...prev,
      audioFinalMix: {
        ...prev.audioFinalMix,
        completed: !prev.audioFinalMix.completed,
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  const handleToggleVideo = () => {
    if (!canEdit) return
    setPostData((prev) => ({
      ...prev,
      videoFinalMix: {
        ...prev.videoFinalMix,
        completed: !prev.videoFinalMix.completed,
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    await onUpdatePostProduction(postData)
    setIsSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2500)
  }

  const handleConfirmRelease = async () => {
    setIsSaving(true)
    await onUpdatePostProduction({
      ...postData,
      isReleased: true,
      releasedAt: new Date().toISOString(),
      releaseUrl,
    })
    setIsSaving(false)
    setShowReleaseModal(false)
  }

  const handleReopenProject = async () => {
    if (!window.confirm('Re-open this project back into Active Production?')) return
    setIsSaving(true)
    await onUpdatePostProduction({
      ...postData,
      isReleased: false,
    })
    setIsSaving(false)
  }

  const formatTimestamp = (iso?: string) => {
    return formatEST(iso)
  }

  const isReadyForRelease = postData.audioFinalMix.completed && postData.videoFinalMix.completed

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Released Banner */}
      {postData.isReleased && (
        <div
          style={{
            background: 'var(--color-green-soft)',
            border: '1px solid rgba(35, 165, 90, 0.4)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PartyPopper size={18} color="var(--color-green)" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge badge-green">RELEASED</span>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                  {formatTimestamp(postData.releasedAt)}
                </span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-header)' }}>
                &ldquo;{project.title}&rdquo; is Live!
              </div>
              {postData.releaseUrl && (
                <a
                  href={postData.releaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    color: 'var(--color-green)',
                    fontWeight: 600,
                    fontSize: '11px',
                    marginTop: '2px',
                  }}
                >
                  <Play size={10} /> Watch Video <ExternalLink size={9} />
                </a>
              )}
            </div>
          </div>

          {canEdit && (
            <button
              onClick={handleReopenProject}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-muted)',
                fontSize: '10.5px',
                background: 'var(--bg-tertiary)',
              }}
            >
              <RotateCcw size={11} /> Reopen
            </button>
          )}
        </div>
      )}

      {/* Header */}
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
        }}
      >
        <div>
          <span className="badge badge-blue">Final Master Verification</span>
          <h2 style={{ fontSize: '12.5px', fontWeight: 800, marginTop: '2px', color: 'var(--text-header)' }}>
            Post-Production & Final Master Mix
          </h2>
        </div>

        {canEdit && (
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
            {isSaving ? 'Saving...' : saveSuccess ? '✓ Saved' : 'Save Links'}
          </button>
        )}
      </div>

      {/* Audio & Video mix cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px', marginBottom: '10px' }}>
        {/* Audio Final Mix */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: postData.audioFinalMix.completed
              ? '1px solid rgba(35, 165, 90, 0.4)'
              : '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Radio size={15} color="var(--color-primary)" />
              <div>
                <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-header)' }}>Audio Final Mix</h3>
                <div style={{ fontSize: '9.5px', color: 'var(--text-dim)' }}>
                  {postData.audioFinalMix.updatedAt && `Updated ${formatTimestamp(postData.audioFinalMix.updatedAt)}`}
                </div>
              </div>
            </div>

            <button
              onClick={handleToggleAudio}
              disabled={!canEdit}
              title="Click to toggle Yes/No"
              className={`status-cycle-btn ${postData.audioFinalMix.completed ? 'status-completed' : 'status-not-started'}`}
            >
              {postData.audioFinalMix.completed ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
              {postData.audioFinalMix.completed ? 'YES (Approved)' : 'NO (Pending)'}
            </button>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '2px' }}>
              MASTER AUDIO LINK (WAV / STEMS)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="text"
                value={postData.audioFinalMix.link || ''}
                disabled={!canEdit}
                placeholder="https://drive.google.com/master.wav..."
                onChange={(e) =>
                  setPostData((prev) => ({
                    ...prev,
                    audioFinalMix: { ...prev.audioFinalMix, link: e.target.value },
                  }))
                }
                style={{ width: '100%', fontSize: '11px', height: '24px' }}
              />
              {postData.audioFinalMix.link && (
                <a href={postData.audioFinalMix.link} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Video Final Mix */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: postData.videoFinalMix.completed
              ? '1px solid rgba(35, 165, 90, 0.4)'
              : '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Film size={15} color="var(--color-yellow)" />
              <div>
                <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-header)' }}>Video Final Mix</h3>
                <div style={{ fontSize: '9.5px', color: 'var(--text-dim)' }}>
                  {postData.videoFinalMix.updatedAt && `Updated ${formatTimestamp(postData.videoFinalMix.updatedAt)}`}
                </div>
              </div>
            </div>

            <button
              onClick={handleToggleVideo}
              disabled={!canEdit}
              title="Click to toggle Yes/No"
              className={`status-cycle-btn ${postData.videoFinalMix.completed ? 'status-completed' : 'status-not-started'}`}
            >
              {postData.videoFinalMix.completed ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
              {postData.videoFinalMix.completed ? 'YES (Approved)' : 'NO (Pending)'}
            </button>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '2px' }}>
              MASTER VIDEO RENDER LINK
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="text"
                value={postData.videoFinalMix.link || ''}
                disabled={!canEdit}
                placeholder="https://drive.google.com/final_render.mp4..."
                onChange={(e) =>
                  setPostData((prev) => ({
                    ...prev,
                    videoFinalMix: { ...prev.videoFinalMix, link: e.target.value },
                  }))
                }
                style={{ width: '100%', fontSize: '11px', height: '24px' }}
              />
              {postData.videoFinalMix.link && (
                <a href={postData.videoFinalMix.link} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Release Project CTA Box */}
      {!postData.isReleased && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: isReadyForRelease
              ? '1px solid var(--color-green)'
              : '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-green" style={{ fontSize: '9.5px' }}>
                Release Gate
              </span>
              <strong style={{ fontSize: '12px', color: 'var(--text-header)' }}>
                Mark Video as Released
              </strong>
            </div>
            <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {isReadyForRelease
                ? 'Both Audio and Video mixes are approved. Ready to archive and publish live!'
                : 'Both Audio and Video final mixes must be marked "YES (Approved)" before publishing.'}
            </p>
          </div>

          {canEdit && (
            <button
              onClick={() => setShowReleaseModal(true)}
              disabled={!isReadyForRelease}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-xs)',
                background: isReadyForRelease ? 'var(--color-green)' : 'var(--bg-tertiary)',
                color: isReadyForRelease ? '#fff' : 'var(--text-dim)',
                fontWeight: 700,
                fontSize: '11px',
                cursor: isReadyForRelease ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <PartyPopper size={12} />
              <span>Release Video</span>
            </button>
          )}
        </div>
      )}

      {/* Release Confirmation Modal */}
      {showReleaseModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', padding: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '6px', color: 'var(--text-header)' }}>
              Release & Complete "{project.title}"
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Enter the public YouTube or video link to finalize this project:
            </p>

            <input
              type="text"
              placeholder="https://youtube.com/watch?v=..."
              value={releaseUrl}
              onChange={(e) => setReleaseUrl(e.target.value)}
              style={{ width: '100%', height: '28px', marginBottom: '12px', fontSize: '11px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
              <button
                onClick={() => setShowReleaseModal(false)}
                style={{
                  padding: '4px 10px',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRelease}
                disabled={isSaving}
                style={{
                  padding: '4px 12px',
                  background: 'var(--color-green)',
                  color: '#fff',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                Confirm Release
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

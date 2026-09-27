import { useState } from 'react'
import {
  Plus,
  Trash2,
  Undo2,
  Redo2,
  Save,
  Sparkles,
} from 'lucide-react'
import type { Project, Shot, Panel, PanelType } from '../types'
import { PRICING_RULES } from '../types'

interface ArtScriptMakerTabProps {
  project: Project
  onSaveShots: (shots: Shot[]) => Promise<void>
  currentRole: string
}

export const ArtScriptMakerTab = ({ project, onSaveShots }: ArtScriptMakerTabProps) => {
  const [shots, setShots] = useState<Shot[]>(project.shots || [])
  const [history, setHistory] = useState<Shot[][]>([])
  const [redoStack, setRedoStack] = useState<Shot[][]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Track state change for undo/redo
  const pushHistory = (currentShots: Shot[]) => {
    setHistory((prev) => [...prev.slice(-30), JSON.parse(JSON.stringify(currentShots))])
    setRedoStack([])
  }

  const handleUndo = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setRedoStack((r) => [JSON.parse(JSON.stringify(shots)), ...r])
    setHistory((h) => h.slice(0, h.length - 1))
    setShots(prev)
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    const next = redoStack[0]
    setHistory((h) => [...h, JSON.parse(JSON.stringify(shots))])
    setRedoStack((r) => r.slice(1))
    setShots(next)
  }

  // Helper to get letter (0 -> A, 1 -> B, ...)
  const getPanelLetter = (index: number): string => {
    let letter = ''
    while (index >= 0) {
      letter = String.fromCharCode(65 + (index % 26)) + letter
      index = Math.floor(index / 26) - 1
    }
    return letter
  }

  // Re-index all shots and panels
  const reindexShots = (updatedShots: Shot[]): Shot[] => {
    return updatedShots.map((shot, sIdx) => {
      const shotNumber = sIdx + 1
      const reindexedPanels = (shot.panels || []).map((panel, pIdx) => {
        const letter = getPanelLetter(pIdx)
        return {
          ...panel,
          panelLetter: letter,
          panelCode: `${shotNumber}${letter}`,
          price: panel.type === 'ANIMATED' ? panel.price || 0 : PRICING_RULES[panel.type] || 0,
        }
      })
      return {
        ...shot,
        shotNumber,
        panels: reindexedPanels,
      }
    })
  }

  // Calculate shot total
  const getShotTotal = (shot: Shot): number => {
    let total = 0
    if (shot.isAnimated && shot.customPrice) {
      total += Number(shot.customPrice) || 0
    }
    shot.panels?.forEach((p) => {
      total += Number(p.price) || 0
    })
    return total
  }

  // Calculate project grand total
  const getGrandTotal = (): number => {
    return shots.reduce((acc, shot) => acc + getShotTotal(shot), 0)
  }

  // Add new Shot
  const addShot = () => {
    pushHistory(shots)
    const newShotNum = shots.length + 1
    const newShot: Shot = {
      id: `shot-${Date.now()}`,
      shotNumber: newShotNum,
      sceneIntro: '',
      isAnimated: false,
      animationTags: [],
      customPrice: 0,
      assignedArtist: '',
      deadline: '',
      bgAssistanceNeeded: false,
      notes: '',
      updatedAt: new Date().toISOString(),
      panels: [
        {
          id: `p-${Date.now()}-a`,
          panelLetter: 'A',
          panelCode: `${newShotNum}A`,
          type: 'NONE',
          price: 0,
          scriptSegment: '',
          directionNotes: '',
          status: 'Not Started',
          sketchOk: false,
          driveLink: '',
          updatedAt: new Date().toISOString(),
        },
      ],
    }
    setShots(reindexShots([...shots, newShot]))
  }

  // Add Panel to a specific shot
  const addPanel = (shotId: string) => {
    pushHistory(shots)
    const updated = shots.map((s) => {
      if (s.id !== shotId) return s
      const pIdx = s.panels.length
      const letter = getPanelLetter(pIdx)
      const newPanel: Panel = {
        id: `p-${Date.now()}`,
        panelLetter: letter,
        panelCode: `${s.shotNumber}${letter}`,
        type: 'SIMPLE BASE',
        price: PRICING_RULES['SIMPLE BASE'],
        scriptSegment: '',
        directionNotes: '',
        status: 'Not Started',
        sketchOk: false,
        driveLink: '',
        updatedAt: new Date().toISOString(),
      }
      return {
        ...s,
        panels: [...s.panels, newPanel],
        updatedAt: new Date().toISOString(),
      }
    })
    setShots(reindexShots(updated))
  }

  // Delete Shot
  const deleteShot = (shotId: string) => {
    if (!window.confirm('Delete this entire shot and all its panels?')) return
    pushHistory(shots)
    const filtered = shots.filter((s) => s.id !== shotId)
    setShots(reindexShots(filtered))
  }

  // Delete Panel
  const deletePanel = (shotId: string, panelId: string) => {
    pushHistory(shots)
    const updated = shots
      .map((s) => {
        if (s.id !== shotId) return s
        const filteredPanels = s.panels.filter((p) => p.id !== panelId)
        return {
          ...s,
          panels: filteredPanels,
          updatedAt: new Date().toISOString(),
        }
      })
      .filter((s) => s.panels.length > 0) // Remove shot if empty
    setShots(reindexShots(updated))
  }

  // Update shot scene intro
  const updateShotIntro = (shotId: string, sceneIntro: string) => {
    setShots((prev) =>
      prev.map((s) => (s.id === shotId ? { ...s, sceneIntro, updatedAt: new Date().toISOString() } : s))
    )
  }

  // Toggle animation on shot
  const toggleAnimation = (shotId: string, isAnimated: boolean) => {
    pushHistory(shots)
    setShots((prev) =>
      prev.map((s) =>
        s.id === shotId
          ? {
              ...s,
              isAnimated,
              customPrice: isAnimated ? (s.customPrice || 100) : 0,
              updatedAt: new Date().toISOString(),
            }
          : s
      )
    )
  }

  // Update custom price for animated shot
  const updateCustomPrice = (shotId: string, customPrice: number) => {
    setShots((prev) =>
      prev.map((s) => (s.id === shotId ? { ...s, customPrice, updatedAt: new Date().toISOString() } : s))
    )
  }

  // Update panel field
  const updatePanel = (shotId: string, panelId: string, field: keyof Panel, value: any) => {
    setShots((prev) =>
      prev.map((s) => {
        if (s.id !== shotId) return s
        const updatedPanels = s.panels.map((p) => {
          if (p.id !== panelId) return p
          const updatedP = { ...p, [field]: value, updatedAt: new Date().toISOString() }
          if (field === 'type') {
            const t = value as PanelType
            updatedP.price = t === 'ANIMATED' ? updatedP.price || 0 : PRICING_RULES[t] || 0
          }
          return updatedP
        })
        return { ...s, panels: updatedPanels, updatedAt: new Date().toISOString() }
      })
    )
  }

  // Save to backend
  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    await onSaveShots(shots)
    setIsSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  // Export to CSV
  const exportCSV = () => {
    let csv = 'Shot,Panel,Type,Price,Script Segment,Direction & Notes\n'
    shots.forEach((shot) => {
      shot.panels?.forEach((panel) => {
        const scriptClean = `"${(panel.scriptSegment || '').replace(/"/g, '""')}"`
        const notesClean = `"${(panel.directionNotes || '').replace(/"/g, '""')}"`
        csv += `${shot.shotNumber},${panel.panelCode},${panel.type},$${panel.price},${scriptClean},${notesClean}\n`
      })
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${project.title.toLowerCase().replace(/\s+/g, '_')}_art_script.csv`
    link.click()
  }

  // Export to Word / Doc
  const exportDoc = () => {
    let content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>${project.title} Script</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #999; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .shot-header { background-color: #e0e0e0; font-weight: bold; }
      </style>
      </head>
      <body>
      <h1>${project.title} - Art Script</h1>
      <p>Director: ${project.director} | Resolution: ${project.resolution}</p>
      <table>
        <thead>
          <tr>
            <th>Panel</th>
            <th>Type</th>
            <th>Price</th>
            <th>Script</th>
            <th>Direction</th>
          </tr>
        </thead>
        <tbody>
    `
    shots.forEach((shot) => {
      content += `
        <tr class="shot-header">
          <td colspan="5">SHOT ${shot.shotNumber}: ${shot.sceneIntro || 'Scene'} (Total: $${getShotTotal(shot)})</td>
        </tr>
      `
      shot.panels?.forEach((panel) => {
        content += `
          <tr>
            <td><strong>${panel.panelCode}</strong></td>
            <td>${panel.type}</td>
            <td>$${panel.price}</td>
            <td>${panel.scriptSegment}</td>
            <td>${panel.directionNotes}</td>
          </tr>
        `
      })
    })
    content += `</tbody></table></body></html>`

    const blob = new Blob([content], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${project.title.toLowerCase().replace(/\s+/g, '_')}_art_script.doc`
    link.click()
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Script Maker Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface)',
          padding: '16px 24px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-medium)',
          marginBottom: '24px',
          position: 'sticky',
          top: '78px',
          zIndex: 40,
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-amber">Script & Direction Workspace</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                {shots.length} Shots &bull; {shots.reduce((acc, s) => acc + (s.panels?.length || 0), 0)} Panels
              </span>
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px', color: 'var(--color-green)' }}>
              Est. Art Budget: ${getGrandTotal().toLocaleString()}
            </div>
          </div>

          {/* Undo / Redo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              borderLeft: '1px solid var(--border-medium)',
              paddingLeft: '16px',
            }}
          >
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              title="Undo Structure (Ctrl+Z)"
              style={{
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                color: history.length > 0 ? 'var(--text-main)' : 'var(--text-dim)',
                cursor: history.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Redo Structure (Ctrl+Y)"
              style={{
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                color: redoStack.length > 0 ? 'var(--text-main)' : 'var(--text-dim)',
                cursor: redoStack.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              <Redo2 size={18} />
            </button>
          </div>
        </div>

        {/* Actions Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Export buttons */}
          <button
            onClick={exportDoc}
            style={{
              padding: '7px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Export Doc
          </button>
          <button
            onClick={exportCSV}
            style={{
              padding: '7px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Export CSV
          </button>

          {/* Add New Shot */}
          <button
            onClick={addShot}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-amber)',
              color: 'var(--color-amber)',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            <Plus size={16} /> New Shot
          </button>

          {/* Save / Sync */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              background: saveSuccess ? 'var(--color-green)' : 'var(--color-amber)',
              color: '#000',
              fontSize: '0.85rem',
              fontWeight: 800,
            }}
          >
            <Save size={16} />
            {isSaving ? 'Syncing...' : saveSuccess ? 'Synced to Tracker!' : 'Sync to Art Tracker'}
          </button>
        </div>
      </div>

      {/* Pricing Guide Cheat Sheet */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 20px',
          marginBottom: '24px',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Standard Panel Pricing:</span>
        <span>Complex Base: <strong style={{ color: 'var(--color-green)' }}>$36</strong></span>
        <span>Simple Base: <strong style={{ color: 'var(--color-green)' }}>$18</strong></span>
        <span>Complex Alt: <strong style={{ color: 'var(--color-green)' }}>$9</strong></span>
        <span>Simple Alt: <strong style={{ color: 'var(--color-green)' }}>$3</strong></span>
        <span style={{ marginLeft: 'auto', color: 'var(--color-amber)' }}>
          Animated Segments: Custom Priced & Tagged
        </span>
      </div>

      {/* Shots List */}
      {shots.length === 0 ? (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '2px dashed var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            padding: '60px 20px',
            textAlign: 'center',
          }}
        >
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
            No shots in this script yet. Start directing by creating Shot 1!
          </p>
          <button
            onClick={addShot}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-amber)',
              color: '#000',
              fontWeight: 700,
            }}
          >
            + Create First Shot
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {shots.map((shot) => {
            const shotTotal = getShotTotal(shot)

            return (
              <div
                key={shot.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: shot.isAnimated ? '2px solid rgba(139, 92, 246, 0.5)' : '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Shot Header Bar */}
                <div
                  style={{
                    background: shot.isAnimated
                      ? 'linear-gradient(90deg, #1f1b2e 0%, #17181c 100%)'
                      : 'var(--bg-surface-elevated)',
                    borderBottom: '1px solid var(--border-medium)',
                    padding: '12px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                    <span
                      style={{
                        color: shot.isAnimated ? 'var(--color-purple)' : 'var(--color-amber)',
                        fontWeight: 900,
                        fontSize: '1rem',
                        letterSpacing: '1px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      SHOT {shot.shotNumber}
                    </span>

                    <input
                      type="text"
                      value={shot.sceneIntro}
                      placeholder="Add scene setting, location, or shot description (e.g. BABA'S BEDROOM - SUNNY MORNING)..."
                      onChange={(e) => updateShotIntro(shot.id, e.target.value)}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid transparent',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        padding: '4px 0',
                      }}
                      onFocus={(e) => (e.target.style.borderBottom = '1px solid var(--color-amber)')}
                      onBlur={(e) => (e.target.style.borderBottom = '1px solid transparent')}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Animated Segment Toggle */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        color: shot.isAnimated ? 'var(--color-purple)' : 'var(--text-dim)',
                        fontWeight: 600,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={shot.isAnimated}
                        onChange={(e) => toggleAnimation(shot.id, e.target.checked)}
                      />
                      <Sparkles size={14} /> Animated Segment
                    </label>

                    {/* Custom price input if animated */}
                    {shot.isAnimated && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Custom $:</span>
                        <input
                          type="number"
                          value={shot.customPrice || 0}
                          onChange={(e) => updateCustomPrice(shot.id, Number(e.target.value))}
                          style={{
                            width: '75px',
                            padding: '4px 6px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: 'var(--color-purple)',
                          }}
                        />
                      </div>
                    )}

                    {/* Shot Total Cost */}
                    <div
                      style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: 'var(--color-green)',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.95rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Total: ${shotTotal}
                    </div>

                    {/* Delete Shot */}
                    <button
                      onClick={() => deleteShot(shot.id)}
                      title="Delete Entire Shot"
                      style={{
                        color: 'var(--text-dim)',
                        padding: '4px',
                        borderRadius: 'var(--radius-sm)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-red)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Panels Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-medium)' }}>
                      <th style={{ width: '80px', padding: '10px 14px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                        PANEL
                      </th>
                      <th style={{ width: '38%', padding: '10px 14px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                        SCRIPT SEGMENT
                      </th>
                      <th style={{ width: '34%', padding: '10px 14px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                        DIRECTION & ART NOTES
                      </th>
                      <th style={{ width: '180px', padding: '10px 14px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                        PANEL TYPE & PRICE
                      </th>
                      <th style={{ width: '50px', padding: '10px 14px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {shot.panels?.map((panel) => (
                      <tr
                        key={panel.id}
                        style={{ borderBottom: '1px solid var(--border-subtle)', verticalAlign: 'top' }}
                      >
                        {/* Panel Code (e.g. 1A, 1B) */}
                        <td
                          style={{
                            padding: '14px',
                            textAlign: 'center',
                            fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--color-amber)',
                            fontSize: '1rem',
                            borderRight: '1px solid var(--border-subtle)',
                            userSelect: 'none',
                          }}
                        >
                          {panel.panelCode}
                        </td>

                        {/* Script Segment */}
                        <td style={{ padding: '12px 14px', borderRight: '1px solid var(--border-subtle)' }}>
                          <textarea
                            rows={2}
                            value={panel.scriptSegment}
                            placeholder="Dialogue or song lyrics..."
                            onChange={(e) => updatePanel(shot.id, panel.id, 'scriptSegment', e.target.value)}
                            style={{
                              width: '100%',
                              background: 'transparent',
                              border: 'none',
                              padding: '2px',
                              lineHeight: 1.5,
                              resize: 'vertical',
                            }}
                          />
                        </td>

                        {/* Direction & Notes */}
                        <td style={{ padding: '12px 14px', borderRight: '1px solid var(--border-subtle)' }}>
                          <textarea
                            rows={2}
                            value={panel.directionNotes}
                            placeholder="Character action, camera angle, expression, lighting notes..."
                            onChange={(e) => updatePanel(shot.id, panel.id, 'directionNotes', e.target.value)}
                            style={{
                              width: '100%',
                              background: 'transparent',
                              border: 'none',
                              padding: '2px',
                              lineHeight: 1.5,
                              color: 'var(--text-muted)',
                              fontStyle: 'italic',
                              resize: 'vertical',
                            }}
                          />
                        </td>

                        {/* Panel Type Selection */}
                        <td style={{ padding: '12px 14px', borderRight: '1px solid var(--border-subtle)' }}>
                          <select
                            value={panel.type}
                            onChange={(e) => updatePanel(shot.id, panel.id, 'type', e.target.value as PanelType)}
                            style={{
                              width: '100%',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              background: 'var(--bg-main)',
                              borderColor: panel.type === 'NONE' ? 'var(--border-medium)' : 'var(--border-accent)',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="NONE">Select Type...</option>
                            <option value="COMPLEX BASE">Complex Base ($36)</option>
                            <option value="SIMPLE BASE">Simple Base ($18)</option>
                            <option value="COMPLEX ALT">Complex Alt ($9)</option>
                            <option value="SIMPLE ALT">Simple Alt ($3)</option>
                            <option value="ANIMATED">Animated Segment (Custom)</option>
                          </select>
                        </td>

                        {/* Delete Panel Action */}
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            onClick={() => deletePanel(shot.id, panel.id)}
                            title="Delete Panel"
                            style={{
                              color: 'var(--text-dim)',
                              padding: '4px',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-red)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Add Panel Button at bottom of shot */}
                <div style={{ padding: '10px 20px', background: 'var(--bg-surface-elevated)', display: 'flex', justifyContent: 'flex-start' }}>
                  <button
                    onClick={() => addPanel(shot.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <Plus size={14} /> + Add Panel to Shot {shot.shotNumber}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

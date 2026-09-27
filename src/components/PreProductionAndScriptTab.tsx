import { useState, useEffect, useRef } from 'react'
import {
  Plus,
  Trash2,
  Undo2,
  Redo2,
  Save,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Music,
  FileText,
  Mic,
  Piano,
  Keyboard,
  Upload,
} from 'lucide-react'
import type { Project, Shot, Panel, PanelType, InitialSetup, SetupStepStatus } from '../types'
import { PRICING_RULES } from '../types'
import { formatEST } from '../utils/formatDate'

interface PreProductionAndScriptTabProps {
  project: Project
  onUpdateSetup: (updatedSetup: InitialSetup) => Promise<void>
  onSaveShots: (shots: Shot[]) => Promise<void>
  currentRole: string
  canEdit: boolean
}

export const PreProductionAndScriptTab = ({
  project,
  onUpdateSetup,
  onSaveShots,
  canEdit,
}: PreProductionAndScriptTabProps) => {
  // Pre-production state
  const [setupData, setSetupData] = useState<InitialSetup>(project.initialSetup)
  const [setupCollapsed, setSetupCollapsed] = useState(false)
  const [setupSaving, setSetupSaving] = useState(false)
  const [setupSaved, setSetupSaved] = useState(false)

  // Script maker state
  const [shots, setShots] = useState<Shot[]>(project.shots || [])
  const [history, setHistory] = useState<Shot[][]>([])
  const [redoStack, setRedoStack] = useState<Shot[][]>([])
  const [shotsSaving, setShotsSaving] = useState(false)
  const [shotsSaved, setShotsSaved] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)

  // Global Undo / Redo keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!canEdit) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault()
          handleRedo()
        } else if (history.length > 0) {
          e.preventDefault()
          handleUndo()
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        if (redoStack.length > 0) {
          e.preventDefault()
          handleRedo()
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [history, redoStack, shots, canEdit])

  // Cycle status for setup steps
  const cycleSetupStatus = async (key: keyof InitialSetup) => {
    if (!canEdit) return
    const current = setupData[key].status
    const nextStatus: SetupStepStatus =
      current === 'not_started' ? 'in_progress' : current === 'in_progress' ? 'completed' : 'not_started'

    const updated = {
      ...setupData,
      [key]: {
        ...setupData[key],
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      },
    }
    setSetupData(updated)
    setSetupSaving(true)
    await onUpdateSetup(updated)
    setSetupSaving(false)
    setSetupSaved(true)
    setTimeout(() => setSetupSaved(false), 2000)
  }

  // Update link for setup step
  const handleSetupLinkChange = (key: keyof InitialSetup, link: string) => {
    setSetupData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        link,
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  const saveSetupLinks = async () => {
    setSetupSaving(true)
    await onUpdateSetup(setupData)
    setSetupSaving(false)
    setSetupSaved(true)
    setTimeout(() => setSetupSaved(false), 2000)
  }

  // Undo / Redo for shots
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

  const getPanelLetter = (index: number): string => {
    let letter = ''
    while (index >= 0) {
      letter = String.fromCharCode(65 + (index % 26)) + letter
      index = Math.floor(index / 26) - 1
    }
    return letter
  }

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

  const getGrandTotal = (): number => {
    return shots.reduce((acc, shot) => acc + getShotTotal(shot), 0)
  }

  // Script editing actions
  const addShot = () => {
    if (!canEdit) return
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

  const addPanel = (shotId: string) => {
    if (!canEdit) return
    pushHistory(shots)
    const updated = shots.map((s) => {
      if (s.id !== shotId) return s
      const panels = s.panels || []
      const nextLetter = getPanelLetter(panels.length)
      const newPanel: Panel = {
        id: `p-${Date.now()}-${nextLetter.toLowerCase()}`,
        panelLetter: nextLetter,
        panelCode: `${s.shotNumber}${nextLetter}`,
        type: 'NONE',
        price: 0,
        scriptSegment: '',
        directionNotes: '',
        status: 'Not Started',
        sketchOk: false,
        driveLink: '',
        updatedAt: new Date().toISOString(),
      }
      return {
        ...s,
        panels: [...panels, newPanel],
        updatedAt: new Date().toISOString(),
      }
    })
    setShots(reindexShots(updated))
  }

  const deleteShot = (shotId: string) => {
    if (!canEdit) return
    if (!window.confirm('Delete this shot and all its panels?')) return
    pushHistory(shots)
    setShots(reindexShots(shots.filter((s) => s.id !== shotId)))
  }

  const deletePanel = (shotId: string, panelId: string) => {
    if (!canEdit) return
    pushHistory(shots)
    const updated = shots
      .map((s) => {
        if (s.id !== shotId) return s
        return {
          ...s,
          panels: s.panels.filter((p) => p.id !== panelId),
          updatedAt: new Date().toISOString(),
        }
      })
      .filter((s) => s.panels.length > 0)
    setShots(reindexShots(updated))
  }

  const updateShotIntro = (shotId: string, sceneIntro: string) => {
    if (!canEdit) return
    setShots((prev) =>
      prev.map((s) => (s.id === shotId ? { ...s, sceneIntro, updatedAt: new Date().toISOString() } : s))
    )
  }

  const toggleAnimation = (shotId: string, isAnimated: boolean) => {
    if (!canEdit) return
    pushHistory(shots)
    setShots((prev) =>
      prev.map((s) =>
        s.id === shotId
          ? {
              ...s,
              isAnimated,
              customPrice: isAnimated ? s.customPrice || 100 : 0,
              updatedAt: new Date().toISOString(),
            }
          : s
      )
    )
  }

  const updateCustomPrice = (shotId: string, customPrice: number) => {
    if (!canEdit) return
    setShots((prev) =>
      prev.map((s) => (s.id === shotId ? { ...s, customPrice, updatedAt: new Date().toISOString() } : s))
    )
  }

  const updatePanel = (shotId: string, panelId: string, field: keyof Panel, value: any) => {
    if (!canEdit) return
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

  // Paste plain text only (strips rich formatting)
  const handlePastePlainText = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  // Key navigation: Shift+Enter -> split text & create new panel, Ctrl+Enter -> split text & create new shot
  const handleScriptKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
    shotId: string,
    panelId?: string,
    field: 'scriptSegment' | 'directionNotes' | 'sceneIntro' = 'scriptSegment'
  ) => {
    if (e.key === 'Enter' && e.shiftKey) {
      // SHIFT + ENTER -> Split to new panel in current shot
      e.preventDefault()
      if (!canEdit) return

      const target = e.currentTarget
      const pos = target.selectionStart ?? target.value.length
      const fullText = target.value
      const beforeText = fullText.slice(0, pos).trimEnd()
      const afterText = fullText.slice(pos).trimStart()

      pushHistory(shots)

      const newPanelId = `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

      const updated = shots.map((s) => {
        if (s.id !== shotId) return s

        const panels = s.panels || []
        const currentPanelIdx = panelId ? panels.findIndex((p) => p.id === panelId) : panels.length - 1

        const updatedPanels = [...panels]
        if (currentPanelIdx !== -1 && panelId) {
          updatedPanels[currentPanelIdx] = {
            ...updatedPanels[currentPanelIdx],
            [field]: beforeText,
            updatedAt: new Date().toISOString(),
          }
        }

        const nextLetter = getPanelLetter(updatedPanels.length)
        const newPanel: Panel = {
          id: newPanelId,
          panelLetter: nextLetter,
          panelCode: `${s.shotNumber}${nextLetter}`,
          type: 'NONE',
          price: 0,
          scriptSegment: field === 'scriptSegment' ? afterText : '',
          directionNotes: field === 'directionNotes' ? afterText : '',
          status: 'Not Started',
          sketchOk: false,
          driveLink: '',
          updatedAt: new Date().toISOString(),
        }

        if (currentPanelIdx !== -1) {
          updatedPanels.splice(currentPanelIdx + 1, 0, newPanel)
        } else {
          updatedPanels.push(newPanel)
        }

        return {
          ...s,
          panels: updatedPanels,
          updatedAt: new Date().toISOString(),
        }
      })

      setShots(reindexShots(updated))

      setTimeout(() => {
        const el = document.getElementById(`panel-${field}-${newPanelId}`)
        if (el) {
          el.focus()
          if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
            el.setSelectionRange(0, 0)
          }
        }
      }, 30)
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      // CTRL + ENTER -> Split to completely new shot
      e.preventDefault()
      if (!canEdit) return

      const target = e.currentTarget
      const pos = target.selectionStart ?? target.value.length
      const fullText = target.value
      const beforeText = fullText.slice(0, pos).trimEnd()
      const afterText = fullText.slice(pos).trimStart()

      pushHistory(shots)

      const currentShotIdx = shots.findIndex((s) => s.id === shotId)
      const newShotId = `shot-${Date.now()}`
      const newPanelId = `p-${Date.now()}-a`

      const updatedShots = shots.map((s) => {
        if (s.id !== shotId) return s

        if (field === 'sceneIntro') {
          return { ...s, sceneIntro: beforeText, updatedAt: new Date().toISOString() }
        }

        if (panelId) {
          const panels = s.panels.map((p) =>
            p.id === panelId ? { ...p, [field]: beforeText, updatedAt: new Date().toISOString() } : p
          )
          return { ...s, panels, updatedAt: new Date().toISOString() }
        }

        return s
      })

      const newShotNum = currentShotIdx !== -1 ? currentShotIdx + 2 : shots.length + 1
      const newShot: Shot = {
        id: newShotId,
        shotNumber: newShotNum,
        sceneIntro: field === 'sceneIntro' ? afterText : '',
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
            id: newPanelId,
            panelLetter: 'A',
            panelCode: `${newShotNum}A`,
            type: 'NONE',
            price: 0,
            scriptSegment: field === 'scriptSegment' ? afterText : '',
            directionNotes: field === 'directionNotes' ? afterText : '',
            status: 'Not Started',
            sketchOk: false,
            driveLink: '',
            updatedAt: new Date().toISOString(),
          },
        ],
      }

      if (currentShotIdx !== -1) {
        updatedShots.splice(currentShotIdx + 1, 0, newShot)
      } else {
        updatedShots.push(newShot)
      }

      setShots(reindexShots(updatedShots))

      setTimeout(() => {
        const el = document.getElementById(`panel-${field}-${newPanelId}`)
        if (el) {
          el.focus()
          if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
            el.setSelectionRange(0, 0)
          }
        }
      }, 30)
    }
  }

  const handleSaveShots = async () => {
    setShotsSaving(true)
    await onSaveShots(shots)
    setShotsSaving(false)
    setShotsSaved(true)
    setTimeout(() => setShotsSaved(false), 2500)
  }

  const exportCSV = () => {
    let csv = 'Shot,Panel,Type,Price,Script Segment,Direction & Notes\n'
    shots.forEach((shot) => {
      shot.panels?.forEach((panel) => {
        const s = `"${(panel.scriptSegment || '').replace(/"/g, '""')}"`
        const d = `"${(panel.directionNotes || '').replace(/"/g, '""')}"`
        csv += `${shot.shotNumber},${panel.panelCode},${panel.type},$${panel.price},${s},${d}\n`
      })
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${project.title.toLowerCase().replace(/\s+/g, '_')}_script.csv`
    link.click()
  }

  const exportDoc = () => {
    let content = `<html><body><h2>${project.title} - Script & Pre-Production</h2><table border="1" cellpadding="6"><tr><th>Panel</th><th>Type</th><th>Price</th><th>Script</th><th>Direction</th></tr>`
    shots.forEach((shot) => {
      content += `<tr><td colspan="5" bgcolor="#2b2d31" style="color:#fff"><b>SHOT ${shot.shotNumber}: ${shot.sceneIntro} ($${getShotTotal(shot)})</b></td></tr>`
      shot.panels?.forEach((p) => {
        content += `<tr><td>${p.panelCode}</td><td>${p.type}</td><td>$${p.price}</td><td>${p.scriptSegment}</td><td>${p.directionNotes}</td></tr>`
      })
    })
    content += `</table></body></html>`
    const blob = new Blob([content], { type: 'application/msword;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${project.title.toLowerCase().replace(/\s+/g, '_')}_script.doc`
    link.click()
  }

  const parseCsvLines = (text: string): string[][] => {
    const lines: string[][] = []
    let currentRow: string[] = []
    let currentField = ''
    let inQuotes = false

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const nextChar = text[i + 1]

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentField += '"'
          i++
        } else if (char === '"') {
          inQuotes = false
        } else {
          currentField += char
        }
      } else {
        if (char === '"') {
          inQuotes = true
        } else if (char === ',') {
          currentRow.push(currentField)
          currentField = ''
        } else if (char === '\r') {
          // ignore
        } else if (char === '\n') {
          currentRow.push(currentField)
          lines.push(currentRow)
          currentRow = []
          currentField = ''
        } else {
          currentField += char
        }
      }
    }

    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField)
      lines.push(currentRow)
    }

    return lines
  }

  const parseAndLoadCsv = (csvText: string) => {
    const lines = parseCsvLines(csvText)
    if (lines.length === 0) return

    let startIndex = 0
    const firstRow = lines[0].map((c) => c.trim().toLowerCase())
    if (firstRow.some((c) => c.includes('shot') || c.includes('panel') || c.includes('script'))) {
      startIndex = 1
    }

    const shotMap = new Map<
      number,
      {
        sceneIntro: string
        isAnimated: boolean
        customPrice: number
        panels: Panel[]
      }
    >()

    for (let i = startIndex; i < lines.length; i++) {
      const row = lines[i]
      if (row.length < 2 || !row.some((c) => c.trim())) continue

      let shotNum = parseInt(row[0]?.replace(/\D/g, '') || '', 10)
      if (isNaN(shotNum) && row[1]) {
        const match = row[1].match(/^(\d+)/)
        if (match) shotNum = parseInt(match[1], 10)
      }
      if (isNaN(shotNum)) shotNum = shotMap.size + 1

      const panelCodeRaw = (row[1] || '').trim()
      const typeRaw = (row[2] || '').trim().toUpperCase()
      const priceRaw = parseFloat((row[3] || '').replace(/[^0-9.]/g, '')) || 0
      const scriptSegment = (row[4] || '').trim()
      const directionNotes = (row[5] || '').trim()

      let panelType: PanelType = 'NONE'
      if (typeRaw.includes('COMPLEX BASE')) panelType = 'COMPLEX BASE'
      else if (typeRaw.includes('SIMPLE BASE')) panelType = 'SIMPLE BASE'
      else if (typeRaw.includes('COMPLEX ALT')) panelType = 'COMPLEX ALT'
      else if (typeRaw.includes('SIMPLE ALT')) panelType = 'SIMPLE ALT'
      else if (typeRaw.includes('ANIMAT')) panelType = 'ANIMATED'
      else if (typeRaw.includes('NONE')) panelType = 'NONE'

      if (!shotMap.has(shotNum)) {
        shotMap.set(shotNum, {
          sceneIntro: '',
          isAnimated: panelType === 'ANIMATED',
          customPrice: panelType === 'ANIMATED' ? priceRaw : 0,
          panels: [],
        })
      }

      const shotEntry = shotMap.get(shotNum)!
      if (panelType === 'ANIMATED') {
        shotEntry.isAnimated = true
        if (priceRaw > 0) shotEntry.customPrice = priceRaw
      }

      const panelLetter =
        panelCodeRaw.replace(/^[0-9]+/, '').toUpperCase() || getPanelLetter(shotEntry.panels.length)
      const calculatedPrice = panelType === 'ANIMATED' ? priceRaw : PRICING_RULES[panelType] || 0

      shotEntry.panels.push({
        id: `p-${Date.now()}-${shotNum}-${shotEntry.panels.length}-${Math.random().toString(36).slice(2, 5)}`,
        panelLetter: panelLetter || 'A',
        panelCode: `${shotNum}${panelLetter || 'A'}`,
        type: panelType,
        price: calculatedPrice,
        scriptSegment,
        directionNotes,
        status: 'Not Started',
        sketchOk: false,
        driveLink: '',
        updatedAt: new Date().toISOString(),
      })
    }

    const parsedShots: Shot[] = []
    const sortedShotNums = Array.from(shotMap.keys()).sort((a, b) => a - b)
    sortedShotNums.forEach((sNum, idx) => {
      const entry = shotMap.get(sNum)!
      parsedShots.push({
        id: `shot-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        shotNumber: idx + 1,
        sceneIntro: entry.sceneIntro,
        isAnimated: entry.isAnimated,
        animationTags: [],
        customPrice: entry.customPrice,
        assignedArtist: '',
        deadline: '',
        bgAssistanceNeeded: false,
        notes: '',
        updatedAt: new Date().toISOString(),
        panels: entry.panels,
      })
    })

    if (parsedShots.length > 0) {
      pushHistory(shots)
      setShots(reindexShots(parsedShots))
    }
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) return
      try {
        parseAndLoadCsv(text)
      } catch (err) {
        alert('Failed to parse CSV file: ' + (err as Error).message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const setupPillars: {
    key: keyof InitialSetup
    label: string
    icon: any
    hasLinkInput: boolean
    placeholder?: string
  }[] = [
    { key: 'storyPitch', label: '1. Story Pitch', icon: FileText, hasLinkInput: false },
    { key: 'melodyStyle', label: '2. Melody Style', icon: Music, hasLinkInput: false },
    { key: 'writing', label: '3. Writing & Lyrics', icon: FileText, hasLinkInput: false },
    { key: 'pianodemo', label: '4. Piano Demo', icon: Piano, hasLinkInput: true, placeholder: 'Drive / Audio piano demo link...' },
    { key: 'scratchTrack', label: '5. Scratch Track', icon: Mic, hasLinkInput: true, placeholder: 'Guide vocal / click track link...' },
  ]

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
      {/* 1. Combined Section: Pre-Production Setup Pillars */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 12px',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            onClick={() => setSetupCollapsed(!setupCollapsed)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <div style={{ fontWeight: 800, fontSize: '11.5px', color: 'var(--text-header)' }}>
              PRE-PRODUCTION SETUP
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              ({Object.values(setupData).filter((s) => s.status === 'completed').length}/5 Completed)
            </span>
            {setupCollapsed ? <ChevronDown size={13} color="var(--text-dim)" /> : <ChevronUp size={13} color="var(--text-dim)" />}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {canEdit && (
              <button
                onClick={saveSetupLinks}
                disabled={setupSaving}
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-xs)',
                  background: setupSaved ? 'var(--color-green)' : 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: setupSaved ? '#fff' : 'var(--text-muted)',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  height: '24px',
                }}
              >
                {setupSaving ? 'Saving...' : setupSaved ? 'Saved' : 'Save Links'}
              </button>
            )}
          </div>
        </div>

        {!setupCollapsed && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '8px',
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            {setupPillars.map((pillar) => {
              const item = setupData[pillar.key]
              const Icon = pillar.icon

              return (
                <div
                  key={pillar.key}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '6px 8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: pillar.hasLinkInput ? '4px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '11px', color: 'var(--text-header)' }}>
                      <Icon size={12} color="var(--color-yellow)" />
                      <span>{pillar.label}</span>
                    </div>

                    <button
                      onClick={() => cycleSetupStatus(pillar.key)}
                      disabled={!canEdit}
                      title="Click to cycle status"
                      className={`status-cycle-btn ${
                        item.status === 'completed'
                          ? 'status-completed'
                          : item.status === 'in_progress'
                          ? 'status-sketched'
                          : 'status-not-started'
                      }`}
                      style={{ fontSize: '9.5px', padding: '1.5px 5px' }}
                    >
                      {item.status === 'completed' ? 'Done' : item.status === 'in_progress' ? 'In Progress' : 'Pending'}
                    </button>
                  </div>

                  {pillar.hasLinkInput && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <input
                        type="text"
                        value={item.link || ''}
                        placeholder={pillar.placeholder}
                        disabled={!canEdit}
                        onChange={(e) => handleSetupLinkChange(pillar.key, e.target.value)}
                        onPaste={handlePastePlainText}
                        style={{ width: '100%', fontSize: '10.5px', height: '22px', padding: '2px 5px' }}
                      />
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          title="Open file link"
                          style={{ color: 'var(--color-primary)', padding: '2px' }}
                        >
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  )}

                  <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: '2px', textAlign: 'right' }}>
                    {formatEST(item.updatedAt)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 2. Art Script Maker Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-secondary)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-medium)',
          marginBottom: '8px',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-amber">Art Script Maker</span>
              <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                {shots.length} Shots &bull; {shots.reduce((acc, s) => acc + (s.panels?.length || 0), 0)} Panels
              </span>
            </div>
            <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--color-green)', marginTop: '1px' }}>
              Art Budget: ${getGrandTotal().toLocaleString()}
            </div>
          </div>

          {canEdit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '8px' }}>
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                title="Undo (Ctrl+Z)"
                style={{ padding: '3px', color: history.length > 0 ? 'var(--text-header)' : 'var(--text-dim)' }}
              >
                <Undo2 size={13} />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                title="Redo (Ctrl+Y)"
                style={{ padding: '3px', color: redoStack.length > 0 ? 'var(--text-header)' : 'var(--text-dim)' }}
              >
                <Redo2 size={13} />
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Keyboard shortcut hint */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              color: 'var(--text-dim)',
              background: 'var(--bg-tertiary)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Keyboard size={10} />
            <span>Shift+Enter: New Panel | Ctrl+Enter: New Shot</span>
          </div>

          <button
            onClick={exportDoc}
            style={{ padding: '3px 7px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: '10.5px', height: '24px' }}
          >
            Export Doc
          </button>
          <button
            onClick={exportCSV}
            style={{ padding: '3px 7px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: '10.5px', height: '24px' }}
          >
            Export CSV
          </button>

          {canEdit && (
            <>
              <button
                onClick={() => csvInputRef.current?.click()}
                title="Upload CSV to import script"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '3px 7px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-header)',
                  fontSize: '10.5px',
                  height: '24px',
                }}
              >
                <Upload size={11} /> Import CSV
              </button>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleCsvUpload}
              />

              <button
                onClick={addShot}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--color-yellow)',
                  fontWeight: 600,
                  fontSize: '10.5px',
                  height: '24px',
                }}
              >
                <Plus size={11} /> New Shot
              </button>
              <button
                onClick={handleSaveShots}
                disabled={shotsSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-xs)',
                  background: shotsSaved ? 'var(--color-green)' : 'var(--color-primary)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '10.5px',
                  height: '24px',
                }}
              >
                <Save size={11} />
                {shotsSaving ? 'Syncing...' : shotsSaved ? 'Synced' : 'Sync to Tracker'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pricing Cheat Sheet banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xs)',
          padding: '4px 10px',
          marginBottom: '8px',
          fontSize: '10.5px',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: 700, color: 'var(--text-header)' }}>Rates:</span>
        <span>Complex Base: <strong style={{ color: 'var(--color-green)' }}>$36</strong></span>
        <span>Simple Base: <strong style={{ color: 'var(--color-green)' }}>$18</strong></span>
        <span>Complex Alt: <strong style={{ color: 'var(--color-green)' }}>$9</strong></span>
        <span>Simple Alt: <strong style={{ color: 'var(--color-green)' }}>$3</strong></span>
        <span style={{ marginLeft: 'auto', color: 'var(--color-purple)' }}>
          Animated Segments: Custom Priced
        </span>
      </div>

      {/* Shots List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {shots.map((shot) => {
          const shotTotal = getShotTotal(shot)

          return (
            <div
              key={shot.id}
              style={{
                background: 'var(--bg-secondary)',
                border: shot.isAnimated ? '1px solid rgba(155, 89, 182, 0.4)' : '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
              }}
            >
              {/* Shot Header */}
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  borderBottom: '1px solid var(--border-subtle)',
                  padding: '5px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <span
                    style={{
                      color: shot.isAnimated ? 'var(--color-purple)' : 'var(--color-yellow)',
                      fontWeight: 800,
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    SHOT {shot.shotNumber}
                  </span>

                  <input
                    type="text"
                    value={shot.sceneIntro}
                    disabled={!canEdit}
                    placeholder="Scene setting, background location, lighting notes..."
                    onFocus={() => pushHistory(shots)}
                    onChange={(e) => updateShotIntro(shot.id, e.target.value)}
                    onKeyDown={(e) => handleScriptKeyDown(e, shot.id, undefined, 'sceneIntro')}
                    onPaste={handlePastePlainText}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid transparent',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-header)',
                      padding: '2px 0',
                    }}
                    onFocusCapture={(e) => (e.target.style.borderBottom = '1px solid var(--color-primary)')}
                    onBlurCapture={(e) => (e.target.style.borderBottom = '1px solid transparent')}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Animated toggle */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '10.5px',
                      color: shot.isAnimated ? 'var(--color-purple)' : 'var(--text-dim)',
                      cursor: canEdit ? 'pointer' : 'default',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={shot.isAnimated}
                      disabled={!canEdit}
                      onChange={(e) => toggleAnimation(shot.id, e.target.checked)}
                    />
                    <Sparkles size={11} /> Animated
                  </label>

                  {shot.isAnimated && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Custom $:</span>
                      <input
                        type="number"
                        value={shot.customPrice || 0}
                        disabled={!canEdit}
                        onFocus={() => pushHistory(shots)}
                        onChange={(e) => updateCustomPrice(shot.id, Number(e.target.value))}
                        style={{ width: '50px', padding: '1px 3px', fontSize: '10.5px', color: 'var(--color-purple)', height: '22px' }}
                      />
                    </div>
                  )}

                  <span
                    style={{
                      background: 'var(--color-green-soft)',
                      color: 'var(--color-green)',
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-xs)',
                      fontWeight: 800,
                      fontSize: '10.5px',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    ${shotTotal}
                  </span>

                  {canEdit && (
                    <button
                      onClick={() => deleteShot(shot.id)}
                      title="Delete Shot"
                      style={{ color: 'var(--text-dim)', padding: '2px' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-red)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Panels Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ width: '45px', padding: '4px 6px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '10px' }}>
                      PANEL
                    </th>
                    <th style={{ width: '44%', padding: '4px 6px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '10px' }}>
                      SCRIPT SEGMENT (LYRICS / DIALOGUE)
                    </th>
                    <th style={{ width: '38%', padding: '4px 6px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '10px' }}>
                      DIRECTION & ART NOTES
                    </th>
                    <th style={{ width: '150px', padding: '4px 6px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '10px' }}>
                      TYPE & PRICE
                    </th>
                    {canEdit && <th style={{ width: '28px', padding: '4px 6px', textAlign: 'center' }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {shot.panels?.map((panel) => (
                    <tr key={panel.id} style={{ borderBottom: '1px solid var(--border-subtle)', verticalAlign: 'top' }}>
                      <td
                        style={{
                          padding: '5px 6px',
                          textAlign: 'center',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: 'var(--color-yellow)',
                          borderRight: '1px solid var(--border-subtle)',
                        }}
                      >
                        {panel.panelCode}
                      </td>

                      <td style={{ padding: '4px 6px', borderRight: '1px solid var(--border-subtle)' }}>
                        <textarea
                          id={`panel-scriptSegment-${panel.id}`}
                          rows={2}
                          value={panel.scriptSegment}
                          disabled={!canEdit}
                          placeholder="Lyrics or dialogue..."
                          onFocus={() => pushHistory(shots)}
                          onChange={(e) => updatePanel(shot.id, panel.id, 'scriptSegment', e.target.value)}
                          onKeyDown={(e) => handleScriptKeyDown(e, shot.id, panel.id, 'scriptSegment')}
                          onPaste={handlePastePlainText}
                          style={{ width: '100%', background: 'transparent', border: 'none', padding: '2px', resize: 'vertical', lineHeight: 1.35, fontSize: '11px', color: 'var(--text-header)' }}
                        />
                      </td>

                      <td style={{ padding: '4px 6px', borderRight: '1px solid var(--border-subtle)' }}>
                        <textarea
                          id={`panel-directionNotes-${panel.id}`}
                          rows={2}
                          value={panel.directionNotes}
                          disabled={!canEdit}
                          placeholder="Action, character expression, framing notes..."
                          onFocus={() => pushHistory(shots)}
                          onChange={(e) => updatePanel(shot.id, panel.id, 'directionNotes', e.target.value)}
                          onKeyDown={(e) => handleScriptKeyDown(e, shot.id, panel.id, 'directionNotes')}
                          onPaste={handlePastePlainText}
                          style={{ width: '100%', background: 'transparent', border: 'none', padding: '2px', color: 'var(--text-muted)', resize: 'vertical', lineHeight: 1.35, fontSize: '11px' }}
                        />
                      </td>

                      <td style={{ padding: '4px 6px', borderRight: '1px solid var(--border-subtle)' }}>
                        <select
                          value={panel.type}
                          disabled={!canEdit}
                          onChange={(e) => {
                            pushHistory(shots)
                            updatePanel(shot.id, panel.id, 'type', e.target.value as PanelType)
                          }}
                          style={{ width: '100%', fontSize: '10.5px', padding: '2px 4px', background: 'var(--bg-tertiary)', height: '24px' }}
                        >
                          <option value="NONE">Select Type...</option>
                          <option value="COMPLEX BASE">Complex Base ($36)</option>
                          <option value="SIMPLE BASE">Simple Base ($18)</option>
                          <option value="COMPLEX ALT">Complex Alt ($9)</option>
                          <option value="SIMPLE ALT">Simple Alt ($3)</option>
                          <option value="ANIMATED">Animated (Custom)</option>
                        </select>
                      </td>

                      {canEdit && (
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          <button
                            onClick={() => deletePanel(shot.id, panel.id)}
                            title="Delete Panel"
                            style={{ color: 'var(--text-dim)', padding: '2px' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-red)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                          >
                            <Trash2 size={11} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {canEdit && (
                <div style={{ padding: '4px 10px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => addPanel(shot.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text-dim)', fontSize: '10.5px', fontWeight: 600 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-header)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                  >
                    <Plus size={11} /> Add Panel
                  </button>

                  <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>
                    Press Shift+Enter to create panel, Ctrl+Enter to create shot
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

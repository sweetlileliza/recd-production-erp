import { useState, useEffect } from 'react'
import {
  ExternalLink,
  Filter,
  Search,
  Check,
  X,
  Sparkles,
  Users,
  CheckSquare,
  Square,
  FolderPlus,
  FileText,
  Edit2,
  FolderOpen,
  Star,
  PieChart,
} from 'lucide-react'
import type { Project, Shot, Panel, PanelStatus, ArtistSplit } from '../types'
import { formatEST } from '../utils/formatDate'

interface ArtTrackerTabProps {
  project: Project
  onUpdateShot: (shotId: string, updates: Partial<Shot>) => Promise<void>
  onUpdatePanel: (shotId: string, panelId: string, updates: Partial<Panel>) => Promise<void>
  onArtistOptIn?: (shotId: string, artistName: string) => Promise<void>
  onBulkAssign: (shotIds: string[], artistName: string, deadline?: string) => Promise<void>
  onBulkSetFolders?: (payload: { baseFolderUrl?: string; folderMappings?: Record<string, string> }) => Promise<void>
  onUpdateProject?: (updates: Partial<Project>) => Promise<void>
  onSaveArtistPreferences?: (pref: {
    artistName: string
    maxShots: number
    preferredShots: number[]
    avoidShots: number[]
    notes?: string
  }) => Promise<void>
  availableArtists: { name: string; email: string; specialty?: string }[]
  currentRole: string
  isArtist?: boolean
  activeArtistName: string
  canAssign: boolean
}

export const ArtTrackerTab = ({
  project,
  onUpdateShot,
  onUpdatePanel,
  onArtistOptIn: _onArtistOptIn,
  onBulkAssign,
  onBulkSetFolders,
  onUpdateProject,
  onSaveArtistPreferences,
  availableArtists,
  currentRole,
  isArtist = false,
  activeArtistName,
  canAssign,
}: ArtTrackerTabProps) => {
  const [artistFilter, setArtistFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Artist Preview mode for Producer / Director
  const [previewArtist, setPreviewArtist] = useState<string | null>(null)
  const isActuallyArtist = Boolean(isArtist) || currentRole === 'artist' || (currentRole === 'team_member' && Boolean(activeArtistName))
  const isViewerArtist = Boolean(previewArtist) || isActuallyArtist
  const effectiveArtistName = previewArtist || activeArtistName || availableArtists[0]?.name || 'Artist'

  // Bulk Allotment state
  const [showBulkCenter, setShowBulkCenter] = useState<boolean>(false)
  const [selectedShotIds, setSelectedShotIds] = useState<string[]>([])
  const [bulkArtistTarget, setBulkArtistTarget] = useState<string>('')
  const [bulkDeadline, setBulkDeadline] = useState<string>('')
  const [isBulkAssigning, setIsBulkAssigning] = useState<boolean>(false)

  // Bulk Drive Folder modal state
  const [showBulkFolderModal, setShowBulkFolderModal] = useState<boolean>(false)
  const [folderTemplate, setFolderTemplate] = useState<string>(
    'https://drive.google.com/drive/folders/recd-shot-{shotNumber}'
  )
  const [customFolderMap, setCustomFolderMap] = useState<Record<string, string>>({})
  const [bulkFolderMode, setBulkFolderMode] = useState<'template' | 'list'>('template')
  const [isApplyingFolders, setIsApplyingFolders] = useState<boolean>(false)

  // Inline editing for Shot Drive link
  const [editingDriveShotId, setEditingDriveShotId] = useState<string | null>(null)
  const [tempDriveUrl, setTempDriveUrl] = useState<string>('')

  // Inline editing for Art Ref Doc
  const [isEditingRefDoc, setIsEditingRefDoc] = useState<boolean>(false)
  const [tempRefDocUrl, setTempRefDocUrl] = useState<string>(project.refDocUrl || '')

  // Artist Preferences Modal state
  const [showPrefModal, setShowPrefModal] = useState<boolean>(false)
  const [prefArtistTarget, setPrefArtistTarget] = useState<string>('')
  const [prefMaxShots, setPrefMaxShots] = useState<number | string>(3)
  const [prefChoices, setPrefChoices] = useState<(number | '')[]>(['', '', '', '', ''])
  const [prefAvoidShots, setPrefAvoidShots] = useState<number[]>([])
  const [prefNotes, setPrefNotes] = useState<string>('')
  const [isSavingPref, setIsSavingPref] = useState<boolean>(false)

  // Split Shot / Ratio Wheel State
  const [splitModalShot, setSplitModalShot] = useState<Shot | null>(null)
  const [splits, setSplits] = useState<ArtistSplit[]>([])
  const [splitNotes, setSplitNotes] = useState<string>('')
  const [isSavingSplit, setIsSavingSplit] = useState<boolean>(false)

  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showPrefModal) setShowPrefModal(false)
        if (showBulkFolderModal) setShowBulkFolderModal(false)
        if (splitModalShot) setSplitModalShot(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showPrefModal, showBulkFolderModal, splitModalShot])

  const getShotTotalPay = (shot: Shot): number => {
    return (
      (shot.isAnimated && shot.customPrice ? Number(shot.customPrice) : 0) +
      (shot.panels?.reduce((acc, p) => acc + (p.price || 0), 0) || 0)
    )
  }

  const handleOpenSplitModal = (shot: Shot) => {
    if (!canAssign) return
    setSplitModalShot(shot)
    const totalPay = getShotTotalPay(shot)

    if (shot.artistSplits && shot.artistSplits.length > 0) {
      setSplits(shot.artistSplits.map((s) => ({ ...s })))
      setSplitNotes(shot.artistSplits[0]?.notes || '')
    } else {
      const firstArtist = shot.assignedArtist || availableArtists[0]?.name || 'Artist 1'
      const secondArtist =
        availableArtists.find((a) => a.name.toLowerCase() !== firstArtist.toLowerCase())?.name ||
        availableArtists[1]?.name ||
        'Artist 2'

      const half = Math.round(totalPay * 0.5)
      setSplits([
        {
          artistName: firstArtist,
          percentage: 50,
          amount: half,
        },
        {
          artistName: secondArtist,
          percentage: 50,
          amount: totalPay - half,
        },
      ])
      setSplitNotes('')
    }
  }

  const handleTwoWayRatio = (firstPercent: number) => {
    if (!splitModalShot || splits.length < 2) return
    const totalPay = getShotTotalPay(splitModalShot)
    const p1 = Math.max(0, Math.min(100, Math.round(firstPercent)))
    const p2 = 100 - p1
    const a1 = Math.round((p1 / 100) * totalPay)
    const a2 = totalPay - a1

    setSplits([
      { ...splits[0], percentage: p1, amount: a1 },
      { ...splits[1], percentage: p2, amount: a2 },
      ...splits.slice(2),
    ])
  }

  const handleMultiPercentageChange = (index: number, newPercent: number) => {
    if (!splitModalShot) return
    const totalPay = getShotTotalPay(splitModalShot)
    const updated = splits.map((s, idx) => {
      if (idx !== index) return s
      const clamped = Math.max(0, Math.min(100, Math.round(newPercent)))
      return {
        ...s,
        percentage: clamped,
        amount: Math.round((clamped / 100) * totalPay),
      }
    })
    setSplits(updated)
  }

  const handleSplitArtistChange = (index: number, newArtist: string) => {
    setSplits((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, artistName: newArtist } : s))
    )
  }

  const handleAddSplitArtist = () => {
    if (!splitModalShot) return
    const totalPay = getShotTotalPay(splitModalShot)
    const unusedArtist = availableArtists.find(
      (a) => !splits.some((s) => s.artistName.toLowerCase() === a.name.toLowerCase())
    )?.name || `Artist ${splits.length + 1}`

    const count = splits.length + 1
    const basePct = Math.floor(100 / count)
    const remainder = 100 - basePct * count

    const newSplits: ArtistSplit[] = [
      ...splits.map((s, idx) => {
        const pct = basePct + (idx === 0 ? remainder : 0)
        return {
          ...s,
          percentage: pct,
          amount: Math.round((pct / 100) * totalPay),
        }
      }),
      {
        artistName: unusedArtist,
        percentage: basePct,
        amount: Math.round((basePct / 100) * totalPay),
      },
    ]
    setSplits(newSplits)
  }

  const handleRemoveSplitArtist = (index: number) => {
    if (!splitModalShot || splits.length <= 2) return
    const totalPay = getShotTotalPay(splitModalShot)
    const filtered = splits.filter((_, idx) => idx !== index)
    // Renormalize percentages
    const currentSum = filtered.reduce((acc, s) => acc + s.percentage, 0) || 1
    const renormalized = filtered.map((s) => {
      const pct = Math.round((s.percentage / currentSum) * 100)
      return {
        ...s,
        percentage: pct,
        amount: Math.round((pct / 100) * totalPay),
      }
    })
    setSplits(renormalized)
  }

  const handleSaveSplit = async () => {
    if (!splitModalShot) return
    setIsSavingSplit(true)
    const splitsWithNotes = splits.map((s) => ({ ...s, notes: splitNotes.trim() }))
    await onUpdateShot(splitModalShot.id, {
      artistSplits: splitsWithNotes,
      assignedArtist: splits.map((s) => s.artistName).join(' & '),
    })
    setIsSavingSplit(false)
    setSplitModalShot(null)
  }

  const handleClearSplit = async () => {
    if (!splitModalShot) return
    if (!window.confirm('Clear split and return this shot to a single artist?')) return
    setIsSavingSplit(true)
    await onUpdateShot(splitModalShot.id, {
      artistSplits: [],
      assignedArtist: splits[0]?.artistName || splitModalShot.assignedArtist,
    })
    setIsSavingSplit(false)
    setSplitModalShot(null)
  }

  const handleOpenPreferencesModal = (artistName?: string) => {
    const target = artistName || effectiveArtistName
    setPrefArtistTarget(target)
    const existing = (project.artistPreferences || []).find(
      (p) => p.artistName.toLowerCase() === target.toLowerCase()
    )
    if (existing) {
      setPrefMaxShots(existing.maxShots || 1)
      const choices: (number | '')[] = ['', '', '', '', '']
      ;(existing.preferredShots || []).slice(0, 5).forEach((num, idx) => {
        choices[idx] = num
      })
      setPrefChoices(choices)
      setPrefAvoidShots(existing.avoidShots || [])
      setPrefNotes(existing.notes || '')
    } else {
      setPrefMaxShots(3)
      setPrefChoices(['', '', '', '', ''])
      setPrefAvoidShots([])
      setPrefNotes('')
    }
    setShowPrefModal(true)
  }

  const handleSavePreferences = async () => {
    const max = Number(prefMaxShots)
    if (!max || max < 1) {
      alert('Please specify a valid max shots capacity (minimum 1).')
      return
    }
    if (!onSaveArtistPreferences) return
    setIsSavingPref(true)
    try {
      const validChoices = prefChoices.filter((n): n is number => typeof n === 'number' && n > 0)
      await onSaveArtistPreferences({
        artistName: prefArtistTarget,
        maxShots: max,
        preferredShots: validChoices,
        avoidShots: prefAvoidShots,
        notes: prefNotes.trim(),
      })
      setShowPrefModal(false)
    } catch (err) {
      console.error('Failed to save artist preferences:', err)
    } finally {
      setIsSavingPref(false)
    }
  }

  const handleRankChoiceChange = (slotIndex: number, shotNum: number | '') => {
    setPrefChoices((prev) => {
      const updated = [...prev]
      if (shotNum !== '') {
        const existingSlot = updated.findIndex((val, idx) => idx !== slotIndex && val === shotNum)
        if (existingSlot !== -1) {
          updated[existingSlot] = ''
        }
        setPrefAvoidShots((prevAvoid) => prevAvoid.filter((n) => n !== shotNum))
      }
      updated[slotIndex] = shotNum
      return updated
    })
  }

  const handleToggleAvoidShot = (shotNum: number) => {
    setPrefAvoidShots((prev) => {
      if (prev.includes(shotNum)) {
        return prev.filter((n) => n !== shotNum)
      } else {
        setPrefChoices((prevChoices) =>
          prevChoices.map((choice) => (choice === shotNum ? '' : choice))
        )
        return [...prev, shotNum]
      }
    })
  }

  // Count currently assigned shots per artist
  const artistAssignedCount: Record<string, number> = {}
  project.shots?.forEach((shot) => {
    if (shot.assignedArtist) {
      const k = shot.assignedArtist.toLowerCase()
      artistAssignedCount[k] = (artistAssignedCount[k] || 0) + 1
    }
  })

  const myPref = (project.artistPreferences || []).find(
    (p) => p.artistName.toLowerCase() === effectiveArtistName.toLowerCase()
  )

  // Status cycle sequence
  const statusCycle: PanelStatus[] = ['Not Started', 'Sketched', 'Lined', 'Colored', 'Completed']

  const cyclePanelStatus = (shotId: string, panel: Panel) => {
    const currentIdx = statusCycle.indexOf(panel.status)
    const nextIdx = (currentIdx + 1) % statusCycle.length
    const nextStatus = statusCycle[nextIdx]
    onUpdatePanel(shotId, panel.id, { status: nextStatus })
  }

  // Compute stats
  let totalPanels = 0
  let sketchedCount = 0
  let linedCount = 0
  let coloredCount = 0
  let completedCount = 0
  let unassignedShots = 0
  let totalBudget = 0

  project.shots?.forEach((shot) => {
    if (!shot.assignedArtist) unassignedShots += 1
    if (shot.isAnimated && shot.customPrice) totalBudget += Number(shot.customPrice) || 0

    shot.panels?.forEach((panel) => {
      totalPanels += 1
      totalBudget += Number(panel.price) || 0
      if (panel.status === 'Sketched') sketchedCount += 1
      if (panel.status === 'Lined') {
        sketchedCount += 1
        linedCount += 1
      }
      if (panel.status === 'Colored') {
        sketchedCount += 1
        linedCount += 1
        coloredCount += 1
      }
      if (panel.status === 'Completed') {
        sketchedCount += 1
        linedCount += 1
        coloredCount += 1
        completedCount += 1
      }
    })
  })

  const completedPercent = totalPanels > 0 ? Math.round((completedCount / totalPanels) * 100) : 0

  // Filter shots
  const filteredShots = (project.shots || []).filter((shot) => {
    if (artistFilter === 'UNASSIGNED' && shot.assignedArtist) return false
    if (artistFilter !== 'ALL' && artistFilter !== 'UNASSIGNED' && shot.assignedArtist !== artistFilter) return false

    if (statusFilter !== 'ALL') {
      const hasStatus = shot.panels?.some((p) => p.status === statusFilter)
      if (!hasStatus) return false
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchShot = shot.shotNumber.toString().includes(q) || (shot.sceneIntro || '').toLowerCase().includes(q)
      const matchPanels = shot.panels?.some(
        (p) =>
          p.panelCode.toLowerCase().includes(q) ||
          (p.scriptSegment || '').toLowerCase().includes(q) ||
          (p.directionNotes || '').toLowerCase().includes(q)
      )
      if (!matchShot && !matchPanels) return false
    }

    return true
  })

  // Bulk selection helpers
  const toggleSelectShot = (shotId: string) => {
    setSelectedShotIds((prev) =>
      prev.includes(shotId) ? prev.filter((id) => id !== shotId) : [...prev, shotId]
    )
  }

  const selectAllUnassigned = () => {
    const unassignedIds = (project.shots || []).filter((s) => !s.assignedArtist).map((s) => s.id)
    setSelectedShotIds(unassignedIds)
  }

  const handleExecuteBulkAssign = async () => {
    if (selectedShotIds.length === 0 || !bulkArtistTarget) return
    setIsBulkAssigning(true)
    await onBulkAssign(selectedShotIds, bulkArtistTarget, bulkDeadline)
    setSelectedShotIds([])
    setIsBulkAssigning(false)
  }

  // Handle single shot drive link update
  const handleSaveShotDrive = async (shotId: string) => {
    await onUpdateShot(shotId, { driveFolderUrl: tempDriveUrl.trim() })
    setEditingDriveShotId(null)
    setTempDriveUrl('')
  }

  // Handle save Art Ref Doc
  const handleSaveRefDoc = async () => {
    if (onUpdateProject) {
      await onUpdateProject({ refDocUrl: tempRefDocUrl.trim() })
    }
    setIsEditingRefDoc(false)
  }

  // Handle execute bulk folders
  const handleApplyBulkFolders = async () => {
    if (!onBulkSetFolders) return
    setIsApplyingFolders(true)
    if (bulkFolderMode === 'template') {
      await onBulkSetFolders({ baseFolderUrl: folderTemplate.trim() })
    } else {
      await onBulkSetFolders({ folderMappings: customFolderMap })
    }
    setIsApplyingFolders(false)
    setShowBulkFolderModal(false)
  }

  const SPLIT_COLORS = ['#5865f2', '#57f287', '#fee75c', '#eb459e', '#00b0f4', '#ed4245']

  const renderRatioWheel = (currentSplits: ArtistSplit[], totalPay: number) => {
    const size = 180
    const center = size / 2
    const radius = 75
    const innerRadius = 45

    let cumulativeAngle = -90

    const paths = currentSplits.map((split, i) => {
      const fraction = Math.max(0, Math.min(100, split.percentage)) / 100
      const sliceAngle = fraction * 360

      if (fraction <= 0) return null

      if (fraction >= 0.999) {
        return (
          <path
            key={i}
            d={`
              M ${center} ${center - radius}
              A ${radius} ${radius} 0 1 1 ${center - 0.001} ${center - radius}
              L ${center - 0.001} ${center - innerRadius}
              A ${innerRadius} ${innerRadius} 0 1 0 ${center} ${center - innerRadius}
              Z
            `}
            fill={SPLIT_COLORS[i % SPLIT_COLORS.length]}
          />
        )
      }

      const startAngle = cumulativeAngle
      const endAngle = cumulativeAngle + sliceAngle
      cumulativeAngle += sliceAngle

      const startRad = (startAngle * Math.PI) / 180
      const endRad = (endAngle * Math.PI) / 180

      const x1 = center + radius * Math.cos(startRad)
      const y1 = center + radius * Math.sin(startRad)
      const x2 = center + radius * Math.cos(endRad)
      const y2 = center + radius * Math.sin(endRad)

      const innerX1 = center + innerRadius * Math.cos(endRad)
      const innerY1 = center + innerRadius * Math.sin(endRad)
      const innerX2 = center + innerRadius * Math.cos(startRad)
      const innerY2 = center + innerRadius * Math.sin(startRad)

      const largeArc = sliceAngle > 180 ? 1 : 0

      const pathData = `
        M ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
        L ${innerX1} ${innerY1}
        A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerX2} ${innerY2}
        Z
      `

      return (
        <path
          key={i}
          d={pathData}
          fill={SPLIT_COLORS[i % SPLIT_COLORS.length]}
        />
      )
    })

    return (
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {paths}
        </svg>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-header)' }}>
            ${totalPay}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Ratio Split
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
      {/* 1. Header Overview & Stats Matrix */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-amber" style={{ fontSize: '10px', padding: '1px 6px' }}>
                Art Doc Matrix
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                {project.resolution} &bull; Target: {project.targetDeadline || 'TBD'}
              </span>

              {/* ART REFERENCE DOC LINK */}
              {isEditingRefDoc ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                  <input
                    type="url"
                    value={tempRefDocUrl}
                    onChange={(e) => setTempRefDocUrl(e.target.value)}
                    placeholder="https://docs.google.com/..."
                    style={{ fontSize: '10.5px', padding: '2px 6px', width: '220px', height: '22px' }}
                  />
                  <button
                    onClick={handleSaveRefDoc}
                    style={{
                      background: 'var(--color-green)',
                      color: '#000',
                      border: 'none',
                      borderRadius: 'var(--radius-xs)',
                      padding: '2px 6px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      height: '22px',
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingRefDoc(false)
                      setTempRefDocUrl(project.refDocUrl || '')
                    }}
                    style={{
                      background: 'transparent',
                      color: 'var(--text-dim)',
                      border: 'none',
                      fontSize: '10.5px',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : project.refDocUrl ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                  <a
                    href={project.refDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-xs)',
                      background: 'rgba(88, 101, 242, 0.15)',
                      border: '1px solid rgba(88, 101, 242, 0.4)',
                      color: 'var(--color-primary-light)',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <FileText size={11} />
                    <span>Open Art Ref Doc</span>
                    <ExternalLink size={10} />
                  </a>
                  {canAssign && (
                    <button
                      onClick={() => {
                        setTempRefDocUrl(project.refDocUrl || '')
                        setIsEditingRefDoc(true)
                      }}
                      title="Edit Art Doc Link"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim)',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Edit2 size={11} />
                    </button>
                  )}
                </div>
              ) : canAssign ? (
                <button
                  onClick={() => setIsEditingRefDoc(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-xs)',
                    background: 'var(--bg-tertiary)',
                    border: '1px dashed var(--border-medium)',
                    color: 'var(--text-muted)',
                    fontSize: '10.5px',
                    marginLeft: '6px',
                  }}
                >
                  <FileText size={11} />
                  <span>+ Link Art Ref Doc</span>
                </button>
              ) : null}
            </div>

            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '2px', color: 'var(--text-header)' }}>
              Animation Art Tracker & Allotment
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-green)' }}>
                {completedCount} / {totalPanels}{' '}
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>({completedPercent}%)</span>
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--color-amber)', fontWeight: 600 }}>
                Budget: ${totalBudget.toLocaleString()}
              </div>
            </div>

            {/* BULK SHOT DRIVE FOLDERS BUTTON (PRODUCER TOOL) */}
            {canAssign && (
              <button
                onClick={() => {
                  // Pre-populate custom folder map with existing folders
                  const currentMap: Record<string, string> = {}
                  project.shots?.forEach((s) => {
                    if (s.driveFolderUrl) currentMap[s.id] = s.driveFolderUrl
                  })
                  setCustomFolderMap(currentMap)
                  setShowBulkFolderModal(true)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: 'var(--color-primary-light)',
                  fontSize: '11px',
                  fontWeight: 700,
                  height: '28px',
                }}
                title="Bulk create or assign Google Drive folders for each shot"
              >
                <FolderPlus size={13} />
                <span>Bulk Drive Folders</span>
              </button>
            )}

            {/* ARTIST SHOT PREFERENCES & CAPACITY BUTTON */}
            {isViewerArtist ? (
              <button
                onClick={() => handleOpenPreferencesModal()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(124, 58, 237, 0.2)',
                  border: '1px solid rgba(124, 58, 237, 0.6)',
                  color: 'var(--color-purple)',
                  fontSize: '11px',
                  fontWeight: 700,
                  height: '28px',
                  cursor: 'pointer',
                }}
              >
                <Star size={13} />
                <span>My Shot Preferences</span>
                {myPref && (
                  <span
                    style={{
                      background: 'var(--color-purple)',
                      color: '#fff',
                      borderRadius: 'var(--radius-full)',
                      padding: '1px 5px',
                      fontSize: '9px',
                    }}
                  >
                    Max {myPref.maxShots}
                  </span>
                )}
              </button>
            ) : canAssign ? (
              <button
                onClick={() => handleOpenPreferencesModal()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(124, 58, 237, 0.15)',
                  border: '1px solid rgba(124, 58, 237, 0.4)',
                  color: 'var(--color-purple)',
                  fontSize: '11px',
                  fontWeight: 700,
                  height: '28px',
                  cursor: 'pointer',
                }}
                title="View & configure artist shot preferences"
              >
                <Star size={13} />
                <span>Preferences</span>
                {(project.artistPreferences || []).length > 0 && (
                  <span
                    style={{
                      background: 'var(--color-purple)',
                      color: '#fff',
                      borderRadius: 'var(--radius-full)',
                      padding: '1px 5px',
                      fontSize: '9px',
                    }}
                  >
                    {(project.artistPreferences || []).length}
                  </span>
                )}
              </button>
            ) : null}

            {/* OPT-INS & BULK ALLOTMENT BUTTON */}
            {canAssign && (
              <button
                onClick={() => setShowBulkCenter(!showBulkCenter)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: showBulkCenter ? 'var(--color-amber)' : 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  color: showBulkCenter ? '#000' : 'var(--text-main)',
                  fontSize: '11px',
                  fontWeight: 700,
                  height: '28px',
                }}
              >
                <Users size={13} />
                <span>Opt-Ins & Bulk Allotment</span>
                {unassignedShots > 0 && (
                  <span
                    style={{
                      background: 'var(--color-red)',
                      color: '#fff',
                      borderRadius: 'var(--radius-full)',
                      padding: '1px 5px',
                      fontSize: '9.5px',
                    }}
                  >
                    {unassignedShots}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Counters Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
            gap: '6px',
            background: 'var(--bg-main)',
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', fontWeight: 700 }}>UNASSIGNED</div>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 800,
                color: unassignedShots > 0 ? 'var(--color-red)' : 'var(--color-green)',
              }}
            >
              {unassignedShots} shots
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', fontWeight: 700 }}>SKETCHED</div>
            <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--color-amber)' }}>
              {sketchedCount} / {totalPanels}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', fontWeight: 700 }}>LINED</div>
            <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--color-cyan)' }}>
              {linedCount} / {totalPanels}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', fontWeight: 700 }}>COLORED</div>
            <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--color-purple)' }}>
              {coloredCount} / {totalPanels}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', fontWeight: 700 }}>COMPLETED</div>
            <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--color-green)' }}>
              {completedCount} / {totalPanels}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Bulk Drive Folder Modal for Producer */}
      {showBulkFolderModal && canAssign && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--bg-surface-elevated)',
                borderBottom: '1px solid var(--border-medium)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderPlus size={16} color="var(--color-primary-light)" />
                <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-header)' }}>
                  Bulk Shot Google Drive Folders
                </h3>
              </div>
              <button
                onClick={() => setShowBulkFolderModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '14px 16px', overflowY: 'auto', flex: 1 }}>
              {/* Mode Tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button
                  onClick={() => setBulkFolderMode('template')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: bulkFolderMode === 'template' ? 'var(--color-primary)' : 'var(--bg-main)',
                    color: bulkFolderMode === 'template' ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border-medium)',
                  }}
                >
                  Dynamic URL Template
                </button>
                <button
                  onClick={() => setBulkFolderMode('list')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: bulkFolderMode === 'list' ? 'var(--color-primary)' : 'var(--bg-main)',
                    color: bulkFolderMode === 'list' ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border-medium)',
                  }}
                >
                  Shot-by-Shot URLs
                </button>
              </div>

              {bulkFolderMode === 'template' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                    TEMPLATE PATTERN (Use <code style={{ color: 'var(--color-amber)' }}>{'{shotNumber}'}</code> as the placeholder):
                  </label>
                  <input
                    type="text"
                    value={folderTemplate}
                    onChange={(e) => setFolderTemplate(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/...?shot={shotNumber}"
                    style={{ width: '100%', fontSize: '11.5px', padding: '6px 8px', marginBottom: '10px' }}
                  />

                  <div
                    style={{
                      background: 'var(--bg-main)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '10.5px',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Live Preview on Current Shots:
                    </div>
                    {(project.shots || []).slice(0, 4).map((s) => (
                      <div
                        key={s.id}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: 'var(--text-dim)',
                          marginBottom: '2px',
                        }}
                      >
                        Shot {s.shotNumber} &rarr;{' '}
                        <span style={{ color: 'var(--color-primary-light)' }}>
                          {folderTemplate.replace('{shotNumber}', String(s.shotNumber)).replace('{shot}', String(s.shotNumber))}
                        </span>
                      </div>
                    ))}
                    {(project.shots || []).length > 4 && (
                      <div style={{ color: 'var(--text-dim)', fontSize: '10px', marginTop: '3px' }}>
                        + {(project.shots || []).length - 4} more shots will be updated.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-dim)' }}>
                        <th style={{ width: '80px', padding: '4px 6px', textAlign: 'left' }}>SHOT</th>
                        <th style={{ padding: '4px 6px', textAlign: 'left' }}>GOOGLE DRIVE FOLDER URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.shots?.map((s) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '4px 6px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            Shot {s.shotNumber}
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <input
                              type="url"
                              value={customFolderMap[s.id] ?? s.driveFolderUrl ?? ''}
                              onChange={(e) =>
                                setCustomFolderMap((prev) => ({
                                  ...prev,
                                  [s.id]: e.target.value,
                                }))
                              }
                              placeholder="https://drive.google.com/drive/folders/..."
                              style={{ width: '100%', fontSize: '11px', padding: '3px 6px' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '10px 16px',
                background: 'var(--bg-surface-elevated)',
                borderTop: '1px solid var(--border-medium)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
              }}
            >
              <button
                onClick={() => setShowBulkFolderModal(false)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyBulkFolders}
                disabled={isApplyingFolders}
                style={{
                  padding: '5px 14px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'var(--color-primary)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '11px',
                }}
              >
                {isApplyingFolders ? 'Applying...' : 'Apply Drive Folders'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2b. Artist Shot Preferences & Capacity Modal */}
      {showPrefModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setShowPrefModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--bg-surface-elevated)',
                borderBottom: '1px solid var(--border-medium)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={15} color="var(--color-purple)" />
                <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-header)' }}>
                  Shot Preferences & Capacity
                </h3>
                {canAssign ? (
                  <select
                    value={prefArtistTarget}
                    onChange={(e) => handleOpenPreferencesModal(e.target.value)}
                    style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      background: 'var(--bg-main)',
                      color: 'var(--color-purple)',
                      fontWeight: 700,
                      height: '24px',
                    }}
                  >
                    {availableArtists.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--color-purple)',
                      fontWeight: 700,
                      background: 'rgba(124, 58, 237, 0.15)',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  >
                    {prefArtistTarget}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowPrefModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '14px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Field 1: Max shots capacity (Required) */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-header)' }}>
                    MAX SHOTS CAPACITY * <span style={{ color: 'var(--color-red)' }}>(Required)</span>
                  </label>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                    Current Allotted: {artistAssignedCount[prefArtistTarget.toLowerCase()] || 0} shots
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={prefMaxShots}
                    onChange={(e) => setPrefMaxShots(e.target.value)}
                    style={{ width: '80px', fontSize: '12px', fontWeight: 800, padding: '4px 8px', height: '28px' }}
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    maximum shots {prefArtistTarget} can comfortably take
                  </span>
                </div>
              </div>

              {/* Field 2: Ranked Preferences (1st to 5th, Optional) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-header)' }}>
                    RANKED PREFERENCES (1st &ndash; 5th)
                  </label>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                    Optional &bull; Max 5 choices
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[0, 1, 2, 3, 4].map((slotIdx) => {
                    const rankLabel = ['1st Preference', '2nd Preference', '3rd Preference', '4th Preference', '5th Preference'][slotIdx]
                    const currentVal = prefChoices[slotIdx] ?? ''

                    return (
                      <div
                        key={slotIdx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '120px 1fr 24px',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ fontSize: '11px', fontWeight: 700, color: slotIdx === 0 ? 'var(--color-purple)' : 'var(--text-muted)' }}>
                          {rankLabel}:
                        </span>
                        <select
                          value={currentVal}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value)
                            handleRankChoiceChange(slotIdx, val)
                          }}
                          style={{
                            width: '100%',
                            fontSize: '11px',
                            padding: '3px 8px',
                            background: currentVal !== '' ? 'rgba(124, 58, 237, 0.12)' : 'var(--bg-main)',
                            borderColor: currentVal !== '' ? 'rgba(124, 58, 237, 0.4)' : 'var(--border-medium)',
                            color: currentVal !== '' ? 'var(--text-header)' : 'var(--text-dim)',
                            height: '26px',
                          }}
                        >
                          <option value="">(None / Open to any)</option>
                          {project.shots?.map((s) => {
                            const isChosenElsewhere = prefChoices.some((c, i) => i !== slotIdx && c === s.shotNumber)
                            const isAvoided = prefAvoidShots.includes(s.shotNumber)
                            const isAlreadyAssigned = s.assignedArtist && s.assignedArtist.toLowerCase() === prefArtistTarget.toLowerCase()

                            return (
                              <option
                                key={s.id}
                                value={s.shotNumber}
                                disabled={isChosenElsewhere}
                              >
                                Shot {s.shotNumber} {s.sceneIntro ? `— ${s.sceneIntro.slice(0, 30)}` : ''} ({s.panels?.length || 0} panels)
                                {isAlreadyAssigned ? ' [Assigned]' : isAvoided ? ' [Avoided]' : ''}
                                {isChosenElsewhere ? ' (Picked)' : ''}
                              </option>
                            )
                          })}
                        </select>
                        {currentVal !== '' ? (
                          <button
                            type="button"
                            onClick={() => handleRankChoiceChange(slotIdx, '')}
                            title="Clear this choice"
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                          >
                            <X size={12} />
                          </button>
                        ) : <span />}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Field 3: Avoid List (Shots they absolutely don't want to do, Optional) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-header)' }}>
                    SHOTS TO AVOID (DO NOT WANT)
                  </label>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                    Optional &bull; Click to toggle
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    background: 'var(--bg-main)',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    maxHeight: '120px',
                    overflowY: 'auto',
                  }}
                >
                  {project.shots && project.shots.length > 0 ? (
                    project.shots.map((s) => {
                      const isAvoided = prefAvoidShots.includes(s.shotNumber)
                      const isPreferred = prefChoices.includes(s.shotNumber)

                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleToggleAvoidShot(s.shotNumber)}
                          style={{
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-xs)',
                            fontSize: '10.5px',
                            fontWeight: isAvoided ? 700 : 500,
                            background: isAvoided
                              ? 'rgba(239, 68, 68, 0.2)'
                              : 'var(--bg-surface)',
                            border: isAvoided
                              ? '1px solid var(--color-red)'
                              : '1px solid var(--border-subtle)',
                            color: isAvoided
                              ? 'var(--color-red)'
                              : isPreferred
                              ? 'var(--color-purple)'
                              : 'var(--text-muted)',
                            cursor: 'pointer',
                          }}
                        >
                          {isAvoided ? `Avoid Shot ${s.shotNumber}` : `Shot ${s.shotNumber}`}
                        </button>
                      )
                    })
                  ) : (
                    <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>No shots created yet</span>
                  )}
                </div>
              </div>

              {/* Field 4: Optional Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '3px' }}>
                  NOTES / AVAILABILITY (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={prefNotes}
                  onChange={(e) => setPrefNotes(e.target.value)}
                  placeholder="e.g. Can start on Monday, prefer action scenes..."
                  style={{ width: '100%', fontSize: '11px', padding: '4px 8px', height: '26px' }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '8px 14px',
                background: 'var(--bg-surface-elevated)',
                borderTop: '1px solid var(--border-medium)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
              }}
            >
              <button
                type="button"
                onClick={() => setShowPrefModal(false)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={isSavingPref || !prefMaxShots || Number(prefMaxShots) < 1}
                style={{
                  padding: '4px 14px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'var(--color-primary)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '11px',
                  cursor: isSavingPref ? 'not-allowed' : 'pointer',
                }}
              >
                {isSavingPref ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2c. Split Incomplete Shot / Ratio Wheel Modal (Producer & Director Only) */}
      {splitModalShot && canAssign && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setSplitModalShot(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--bg-surface-elevated)',
                borderBottom: '1px solid var(--border-medium)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieChart size={16} color="var(--color-yellow)" />
                <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-header)' }}>
                  Divide Shot {splitModalShot.shotNumber} - Ratio Wheel
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSplitModalShot(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '14px 16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '8px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-header)' }}>
                    Shot {splitModalShot.shotNumber}: {splitModalShot.sceneIntro || 'Scene'}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                    {splitModalShot.isAnimated ? 'Animated Shot' : `${splitModalShot.panels?.length || 0} Panels`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Shot Payout</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-green)' }}>
                    ${getShotTotalPay(splitModalShot)}
                  </div>
                </div>
              </div>

              {/* Ratio Wheel Graphic */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
                {renderRatioWheel(splits, getShotTotalPay(splitModalShot))}
              </div>

              {/* 2-Way Quick Slider if 2 artists */}
              {splits.length === 2 && (
                <div style={{ background: 'var(--bg-main)', padding: '10px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: 700, marginBottom: '6px' }}>
                    <span style={{ color: SPLIT_COLORS[0] }}>{splits[0].artistName}: {splits[0].percentage}% (${splits[0].amount})</span>
                    <span style={{ color: SPLIT_COLORS[1] }}>{splits[1].artistName}: {splits[1].percentage}% (${splits[1].amount})</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={splits[0].percentage}
                    onChange={(e) => handleTwoWayRatio(Number(e.target.value))}
                    style={{ width: '100%', accentColor: SPLIT_COLORS[0], cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '8px' }}>
                    {[50, 60, 70, 80, 90].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleTwoWayRatio(pct)}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-xs)',
                          fontSize: '10px',
                          fontWeight: 600,
                          background: splits[0].percentage === pct ? 'var(--color-primary)' : 'var(--bg-surface)',
                          color: splits[0].percentage === pct ? '#fff' : 'var(--text-muted)',
                          border: '1px solid var(--border-medium)',
                          cursor: 'pointer',
                        }}
                      >
                        {pct} / {100 - pct}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Artist Splits List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Artists & Pay Allocation
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSplitArtist}
                    disabled={splits.length >= availableArtists.length}
                    style={{
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: 600,
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-xs)',
                      color: 'var(--color-yellow)',
                      cursor: splits.length >= availableArtists.length ? 'not-allowed' : 'pointer',
                    }}
                  >
                    + Add Co-Artist
                  </button>
                </div>

                {splits.map((split, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'var(--bg-main)',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: SPLIT_COLORS[idx % SPLIT_COLORS.length],
                        flexShrink: 0,
                      }}
                    />

                    <select
                      value={split.artistName}
                      onChange={(e) => handleSplitArtistChange(idx, e.target.value)}
                      style={{ flex: 1, fontSize: '11px', padding: '3px 6px', background: 'var(--bg-surface)' }}
                    >
                      {availableArtists.map((a) => (
                        <option key={a.name} value={a.name}>
                          {a.name}
                        </option>
                      ))}
                    </select>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={split.percentage}
                        onChange={(e) => handleMultiPercentageChange(idx, Number(e.target.value))}
                        style={{ width: '48px', fontSize: '11px', padding: '3px 4px', textAlign: 'right' }}
                      />
                      <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>%</span>
                    </div>

                    <div
                      style={{
                        minWidth: '55px',
                        textAlign: 'right',
                        fontWeight: 700,
                        fontSize: '11.5px',
                        color: 'var(--color-green)',
                      }}
                    >
                      ${split.amount}
                    </div>

                    {splits.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSplitArtist(idx)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                        title="Remove artist from split"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Reason / Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '3px', textTransform: 'uppercase' }}>
                  Split Notes / Hand-Off Context
                </label>
                <input
                  type="text"
                  value={splitNotes}
                  onChange={(e) => setSplitNotes(e.target.value)}
                  placeholder="e.g. Artist A completed rough sketch (40%), Artist B took over lines & color (60%)"
                  style={{ width: '100%', fontSize: '10.5px', padding: '4px 8px', height: '26px' }}
                />
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '8px 14px',
                background: 'var(--bg-surface-elevated)',
                borderTop: '1px solid var(--border-medium)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                {splitModalShot.artistSplits && splitModalShot.artistSplits.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSplit}
                    disabled={isSavingSplit}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-xs)',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: 'var(--color-red)',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Clear Split
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSplitModalShot(null)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-xs)',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSplit}
                  disabled={isSavingSplit}
                  style={{
                    padding: '4px 14px',
                    borderRadius: 'var(--radius-xs)',
                    background: 'var(--color-primary)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '11px',
                    cursor: isSavingSplit ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSavingSplit ? 'Saving...' : 'Save Ratio Split'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Bulk Allotment & Opt-In Control Panel */}
      {showBulkCenter && canAssign && (
        <div
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--color-amber)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            marginBottom: '14px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-amber" style={{ fontSize: '10px' }}>
                Bulk Allotment Center
              </span>
            </div>
            <button
              onClick={() => setShowBulkCenter(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Artist Capacity & Preferences Matrix */}
          <div style={{ marginBottom: '10px', background: 'var(--bg-main)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Star size={12} color="var(--color-purple)" />
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-header)' }}>
                  Artist Preferences & Capacity Matrix
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                  ({(project.artistPreferences || []).length} artists configured)
                </span>
              </div>
              <button
                onClick={() => handleOpenPreferencesModal()}
                style={{
                  fontSize: '10.5px',
                  color: 'var(--color-primary-light)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                + Set / Edit Artist Preferences
              </button>
            </div>

            <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-dim)', fontSize: '9.5px' }}>
                    <th style={{ padding: '3px 6px', textAlign: 'left', width: '110px' }}>ARTIST</th>
                    <th style={{ padding: '3px 6px', textAlign: 'center', width: '80px' }}>CAPACITY</th>
                    <th style={{ padding: '3px 6px', textAlign: 'center', width: '90px' }}>ALLOTTED</th>
                    <th style={{ padding: '3px 6px', textAlign: 'left' }}>RANKED PREFERENCES (1st - 5th)</th>
                    <th style={{ padding: '3px 6px', textAlign: 'left', width: '130px' }}>DO NOT WANT</th>
                    <th style={{ padding: '3px 6px', textAlign: 'right', width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {availableArtists.map((artist) => {
                    const pref = (project.artistPreferences || []).find(
                      (p) => p.artistName.toLowerCase() === artist.name.toLowerCase()
                    )
                    const assignedCount = artistAssignedCount[artist.name.toLowerCase()] || 0
                    const maxShots = pref?.maxShots || 0
                    const hasPrefs = pref && pref.preferredShots && pref.preferredShots.length > 0
                    const hasAvoids = pref && pref.avoidShots && pref.avoidShots.length > 0
                    const isAtCapacity = maxShots > 0 && assignedCount >= maxShots

                    return (
                      <tr key={artist.name} style={{ borderBottom: '1px solid var(--border-subtle)', background: isAtCapacity ? 'rgba(234, 179, 8, 0.05)' : 'transparent' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 700, color: 'var(--text-header)' }}>
                          {artist.name}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                          {maxShots > 0 ? (
                            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{maxShots} shots</span>
                          ) : (
                            <span style={{ color: 'var(--text-dim)', fontSize: '9.5px' }}>Not set</span>
                          )}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '1px 5px',
                              borderRadius: 'var(--radius-xs)',
                              fontSize: '9.5px',
                              fontWeight: 800,
                              background: isAtCapacity ? 'rgba(234, 179, 8, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                              color: isAtCapacity ? 'var(--color-amber)' : 'var(--color-green)',
                            }}
                          >
                            {assignedCount} / {maxShots || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          {hasPrefs ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              {pref!.preferredShots.map((shotNum, rankIdx) => {
                                const rankLabel = ['1st', '2nd', '3rd', '4th', '5th'][rankIdx]
                                const matchingShot = project.shots?.find((s) => s.shotNumber === shotNum)
                                const isAssignedToThis = matchingShot?.assignedArtist?.toLowerCase() === artist.name.toLowerCase()
                                const isAssignedToOther = matchingShot?.assignedArtist && !isAssignedToThis

                                return (
                                  <button
                                    key={shotNum}
                                    onClick={() => {
                                      if (matchingShot && !isAssignedToThis) {
                                        onBulkAssign([matchingShot.id], artist.name)
                                      }
                                    }}
                                    disabled={isAssignedToThis}
                                    title={
                                      isAssignedToThis
                                        ? `Already assigned to ${artist.name}`
                                        : isAssignedToOther
                                        ? `Assigned to ${matchingShot?.assignedArtist}. Click to reassign to ${artist.name}`
                                        : `Click to allot Shot ${shotNum} to ${artist.name}`
                                    }
                                    style={{
                                      background: isAssignedToThis
                                        ? 'rgba(16, 185, 129, 0.15)'
                                        : isAssignedToOther
                                        ? 'rgba(234, 179, 8, 0.12)'
                                        : 'rgba(124, 58, 237, 0.15)',
                                      border: isAssignedToThis
                                        ? '1px solid rgba(16, 185, 129, 0.4)'
                                        : isAssignedToOther
                                        ? '1px solid rgba(234, 179, 8, 0.4)'
                                        : '1px solid rgba(124, 58, 237, 0.4)',
                                      color: isAssignedToThis
                                        ? 'var(--color-green)'
                                        : isAssignedToOther
                                        ? 'var(--color-amber)'
                                        : 'var(--color-purple)',
                                      padding: '1px 5px',
                                      borderRadius: 'var(--radius-xs)',
                                      fontSize: '9.5px',
                                      fontWeight: 600,
                                      cursor: isAssignedToThis ? 'default' : 'pointer',
                                    }}
                                  >
                                    {rankLabel}: #{shotNum} {isAssignedToThis ? '✓' : isAssignedToOther ? `(Reassign)` : '+ Allot'}
                                  </button>
                                )
                              })}
                            </div>
                          ) : (
                            <span style={{ fontSize: '9.5px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                              Open to any shot
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          {hasAvoids ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
                              {pref!.avoidShots.map((shotNum) => (
                                <span
                                  key={shotNum}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    color: 'var(--color-red)',
                                    padding: '1px 4px',
                                    borderRadius: 'var(--radius-xs)',
                                    fontSize: '9px',
                                    fontWeight: 600,
                                  }}
                                >
                                  Avoid #{shotNum}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '9.5px', color: 'var(--text-dim)' }}>None</span>
                          )}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenPreferencesModal(artist.name)}
                            style={{
                              padding: '1px 5px',
                              borderRadius: 'var(--radius-xs)',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-medium)',
                              color: 'var(--text-muted)',
                              fontSize: '9.5px',
                              cursor: 'pointer',
                            }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Allotment Actions Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              background: 'var(--bg-main)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                {selectedShotIds.length} shot(s) selected:
              </span>
              <button
                onClick={selectAllUnassigned}
                style={{
                  fontSize: '11px',
                  color: 'var(--color-amber)',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  background: 'none',
                  border: 'none',
                }}
              >
                Select All Unassigned
              </button>
              {selectedShotIds.length > 0 && (
                <button
                  onClick={() => setSelectedShotIds([])}
                  style={{ fontSize: '11px', color: 'var(--text-dim)', background: 'none', border: 'none' }}
                >
                  Clear
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
              <select
                value={bulkArtistTarget}
                onChange={(e) => setBulkArtistTarget(e.target.value)}
                style={{ fontSize: '11px', padding: '3px 8px', background: 'var(--bg-surface)' }}
              >
                <option value="">Choose Artist to Assign...</option>
                {availableArtists.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={bulkDeadline}
                onChange={(e) => setBulkDeadline(e.target.value)}
                title="Optional Deadline"
                style={{ fontSize: '11px', padding: '3px 6px' }}
              />

              <button
                onClick={handleExecuteBulkAssign}
                disabled={selectedShotIds.length === 0 || !bulkArtistTarget || isBulkAssigning}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-xs)',
                  background:
                    selectedShotIds.length > 0 && bulkArtistTarget
                      ? 'var(--color-amber)'
                      : 'var(--bg-surface)',
                  border: '1px solid var(--border-medium)',
                  color: selectedShotIds.length > 0 && bulkArtistTarget ? '#000' : 'var(--text-dim)',
                  fontWeight: 700,
                  fontSize: '11px',
                }}
              >
                {isBulkAssigning ? 'Assigning...' : `Assign to ${bulkArtistTarget || 'Artist'} →`}
              </button>
            </div>
          </div>

          {/* Opt-Ins Summary Table */}
          <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-dim)' }}>
                  <th style={{ width: '36px', padding: '3px 6px', textAlign: 'center' }}>SELECT</th>
                  <th style={{ width: '60px', padding: '3px 6px', textAlign: 'left' }}>SHOT</th>
                  <th style={{ padding: '3px 6px', textAlign: 'left' }}>SCENE</th>
                  <th style={{ width: '130px', padding: '3px 6px', textAlign: 'left' }}>CURRENT ASSIGNMENT</th>
                  <th style={{ padding: '3px 6px', textAlign: 'left' }}>ARTISTS OPTED IN</th>
                </tr>
              </thead>
              <tbody>
                {project.shots?.map((shot) => {
                  const isSelected = selectedShotIds.includes(shot.id)
                  const hasOptIns = shot.artistOptIns && shot.artistOptIns.length > 0

                  return (
                    <tr
                      key={shot.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(217, 119, 6, 0.08)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '4px', textAlign: 'center' }}>
                        <button
                          onClick={() => toggleSelectShot(shot.id)}
                          style={{ color: 'var(--text-dim)', background: 'none', border: 'none' }}
                        >
                          {isSelected ? <CheckSquare size={12} color="var(--color-amber)" /> : <Square size={12} />}
                        </button>
                      </td>
                      <td style={{ padding: '4px 6px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        Shot {shot.shotNumber}
                      </td>
                      <td style={{ padding: '4px 6px', color: 'var(--text-muted)' }}>
                        {shot.sceneIntro || 'Scene'} ({shot.panels?.length || 0} panels)
                      </td>
                      <td style={{ padding: '4px 6px', fontWeight: 600 }}>
                        {shot.assignedArtist ? (
                          <span style={{ color: 'var(--text-main)' }}>{shot.assignedArtist}</span>
                        ) : (
                          <span style={{ color: 'var(--color-red)' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        {hasOptIns ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                            {shot.artistOptIns!.map((artName) => (
                              <button
                                key={artName}
                                onClick={() => onBulkAssign([shot.id], artName)}
                                title={`Click to assign Shot ${shot.shotNumber} directly to ${artName}`}
                                style={{
                                  background:
                                    shot.assignedArtist === artName
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : 'rgba(124, 58, 237, 0.15)',
                                  border:
                                    shot.assignedArtist === artName
                                      ? '1px solid rgba(16, 185, 129, 0.4)'
                                      : '1px solid rgba(124, 58, 237, 0.4)',
                                  color: shot.assignedArtist === artName ? 'var(--color-green)' : 'var(--color-purple)',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--radius-xs)',
                                  fontSize: '9.5px',
                                  fontWeight: 600,
                                }}
                              >
                                {artName} {shot.assignedArtist === artName ? '✓' : '+ Assign'}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '9.5px' }}>No opt-ins yet</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Filters & Search */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '200px' }}>
            <Search size={12} style={{ position: 'absolute', left: '8px', top: '7px', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search shot, panel, lyrics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', fontSize: '11px', padding: '4px 8px 4px 26px', height: '26px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={11} color="var(--text-dim)" />
            <select
              value={artistFilter}
              onChange={(e) => setArtistFilter(e.target.value)}
              style={{ fontSize: '11px', padding: '4px 8px', background: 'var(--bg-surface)', height: '26px' }}
            >
              <option value="ALL">All Artists</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              {availableArtists.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ fontSize: '11px', padding: '4px 8px', background: 'var(--bg-surface)', height: '26px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="Not Started">Not Started</option>
            <option value="Sketched">Sketched</option>
            <option value="Lined">Lined</option>
            <option value="Colored">Colored</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isViewerArtist ? (
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Viewing as Artist: <strong style={{ color: 'var(--color-purple)' }}>{effectiveArtistName}</strong>
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Logged in as: <strong style={{ color: 'var(--color-amber)' }}>{activeArtistName}</strong> (Producer/Director)
            </div>
          )}
        </div>
      </div>

      {/* 4. Controls & Artist Preferences Status Strip */}
      <div
        style={{
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 12px',
          marginBottom: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isViewerArtist ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-purple)' }}>
                {effectiveArtistName}
              </span>

              {myPref ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: 'rgba(124, 58, 237, 0.15)',
                      border: '1px solid rgba(124, 58, 237, 0.4)',
                      color: 'var(--color-purple)',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '10px',
                      fontWeight: 600,
                    }}
                  >
                    Max {myPref.maxShots} shots ({artistAssignedCount[effectiveArtistName.toLowerCase()] || 0} assigned)
                  </span>

                  {myPref.preferredShots && myPref.preferredShots.length > 0 && (
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      &bull; Prefers: {myPref.preferredShots.map((n, i) => `${['1st', '2nd', '3rd', '4th', '5th'][i]}: #${n}`).join(', ')}
                    </span>
                  )}

                  {myPref.avoidShots && myPref.avoidShots.length > 0 && (
                    <span style={{ fontSize: '10.5px', color: 'var(--color-red)' }}>
                      &bull; Avoid: {myPref.avoidShots.map((n) => `#${n}`).join(', ')}
                    </span>
                  )}

                  <button
                    onClick={() => handleOpenPreferencesModal()}
                    style={{
                      padding: '2px 7px',
                      borderRadius: 'var(--radius-xs)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-header)',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginLeft: '4px',
                    }}
                  >
                    Edit Preferences
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleOpenPreferencesModal()}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-xs)',
                    background: 'var(--color-purple)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Set Shot Preferences & Capacity
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-amber)' }}>
                Leadership View
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                &bull; {(project.artistPreferences || []).length} artist preferences submitted
              </span>
              <button
                onClick={() => handleOpenPreferencesModal()}
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-header)',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginLeft: '4px',
                }}
              >
                Configure Artist Preferences
              </button>
            </div>
          )}
        </div>

        {/* Quick Toggle for Producer to preview artist view */}
        {canAssign && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {previewArtist ? (
              <button
                onClick={() => setPreviewArtist(null)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-main)',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Exit Artist Preview
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Preview Artist:</span>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) setPreviewArtist(e.target.value)
                  }}
                  style={{ fontSize: '10.5px', padding: '2px 6px', background: 'var(--bg-main)', height: '22px' }}
                >
                  <option value="">Select Artist...</option>
                  {availableArtists.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Shots List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredShots.map((shot) => {
          const shotTotal =
            (shot.isAnimated && shot.customPrice ? Number(shot.customPrice) : 0) +
            (shot.panels?.reduce((acc, p) => acc + (p.price || 0), 0) || 0)

          const isAssigned = !!shot.assignedArtist
          const isMyShot = Boolean(shot.assignedArtist && shot.assignedArtist.toLowerCase() === effectiveArtistName.toLowerCase())
          const isEditingThisDrive = editingDriveShotId === shot.id

          const shotLastUpdated = new Date(shot.updatedAt || project.createdAt).getTime()
          const diffDays = Math.floor((Date.now() - shotLastUpdated) / (1000 * 3600 * 24))
          const allPanelsCompleted = !shot.isAnimated && (shot.panels?.length > 0) && shot.panels.every((p) => p.status === 'Completed')
          const isLagging = (isAssigned || shot.isAnimated) && !allPanelsCompleted && diffDays >= 3

          return (
            <div
              key={shot.id}
              style={{
                background: 'var(--bg-surface)',
                border: isLagging
                  ? '1px solid rgba(239, 68, 68, 0.5)'
                  : isMyShot
                  ? '1px solid rgba(124, 58, 237, 0.4)'
                  : !isAssigned
                  ? '1px solid rgba(225, 29, 72, 0.3)'
                  : '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              {/* Shot Header Bar */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  borderBottom: '1px solid var(--border-medium)',
                  padding: '7px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      color: shot.isAnimated ? 'var(--color-purple)' : 'var(--color-amber)',
                      fontSize: '11.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    SHOT {shot.shotNumber}
                    {shot.isAnimated && <Sparkles size={11} />}
                  </div>

                  <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {shot.sceneIntro || 'Scene'}
                  </span>

                  <span
                    style={{
                      background: 'var(--color-green-soft)',
                      color: 'var(--color-green)',
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '10.5px',
                      fontWeight: 700,
                    }}
                  >
                    Pays ${shotTotal}
                  </span>

                  {/* LAG INACTIVITY BADGE (3+ days) */}
                  {isLagging && (
                    <span
                      style={{
                        background: 'rgba(239, 68, 68, 0.18)',
                        border: '1px solid rgba(239, 68, 68, 0.6)',
                        color: 'var(--color-red)',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '10px',
                        fontWeight: 800,
                      }}
                      title={`No update for ${diffDays} consecutive days`}
                    >
                      Lag: {diffDays}d Inactive
                    </span>
                  )}

                  {/* ARTIST SPLIT BADGE */}
                  {shot.artistSplits && shot.artistSplits.length > 0 && (
                    <span
                      style={{
                        background: 'rgba(88, 101, 242, 0.18)',
                        border: '1px solid #5865f2',
                        color: '#5865f2',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '10px',
                        fontWeight: 700,
                      }}
                      title="Divided among multiple artists"
                    >
                      Split: {shot.artistSplits.map((s) => `${s.artistName} (${s.percentage}% / $${s.amount})`).join(' + ')}
                    </span>
                  )}

                  {/* DIVIDE SHOT / RATIO WHEEL BUTTON (PRODUCER/DIRECTOR ONLY) */}
                  {canAssign && (
                    <button
                      type="button"
                      onClick={() => handleOpenSplitModal(shot)}
                      title="Divide this shot among multiple artists and set pay ratio"
                      style={{
                        padding: '2px 7px',
                        fontSize: '10px',
                        background: shot.artistSplits && shot.artistSplits.length > 0 ? 'rgba(88, 101, 242, 0.2)' : 'var(--bg-main)',
                        border: shot.artistSplits && shot.artistSplits.length > 0 ? '1px solid #5865f2' : '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-xs)',
                        color: shot.artistSplits && shot.artistSplits.length > 0 ? '#5865f2' : 'var(--color-yellow)',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {shot.artistSplits && shot.artistSplits.length > 0 ? 'Edit Ratio Wheel' : 'Divide Shot'}
                    </button>
                  )}

                  {/* SHOT GOOGLE DRIVE SUBMISSION FOLDER */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginLeft: '6px' }}>
                    {isEditingThisDrive ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="url"
                          value={tempDriveUrl}
                          onChange={(e) => setTempDriveUrl(e.target.value)}
                          placeholder="https://drive.google.com/drive/folders/..."
                          style={{ fontSize: '10px', padding: '2px 5px', width: '220px', height: '20px' }}
                        />
                        <button
                          onClick={() => handleSaveShotDrive(shot.id)}
                          style={{
                            background: 'var(--color-green)',
                            color: '#000',
                            border: 'none',
                            borderRadius: 'var(--radius-xs)',
                            padding: '2px 6px',
                            fontSize: '10px',
                            fontWeight: 700,
                            height: '20px',
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingDriveShotId(null)
                            setTempDriveUrl('')
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '10px' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : shot.driveFolderUrl ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <a
                          href={shot.driveFolderUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-xs)',
                            background: 'rgba(59, 130, 246, 0.12)',
                            border: '1px solid rgba(59, 130, 246, 0.35)',
                            color: 'var(--color-primary-light)',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                          title="Open Google Drive Submission Folder for this Shot"
                        >
                          <FolderOpen size={11} />
                          <span>Shot Drive Folder</span>
                          <ExternalLink size={10} />
                        </a>
                        {canAssign && (
                          <button
                            onClick={() => {
                              setEditingDriveShotId(shot.id)
                              setTempDriveUrl(shot.driveFolderUrl || '')
                            }}
                            title="Edit Drive Folder Link"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-dim)',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Edit2 size={10} />
                          </button>
                        )}
                      </div>
                    ) : canAssign ? (
                      <button
                        onClick={() => {
                          setEditingDriveShotId(shot.id)
                          setTempDriveUrl('')
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-xs)',
                          background: 'var(--bg-main)',
                          border: '1px dashed var(--border-medium)',
                          color: 'var(--text-dim)',
                          fontSize: '10px',
                        }}
                      >
                        <FolderPlus size={10} />
                        <span>+ Set Folder</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>No folder set</span>
                    )}
                  </div>
                </div>

                {/* Right: Artist allotment & preferences actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {isViewerArtist ? (
                    /* ARTIST VIEW ON SHOT CARD (Preference-driven, no per-shot opt button) */
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {shot.assignedArtist ? (
                        shot.assignedArtist.toLowerCase() === effectiveArtistName.toLowerCase() ? (
                          <span
                            style={{
                              background: 'rgba(16, 185, 129, 0.18)',
                              border: '1px solid var(--color-green)',
                              color: 'var(--color-green)',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-xs)',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            Assigned to You!
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                            Assigned: <strong style={{ color: 'var(--text-muted)' }}>{shot.assignedArtist}</strong>
                          </span>
                        )
                      ) : (
                        (() => {
                          const rankIdx = myPref?.preferredShots ? myPref.preferredShots.indexOf(shot.shotNumber) : -1
                          const isAvoided = myPref?.avoidShots ? myPref.avoidShots.includes(shot.shotNumber) : false

                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {rankIdx !== -1 ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    background: 'rgba(124, 58, 237, 0.18)',
                                    border: '1px solid var(--color-purple)',
                                    color: 'var(--color-purple)',
                                    padding: '2px 8px',
                                    borderRadius: 'var(--radius-xs)',
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                  }}
                                  title="You selected this shot in your preferences"
                                >
                                  Your {['1st', '2nd', '3rd', '4th', '5th'][rankIdx]} Choice
                                </span>
                              ) : isAvoided ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                    color: 'var(--color-red)',
                                    padding: '2px 8px',
                                    borderRadius: 'var(--radius-xs)',
                                    fontSize: '10.5px',
                                    fontWeight: 600,
                                  }}
                                  title="You marked this shot as avoided"
                                >
                                  Marked to Avoid
                                </span>
                              ) : (
                                <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                                  Open to Any
                                </span>
                              )}

                              <button
                                onClick={() => handleOpenPreferencesModal()}
                                title="Adjust your shot preferences"
                                style={{
                                  background: 'var(--bg-main)',
                                  border: '1px solid var(--border-medium)',
                                  color: 'var(--text-header)',
                                  padding: '2px 7px',
                                  borderRadius: 'var(--radius-xs)',
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Edit Prefs
                              </button>
                            </div>
                          )
                        })()
                      )}

                      {shot.deadline && (
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Due {shot.deadline}</span>
                      )}
                    </div>
                  ) : (
                    /* PRODUCER / LEADERSHIP VIEW ON SHOT CARD */
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', fontWeight: 600 }}>ARTIST:</span>
                        <select
                          value={shot.assignedArtist || ''}
                          onChange={(e) => onUpdateShot(shot.id, { assignedArtist: e.target.value })}
                          style={{
                            background: 'var(--bg-main)',
                            borderColor: isAssigned ? 'var(--border-medium)' : 'var(--color-red)',
                            color: isAssigned ? 'var(--text-main)' : 'var(--color-red)',
                            fontWeight: 600,
                            fontSize: '10.5px',
                            padding: '2px 6px',
                            height: '24px',
                          }}
                        >
                          <option value="">Unassigned</option>
                          {availableArtists.map((a) => (
                            <option key={a.name} value={a.name}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Deadline */}
                      <input
                        type="date"
                        value={shot.deadline || ''}
                        onChange={(e) => onUpdateShot(shot.id, { deadline: e.target.value })}
                        style={{ fontSize: '10.5px', padding: '2px 5px', height: '24px' }}
                      />

                      {/* PREFERENCES & ALLOTMENT DISPLAY */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          paddingLeft: '8px',
                          borderLeft: '1px solid var(--border-medium)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700 }}>PREFERENCES:</span>
                        {(() => {
                          const candidatePrefs = (project.artistPreferences || []).filter((p) =>
                            p.preferredShots?.includes(shot.shotNumber)
                          )
                          const avoiders = (project.artistPreferences || []).filter((p) =>
                            p.avoidShots?.includes(shot.shotNumber)
                          )

                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              {candidatePrefs.length > 0 ? (
                                candidatePrefs.map((pref) => {
                                  const rank = (pref.preferredShots?.indexOf(shot.shotNumber) ?? 0) + 1
                                  const rankWord = ['1st', '2nd', '3rd', '4th', '5th'][rank - 1] || `${rank}th`
                                  const isCurrent = shot.assignedArtist?.toLowerCase() === pref.artistName.toLowerCase()

                                  return (
                                    <button
                                      key={pref.artistName}
                                      onClick={() => onBulkAssign([shot.id], pref.artistName)}
                                      title={`Assign Shot ${shot.shotNumber} to ${pref.artistName} (${rankWord} choice)`}
                                      style={{
                                        background: isCurrent ? 'rgba(16, 185, 129, 0.2)' : 'rgba(124, 58, 237, 0.2)',
                                        border: isCurrent ? '1px solid var(--color-green)' : '1px solid rgba(124, 58, 237, 0.5)',
                                        color: isCurrent ? 'var(--color-green)' : 'var(--color-purple)',
                                        padding: '2px 6px',
                                        borderRadius: 'var(--radius-xs)',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {pref.artistName} ({rankWord}) {isCurrent ? '✓' : '+ Allot'}
                                    </button>
                                  )
                                })
                              ) : shot.artistOptIns && shot.artistOptIns.length > 0 ? (
                                shot.artistOptIns.map((artName) => (
                                  <button
                                    key={artName}
                                    onClick={() => onBulkAssign([shot.id], artName)}
                                    title={`Assign Shot ${shot.shotNumber} to ${artName}`}
                                    style={{
                                      background: 'rgba(124, 58, 237, 0.15)',
                                      border: '1px solid rgba(124, 58, 237, 0.4)',
                                      color: 'var(--color-purple)',
                                      padding: '2px 6px',
                                      borderRadius: 'var(--radius-xs)',
                                      fontSize: '9.5px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {artName} + Allot
                                  </button>
                                ))
                              ) : (
                                <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                  None yet
                                </span>
                              )}

                              {avoiders.length > 0 && (
                                <span
                                  title={`Avoided by: ${avoiders.map((a) => a.artistName).join(', ')}`}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                    color: 'var(--color-red)',
                                    padding: '1px 5px',
                                    borderRadius: 'var(--radius-xs)',
                                    fontSize: '9.5px',
                                  }}
                                >
                                  Avoided by {avoiders.map((a) => a.artistName).join(', ')}
                                </span>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Panels Table or Animated Shot Update Box */}
              {shot.isAnimated ? (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'var(--bg-main)',
                    borderTop: '1px solid var(--border-medium)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                      flexWrap: 'wrap',
                      gap: '6px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--color-purple)',
                      }}
                    >
                      <Sparkles size={12} />
                      <span>ANIMATION WIP / UPDATE</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 400 }}>
                        (Discord message link or progress log)
                      </span>
                    </div>

                    <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      Last Touch (EST): {formatEST(shot.updatedAt) || '—'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="text"
                      value={shot.latestAnimationUpdate || ''}
                      placeholder="Paste Discord message link or latest animation update..."
                      onChange={(e) => onUpdateShot(shot.id, { latestAnimationUpdate: e.target.value })}
                      style={{
                        flex: 1,
                        fontSize: '11px',
                        padding: '5px 8px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-xs)',
                        color: 'var(--text-main)',
                      }}
                    />
                    {shot.latestAnimationUpdate && (
                      <a
                        href={shot.latestAnimationUpdate}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-xs)',
                          background: 'rgba(88, 101, 242, 0.18)',
                          border: '1px solid #5865f2',
                          color: '#5865f2',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                        }}
                        title="Open Discord update link"
                      >
                        <span>Open Link</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-medium)' }}>
                      <th style={{ width: '60px', padding: '5px 8px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '10px' }}>
                        PANEL
                      </th>
                      <th style={{ width: '120px', padding: '5px 8px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '10px' }}>
                        TYPE & PAY
                      </th>
                      <th style={{ padding: '5px 8px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '10px' }}>
                        SCRIPT & DIRECTION NOTES
                      </th>
                      <th style={{ width: '80px', padding: '5px 8px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '10px' }}>
                        SKETCH OK
                      </th>
                      <th style={{ width: '140px', padding: '5px 8px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '10px' }}>
                        STATUS (CLICK TO CYCLE)
                      </th>
                      <th style={{ width: '130px', padding: '5px 8px', textAlign: 'right', color: 'var(--text-dim)', fontSize: '10px' }}>
                        LAST TOUCH (EST)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shot.panels?.map((panel) => {
                      const isCompleted = panel.status === 'Completed'

                      let statusClass = 'status-not-started'
                      if (panel.status === 'Sketched') statusClass = 'status-sketched'
                      if (panel.status === 'Lined') statusClass = 'status-lined'
                      if (panel.status === 'Colored') statusClass = 'status-colored'
                      if (panel.status === 'Completed') statusClass = 'status-completed'

                      return (
                        <tr
                          key={panel.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background: isCompleted ? 'rgba(16, 185, 129, 0.02)' : 'transparent',
                          }}
                        >
                          {/* Panel Code */}
                          <td
                            style={{
                              padding: '6px 8px',
                              textAlign: 'center',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              color: isCompleted ? 'var(--color-green)' : 'var(--color-amber)',
                              borderRight: '1px solid var(--border-subtle)',
                            }}
                          >
                            {panel.panelCode}
                          </td>

                          {/* Type & Pay */}
                          <td style={{ padding: '6px 8px', borderRight: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontWeight: 600, fontSize: '10.5px' }}>{panel.type}</div>
                            <div style={{ color: 'var(--color-green)', fontSize: '10.5px', fontWeight: 600 }}>
                              ${panel.price}
                            </div>
                          </td>

                          {/* Script & Notes */}
                          <td style={{ padding: '6px 8px', borderRight: '1px solid var(--border-subtle)' }}>
                            {panel.scriptSegment && (
                              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '1px', fontSize: '11px' }}>
                                &ldquo;{panel.scriptSegment}&rdquo;
                              </div>
                            )}
                            <div style={{ color: 'var(--text-muted)', fontSize: '10.5px', fontStyle: 'italic' }}>
                              {panel.directionNotes || 'No notes'}
                            </div>
                          </td>

                          {/* Sketch OK Toggle */}
                          <td style={{ padding: '6px 8px', textAlign: 'center', borderRight: '1px solid var(--border-subtle)' }}>
                            <button
                              onClick={() => {
                                if (canAssign) {
                                  onUpdatePanel(shot.id, panel.id, { sketchOk: !panel.sketchOk })
                                }
                              }}
                              disabled={!canAssign}
                              title={canAssign ? 'Click to toggle sketch approval' : 'Director approval status'}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: 'var(--radius-xs)',
                                border: panel.sketchOk ? '1px solid var(--color-green)' : '1px solid var(--border-medium)',
                                background: panel.sketchOk ? 'var(--color-green-soft)' : 'var(--bg-main)',
                                color: panel.sketchOk ? 'var(--color-green)' : 'var(--text-dim)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {panel.sketchOk ? <Check size={13} strokeWidth={3} /> : <X size={11} />}
                            </button>
                          </td>

                          {/* CLICK-TO-CYCLE STATUS BUTTON */}
                          <td style={{ padding: '6px 8px', textAlign: 'center', borderRight: '1px solid var(--border-subtle)' }}>
                            <button
                              onClick={() => cyclePanelStatus(shot.id, panel)}
                              title="Click to cycle: Not Started → Sketched → Lined → Colored → Completed"
                              className={`status-cycle-btn ${statusClass}`}
                              style={{ padding: '3px 8px', fontSize: '10.5px' }}
                            >
                              {panel.status}
                            </button>
                          </td>

                          {/* Last Updated Timestamp (EST) */}
                          <td
                            style={{
                              padding: '6px 8px',
                              textAlign: 'right',
                              fontSize: '9.5px',
                              color: 'var(--text-dim)',
                              fontFamily: 'var(--font-mono)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatEST(panel.updatedAt) || '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

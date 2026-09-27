import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  ArrowRight,
  Clock,
  User,
  Film,
} from 'lucide-react'
import type { BottleneckItem, Project } from '../types'
import { formatEST } from '../utils/formatDate'

interface ProducerBottlenecksProps {
  onClose: () => void
  onSelectProject: (proj: Project) => void
  projects: Project[]
}

export const ProducerBottlenecks = ({ onClose, onSelectProject, projects }: ProducerBottlenecksProps) => {
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('ALL')

  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const fetchBottlenecks = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/bottlenecks')
      if (res.ok) {
        const data = await res.json()
        setBottlenecks(data.bottlenecks || [])
      }
    } catch (err) {
      console.error('Error fetching bottlenecks:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBottlenecks()
  }, [])

  // Artist payouts breakdown
  const artistPayouts: Record<string, { totalPanels: number; completedPanels: number; totalEarnings: number }> = {}

  projects.forEach((proj) => {
    proj.shots?.forEach((shot) => {
      const artist = shot.assignedArtist || 'Unassigned'
      if (!artistPayouts[artist]) {
        artistPayouts[artist] = { totalPanels: 0, completedPanels: 0, totalEarnings: 0 }
      }

      if (shot.isAnimated && shot.customPrice) {
        artistPayouts[artist].totalEarnings += Number(shot.customPrice) || 0
      }

      shot.panels?.forEach((panel) => {
        artistPayouts[artist].totalPanels += 1
        artistPayouts[artist].totalEarnings += Number(panel.price) || 0
        if (panel.status === 'Completed') {
          artistPayouts[artist].completedPanels += 1
        }
      })
    })
  })

  const filteredBottlenecks = bottlenecks.filter((b) => {
    if (filterType === 'HIGH') return b.severity === 'high'
    if (filterType === 'DIRECTOR') return b.type === 'director_setup'
    if (filterType === 'ARTIST') return b.type === 'artist_lagging'
    if (filterType === 'UNASSIGNED') return b.type === 'unassigned_shot'
    return true
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '960px',
          width: '95vw',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          padding: 0,
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'var(--bg-tertiary)',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={15} color="var(--color-red)" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-header)' }}>
                  Production Bottleneck Monitor
                </span>
                <span className="badge badge-red" style={{ fontSize: '9px' }}>
                  {bottlenecks.filter((b) => b.severity === 'high').length} CRITICAL
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={fetchBottlenecks}
              title="Refresh"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-primary)',
                color: 'var(--text-muted)',
                fontSize: '10.5px',
              }}
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onClose}
              style={{ color: 'var(--text-dim)', padding: '3px', borderRadius: 'var(--radius-xs)' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div
          style={{
            background: 'var(--bg-primary)',
            padding: '6px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexWrap: 'wrap',
          }}
        >
          {[
            { id: 'ALL', label: `All (${bottlenecks.length})` },
            { id: 'HIGH', label: `High Severity (${bottlenecks.filter((b) => b.severity === 'high').length})` },
            { id: 'UNASSIGNED', label: `Unassigned Shots (${bottlenecks.filter((b) => b.type === 'unassigned_shot').length})` },
            { id: 'ARTIST', label: `Artist Lag (${bottlenecks.filter((b) => b.type === 'artist_lagging').length})` },
            { id: 'DIRECTOR', label: `Director Setup (${bottlenecks.filter((b) => b.type === 'director_setup').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              style={{
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '10.5px',
                fontWeight: 600,
                background: filterType === tab.id ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                color: filterType === tab.id ? '#fff' : 'var(--text-dim)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scan-Friendly Compact Table List */}
        <div style={{ padding: '12px 16px', maxHeight: '55vh', overflowY: 'auto' }}>
          {filteredBottlenecks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={24} color="var(--color-green)" style={{ marginBottom: '6px' }} />
              <p style={{ fontWeight: 600, fontSize: '12px' }}>No bottlenecks in this category!</p>
              <p style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                Production is moving according to schedule.
              </p>
            </div>
          ) : (
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
                      fontSize: '9.5px',
                      textTransform: 'uppercase',
                    }}
                  >
                    <th style={{ padding: '5px 8px', width: '60px' }}>Sev</th>
                    <th style={{ padding: '5px 8px', width: '130px' }}>Project</th>
                    <th style={{ padding: '5px 8px', width: '130px' }}>Responsible</th>
                    <th style={{ padding: '5px 8px' }}>Issue & Details</th>
                    <th style={{ padding: '5px 8px', width: '125px' }}>Last Touched (EST)</th>
                    <th style={{ padding: '5px 8px', textAlign: 'right', width: '65px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBottlenecks.map((item) => {
                    const targetProject = projects.find((p) => p.id === item.projectId)
                    const isHigh = item.severity === 'high'

                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background: isHigh ? 'rgba(242, 63, 67, 0.05)' : 'var(--bg-secondary)',
                          transition: 'background 0.1s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg-hover)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isHigh ? 'rgba(242, 63, 67, 0.05)' : 'var(--bg-secondary)'
                        }}
                      >
                        {/* Severity */}
                        <td style={{ padding: '4px 8px' }}>
                          <span
                            className={isHigh ? 'badge badge-red' : 'badge badge-amber'}
                            style={{ fontSize: '8.5px', padding: '1px 4px' }}
                          >
                            {isHigh ? 'HIGH' : 'MED'}
                          </span>
                        </td>

                        {/* Project */}
                        <td style={{ padding: '4px 8px', fontWeight: 700, color: 'var(--text-header)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Film size={10} color="var(--color-primary)" />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}>
                              {item.projectTitle}
                            </span>
                          </div>
                        </td>

                        {/* Responsible */}
                        <td style={{ padding: '4px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text-muted)' }}>
                            <User size={10} />
                            <span style={{ fontSize: '10.5px' }}>{item.responsibleParty}</span>
                          </div>
                        </td>

                        {/* Issue Details */}
                        <td style={{ padding: '4px 8px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '11px' }}>
                            {item.title}
                          </div>
                          <div
                            style={{
                              fontSize: '9.5px',
                              color: 'var(--text-dim)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '380px',
                            }}
                          >
                            {item.details}
                          </div>
                        </td>

                        {/* Inactivity & EST Time */}
                        <td style={{ padding: '4px 8px', fontSize: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: isHigh ? 'var(--color-red)' : 'var(--color-yellow)' }}>
                            <Clock size={9} />
                            <strong>{item.daysInactive}d inactive</strong>
                          </div>
                          <div style={{ color: 'var(--text-dim)', fontSize: '9px' }}>
                            {formatEST(item.lastUpdated)}
                          </div>
                        </td>

                        {/* Jump Action */}
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                          {targetProject && (
                            <button
                              onClick={() => {
                                onSelectProject(targetProject)
                                onClose()
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-xs)',
                                background: 'var(--color-primary)',
                                color: '#fff',
                                fontSize: '10px',
                                fontWeight: 700,
                              }}
                            >
                              Jump <ArrowRight size={9} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Quick Payouts Summary Bar */}
          <div style={{ marginTop: '12px' }}>
            <div
              style={{
                fontSize: '9.5px',
                fontWeight: 800,
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                marginBottom: '4px',
                letterSpacing: '0.4px',
              }}
            >
              Artist Payout Summary
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px' }}>
              {Object.entries(artistPayouts).map(([artist, stats]) => (
                <div
                  key={artist}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '10.5px',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-header)' }}>{artist}</span>
                  <span style={{ color: 'var(--color-green)', fontWeight: 700 }}>
                    ${stats.totalEarnings.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            background: 'var(--bg-tertiary)',
            padding: '6px 16px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: 'var(--text-dim)',
          }}
        >
          <span>All timestamps displayed in Eastern Time (EST/EDT)</span>
          <button
            onClick={onClose}
            style={{
              padding: '3px 10px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-header)',
              borderRadius: 'var(--radius-xs)',
              fontSize: '10.5px',
              fontWeight: 600,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

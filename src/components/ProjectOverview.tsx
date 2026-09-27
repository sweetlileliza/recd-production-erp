import { Film, CheckCircle2, DollarSign, AlertCircle, Trash2, ArrowRight } from 'lucide-react'
import type { Project } from '../types'

interface ProjectOverviewProps {
  projects: Project[]
  onSelectProject: (proj: Project) => void
  onOpenNewProject: () => void
  onDeleteProject: (id: string, e: React.MouseEvent) => void
  currentRole: string
}

export const ProjectOverview = ({
  projects,
  onSelectProject,
  onOpenNewProject,
  onDeleteProject,
  currentRole,
}: ProjectOverviewProps) => {
  let totalStudioPanels = 0
  let totalStudioCompleted = 0
  let totalStudioBudget = 0
  let totalActive = 0
  let totalReleased = 0

  projects.forEach((p) => {
    if (p.status === 'released') {
      totalReleased += 1
    } else {
      totalActive += 1
    }

    p.shots?.forEach((s) => {
      if (s.isAnimated && s.customPrice) {
        totalStudioBudget += Number(s.customPrice) || 0
      }
      s.panels?.forEach((pn) => {
        totalStudioPanels += 1
        totalStudioBudget += Number(pn.price) || 0
        if (pn.status === 'Completed') {
          totalStudioCompleted += 1
        }
      })
    })
  })

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '12px 16px' }}>
      {/* Compact Studio Header Banner */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-medium)',
          padding: '10px 14px',
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-header)' }}>
              Studio Overview
            </span>
            <span className="badge badge-amber" style={{ fontSize: '9.5px' }}>
              RECD Command Center
            </span>
            <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
              Role: <strong style={{ color: 'var(--text-muted)' }}>{currentRole.toUpperCase()}</strong>
            </span>
          </div>
        </div>

        {/* Aggregated Quick Metrics in single compact row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              background: 'var(--bg-tertiary)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--border-subtle)',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Film size={12} color="var(--color-primary)" />
            <span style={{ color: 'var(--text-dim)' }}>Projects:</span>
            <strong style={{ color: 'var(--text-header)' }}>{totalActive}</strong>
            <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>({totalReleased} done)</span>
          </div>

          <div
            style={{
              background: 'var(--bg-tertiary)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--border-subtle)',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <CheckCircle2 size={12} color="var(--color-green)" />
            <span style={{ color: 'var(--text-dim)' }}>Panels:</span>
            <strong style={{ color: 'var(--color-green)' }}>
              {totalStudioCompleted}/{totalStudioPanels}
            </strong>
            <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
              ({totalStudioPanels > 0 ? Math.round((totalStudioCompleted / totalStudioPanels) * 100) : 0}%)
            </span>
          </div>

          <div
            style={{
              background: 'var(--bg-tertiary)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--border-subtle)',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <DollarSign size={12} color="var(--color-yellow)" />
            <span style={{ color: 'var(--text-dim)' }}>Art Budget:</span>
            <strong style={{ color: 'var(--color-yellow)' }}>${totalStudioBudget.toLocaleString()}</strong>
          </div>

          {currentRole === 'producer' && (
            <button
              onClick={onOpenNewProject}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--color-primary)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '11px',
                height: '26px',
              }}
            >
              + New Project
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.4px' }}>
          Projects in Pipeline ({projects.length})
        </span>
      </div>

      {/* Compact Projects Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '8px' }}>
        {projects.map((project) => {
          let panelsCount = 0
          let completedCount = 0
          let projectBudget = 0
          let unassignedShots = 0

          project.shots?.forEach((s) => {
            if (!s.assignedArtist) unassignedShots += 1
            if (s.isAnimated && s.customPrice) projectBudget += Number(s.customPrice) || 0
            s.panels?.forEach((pn) => {
              panelsCount += 1
              projectBudget += Number(pn.price) || 0
              if (pn.status === 'Completed') completedCount += 1
            })
          })

          const progress = panelsCount > 0 ? Math.round((completedCount / panelsCount) * 100) : 0
          const isReleased = project.status === 'released'

          return (
            <div
              key={project.id}
              onClick={() => onSelectProject(project)}
              style={{
                background: 'var(--bg-secondary)',
                border: isReleased ? '1px solid rgba(35, 165, 90, 0.4)' : '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)'
                e.currentTarget.style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = isReleased ? 'rgba(35, 165, 90, 0.4)' : 'var(--border-medium)'
                e.currentTarget.style.background = 'var(--bg-secondary)'
              }}
            >
              {/* Card Top */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                    {isReleased ? (
                      <span className="badge badge-green" style={{ fontSize: '9px' }}>
                        Released
                      </span>
                    ) : (
                      <span className="badge badge-amber" style={{ fontSize: '9px' }}>
                        Active
                      </span>
                    )}
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Dir: {project.director}</span>
                  </div>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-header)' }}>
                    {project.title}
                  </h3>
                </div>

                {currentRole === 'producer' && (
                  <button
                    onClick={(e) => onDeleteProject(project.id, e)}
                    title="Delete Project (Admin)"
                    style={{
                      color: 'var(--text-dim)',
                      padding: '2px',
                      borderRadius: 'var(--radius-xs)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-red)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Progress:</span>
                  <span style={{ fontWeight: 700, color: progress === 100 ? 'var(--color-green)' : 'var(--color-yellow)' }}>
                    {progress}% ({completedCount}/{panelsCount})
                  </span>
                </div>
                <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${progress}%`,
                      background: progress === 100 ? 'var(--color-green)' : 'var(--color-yellow)',
                      borderRadius: '2px',
                    }}
                  />
                </div>
              </div>

              {/* Specs & Stats row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '5px 8px',
                  marginBottom: '8px',
                  fontSize: '10.5px',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Shots: </span>
                  <strong>{project.shots?.length || 0}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Budget: </span>
                  <strong style={{ color: 'var(--color-yellow)' }}>${projectBudget}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Due: </span>
                  <span>{project.targetDeadline || 'TBD'}</span>
                </div>
              </div>

              {/* Alerts or Action footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {unassignedShots > 0 && !isReleased ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: 'var(--color-yellow)',
                    }}
                  >
                    <AlertCircle size={11} />
                    <span>{unassignedShots} unassigned shot(s)</span>
                  </div>
                ) : (
                  <span />
                )}

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '10.5px',
                    color: 'var(--color-primary)',
                    fontWeight: 600,
                  }}
                >
                  Enter <ArrowRight size={11} />
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

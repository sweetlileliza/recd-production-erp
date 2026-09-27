import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDb } from './db/firebase.js'
import {
  autoSeedIfEmpty,
  verifyPasscode,
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  updateInitialSetup,
  updateShots,
  bulkAssignShots,
  bulkFolders,
  updateSingleShot,
  toggleOptIn,
  updateArtistPreference,
  updatePanel,
  updateVoiceCasting,
  updatePostProduction,
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getArtists,
  createArtist,
  getBottlenecks,
  getDiscordFeed,
} from './db/firestoreService.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Health check endpoint
app.get('/api/health', (_req, res) => {
  const isCloudFirestore = !!getDb()
  res.json({
    status: 'online',
    message: 'RECD Studios Production Backend is running',
    database: isCloudFirestore ? 'Cloud Firestore (Active)' : 'Local JSON Fallback (store.json)',
    timestamp: new Date().toISOString(),
  })
})

// Producer / Admin passcode verification
app.post('/api/admin/verify', async (req, res) => {
  try {
    const { passcode } = req.body
    const isValid = await verifyPasscode('producer', passcode)
    if (isValid) {
      return res.json({ success: true, message: 'Producer access granted' })
    }
    return res.status(401).json({ success: false, message: 'Invalid Producer passcode' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Director passcode verification
app.post('/api/director/verify', async (req, res) => {
  try {
    const { passcode } = req.body
    const isValid = await verifyPasscode('director', passcode)
    if (isValid) {
      return res.json({ success: true, message: 'Director access granted' })
    }
    return res.status(401).json({ success: false, message: 'Invalid Director passcode' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// List all projects with computed stats
app.get('/api/projects', async (_req, res) => {
  try {
    const projects = await getAllProjects()

    // Add aggregated stats to each project for quick overview
    const projectsWithStats = projects.map((p: any) => {
      let totalPanels = 0
      let completedPanels = 0
      let totalBudget = 0
      let unassignedShots = 0

      p.shots?.forEach((shot: any) => {
        if (!shot.assignedArtist) {
          unassignedShots += 1
        }
        if (shot.isAnimated && shot.customPrice) {
          totalBudget += Number(shot.customPrice) || 0
        }
        shot.panels?.forEach((panel: any) => {
          totalPanels += 1
          totalBudget += Number(panel.price) || 0
          if (panel.status === 'Completed') {
            completedPanels += 1
          }
        })
      })

      const progressPercent = totalPanels > 0 ? Math.round((completedPanels / totalPanels) * 100) : 0

      return {
        ...p,
        stats: {
          totalShots: p.shots?.length || 0,
          totalPanels,
          completedPanels,
          progressPercent,
          totalBudget,
          unassignedShots,
        },
      }
    })

    res.json(projectsWithStats)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch projects' })
  }
})

// Get single project
app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await getProjectById(req.params.id)
    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json(project)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Create new project
app.post('/api/projects', async (req, res) => {
  try {
    const { title } = req.body
    if (!title) {
      return res.status(400).json({ error: 'Project title is required' })
    }

    const newProject = await createProject(req.body)
    res.status(201).json(newProject)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Update project metadata
app.put('/api/projects/:id', async (req, res) => {
  try {
    const updated = await updateProject(req.params.id, req.body)
    if (!updated) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json(updated)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Delete project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const success = await deleteProject(req.params.id)
    if (!success) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json({ message: 'Project deleted successfully' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Update Initial Setup section
app.put('/api/projects/:id/initial-setup', async (req, res) => {
  try {
    const { stageKey, stageData, initialSetup } = req.body
    const result = await updateInitialSetup(req.params.id, stageKey, stageData, initialSetup)
    if (!result) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Save / replace all shots from Art Script Maker
app.put('/api/projects/:id/shots', async (req, res) => {
  try {
    const result = await updateShots(req.params.id, req.body.shots || [])
    if (!result) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json({ success: true, count: result.count, updatedAt: result.updatedAt })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Bulk assign shots to an artist
app.put('/api/projects/:id/shots/bulk-assign', async (req, res) => {
  try {
    const { shotIds, artistName, deadline } = req.body
    if (!Array.isArray(shotIds) || !artistName) {
      return res.status(400).json({ error: 'shotIds array and artistName required' })
    }

    const result = await bulkAssignShots(req.params.id, shotIds, artistName, deadline)
    if (!result) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json({ success: true, count: result.count, updatedAt: result.updatedAt })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Bulk assign Google Drive folders to shots
app.put('/api/projects/:id/shots/bulk-folders', async (req, res) => {
  try {
    const { folderMappings, baseFolderUrl } = req.body
    const result = await bulkFolders(req.params.id, folderMappings, baseFolderUrl)
    if (!result) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json({ success: true, count: result.count, updatedAt: result.updatedAt })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Update single shot (artist assignment, deadline, notes, animation tags)
app.put('/api/projects/:id/shots/:shotId', async (req, res) => {
  try {
    const updated = await updateSingleShot(req.params.id, req.params.shotId, req.body)
    if (!updated) {
      return res.status(404).json({ error: 'Shot not found' })
    }
    res.json(updated)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Artist Opt-in for a shot
app.post('/api/projects/:id/shots/:shotId/opt-in', async (req, res) => {
  try {
    const { artistName } = req.body
    if (!artistName) return res.status(400).json({ error: 'Artist name required' })

    const optIns = await toggleOptIn(req.params.id, req.params.shotId, artistName)
    if (!optIns) {
      return res.status(404).json({ error: 'Shot not found' })
    }
    res.json({ success: true, artistOptIns: optIns })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Set / Update artist preferences (max shots, 1st-5th ranked choices, avoid shots)
app.put('/api/projects/:id/artist-preferences', async (req, res) => {
  try {
    const { artistName } = req.body
    if (!artistName) return res.status(400).json({ error: 'Artist name is required' })

    const result = await updateArtistPreference(req.params.id, req.body)
    if (!result) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json({ success: true, preference: result.preference, artistPreferences: result.artistPreferences })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Update panel status / drive link / sketch OK (Auto tracker & Discord bot endpoint)
app.put('/api/projects/:id/shots/:shotId/panels/:panelId', async (req, res) => {
  try {
    const result = await updatePanel(req.params.id, req.params.shotId, req.params.panelId, req.body)
    if (!result) {
      return res.status(404).json({ error: 'Panel or shot not found' })
    }
    res.json({ success: true, panel: result.panel, updatedAt: result.updatedAt })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Voice casting update
app.put('/api/projects/:id/voice-casting', async (req, res) => {
  try {
    const result = await updateVoiceCasting(req.params.id, req.body.voiceCasting || [])
    if (!result) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Post production update & Release
app.put('/api/projects/:id/post-production', async (req, res) => {
  try {
    const result = await updatePostProduction(req.params.id, req.body)
    if (!result) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Team Roster Directory (Artists, Voice Actors, and Dual-Role Crew)
app.get('/api/team', async (_req, res) => {
  try {
    const team = await getTeamMembers()
    res.json(team)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/team', async (req, res) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Member name is required' })

    const newMember = await createTeamMember(req.body)
    res.status(201).json(newMember)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/team/:id', async (req, res) => {
  try {
    const updated = await updateTeamMember(req.params.id, req.body)
    if (!updated) return res.status(404).json({ error: 'Team member not found' })
    res.json(updated)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/team/:id', async (req, res) => {
  try {
    const success = await deleteTeamMember(req.params.id)
    if (!success) return res.status(404).json({ error: 'Team member not found' })
    res.json({ success: true, message: 'Member deleted' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Artists directory (backward compatibility)
app.get('/api/artists', async (_req, res) => {
  try {
    const artists = await getArtists()
    res.json(artists)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/artists', async (req, res) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })

    const newArtist = await createArtist(req.body)
    res.status(201).json(newArtist)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Bottleneck Detector for Producer Admin
app.get('/api/bottlenecks', async (_req, res) => {
  try {
    const bottlenecksData = await getBottlenecks()
    res.json(bottlenecksData)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Discord bot auto-tracker feed endpoint
app.get('/api/discord/feed', async (req, res) => {
  try {
    const feed = await getDiscordFeed(req.query.projectId as string)
    res.json({
      status: 'success',
      botSyncTimestamp: new Date().toISOString(),
      feed,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// In production, serve static assets built by Vite
const distPath = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`Backend server listening at http://localhost:${PORT}`)
    await autoSeedIfEmpty()
  })
}

export { app }
export default app

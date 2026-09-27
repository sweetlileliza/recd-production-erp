import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDb } from './firebase.js'
import { serverCache } from './cache.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_FILE = path.join(__dirname, '..', 'data', 'store.json')

// Local JSON fallback helpers
function readLocalData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (error) {
    console.error('[Fallback] Error reading local data file:', error)
  }
  return { projects: [], artists: [], teamMembers: [], adminSettings: { producerPasscode: 'recd2026', directorPasscode: 'direct2026' } }
}

function writeLocalData(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (error) {
    console.error('[Fallback] Error writing local data file:', error)
  }
}

/**
 * Checks if Firestore needs to be auto-seeded from store.json
 */
export async function autoSeedIfEmpty(): Promise<void> {
  const db = getDb()
  if (!db) return

  try {
    const projectsSnap = await db.collection('projects').limit(1).get()
    if (!projectsSnap.empty) {
      return // Already has data in Firestore
    }

    console.log('[Firestore] Detected empty Firestore database. Performing one-time initial migration from store.json...')
    const local = readLocalData()

    // Batch write to stay within limits and perform atomic migration
    const batch = db.batch()

    // Seed settings
    if (local.adminSettings) {
      const settingsRef = db.collection('settings').doc('admin')
      batch.set(settingsRef, local.adminSettings)
    }

    // Seed team members
    if (Array.isArray(local.teamMembers)) {
      for (const member of local.teamMembers) {
        if (member.id) {
          const mRef = db.collection('teamMembers').doc(member.id)
          batch.set(mRef, member)
        }
      }
    }

    // Seed projects
    if (Array.isArray(local.projects)) {
      for (const proj of local.projects) {
        if (proj.id) {
          const pRef = db.collection('projects').doc(proj.id)
          batch.set(pRef, proj)
        }
      }
    }

    await batch.commit()
    console.log('[Firestore] Initial auto-seed completed successfully!')
  } catch (err) {
    console.error('[Firestore] Auto-seed failed:', err)
  }
}

// ----------------- ADMIN SETTINGS -----------------

export async function getAdminSettings(): Promise<any> {
  const cacheKey = 'settings:admin'
  const cached = serverCache.get(cacheKey)
  if (cached) return cached

  const db = getDb()
  if (!db) {
    const local = readLocalData()
    return local.adminSettings || { producerPasscode: 'recd2026', directorPasscode: 'direct2026' }
  }

  try {
    const doc = await db.collection('settings').doc('admin').get()
    if (doc.exists) {
      const data = doc.data()
      serverCache.set(cacheKey, data, 30000) // 30s cache
      return data
    }
  } catch (err) {
    console.error('[Firestore] Error fetching admin settings:', err)
  }

  return { producerPasscode: 'recd2026', directorPasscode: 'direct2026' }
}

export async function verifyPasscode(type: 'producer' | 'director', passcode: string): Promise<boolean> {
  const settings = await getAdminSettings()
  if (type === 'producer') {
    const correct = settings.producerPasscode || 'recd2026'
    return passcode === correct
  } else {
    const correct = settings.directorPasscode || 'direct2026'
    return passcode === correct
  }
}

// ----------------- PROJECTS -----------------

export async function getAllProjects(): Promise<any[]> {
  const cacheKey = 'projects:all'
  const cached = serverCache.get<any[]>(cacheKey)
  if (cached) return cached

  const db = getDb()
  if (!db) {
    const local = readLocalData()
    return local.projects || []
  }

  try {
    const snapshot = await db.collection('projects').get()
    const projects: any[] = []
    snapshot.forEach((doc) => {
      projects.push(doc.data())
    })

    // Sort by createdAt descending if available
    projects.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime()
      const timeB = new Date(b.createdAt || 0).getTime()
      return timeB - timeA
    })

    serverCache.set(cacheKey, projects, 10000) // 10s TTL
    return projects
  } catch (err) {
    console.error('[Firestore] Error fetching projects:', err)
    return []
  }
}

export async function getProjectById(id: string): Promise<any | null> {
  const cacheKey = `project:${id}`
  const cached = serverCache.get(cacheKey)
  if (cached) return cached

  const db = getDb()
  if (!db) {
    const local = readLocalData()
    return local.projects?.find((p: any) => p.id === id) || null
  }

  try {
    const doc = await db.collection('projects').doc(id).get()
    if (doc.exists) {
      const data = doc.data()
      serverCache.set(cacheKey, data, 10000)
      return data
    }
    return null
  } catch (err) {
    console.error(`[Firestore] Error fetching project ${id}:`, err)
    return null
  }
}

export async function createProject(payload: any): Promise<any> {
  const now = new Date().toISOString()
  const newProject = {
    id: payload.id || `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: payload.title,
    director: payload.director || 'Director',
    resolution: payload.resolution || '3840x2160 (DOUBLE 1080P)',
    targetDeadline: payload.targetDeadline || '',
    refDocUrl: payload.refDocUrl || '',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    initialSetup: {
      storyPitch: { title: 'Story Pitch', status: 'not_started', notes: '', link: '', updatedAt: now },
      melodyStyle: { title: 'Melody Style', status: 'not_started', notes: '', link: '', updatedAt: now },
      writing: { title: 'Writing / Lyrics', status: 'not_started', notes: '', link: '', updatedAt: now },
      pianodemo: { title: 'Piano Demo', status: 'not_started', notes: '', link: '', updatedAt: now },
      scratchTrack: { title: 'Scratch Track', status: 'not_started', notes: '', link: '', updatedAt: now },
    },
    shots: [],
    voiceCasting: [],
    postProduction: {
      audioFinalMix: { completed: false, notes: '', link: '', updatedAt: now },
      videoFinalMix: { completed: false, notes: '', link: '', updatedAt: now },
      isReleased: false,
      releasedAt: '',
      releaseUrl: '',
    },
  }

  const db = getDb()
  if (!db) {
    const local = readLocalData()
    if (!local.projects) local.projects = []
    local.projects.unshift(newProject)
    writeLocalData(local)
    return newProject
  }

  await db.collection('projects').doc(newProject.id).set(newProject)
  serverCache.delete('projects:all')
  serverCache.set(`project:${newProject.id}`, newProject)
  return newProject
}

export async function updateProject(id: string, updates: any): Promise<any | null> {
  const now = new Date().toISOString()
  const db = getDb()

  if (!db) {
    const local = readLocalData()
    const index = local.projects?.findIndex((p: any) => p.id === id) ?? -1
    if (index === -1) return null
    local.projects[index] = { ...local.projects[index], ...updates, updatedAt: now }
    writeLocalData(local)
    return local.projects[index]
  }

  const docRef = db.collection('projects').doc(id)
  let updatedData: any = null

  // Using transaction for atomic update
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (!snapshot.exists) throw new Error('Project not found')
    const current = snapshot.data() || {}
    updatedData = { ...current, ...updates, updatedAt: now }
    transaction.set(docRef, updatedData)
  })

  serverCache.delete('projects:all')
  serverCache.delete(`project:${id}`)
  return updatedData
}

export async function deleteProject(id: string): Promise<boolean> {
  const db = getDb()
  if (!db) {
    const local = readLocalData()
    const originalLen = local.projects?.length || 0
    local.projects = local.projects?.filter((p: any) => p.id !== id) || []
    if (local.projects.length === originalLen) return false
    writeLocalData(local)
    return true
  }

  await db.collection('projects').doc(id).delete()
  serverCache.delete('projects:all')
  serverCache.delete(`project:${id}`)
  return true
}

export async function updateInitialSetup(id: string, stageKey?: string, stageData?: any, fullSetup?: any): Promise<any | null> {
  const now = new Date().toISOString()
  const db = getDb()

  if (!db) {
    const local = readLocalData()
    const proj = local.projects?.find((p: any) => p.id === id)
    if (!proj) return null

    if (stageKey && proj.initialSetup[stageKey]) {
      proj.initialSetup[stageKey] = { ...proj.initialSetup[stageKey], ...stageData, updatedAt: now }
    } else if (fullSetup) {
      proj.initialSetup = fullSetup
    }
    proj.updatedAt = now
    writeLocalData(local)
    return proj.initialSetup
  }

  const docRef = db.collection('projects').doc(id)
  let resultingSetup: any = null

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (!snapshot.exists) throw new Error('Project not found')
    const proj = snapshot.data() as any

    if (!proj.initialSetup) proj.initialSetup = {}

    if (stageKey && proj.initialSetup[stageKey]) {
      proj.initialSetup[stageKey] = { ...proj.initialSetup[stageKey], ...stageData, updatedAt: now }
    } else if (fullSetup) {
      proj.initialSetup = fullSetup
    }
    proj.updatedAt = now
    resultingSetup = proj.initialSetup

    transaction.update(docRef, {
      initialSetup: proj.initialSetup,
      updatedAt: now,
    })
  })

  serverCache.delete('projects:all')
  serverCache.delete(`project:${id}`)
  return resultingSetup
}

export async function updateShots(id: string, shots: any[]): Promise<{ count: number; updatedAt: string } | null> {
  const now = new Date().toISOString()
  const db = getDb()

  if (!db) {
    const local = readLocalData()
    const proj = local.projects?.find((p: any) => p.id === id)
    if (!proj) return null
    proj.shots = shots || []
    proj.updatedAt = now
    writeLocalData(local)
    return { count: proj.shots.length, updatedAt: now }
  }

  const docRef = db.collection('projects').doc(id)
  let count = 0

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (!snapshot.exists) throw new Error('Project not found')
    count = shots.length
    transaction.update(docRef, {
      shots,
      updatedAt: now,
    })
  })

  serverCache.delete('projects:all')
  serverCache.delete(`project:${id}`)
  return { count, updatedAt: now }
}

export async function bulkAssignShots(id: string, shotIds: string[], artistName: string, deadline?: string): Promise<{ count: number; updatedAt: string } | null> {
  const now = new Date().toISOString()
  const db = getDb()

  if (!db) {
    const local = readLocalData()
    const proj = local.projects?.find((p: any) => p.id === id)
    if (!proj) return null

    let assignedCount = 0
    proj.shots?.forEach((shot: any) => {
      if (shotIds.includes(shot.id)) {
        shot.assignedArtist = artistName
        if (deadline) shot.deadline = deadline
        shot.updatedAt = now
        shot.panels?.forEach((panel: any) => {
          panel.artist = artistName
          panel.updatedAt = now
        })
        assignedCount++
      }
    })
    proj.updatedAt = now
    writeLocalData(local)
    return { count: assignedCount, updatedAt: now }
  }

  const docRef = db.collection('projects').doc(id)
  let assignedCount = 0

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (!snapshot.exists) throw new Error('Project not found')
    const proj = snapshot.data() as any
    const shots = proj.shots || []

    shots.forEach((shot: any) => {
      if (shotIds.includes(shot.id)) {
        shot.assignedArtist = artistName
        if (deadline) shot.deadline = deadline
        shot.updatedAt = now
        shot.panels?.forEach((panel: any) => {
          panel.artist = artistName
          panel.updatedAt = now
        })
        assignedCount++
      }
    })

    transaction.update(docRef, {
      shots,
      updatedAt: now,
    })
  })

  serverCache.delete('projects:all')
  serverCache.delete(`project:${id}`)
  return { count: assignedCount, updatedAt: now }
}

export async function bulkFolders(id: string, folderMappings?: Record<string, string>, baseFolderUrl?: string): Promise<{ count: number; updatedAt: string } | null> {
  const now = new Date().toISOString()
  const db = getDb()

  if (!db) {
    const local = readLocalData()
    const proj = local.projects?.find((p: any) => p.id === id)
    if (!proj) return null

    proj.shots?.forEach((shot: any) => {
      if (folderMappings && folderMappings[shot.id]) {
        shot.driveFolderUrl = folderMappings[shot.id]
        shot.updatedAt = now
      } else if (baseFolderUrl) {
        shot.driveFolderUrl = baseFolderUrl
          .replace('{shot}', String(shot.shotNumber))
          .replace('{shotNumber}', String(shot.shotNumber))
        shot.updatedAt = now
      }
    })
    proj.updatedAt = now
    writeLocalData(local)
    return { count: proj.shots?.length || 0, updatedAt: now }
  }

  const docRef = db.collection('projects').doc(id)
  let totalShots = 0

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (!snapshot.exists) throw new Error('Project not found')
    const proj = snapshot.data() as any
    const shots = proj.shots || []
    totalShots = shots.length

    shots.forEach((shot: any) => {
      if (folderMappings && folderMappings[shot.id]) {
        shot.driveFolderUrl = folderMappings[shot.id]
        shot.updatedAt = now
      } else if (baseFolderUrl) {
        shot.driveFolderUrl = baseFolderUrl
          .replace('{shot}', String(shot.shotNumber))
          .replace('{shotNumber}', String(shot.shotNumber))
        shot.updatedAt = now
      }
    })

    transaction.update(docRef, {
      shots,
      updatedAt: now,
    })
  })

  serverCache.delete('projects:all')
  serverCache.delete(`project:${id}`)
  return { count: totalShots, updatedAt: now }
}

export async function updateSingleShot(id: string, shotId: string, updates: any): Promise<any | null> {
  const now = new Date().toISOString()
  const db = getDb()

  if (!db) {
    const local = readLocalData()
    const proj = local.projects?.find((p: any) => p.id === id)
    if (!proj) return null
    const shot = proj.shots?.find((s: any) => s.id === shotId)
    if (!shot) return null

    Object.assign(shot, updates, { updatedAt: now })
    proj.updatedAt = now
    writeLocalData(local)
    return shot
  }

  const docRef = db.collection('projects').doc(id)
  let updatedShot: any = null

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (!snapshot.exists) throw new Error('Project not found')
    const proj = snapshot.data() as any
    const shots = proj.shots || []
    const shot = shots.find((s: any) => s.id === shotId)
    if (!shot) throw new Error('Shot not found')

    Object.assign(shot, updates, { updatedAt: now })
    updatedShot = shot

    transaction.update(docRef, {
      shots,
      updatedAt: now,
    })
  })

  serverCache.delete('projects:all')
  serverCache.delete(`project:${id}`)
  return updatedShot
}

export async function toggleOptIn(id: string, shotId: string, artistName: string): Promise<string[] | null> {
  const now = new Date().toISOString()
  const db = getDb()

  if (!db) {
    const local = readLocalData()
    const proj = local.projects?.find((p: any) => p.id === id)
    if (!proj) return null
    const shot = proj.shots?.find((s: any) => s.id === shotId)
    if (!shot) return null

    if (!shot.artistOptIns) shot.artistOptIns = []
    if (shot.artistOptIns.includes(artistName)) {
      shot.artistOptIns = shot.artistOptIns.filter((name: string) => name !== artistName)
    } else {
      shot.artistOptIns.push(artistName)
    }
    shot.updatedAt = now
    proj.updatedAt = now
    writeLocalData(local)
    return shot.artistOptIns
  }

  const docRef = db.collection('projects').doc(id)
  let optIns: string[] = []

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (!snapshot.exists) throw new Error('Project not found')
    const proj = snapshot.data() as any
    const shots = proj.shots || []
    const shot = shots.find((s: any) => s.id === shotId)
    if (!shot) throw new Error('Shot not found')

    if (!shot.artistOptIns) shot.artistOptIns = []
    if (shot.artistOptIns.includes(artistName)) {
      shot.artistOptIns = shot.artistOptIns.filter((name: string) => name !== artistName)
    } else {
      shot.artistOptIns.push(artistName)
    }
    shot.updatedAt = now
    optIns = shot.artistOptIns

    transaction.update(docRef, {
      shots,
      updatedAt: now,
    })
  })

  serverCache.delete('projects:all')
  serverCache.delete(`project:${id}`)
  return optIns
}

export async function updateArtistPreference(id: string, prefData: any): Promise<{ preference: any; artistPreferences: any[] } | null> {
  const now = new Date().toISOString()
  const { artistName, maxShots, preferredShots, avoidShots, notes } = prefData

  const prefShots = Array.isArray(preferredShots) ? preferredShots.slice(0, 5).map(Number) : []
  const avShots = Array.isArray(avoidShots) ? avoidShots.map(Number) : []

  const newPref = {
    artistName,
    maxShots: Math.max(1, Number(maxShots) || 1),
    preferredShots: prefShots,
    avoidShots: avShots,
    notes: notes || '',
    updatedAt: now,
  }

  const db = getDb()

  if (!db) {
    const local = readLocalData()
    const proj = local.projects?.find((p: any) => p.id === id)
    if (!proj) return null

    if (!proj.artistPreferences) proj.artistPreferences = []
    const existingIdx = proj.artistPreferences.findIndex(
      (p: any) => p.artistName.toLowerCase() === artistName.toLowerCase()
    )
    if (existingIdx !== -1) {
      proj.artistPreferences[existingIdx] = newPref
    } else {
      proj.artistPreferences.push(newPref)
    }

    // Sync shot opt-ins
    proj.shots?.forEach((shot: any) => {
      if (!shot.artistOptIns) shot.artistOptIns = []
      if (prefShots.includes(shot.shotNumber)) {
        if (!shot.artistOptIns.includes(artistName)) {
          shot.artistOptIns.push(artistName)
        }
      } else if (avShots.includes(shot.shotNumber)) {
        shot.artistOptIns = shot.artistOptIns.filter((name: string) => name !== artistName)
      }
    })

    proj.updatedAt = now
    writeLocalData(local)
    return { preference: newPref, artistPreferences: proj.artistPreferences }
  }

  const docRef = db.collection('projects').doc(id)
  let allPreferences: any[] = []

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (!snapshot.exists) throw new Error('Project not found')
    const proj = snapshot.data() as any

    if (!proj.artistPreferences) proj.artistPreferences = []
    const existingIdx = proj.artistPreferences.findIndex(
      (p: any) => p.artistName.toLowerCase() === artistName.toLowerCase()
    )
    if (existingIdx !== -1) {
      proj.artistPreferences[existingIdx] = newPref
    } else {
      proj.artistPreferences.push(newPref)
    }

    const shots = proj.shots || []
    shots.forEach((shot: any) => {
      if (!shot.artistOptIns) shot.artistOptIns = []
      if (prefShots.includes(shot.shotNumber)) {
        if (!shot.artistOptIns.includes(artistName)) {
          shot.artistOptIns.push(artistName)
        }
      } else if (avShots.includes(shot.shotNumber)) {
        shot.artistOptIns = shot.artistOptIns.filter((name: string) => name !== artistName)
      }
    })

    allPreferences = proj.artistPreferences

    transaction.update(docRef, {
      artistPreferences: allPreferences,
      shots,
      updatedAt: now,
    })
  })

  serverCache.delete('projects:all')
  serverCache.delete(`project:${id}`)
  return { preference: newPref, artistPreferences: allPreferences }
}

export async function updatePanel(id: string, shotId: string, panelId: string, updates: any): Promise<{ panel: any; updatedAt: string } | null> {
  const now = new Date().toISOString()
  const db = getDb()

  if (!db) {
    const local = readLocalData()
    const proj = local.projects?.find((p: any) => p.id === id)
    if (!proj) return null
    const shot = proj.shots?.find((s: any) => s.id === shotId)
    if (!shot) return null
    const panel = shot.panels?.find((p: any) => p.id === panelId)
    if (!panel) return null

    Object.assign(panel, updates, { updatedAt: now })
    shot.updatedAt = now
    proj.updatedAt = now
    writeLocalData(local)
    return { panel, updatedAt: now }
  }

  const docRef = db.collection('projects').doc(id)
  let updatedPanel: any = null

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (!snapshot.exists) throw new Error('Project not found')
    const proj = snapshot.data() as any
    const shots = proj.shots || []
    const shot = shots.find((s: any) => s.id === shotId)
    if (!shot) throw new Error('Shot not found')
    const panel = shot.panels?.find((p: any) => p.id === panelId)
    if (!panel) throw new Error('Panel not found')

    Object.assign(panel, updates, { updatedAt: now })
    shot.updatedAt = now
    proj.updatedAt = now
    updatedPanel = panel

    transaction.update(docRef, {
      shots,
      updatedAt: now,
    })
  })

  serverCache.delete('projects:all')
  serverCache.delete(`project:${id}`)
  return { panel: updatedPanel, updatedAt: now }
}

export async function updateVoiceCasting(id: string, voiceCasting: any[]): Promise<any[] | null> {
  const now = new Date().toISOString()
  const db = getDb()

  if (!db) {
    const local = readLocalData()
    const proj = local.projects?.find((p: any) => p.id === id)
    if (!proj) return null
    proj.voiceCasting = voiceCasting || []
    proj.updatedAt = now
    writeLocalData(local)
    return proj.voiceCasting
  }

  const docRef = db.collection('projects').doc(id)
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (!snapshot.exists) throw new Error('Project not found')
    transaction.update(docRef, {
      voiceCasting,
      updatedAt: now,
    })
  })

  serverCache.delete('projects:all')
  serverCache.delete(`project:${id}`)
  return voiceCasting
}

export async function updatePostProduction(id: string, updates: any): Promise<any | null> {
  const now = new Date().toISOString()
  const db = getDb()

  if (!db) {
    const local = readLocalData()
    const proj = local.projects?.find((p: any) => p.id === id)
    if (!proj) return null

    proj.postProduction = {
      ...proj.postProduction,
      ...updates,
    }
    if (updates.isReleased) {
      proj.status = 'released'
      proj.postProduction.releasedAt = now
    }
    proj.updatedAt = now
    writeLocalData(local)
    return proj.postProduction
  }

  const docRef = db.collection('projects').doc(id)
  let updatedPost: any = null

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (!snapshot.exists) throw new Error('Project not found')
    const proj = snapshot.data() as any

    proj.postProduction = {
      ...proj.postProduction,
      ...updates,
    }

    const docUpdates: any = {
      postProduction: proj.postProduction,
      updatedAt: now,
    }

    if (updates.isReleased) {
      docUpdates.status = 'released'
      docUpdates['postProduction.releasedAt'] = now
    }

    updatedPost = proj.postProduction
    transaction.update(docRef, docUpdates)
  })

  serverCache.delete('projects:all')
  serverCache.delete(`project:${id}`)
  return updatedPost
}

// ----------------- TEAM MEMBERS & ARTISTS -----------------

export async function getTeamMembers(): Promise<any[]> {
  const cacheKey = 'team:all'
  const cached = serverCache.get<any[]>(cacheKey)
  if (cached) return cached

  const db = getDb()
  if (!db) {
    const local = readLocalData()
    return local.teamMembers || []
  }

  try {
    const snapshot = await db.collection('teamMembers').get()
    const members: any[] = []
    snapshot.forEach((doc) => {
      members.push(doc.data())
    })
    serverCache.set(cacheKey, members, 15000)
    return members
  } catch (err) {
    console.error('[Firestore] Error fetching team members:', err)
    return []
  }
}

export async function createTeamMember(payload: any): Promise<any> {
  const newMember = {
    id: payload.id || `tm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: payload.name,
    isArtist: payload.isArtist ?? true,
    isVoiceActor: payload.isVoiceActor ?? false,
    email: payload.email || '',
    discordHandle: payload.discordHandle || '',
    specialty: payload.specialty || (payload.isArtist && payload.isVoiceActor ? 'Artist & Voice Cast' : payload.isVoiceActor ? 'Voice Actor' : '2D Artist'),
    activeShots: 0,
  }

  const db = getDb()
  if (!db) {
    const local = readLocalData()
    if (!local.teamMembers) local.teamMembers = []
    local.teamMembers.push(newMember)
    if (newMember.isArtist) {
      if (!local.artists) local.artists = []
      if (!local.artists.find((a: any) => a.name === newMember.name)) {
        local.artists.push({
          name: newMember.name,
          email: newMember.email,
          specialty: newMember.specialty,
          activeShots: 0,
        })
      }
    }
    writeLocalData(local)
    return newMember
  }

  await db.collection('teamMembers').doc(newMember.id).set(newMember)
  serverCache.delete('team:all')
  return newMember
}

export async function updateTeamMember(id: string, updates: any): Promise<any | null> {
  const db = getDb()
  if (!db) {
    const local = readLocalData()
    if (!local.teamMembers) local.teamMembers = []
    const member = local.teamMembers.find((m: any) => m.id === id)
    if (!member) return null

    Object.assign(member, updates)
    if (member.isArtist && local.artists) {
      const art = local.artists.find((a: any) => a.name === member.name)
      if (art) {
        art.specialty = member.specialty
        art.email = member.email
      } else {
        local.artists.push({
          name: member.name,
          email: member.email,
          specialty: member.specialty,
          activeShots: 0,
        })
      }
    }
    writeLocalData(local)
    return member
  }

  const docRef = db.collection('teamMembers').doc(id)
  let updatedMember: any = null

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (!snapshot.exists) throw new Error('Team member not found')
    const current = snapshot.data() || {}
    updatedMember = { ...current, ...updates }
    transaction.set(docRef, updatedMember)
  })

  serverCache.delete('team:all')
  return updatedMember
}

export async function deleteTeamMember(id: string): Promise<boolean> {
  const db = getDb()
  if (!db) {
    const local = readLocalData()
    if (!local.teamMembers) return false
    const member = local.teamMembers.find((m: any) => m.id === id)
    local.teamMembers = local.teamMembers.filter((m: any) => m.id !== id)
    if (member && local.artists) {
      local.artists = local.artists.filter((a: any) => a.name !== member.name)
    }
    writeLocalData(local)
    return true
  }

  await db.collection('teamMembers').doc(id).delete()
  serverCache.delete('team:all')
  return true
}

export async function getArtists(): Promise<any[]> {
  const members = await getTeamMembers()
  if (members && members.length > 0) {
    return members
      .filter((m: any) => m.isArtist)
      .map((m: any) => ({
        name: m.name,
        email: m.email || '',
        specialty: m.specialty || 'Artist',
        activeShots: m.activeShots || 0,
      }))
  }

  // Fallback to local artists if available
  const local = readLocalData()
  return local.artists || []
}

export async function createArtist(payload: any): Promise<any> {
  return createTeamMember({
    name: payload.name,
    email: payload.email,
    specialty: payload.specialty,
    isArtist: true,
    isVoiceActor: false,
  })
}

// ----------------- BOTTLENECK ANALYSIS -----------------

export async function getBottlenecks(): Promise<any> {
  const projects = await getAllProjects()
  const bottlenecks: any[] = []
  const now = new Date()

  projects.forEach((proj: any) => {
    if (proj.status === 'released' || proj.status === 'archived') return

    // 1. Check Initial Setup (Director lag)
    const setupKeys = ['storyPitch', 'melodyStyle', 'writing', 'pianodemo', 'scratchTrack']
    setupKeys.forEach((key) => {
      const step = proj.initialSetup?.[key]
      if (step && step.status !== 'completed') {
        const lastUpdated = new Date(step.updatedAt || proj.createdAt)
        const diffDays = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 3600 * 24))
        if (diffDays >= 3 || step.status === 'not_started') {
          bottlenecks.push({
            id: `btnk-setup-${proj.id}-${key}`,
            projectId: proj.id,
            projectTitle: proj.title,
            type: 'director_setup',
            severity: diffDays > 7 ? 'high' : 'medium',
            responsibleParty: `Director (${proj.director})`,
            title: `Setup Incomplete: ${step.title}`,
            details: `Status is "${step.status}". Last touched ${diffDays} day(s) ago. Music/Script foundation needed.`,
            lastUpdated: step.updatedAt,
            daysInactive: diffDays,
          })
        }
      }
    })

    // 2. Check Unassigned shots
    proj.shots?.forEach((shot: any) => {
      if (!shot.assignedArtist) {
        const lastUpdated = new Date(shot.updatedAt || proj.createdAt)
        const diffDays = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 3600 * 24))
        bottlenecks.push({
          id: `btnk-unassigned-${proj.id}-${shot.id}`,
          projectId: proj.id,
          projectTitle: proj.title,
          type: 'unassigned_shot',
          severity: 'high',
          responsibleParty: `Director / Producer`,
          title: `Shot ${shot.shotNumber} is Unassigned`,
          details: `Shot contains ${shot.panels?.length || 0} panels ($${shot.panels?.reduce((acc: number, p: any) => acc + (p.price || 0), 0) || 0}). Artists opted in: ${shot.artistOptIns?.length || 0}. Needs assignment.`,
          lastUpdated: shot.updatedAt,
          daysInactive: diffDays,
        })
      } else {
        // 3. Check Artist Lagging on assigned shots
        const incompletePanels = shot.panels?.filter((p: any) => p.status !== 'Completed') || []
        if (incompletePanels.length > 0) {
          const lastUpdated = new Date(shot.updatedAt || proj.createdAt)
          const diffDays = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 3600 * 24))
          const isOverdue = shot.deadline && new Date(shot.deadline).getTime() < now.getTime()

          if (diffDays >= 3 || isOverdue) {
            bottlenecks.push({
              id: `btnk-artist-${proj.id}-${shot.id}`,
              projectId: proj.id,
              projectTitle: proj.title,
              type: 'artist_lagging',
              severity: isOverdue || diffDays >= 5 ? 'high' : 'medium',
              responsibleParty: `Artist (${shot.assignedArtist})`,
              title: `Shot ${shot.shotNumber} Inactivity / Overdue`,
              details: `${incompletePanels.length} panels remaining. ${isOverdue ? 'DEADLINE PASSED! ' : ''}Inactive for ${diffDays} days.`,
              lastUpdated: shot.updatedAt,
              daysInactive: diffDays,
            })
          }
        }
      }
    })
  })

  bottlenecks.sort((a, b) => {
    const sevScore = (s: string) => (s === 'high' ? 3 : s === 'medium' ? 2 : 1)
    return sevScore(b.severity) - sevScore(a.severity) || b.daysInactive - a.daysInactive
  })

  return {
    count: bottlenecks.length,
    highSeverityCount: bottlenecks.filter((b) => b.severity === 'high').length,
    bottlenecks,
  }
}

// ----------------- DISCORD BOT FEED -----------------

export async function getDiscordFeed(projectId?: string): Promise<any[]> {
  let projects = await getAllProjects()
  if (projectId) {
    projects = projects.filter((p: any) => p.id === projectId)
  }

  return projects.map((p: any) => {
    const totalPanels = p.shots?.reduce((acc: number, s: any) => acc + (s.panels?.length || 0), 0) || 0
    const completedPanels = p.shots?.reduce(
      (acc: number, s: any) => acc + (s.panels?.filter((pn: any) => pn.status === 'Completed').length || 0),
      0
    ) || 0

    return {
      projectId: p.id,
      title: p.title,
      director: p.director,
      status: p.status,
      lastUpdated: p.updatedAt,
      artProgress: {
        completed: completedPanels,
        total: totalPanels,
        percent: totalPanels > 0 ? Math.round((completedPanels / totalPanels) * 100) : 0,
      },
      postProduction: {
        audioFinalMix: p.postProduction?.audioFinalMix?.completed,
        videoFinalMix: p.postProduction?.videoFinalMix?.completed,
        isReleased: p.postProduction?.isReleased,
      },
    }
  })
}

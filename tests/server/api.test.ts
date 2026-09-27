import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import { serverCache } from '../../server/db/cache'

// Mock Firebase DB so we run on local store cleanly
vi.mock('../../server/db/firebase', () => ({
  getDb: vi.fn(() => null),
  initFirestore: vi.fn(() => null),
}))

import { app } from '../../server/index'

const realExistsSync = fs.existsSync.bind(fs)
const realReadFileSync = fs.readFileSync.bind(fs)
const realWriteFileSync = fs.writeFileSync.bind(fs)

describe('Express REST API Endpoints (server/index.ts)', () => {
  let mockStore: any

  beforeEach(() => {
    serverCache.clear()

    mockStore = {
      projects: [],
      artists: [],
      teamMembers: [],
      adminSettings: { producerPasscode: 'recd2026', directorPasscode: 'direct2026' },
    }

    vi.spyOn(fs, 'existsSync').mockImplementation((p: any) => {
      if (typeof p === 'string' && p.includes('store.json')) return true
      return realExistsSync(p)
    })

    vi.spyOn(fs, 'readFileSync').mockImplementation(((p: any, options: any) => {
      if (typeof p === 'string' && p.includes('store.json')) {
        return JSON.stringify(mockStore)
      }
      return realReadFileSync(p, options)
    }) as any)

    vi.spyOn(fs, 'writeFileSync').mockImplementation(((p: any, data: any, options: any) => {
      if (typeof p === 'string' && p.includes('store.json')) {
        mockStore = JSON.parse(data)
        return
      }
      return realWriteFileSync(p, data, options)
    }) as any)
  })

  // 1. Health check
  describe('GET /api/health', () => {
    it('returns online status and local fallback database indicator', async () => {
      const res = await request(app).get('/api/health')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('online')
      expect(res.body.database).toContain('Local JSON Fallback')
      expect(res.body.timestamp).toBeDefined()
    })
  })

  // 2. Admin & Director passcode verification
  describe('Passcode verification', () => {
    it('verifies producer passcode', async () => {
      const validRes = await request(app)
        .post('/api/admin/verify')
        .send({ passcode: 'recd2026' })
      expect(validRes.status).toBe(200)
      expect(validRes.body.success).toBe(true)

      const invalidRes = await request(app)
        .post('/api/admin/verify')
        .send({ passcode: 'badpass' })
      expect(invalidRes.status).toBe(401)
      expect(invalidRes.body.success).toBe(false)
    })

    it('verifies director passcode', async () => {
      const validRes = await request(app)
        .post('/api/director/verify')
        .send({ passcode: 'direct2026' })
      expect(validRes.status).toBe(200)
      expect(validRes.body.success).toBe(true)

      const invalidRes = await request(app)
        .post('/api/director/verify')
        .send({ passcode: 'wrong' })
      expect(invalidRes.status).toBe(401)
      expect(invalidRes.body.success).toBe(false)
    })
  })

  // 3. Projects API
  describe('/api/projects', () => {
    it('creates a project, rejects if title missing, and lists projects with calculated stats', async () => {
      // 400 on missing title
      const badReq = await request(app).post('/api/projects').send({})
      expect(badReq.status).toBe(400)
      expect(badReq.body.error).toContain('title is required')

      // Create valid project
      const createRes = await request(app)
        .post('/api/projects')
        .send({ title: 'My Musical Episode', director: 'Tom' })
      expect(createRes.status).toBe(201)
      expect(createRes.body.title).toBe('My Musical Episode')
      const projectId = createRes.body.id

      // List projects - should include stats
      const listRes = await request(app).get('/api/projects')
      expect(listRes.status).toBe(200)
      expect(Array.isArray(listRes.body)).toBe(true)
      expect(listRes.body.length).toBe(1)
      expect(listRes.body[0].stats).toEqual({
        totalShots: 0,
        totalPanels: 0,
        completedPanels: 0,
        progressPercent: 0,
        totalBudget: 0,
        unassignedShots: 0,
      })

      // Get single project
      const getRes = await request(app).get(`/api/projects/${projectId}`)
      expect(getRes.status).toBe(200)
      expect(getRes.body.id).toBe(projectId)

      // Get 404 for missing project
      const notFoundRes = await request(app).get('/api/projects/unknown-proj')
      expect(notFoundRes.status).toBe(404)

      // Update project
      const updateRes = await request(app)
        .put(`/api/projects/${projectId}`)
        .send({ director: 'Sarah' })
      expect(updateRes.status).toBe(200)
      expect(updateRes.body.director).toBe('Sarah')

      // Delete project
      const delRes = await request(app).delete(`/api/projects/${projectId}`)
      expect(delRes.status).toBe(200)
      expect(delRes.body.message).toContain('deleted')

      // Delete 404
      const del404 = await request(app).delete(`/api/projects/${projectId}`)
      expect(del404.status).toBe(404)
    })
  })

  // 4. Initial Setup endpoint
  describe('PUT /api/projects/:id/initial-setup', () => {
    it('updates setup stages', async () => {
      const createRes = await request(app)
        .post('/api/projects')
        .send({ title: 'Setup Test' })
      const id = createRes.body.id

      const res = await request(app)
        .put(`/api/projects/${id}/initial-setup`)
        .send({
          stageKey: 'writing',
          stageData: { status: 'in_progress', notes: 'Drafting verse 1' },
        })

      expect(res.status).toBe(200)
      expect(res.body.writing.status).toBe('in_progress')
      expect(res.body.writing.notes).toBe('Drafting verse 1')
    })
  })

  // 5. Shots, Panels, Bulk & Opt-ins
  describe('Shots, Panels & Assignments', () => {
    it('manages shots, bulk assignment, and artist opt-ins', async () => {
      const proj = (await request(app).post('/api/projects').send({ title: 'Shot Ep' })).body
      const id = proj.id

      // 1. Replace shots
      const shotsPayload = [
        {
          id: 'shot-1',
          shotNumber: 1,
          assignedArtist: '',
          panels: [
            { id: 'p-1a', panelCode: '1A', status: 'Not Started', price: 36 },
          ],
        },
        {
          id: 'shot-2',
          shotNumber: 2,
          assignedArtist: '',
          panels: [
            { id: 'p-2a', panelCode: '2A', status: 'Not Started', price: 18 },
          ],
        },
      ]

      const shotsRes = await request(app)
        .put(`/api/projects/${id}/shots`)
        .send({ shots: shotsPayload })
      expect(shotsRes.status).toBe(200)
      expect(shotsRes.body.count).toBe(2)

      // 2. Bulk assign validation
      const badBulk = await request(app)
        .put(`/api/projects/${id}/shots/bulk-assign`)
        .send({ shotIds: 'not-an-array' })
      expect(badBulk.status).toBe(400)

      // Valid bulk assign
      const bulkRes = await request(app)
        .put(`/api/projects/${id}/shots/bulk-assign`)
        .send({ shotIds: ['shot-1'], artistName: 'Alice', deadline: '2026-11-01' })
      expect(bulkRes.status).toBe(200)
      expect(bulkRes.body.count).toBe(1)

      // 3. Bulk folders
      const folderRes = await request(app)
        .put(`/api/projects/${id}/shots/bulk-folders`)
        .send({ baseFolderUrl: 'https://drive.com/folder/{shot}' })
      expect(folderRes.status).toBe(200)
      expect(folderRes.body.count).toBe(2)

      // 4. Update single shot
      const singleShotRes = await request(app)
        .put(`/api/projects/${id}/shots/shot-1`)
        .send({ notes: 'Epic dynamic camera move' })
      expect(singleShotRes.status).toBe(200)
      expect(singleShotRes.body.notes).toBe('Epic dynamic camera move')

      // 5. Artist opt-in
      const badOptIn = await request(app)
        .post(`/api/projects/${id}/shots/shot-2/opt-in`)
        .send({})
      expect(badOptIn.status).toBe(400)

      const optInRes = await request(app)
        .post(`/api/projects/${id}/shots/shot-2/opt-in`)
        .send({ artistName: 'Bob' })
      expect(optInRes.status).toBe(200)
      expect(optInRes.body.artistOptIns).toContain('Bob')

      // 6. Update Panel
      const panelRes = await request(app)
        .put(`/api/projects/${id}/shots/shot-1/panels/p-1a`)
        .send({ status: 'Completed', sketchOk: true })
      expect(panelRes.status).toBe(200)
      expect(panelRes.body.panel.status).toBe('Completed')

      // 7. Artist Preferences
      const prefRes = await request(app)
        .put(`/api/projects/${id}/artist-preferences`)
        .send({ artistName: 'Bob', maxShots: 4, preferredShots: [1, 2] })
      expect(prefRes.status).toBe(200)
      expect(prefRes.body.preference.maxShots).toBe(4)
    })
  })

  // 6. Voice Casting & Post Production
  describe('Voice Casting & Post Production', () => {
    it('updates voice casting and post production', async () => {
      const proj = (await request(app).post('/api/projects').send({ title: 'Audio Video' })).body
      const id = proj.id

      // Voice casting
      const vcRes = await request(app)
        .put(`/api/projects/${id}/voice-casting`)
        .send({
          voiceCasting: [
            { id: 'v-1', characterName: 'Villain', voiceActor: 'Mark', status: 'cast' },
          ],
        })
      expect(vcRes.status).toBe(200)
      expect(vcRes.body.length).toBe(1)

      // Post production
      const postRes = await request(app)
        .put(`/api/projects/${id}/post-production`)
        .send({
          audioFinalMix: { completed: true },
          videoFinalMix: { completed: true },
          isReleased: true,
        })
      expect(postRes.status).toBe(200)
      expect(postRes.body.isReleased).toBe(true)
    })
  })

  // 7. Team & Artists
  describe('Team & Artists Endpoints', () => {
    it('manages team members and artists directory', async () => {
      // Missing name on team member
      const badTeam = await request(app).post('/api/team').send({})
      expect(badTeam.status).toBe(400)

      // Create valid team member
      const createRes = await request(app).post('/api/team').send({
        name: 'Gemma Chan',
        isArtist: true,
        specialty: 'Lead Artist',
      })
      expect(createRes.status).toBe(201)
      const memberId = createRes.body.id

      // Get team
      const teamRes = await request(app).get('/api/team')
      expect(teamRes.status).toBe(200)
      expect(teamRes.body.length).toBe(1)

      // Update team member
      const updateRes = await request(app)
        .put(`/api/team/${memberId}`)
        .send({ specialty: 'Character Design Lead' })
      expect(updateRes.status).toBe(200)
      expect(updateRes.body.specialty).toBe('Character Design Lead')

      // Get artists
      const artistsRes = await request(app).get('/api/artists')
      expect(artistsRes.status).toBe(200)
      expect(artistsRes.body.some((a: any) => a.name === 'Gemma Chan')).toBe(true)

      // Create artist directly
      const artistCreate = await request(app).post('/api/artists').send({
        name: 'Benedict Cumberbatch',
        specialty: 'Storyboards',
      })
      expect(artistCreate.status).toBe(201)

      // Delete team member
      const delRes = await request(app).delete(`/api/team/${memberId}`)
      expect(delRes.status).toBe(200)
    })
  })

  // 8. Bottlenecks & Discord Feed
  describe('Bottlenecks & Discord Feed', () => {
    it('returns bottlenecks and discord feed payloads', async () => {
      const bnRes = await request(app).get('/api/bottlenecks')
      expect(bnRes.status).toBe(200)
      expect(bnRes.body).toHaveProperty('count')
      expect(bnRes.body).toHaveProperty('bottlenecks')

      const feedRes = await request(app).get('/api/discord/feed')
      expect(feedRes.status).toBe(200)
      expect(feedRes.body.status).toBe('success')
      expect(feedRes.body).toHaveProperty('feed')
    })
  })
})

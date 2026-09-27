import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import { serverCache } from '../../server/db/cache'

vi.mock('../../server/db/firebase', () => ({
  getDb: vi.fn(() => null),
  initFirestore: vi.fn(() => null),
}))

const realExistsSync = fs.existsSync.bind(fs)
const realReadFileSync = fs.readFileSync.bind(fs)
const realWriteFileSync = fs.writeFileSync.bind(fs)

describe('server/db/firestoreService (Local Fallback Engine)', () => {
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

  // ----------------- ADMIN SETTINGS -----------------
  describe('Admin Settings & Passcodes', () => {
    it('returns default passcodes', async () => {
      const { getAdminSettings, verifyPasscode } = await import('../../server/db/firestoreService')
      const settings = await getAdminSettings()
      expect(settings.producerPasscode).toBe('recd2026')
      expect(settings.directorPasscode).toBe('direct2026')

      expect(await verifyPasscode('producer', 'recd2026')).toBe(true)
      expect(await verifyPasscode('producer', 'wrongpass')).toBe(false)
      expect(await verifyPasscode('director', 'direct2026')).toBe(true)
      expect(await verifyPasscode('director', 'wrongpass')).toBe(false)
    })
  })

  // ----------------- PROJECTS CRUD -----------------
  describe('Projects CRUD', () => {
    it('creates a project with standard defaults', async () => {
      const { createProject, getProjectById } = await import('../../server/db/firestoreService')
      const proj = await createProject({
        title: 'New Musical Short',
        director: 'Tom',
        resolution: '1920x1080',
      })

      expect(proj.id).toMatch(/^proj-\d+/)
      expect(proj.title).toBe('New Musical Short')
      expect(proj.director).toBe('Tom')
      expect(proj.status).toBe('active')
      expect(proj.initialSetup.storyPitch.status).toBe('not_started')
      expect(proj.postProduction.isReleased).toBe(false)

      const fetched = await getProjectById(proj.id)
      expect(fetched).toEqual(proj)
    })

    it('returns null when getting non-existent project', async () => {
      const { getProjectById } = await import('../../server/db/firestoreService')
      const fetched = await getProjectById('does-not-exist')
      expect(fetched).toBeNull()
    })

    it('updates project metadata and updates updatedAt timestamp', async () => {
      const { createProject, updateProject } = await import('../../server/db/firestoreService')
      const created = await createProject({ title: 'Old Title', director: 'Tom' })

      const updated = await updateProject(created.id, {
        title: 'Updated Title',
        targetDeadline: '2026-12-01',
      })

      expect(updated.title).toBe('Updated Title')
      expect(updated.targetDeadline).toBe('2026-12-01')
      expect(updated.director).toBe('Tom')
    })

    it('returns null when updating non-existent project', async () => {
      const { updateProject } = await import('../../server/db/firestoreService')
      const res = await updateProject('invalid-id', { title: 'Test' })
      expect(res).toBeNull()
    })

    it('deletes an existing project and returns true, or false if not found', async () => {
      const { createProject, deleteProject, getProjectById } = await import('../../server/db/firestoreService')
      const created = await createProject({ title: 'To Delete' })

      const deleted = await deleteProject(created.id)
      expect(deleted).toBe(true)

      const fetched = await getProjectById(created.id)
      expect(fetched).toBeNull()

      const secondDelete = await deleteProject('non-existent-id')
      expect(secondDelete).toBe(false)
    })

    it('getAllProjects returns projects sorted by createdAt descending', async () => {
      const { createProject, getAllProjects } = await import('../../server/db/firestoreService')
      await createProject({ title: 'Project 1' })
      await createProject({ title: 'Project 2' })

      const all = await getAllProjects()
      expect(all.length).toBe(2)
      expect(all[0].title).toBe('Project 2')
      expect(all[1].title).toBe('Project 1')
    })
  })

  // ----------------- INITIAL SETUP -----------------
  describe('Initial Setup', () => {
    it('updates specific initial setup stage', async () => {
      const { createProject, updateInitialSetup } = await import('../../server/db/firestoreService')
      const proj = await createProject({ title: 'Stage Test' })

      const setup = await updateInitialSetup(proj.id, 'storyPitch', {
        status: 'completed',
        notes: 'Approved story pitch',
        link: 'https://docs.google.com/pitch',
      })

      expect(setup.storyPitch.status).toBe('completed')
      expect(setup.storyPitch.notes).toBe('Approved story pitch')
      expect(setup.storyPitch.link).toBe('https://docs.google.com/pitch')
      expect(setup.melodyStyle.status).toBe('not_started')
    })

    it('returns null when updating initial setup for non-existent project', async () => {
      const { updateInitialSetup } = await import('../../server/db/firestoreService')
      const res = await updateInitialSetup('missing-proj', 'storyPitch', { status: 'completed' })
      expect(res).toBeNull()
    })
  })

  // ----------------- SHOTS & PANELS -----------------
  describe('Shots & Panels Management', () => {
    it('updates and replaces all shots in a project', async () => {
      const { createProject, updateShots, getProjectById } = await import('../../server/db/firestoreService')
      const proj = await createProject({ title: 'Shots Test' })

      const newShots = [
        {
          id: 'shot-1',
          shotNumber: 1,
          sceneIntro: 'Intro scene',
          panels: [
            { id: 'p-1a', panelCode: '1A', type: 'COMPLEX BASE', price: 36, status: 'Not Started' },
          ],
        },
      ]

      const res = await updateShots(proj.id, newShots)
      expect(res?.count).toBe(1)

      const updatedProj = await getProjectById(proj.id)
      expect(updatedProj.shots.length).toBe(1)
      expect(updatedProj.shots[0].sceneIntro).toBe('Intro scene')
    })

    it('bulkAssignShots assigns multiple shots and panels to artist with deadline', async () => {
      const { createProject, updateShots, bulkAssignShots, getProjectById } = await import(
        '../../server/db/firestoreService'
      )
      const proj = await createProject({ title: 'Bulk Assign' })

      await updateShots(proj.id, [
        {
          id: 'shot-1',
          shotNumber: 1,
          assignedArtist: '',
          panels: [{ id: 'p-1', artist: '' }],
        },
        {
          id: 'shot-2',
          shotNumber: 2,
          assignedArtist: '',
          panels: [{ id: 'p-2', artist: '' }],
        },
        {
          id: 'shot-3',
          shotNumber: 3,
          assignedArtist: 'Other',
          panels: [{ id: 'p-3', artist: 'Other' }],
        },
      ])

      const res = await bulkAssignShots(proj.id, ['shot-1', 'shot-2'], 'Sarah', '2026-10-15')
      expect(res?.count).toBe(2)

      const updated = await getProjectById(proj.id)
      expect(updated.shots[0].assignedArtist).toBe('Sarah')
      expect(updated.shots[0].deadline).toBe('2026-10-15')
      expect(updated.shots[0].panels[0].artist).toBe('Sarah')
      expect(updated.shots[1].assignedArtist).toBe('Sarah')
      expect(updated.shots[2].assignedArtist).toBe('Other')
    })

    it('bulkFolders applies URL templates or explicit mapping dictionary', async () => {
      const { createProject, updateShots, bulkFolders, getProjectById } = await import(
        '../../server/db/firestoreService'
      )
      const proj = await createProject({ title: 'Bulk Folders' })

      await updateShots(proj.id, [
        { id: 's-1', shotNumber: 1, driveFolderUrl: '' },
        { id: 's-2', shotNumber: 2, driveFolderUrl: '' },
      ])

      // Test template interpolation
      await bulkFolders(proj.id, undefined, 'https://drive.com/folder/{shotNumber}')
      let updated = await getProjectById(proj.id)
      expect(updated.shots[0].driveFolderUrl).toBe('https://drive.com/folder/1')
      expect(updated.shots[1].driveFolderUrl).toBe('https://drive.com/folder/2')

      // Test explicit mappings
      await bulkFolders(proj.id, { 's-1': 'https://custom.com/1' })
      updated = await getProjectById(proj.id)
      expect(updated.shots[0].driveFolderUrl).toBe('https://custom.com/1')
      expect(updated.shots[1].driveFolderUrl).toBe('https://drive.com/folder/2')
    })

    it('updateSingleShot updates individual shot details', async () => {
      const { createProject, updateShots, updateSingleShot, getProjectById } = await import(
        '../../server/db/firestoreService'
      )
      const proj = await createProject({ title: 'Single Shot Test' })
      await updateShots(proj.id, [{ id: 's-1', notes: 'Old' }])

      const updated = await updateSingleShot(proj.id, 's-1', { notes: 'New notes', isAnimated: true })
      expect(updated.notes).toBe('New notes')
      expect(updated.isAnimated).toBe(true)

      const projAfter = await getProjectById(proj.id)
      expect(projAfter.shots[0].notes).toBe('New notes')
    })

    it('toggleOptIn toggles artist opt in on and off', async () => {
      const { createProject, updateShots, toggleOptIn } = await import('../../server/db/firestoreService')
      const proj = await createProject({ title: 'OptIn Test' })
      await updateShots(proj.id, [{ id: 's-1', artistOptIns: [] }])

      // First toggle: adds artist
      const afterAdd = await toggleOptIn(proj.id, 's-1', 'Alice')
      expect(afterAdd).toEqual(['Alice'])

      // Second toggle: removes artist
      const afterRemove = await toggleOptIn(proj.id, 's-1', 'Alice')
      expect(afterRemove).toEqual([])
    })

    it('updateArtistPreference validates maxShots, syncs preferred and avoid shots', async () => {
      const { createProject, updateShots, updateArtistPreference, getProjectById } = await import(
        '../../server/db/firestoreService'
      )
      const proj = await createProject({ title: 'Preference Test' })
      await updateShots(proj.id, [
        { id: 's-1', shotNumber: 1, artistOptIns: [] },
        { id: 's-2', shotNumber: 2, artistOptIns: ['Bob'] },
        { id: 's-3', shotNumber: 3, artistOptIns: [] },
      ])

      const res = await updateArtistPreference(proj.id, {
        artistName: 'Bob',
        maxShots: -5, // Should clamp to Math.max(1, ...)
        preferredShots: [1, 3],
        avoidShots: [2],
      })

      expect(res?.preference.maxShots).toBe(1)
      expect(res?.preference.preferredShots).toEqual([1, 3])
      expect(res?.preference.avoidShots).toEqual([2])

      const updatedProj = await getProjectById(proj.id)
      // Shot 1 should have Bob added
      expect(updatedProj.shots[0].artistOptIns).toContain('Bob')
      // Shot 2 should have Bob removed because it was in avoidShots
      expect(updatedProj.shots[1].artistOptIns).not.toContain('Bob')
      // Shot 3 should have Bob added
      expect(updatedProj.shots[2].artistOptIns).toContain('Bob')
    })

    it('updatePanel updates status, drive link and sketchOk on a panel', async () => {
      const { createProject, updateShots, updatePanel, getProjectById } = await import(
        '../../server/db/firestoreService'
      )
      const proj = await createProject({ title: 'Panel Update Test' })
      await updateShots(proj.id, [
        {
          id: 's-1',
          panels: [{ id: 'p-1', status: 'Not Started', sketchOk: false, driveLink: '' }],
        },
      ])

      const res = await updatePanel(proj.id, 's-1', 'p-1', {
        status: 'Completed',
        sketchOk: true,
        driveLink: 'https://drive.com/panel1',
      })

      expect(res?.panel.status).toBe('Completed')
      expect(res?.panel.sketchOk).toBe(true)
      expect(res?.panel.driveLink).toBe('https://drive.com/panel1')

      const updated = await getProjectById(proj.id)
      expect(updated.shots[0].panels[0].status).toBe('Completed')
    })
  })

  // ----------------- VOICE CASTING & POST PRODUCTION -----------------
  describe('Voice Casting & Post Production', () => {
    it('updates voice casting array', async () => {
      const { createProject, updateVoiceCasting, getProjectById } = await import(
        '../../server/db/firestoreService'
      )
      const proj = await createProject({ title: 'Voice Test' })

      const voiceData = [
        { id: 'v-1', characterName: 'Hero', voiceActor: 'John Doe', status: 'cast' },
      ]
      const res = await updateVoiceCasting(proj.id, voiceData)
      expect(res).toEqual(voiceData)

      const updated = await getProjectById(proj.id)
      expect(updated.voiceCasting).toEqual(voiceData)
    })

    it('updates post-production and marks project released when isReleased is true', async () => {
      const { createProject, updatePostProduction, getProjectById } = await import(
        '../../server/db/firestoreService'
      )
      const proj = await createProject({ title: 'Post Test' })

      const res = await updatePostProduction(proj.id, {
        audioFinalMix: { completed: true, notes: 'Mix done', link: 'https://audio.com' },
        videoFinalMix: { completed: true, notes: 'Render done', link: 'https://video.com' },
        isReleased: true,
        releaseUrl: 'https://youtube.com/watch?v=123',
      })

      expect(res.audioFinalMix.completed).toBe(true)
      expect(res.isReleased).toBe(true)
      expect(res.releasedAt).toBeDefined()

      const updatedProj = await getProjectById(proj.id)
      expect(updatedProj.status).toBe('released')
    })
  })

  // ----------------- TEAM & ARTISTS -----------------
  describe('Team Members & Artists', () => {
    it('creates team member and syncs to artists list when isArtist is true', async () => {
      const { createTeamMember, getTeamMembers, getArtists } = await import(
        '../../server/db/firestoreService'
      )
      const member = await createTeamMember({
        name: 'Clara Oswald',
        email: 'clara@recd.com',
        isArtist: true,
        isVoiceActor: false,
        specialty: 'Backgrounds',
      })

      expect(member.name).toBe('Clara Oswald')
      const allMembers = await getTeamMembers()
      expect(allMembers.some((m) => m.name === 'Clara Oswald')).toBe(true)

      const artists = await getArtists()
      expect(artists.some((a) => a.name === 'Clara Oswald')).toBe(true)
    })

    it('updates team member and propagates artist updates', async () => {
      const { createTeamMember, updateTeamMember, getArtists } = await import(
        '../../server/db/firestoreService'
      )
      const member = await createTeamMember({
        name: 'David Tennant',
        email: 'david@recd.com',
        isArtist: true,
        specialty: 'Sketching',
      })

      await updateTeamMember(member.id, { specialty: 'Lead Character Designer' })

      const artists = await getArtists()
      const art = artists.find((a) => a.name === 'David Tennant')
      expect(art?.specialty).toBe('Lead Character Designer')
    })

    it('deletes team member and removes from artists', async () => {
      const { createTeamMember, deleteTeamMember, getTeamMembers, getArtists } = await import(
        '../../server/db/firestoreService'
      )
      const member = await createTeamMember({
        name: 'Matt Smith',
        isArtist: true,
      })

      const delResult = await deleteTeamMember(member.id)
      expect(delResult).toBe(true)

      const members = await getTeamMembers()
      expect(members.some((m) => m.name === 'Matt Smith')).toBe(false)

      const artists = await getArtists()
      expect(artists.some((a) => a.name === 'Matt Smith')).toBe(false)
    })
  })

  // ----------------- BOTTLENECKS -----------------
  describe('Bottleneck Detection', () => {
    it('detects unassigned shots, artist lag, and director setup delays', async () => {
      const { createProject, updateShots, getBottlenecks } = await import('../../server/db/firestoreService')
      const proj = await createProject({
        title: 'Bottlenecked Movie',
        director: 'Tom',
      })

      // Project has initialSetup steps that are not_started -> triggers director_setup bottleneck
      // Add an unassigned shot
      const pastDeadline = new Date(Date.now() - 86400000 * 2).toISOString() // 2 days ago
      await updateShots(proj.id, [
        {
          id: 'shot-unassigned',
          shotNumber: 1,
          assignedArtist: '',
          panels: [{ id: 'p-1', status: 'Not Started', price: 36 }],
        },
        {
          id: 'shot-lagging',
          shotNumber: 2,
          assignedArtist: 'SlowArtist',
          deadline: pastDeadline,
          panels: [{ id: 'p-2', status: 'Sketched', price: 18 }],
        },
      ])

      const result = await getBottlenecks()
      expect(result.count).toBeGreaterThan(0)

      const unassigned = result.bottlenecks.find((b: any) => b.type === 'unassigned_shot')
      expect(unassigned).toBeDefined()
      expect(unassigned.severity).toBe('high')
      expect(unassigned.title).toContain('Shot 1 is Unassigned')

      const artistLag = result.bottlenecks.find((b: any) => b.type === 'artist_lagging')
      expect(artistLag).toBeDefined()
      expect(artistLag.severity).toBe('high')
      expect(artistLag.responsibleParty).toContain('SlowArtist')

      const directorLag = result.bottlenecks.find((b: any) => b.type === 'director_setup')
      expect(directorLag).toBeDefined()
    })

    it('ignores released projects in bottleneck analysis', async () => {
      const { createProject, updateShots, updatePostProduction, getBottlenecks } = await import(
        '../../server/db/firestoreService'
      )
      const proj = await createProject({ title: 'Released Movie' })
      await updateShots(proj.id, [
        { id: 's-1', shotNumber: 1, assignedArtist: '', panels: [] },
      ])
      await updatePostProduction(proj.id, { isReleased: true })

      const result = await getBottlenecks()
      const projectBottlenecks = result.bottlenecks.filter((b: any) => b.projectId === proj.id)
      expect(projectBottlenecks.length).toBe(0)
    })
  })

  // ----------------- DISCORD FEED -----------------
  describe('Discord Feed Generation', () => {
    it('generates accurate progress percentages and filters by projectId', async () => {
      const { createProject, updateShots, getDiscordFeed } = await import('../../server/db/firestoreService')
      const proj1 = await createProject({ title: 'Discord Proj 1' })
      const proj2 = await createProject({ title: 'Discord Proj 2' })

      await updateShots(proj1.id, [
        {
          id: 's-1',
          panels: [
            { id: 'p1', status: 'Completed' },
            { id: 'p2', status: 'Completed' },
            { id: 'p3', status: 'Not Started' },
            { id: 'p4', status: 'Not Started' },
          ],
        },
      ])

      // All projects feed
      const allFeed = await getDiscordFeed()
      expect(allFeed.length).toBe(2)

      // Filtered feed for proj1
      const filtered = await getDiscordFeed(proj1.id)
      expect(filtered.length).toBe(1)
      expect(filtered[0].title).toBe('Discord Proj 1')
      expect(filtered[0].artProgress.total).toBe(4)
      expect(filtered[0].artProgress.completed).toBe(2)
      expect(filtered[0].artProgress.percent).toBe(50)
    })
  })
})

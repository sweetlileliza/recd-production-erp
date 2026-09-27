import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('server/db/firebase', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS
  })

  it('returns null and does not throw when credentials are not configured', async () => {
    const fs = await import('fs')
    const existsSpy = vi.spyOn(fs.default || fs, 'existsSync').mockReturnValue(false)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { initFirestore, getDb } = await import('../../server/db/firebase')

    const db = initFirestore()
    expect(db).toBeNull()
    expect(getDb()).toBeNull()
    warnSpy.mockRestore()
    existsSpy.mockRestore()
  })

  it('initializes firestore when valid FIREBASE_SERVICE_ACCOUNT_KEY JSON is present', async () => {
    const mockApp = { name: 'test-app' }
    const mockFirestore = { id: 'mock-firestore' }

    vi.doMock('firebase-admin/app', () => ({
      initializeApp: vi.fn(() => mockApp),
      cert: vi.fn((acc) => acc),
      getApps: vi.fn(() => []),
    }))

    vi.doMock('firebase-admin/firestore', () => ({
      getFirestore: vi.fn(() => mockFirestore),
    }))

    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      project_id: 'test-proj-json',
      client_email: 'test@example.com',
      private_key: 'test-key',
    })

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { initFirestore } = await import('../../server/db/firebase')
    const db = initFirestore()

    expect(db).toBe(mockFirestore)
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Firestore] ✓ Connected to Firebase project: test-proj-json')
    )
    logSpy.mockRestore()
  })

  it('decodes base64-encoded FIREBASE_SERVICE_ACCOUNT_KEY', async () => {
    const mockApp = { name: 'test-app' }
    const mockFirestore = { id: 'mock-firestore' }

    vi.doMock('firebase-admin/app', () => ({
      initializeApp: vi.fn(() => mockApp),
      cert: vi.fn((acc) => acc),
      getApps: vi.fn(() => []),
    }))

    vi.doMock('firebase-admin/firestore', () => ({
      getFirestore: vi.fn(() => mockFirestore),
    }))

    const serviceAccount = {
      project_id: 'test-proj-base64',
      client_email: 'b64@example.com',
      private_key: 'b64-key',
    }
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = Buffer.from(JSON.stringify(serviceAccount)).toString('base64')

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { initFirestore } = await import('../../server/db/firebase')
    const db = initFirestore()

    expect(db).toBe(mockFirestore)
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Firestore] ✓ Connected to Firebase project: test-proj-base64')
    )
    logSpy.mockRestore()
  })

  it('reuses existing Firebase app if already initialized in getApps()', async () => {
    const mockApp = { name: 'existing-app' }
    const mockFirestore = { id: 'mock-firestore-existing' }

    vi.doMock('firebase-admin/app', () => ({
      initializeApp: vi.fn(),
      cert: vi.fn(),
      getApps: vi.fn(() => [mockApp]),
    }))

    vi.doMock('firebase-admin/firestore', () => ({
      getFirestore: vi.fn(() => mockFirestore),
    }))

    const { initFirestore, getDb } = await import('../../server/db/firebase')
    const db = initFirestore()

    expect(db).toBe(mockFirestore)
    expect(getDb()).toBe(mockFirestore)
  })
})

import { initializeApp, cert, getApps, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let firestoreDb: Firestore | null = null
let appInstance: App | null = null
let isInitialized = false

/**
 * Initializes and returns the Firebase Admin Firestore instance.
 * Automatically checks:
 * 1. FIREBASE_SERVICE_ACCOUNT_KEY env variable (raw JSON or base64)
 * 2. GOOGLE_APPLICATION_CREDENTIALS env path
 * 3. Default local path: server/serviceAccountKey.json (or serviceAccountKey.json in project root)
 */
export function initFirestore(): Firestore | null {
  if (isInitialized) {
    return firestoreDb
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'recd-website'

  try {
    const existingApps = getApps()
    if (existingApps.length > 0) {
      appInstance = existingApps[0]
      firestoreDb = getFirestore(appInstance)
      isInitialized = true
      return firestoreDb
    }

    // 1. Check for raw or base64 JSON string in environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      let raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim()
      if (!raw.startsWith('{')) {
        // Attempt base64 decode
        raw = Buffer.from(raw, 'base64').toString('utf-8')
      }
      const serviceAccount = JSON.parse(raw)
      appInstance = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      })
      console.log(`[Firestore] ✓ Connected to Firebase project: ${serviceAccount.project_id || projectId} via FIREBASE_SERVICE_ACCOUNT_KEY`)
      firestoreDb = getFirestore(appInstance)
      isInitialized = true
      return firestoreDb
    }

    // 2. Check for file path specified in GOOGLE_APPLICATION_CREDENTIALS
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      if (fs.existsSync(credPath)) {
        const raw = fs.readFileSync(credPath, 'utf-8')
        const serviceAccount = JSON.parse(raw)
        appInstance = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || projectId,
        })
        console.log(`[Firestore] ✓ Connected to Firebase project: ${serviceAccount.project_id || projectId} via ${credPath}`)
        firestoreDb = getFirestore(appInstance)
        isInitialized = true
        return firestoreDb
      }
    }

    // 3. Check standard local paths: server/serviceAccountKey.json or root serviceAccountKey.json
    const candidatePaths = [
      path.resolve(__dirname, '..', 'serviceAccountKey.json'),
      path.resolve(process.cwd(), 'server', 'serviceAccountKey.json'),
      path.resolve(process.cwd(), 'serviceAccountKey.json'),
    ]

    for (const keyPath of candidatePaths) {
      if (fs.existsSync(keyPath)) {
        const raw = fs.readFileSync(keyPath, 'utf-8')
        const serviceAccount = JSON.parse(raw)
        appInstance = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || projectId,
        })
        console.log(`[Firestore] ✓ Connected to Firebase project: ${serviceAccount.project_id || projectId} via ${keyPath}`)
        firestoreDb = getFirestore(appInstance)
        isInitialized = true
        return firestoreDb
      }
    }

    // Notice if no credentials file is present
    console.warn(`
========================================================================
[Firestore Status: Waiting for Service Account Key]
Cloud Firestore is configured in code, but no service account key was found.

To connect your live Firestore database (${projectId}):
1. Open Firebase Console:
   https://console.firebase.google.com/u/0/project/${projectId}/settings/serviceaccounts/adminsdk
2. Click "Generate new private key" -> "Generate key"
3. Save the downloaded JSON file as:
   server/serviceAccountKey.json

Meanwhile, the server is running seamlessly using local fallback (store.json).
========================================================================
    `)
  } catch (error) {
    console.error('[Firestore] Initialization error:', error)
  }

  isInitialized = true
  return null
}

export function getDb(): Firestore | null {
  if (!isInitialized) {
    return initFirestore()
  }
  return firestoreDb
}

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { initFirestore } from './firebase.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_FILE = path.join(__dirname, '..', 'data', 'store.json')

async function runMigration() {
  console.log('--- Starting Firestore Migration ---')

  const db = initFirestore()
  if (!db) {
    console.error('Migration aborted: Firestore could not be initialized. Please check your service account key or environment variables.')
    process.exit(1)
  }

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`store.json not found at: ${DATA_FILE}`)
    process.exit(1)
  }

  const raw = fs.readFileSync(DATA_FILE, 'utf-8')
  const data = JSON.parse(raw)

  console.log(`Loaded store.json (${raw.length} bytes).`)

  const batch = db.batch()
  let projectCount = 0
  let memberCount = 0

  // 1. Migrate Admin Settings
  if (data.adminSettings) {
    const settingsRef = db.collection('settings').doc('admin')
    batch.set(settingsRef, data.adminSettings, { merge: true })
    console.log('✓ Queued admin settings for migration')
  }

  // 2. Migrate Team Members
  const members = data.teamMembers || []
  for (const member of members) {
    if (member.id) {
      const ref = db.collection('teamMembers').doc(member.id)
      batch.set(ref, member, { merge: true })
      memberCount++
    }
  }
  console.log(`✓ Queued ${memberCount} team members for migration`)

  // 3. Migrate Projects
  const projects = data.projects || []
  for (const proj of projects) {
    if (proj.id) {
      const ref = db.collection('projects').doc(proj.id)
      batch.set(ref, proj, { merge: true })
      projectCount++
    }
  }
  console.log(`✓ Queued ${projectCount} projects for migration`)

  console.log('Writing batch to Cloud Firestore...')
  await batch.commit()

  console.log('----------------------------------------------------')
  console.log('✓ Migration to Cloud Firestore successfully finished!')
  console.log(`  - Projects: ${projectCount}`)
  console.log(`  - Team Members: ${memberCount}`)
  console.log('  - Settings: 1')
  console.log('----------------------------------------------------')
  process.exit(0)
}

runMigration().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})

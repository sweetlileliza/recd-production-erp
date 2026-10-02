/**
 * RECD Studios Production Server Entry Point
 * 
 * Optimized for Hostinger Node.js Application Manager, PM2, and direct execution.
 * This runs the compiled production backend, which serves:
 * 1. All Express REST API endpoints (/api/*)
 * 2. The compiled Vite React SPA frontend (dist/)
 * 3. The Discord Auto-Tracker Bot (when DISCORD_TOKEN is configured)
 */
import './dist/server.js'
import * as serverServices from './dist/server.js'

// Automatically start Discord Bot alongside server if DISCORD_TOKEN is configured
if (process.env.DISCORD_TOKEN) {
  console.log('🤖 [Hostinger Startup] DISCORD_TOKEN detected. Starting Discord Bot with direct in-memory database bridge...')
  import('./bot.js')
    .then(({ startBot }) => {
      if (typeof startBot === 'function') {
        startBot(serverServices)
      }
    })
    .catch((err) => {
      console.error('❌ [Discord Bot] Failed to initialize bot alongside server:', err)
    })
} else {
  console.log('ℹ️ [Hostinger Startup] DISCORD_TOKEN not found in environment. Running web server only.')
}

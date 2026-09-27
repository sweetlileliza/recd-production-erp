/**
 * RECD Studios Production Server Entry Point
 * 
 * Optimized for Hostinger Node.js Application Manager, PM2, and direct execution.
 * This runs the compiled production backend, which serves:
 * 1. All Express REST API endpoints (/api/*)
 * 2. The compiled Vite React SPA frontend (dist/)
 */
import './dist/server.js'

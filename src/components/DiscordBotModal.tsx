import { useState, useEffect } from 'react'
import { Bot, Copy, Check, X, RefreshCw } from 'lucide-react'

interface DiscordBotModalProps {
  onClose: () => void
}

export const DiscordBotModal = ({ onClose }: DiscordBotModalProps) => {
  const [feedData, setFeedData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copiedSnippet, setCopiedSnippet] = useState(false)

  const fetchFeed = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/discord/feed')
      if (res.ok) {
        const json = await res.json()
        setFeedData(json)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeed()
  }, [])

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const sampleBotCode = `// RECD Studios Auto-Tracker Discord Bot (discord.js)
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const API_BASE = 'http://localhost:5000/api'; // Or your deployed domain https://recdstudios.com/api

// Slash command to check live art status
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'artstatus') {
    const res = await fetch(\`\${API_BASE}/discord/feed\`);
    const data = await res.json();
    
    const embed = {
      title: "RECD Studios Art Production Feed",
      color: 0xf59e0b,
      fields: data.feed.map(p => ({
        name: p.title,
        value: \`**Progress:** \${p.artProgress.completed}/\${p.artProgress.total} (\${p.artProgress.percent}%)\\n**Last touched:** \${new Date(p.lastUpdated).toLocaleDateString()}\`,
        inline: true
      }))
    };
    await interaction.reply({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);`

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleBotCode)
    setCopiedSnippet(true)
    setTimeout(() => setCopiedSnippet(false), 2000)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '850px', width: '95vw', padding: '32px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(88, 101, 242, 0.15)',
                color: '#5865F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge" style={{ background: '#5865F2', color: '#fff' }}>
                  Auto-Tracker Bot API
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Discord Integration</span>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '2px 0 0' }}>
                Discord Bot Auto-Tracker Integration
              </h2>
            </div>
          </div>

          <button onClick={onClose} style={{ color: 'var(--text-dim)', padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px', lineHeight: 1.6 }}>
          All shot updates, panel uploads, and timestamps in RECD Studios are exposed over real-time REST endpoints so
          your Discord bot can post automated progress reports, ping artists on overdue deadlines, and sync directly with
          Google Drive links.
        </p>

        {/* Available Bot Endpoints */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px' }}>Bot Endpoints</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
            <div
              style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ color: 'var(--color-green)', fontWeight: 800 }}>GET</span>{' '}
                <code>/api/discord/feed</code> &mdash; Queries studio projects, completed panel counts, and timestamps.
              </div>
              <button
                onClick={fetchFeed}
                style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Test Feed
              </button>
            </div>

            <div
              style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
              }}
            >
              <span style={{ color: 'var(--color-amber)', fontWeight: 800 }}>PUT</span>{' '}
              <code>/api/projects/:id/shots/:shotId/panels/:panelId</code> &mdash; Updates panel status
              (Sketched/Lined/Colored/Completed) and Drive upload link directly via bot command!
            </div>
          </div>
        </div>

        {/* Live Feed Output Preview */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>Live API Response Preview</h3>
          <pre
            style={{
              background: 'var(--bg-main)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              fontSize: '0.78rem',
              color: 'var(--color-amber)',
              maxHeight: '160px',
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {loading ? 'Fetching live endpoint...' : JSON.stringify(feedData, null, 2)}
          </pre>
        </div>

        {/* Sample Discord Bot Script */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Quick Start Discord Bot Code</h3>
            <button
              onClick={handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                color: copiedSnippet ? 'var(--color-green)' : 'var(--color-primary)',
                fontWeight: 600,
              }}
            >
              {copiedSnippet ? <Check size={14} /> : <Copy size={14} />}
              {copiedSnippet ? 'Copied to Clipboard!' : 'Copy Code'}
            </button>
          </div>
          <pre
            style={{
              background: 'var(--bg-main)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              maxHeight: '180px',
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.5,
            }}
          >
            {sampleBotCode}
          </pre>
        </div>
      </div>
    </div>
  )
}

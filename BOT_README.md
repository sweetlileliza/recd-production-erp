# 🤖 RECD Studios — Discord Auto-Tracker Bot

The **RECD Studios Discord Bot** connects your Discord server directly to the RECD Production ERP website. It gives directors, producers, and artists real-time production visibility, overdue bottleneck warnings, and two-way status updates directly from Discord chat.

---

## 🏗️ How It Works

```
┌─────────────────────────────────┐
│         Discord Server          │
│   (Artists, Directors, VAs)     │
└───────────────▲─────────────────┘
                │ Discord Gateway & Slash Commands
                ▼
┌─────────────────────────────────┐
│        bot.js (discord.js)      │ ◄── In-memory cache (<50ms autocomplete)
└───────────────▲─────────────────┘
                │ REST API (JSON)
                ▼
┌─────────────────────────────────┐
│      RECD Website Backend       │
│      (Express on Port 5000)     │
│  Cloud Firestore / Local Store  │
└─────────────────────────────────┘
```

1. **REST Endpoints**: The RECD website backend exposes real-time endpoints (`/api/discord/feed`, `/api/projects`, `/api/bottlenecks`, `/api/team`, etc.).
2. **Slash Commands**: When users run commands in Discord, `bot.js` queries these endpoints and formats responses into rich Discord embeds.
3. **Dynamic Autocomplete**: When updating panels, `bot.js` dynamically pulls project names, shot numbers, and panel codes straight from the active database into interactive dropdowns.
4. **Two-Way Sync**: Changes made via `/updatepanel` (e.g. marking a panel as `Completed` or submitting a Drive link) immediately reflect on the ERP website.

---

## 📋 Prerequisites

* **Node.js** v18+ installed.
* **Discord Bot Token & Application** from the [Discord Developer Portal](https://discord.com/developers/applications).
* The **RECD Website Server** running locally (`http://localhost:5000`) or hosted on a public domain.

---

## ⚙️ Configuration (`.env`)

Ensure a `.env` file exists in the project root (`RECD WEBSITE/.env`):

```env
# Discord Bot Credentials
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_discord_application_id_here

# (Recommended for Instant Slash Command Updates)
# Put your Discord Server (Guild) ID here to avoid Discord's 1-hour global cache delay:
GUILD_ID=your_server_id_here

# RECD Website Backend API Base
API_BASE=http://localhost:5000/api

# Server Port
PORT=5000
```

> 💡 **Where to find these IDs?**
> * **`CLIENT_ID`**: Discord Developer Portal → Your App → *General Information* → *Application ID*.
> * **`DISCORD_TOKEN`**: Discord Developer Portal → Your App → *Bot* → *Reset Token*.
> * **`GUILD_ID`**: In Discord, turn on *User Settings ⚙️ → Advanced → Developer Mode*, then right-click your server icon and click *Copy Server ID*.

---

## 🚀 How to Run the Bot

### 1. Start the RECD Website & Backend
In your first terminal tab:
```powershell
npm run dev
```
Verify you see:
* `Backend server listening at http://localhost:5000`
* `VITE ready -> Local: http://localhost:5173/`

### 2. Start the Discord Bot
In a **new terminal tab**:
```powershell
node bot.js
```

You should see:
```text
🤖 Logged in as RECD Auto-Tracker!
Registering slash commands...
Slash commands registered successfully! (/artstatus, /bottlenecks, /health, /roster, /panels, /updatepanel)
```

---

## 🔄 Running in the Background (No Open Terminal Required)

To keep the bot running on your computer even after closing PowerShell, use **PM2**:

```powershell
# 1. Install PM2 globally
npm install -g pm2

# 2. Start the bot
pm2 start bot.js --name "recd-bot"

# Common PM2 commands:
pm2 status          # Check if bot is online
pm2 logs recd-bot   # View live logs / output
pm2 restart recd-bot
pm2 stop recd-bot
```

---

## ☁️ Deploying to Hostinger (Server + Bot Together)

When deploying to **Hostinger Node.js Web Apps**, `server.js` automatically starts both the web application AND the Discord bot in the same service.

### 1. Hostinger Build & Output Settings:
* **Build command**: `npm run build`
* **Package manager**: `npm`
* **Output directory**: `dist`
* **Entry file**: `server.js`

### 2. Environment Variables to add in Hostinger:
* `FIREBASE_PROJECT_ID`: `recd-website`
* `FIREBASE_SERVICE_ACCOUNT_KEY`: *(Your Firebase service account JSON string)*
* `PORT`: `5000` *(or Hostinger default)*
* **`DISCORD_TOKEN`**: *(Your Discord Bot token - **Required** to start the bot)*
* **`CLIENT_ID`**: *(Your Discord App Client ID - **Required** for slash commands)*
* **`GUILD_ID`**: *(Your Discord Server ID - Recommended for instant command sync)*

*(Note: `API_BASE` is automatic! The bot automatically talks to `http://127.0.0.1:${PORT}/api` internally on Hostinger).*

---

## 🎮 Available Commands

| Command | Description | Example Usage |
| :--- | :--- | :--- |
| **`/artstatus`** | Displays overall production progress, completed panels count, and visual ASCII progress bars (`[████░░░░░░] 40%`) for all studio projects. | `/artstatus` |
| **`/bottlenecks`** | Alerts the studio on overdue shots, inactive artists (3+ days), and lagging director initial setups. | `/bottlenecks` |
| **`/panels`** | Browse all shots in a project, or select a shot to view its panels, script snippets, director notes, and Drive links. *(Uses dynamic autocomplete)* | `/panels project: ONE SHIFT MORE shot: Shot 9` |
| **`/updatepanel`** | Submit Google Drive artwork links or update panel status (`Completed`, `Lined`, `Colored`, `Sketched`, `Not Started`) straight to the website. *(Uses dynamic autocomplete)* | `/updatepanel project: ONE SHIFT MORE shot: 9 panel: 9C status: Completed drive_link: https://drive.google.com/...` |
| **`/starttracking`** | Activates automated progress tracking in the current channel. Sends an update immediately and recurring every 3 days with all panels that haven't reached the target status (`Sketched`, `Lined`, `Colored`, `Completed`). | `/starttracking project: ONE SHIFT MORE progress: Lined` |
| **`/stoptracking`** | Stops the 3-day recurring progress tracking timer in the current channel. | `/stoptracking` |
| **`/roster`** | Lists all registered studio team members, roles (Artist / Voice Actor), specialties, and linked Discord handles. | `/roster` |
| **`/health`** | Ping check confirming connection to the RECD Express server and whether Cloud Firestore or local JSON fallback is active. | `/health` |

---

## 🛠️ Troubleshooting

### 1. `npm : File ... npm.ps1 cannot be loaded because running scripts is disabled`
Windows PowerShell blocks script execution by default. Run:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Press `Y` and Enter.

### 2. Slash commands don't show up in Discord
* Ensure `GUILD_ID` is defined in `.env`. Guild-registered commands show up **instantly**, while global commands can take up to 1 hour to propagate across Discord.
* Make sure you invited the bot with both `bot` and `applications.commands` scopes selected in the Developer Portal OAuth2 URL generator.

### 3. `❌ Could not connect to RECD API`
* Make sure the RECD website backend is running (`npm run dev`).
* Verify that `API_BASE` in `.env` matches your server port (default: `http://localhost:5000/api`).

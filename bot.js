import { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  EmbedBuilder 
} from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const API_BASE = process.env.API_BASE || `http://127.0.0.1:${process.env.PORT || 5000}/api`;

// Cache projects in-memory for instant autocomplete response (< 50ms)
let projectsCache = [];
let lastProjectsFetch = 0;

async function getCachedProjects(force = false) {
  const now = Date.now();
  if (!force && projectsCache.length > 0 && now - lastProjectsFetch < 30000) {
    return projectsCache;
  }
  try {
    const res = await fetch(`${API_BASE}/projects`);
    if (res.ok) {
      projectsCache = await res.json();
      lastProjectsFetch = now;
    }
  } catch (err) {
    console.error('Error refreshing projects cache:', err);
  }
  return projectsCache;
}

// 1. Define Slash Commands
const commands = [
  new SlashCommandBuilder()
    .setName('artstatus')
    .setDescription('Fetch live RECD Studios art production progress and progress bars'),
  
  new SlashCommandBuilder()
    .setName('bottlenecks')
    .setDescription('Check overdue shots, lagging setups, and production bottlenecks'),
  
  new SlashCommandBuilder()
    .setName('health')
    .setDescription('Check connection and database status of the RECD backend'),
  
  new SlashCommandBuilder()
    .setName('roster')
    .setDescription('View the RECD Studios team roster, artist handles, and specialties'),
  
  new SlashCommandBuilder()
    .setName('panels')
    .setDescription('Browse shots and panel statuses for any project')
    .addStringOption(opt =>
      opt.setName('project')
        .setDescription('Select project')
        .setRequired(true)
        .setAutocomplete(true))
    .addStringOption(opt =>
      opt.setName('shot')
        .setDescription('Select shot number to view its panel breakdown (optional)')
        .setRequired(false)
        .setAutocomplete(true)),

  new SlashCommandBuilder()
    .setName('updatepanel')
    .setDescription('Update a panel status and/or Google Drive artwork link')
    .addStringOption(opt => 
      opt.setName('project')
        .setDescription('Select project')
        .setRequired(true)
        .setAutocomplete(true))
    .addStringOption(opt => 
      opt.setName('shot')
        .setDescription('Select shot number')
        .setRequired(true)
        .setAutocomplete(true))
    .addStringOption(opt => 
      opt.setName('panel')
        .setDescription('Select panel code')
        .setRequired(true)
        .setAutocomplete(true))
    .addStringOption(opt => 
      opt.setName('status')
        .setDescription('New progress status')
        .setRequired(false)
        .addChoices(
          { name: 'Completed', value: 'Completed' },
          { name: 'Lined', value: 'Lined' },
          { name: 'Colored', value: 'Colored' },
          { name: 'Sketched', value: 'Sketched' },
          { name: 'Not Started', value: 'Not Started' }
        ))
    .addStringOption(opt => 
      opt.setName('drive_link')
        .setDescription('Google Drive link to completed artwork')
        .setRequired(false))
].map(cmd => cmd.toJSON());

// 2. Register Slash Commands with Discord
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands() {
  try {
    console.log('Registering slash commands...');
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
    } else {
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
    }
    console.log('Slash commands registered successfully! (/artstatus, /bottlenecks, /health, /roster, /panels, /updatepanel)');
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
}

// 3. Handle Autocomplete Interactions
client.on('interactionCreate', async (interaction) => {
  if (interaction.isAutocomplete()) {
    try {
      const focusedOption = interaction.options.getFocused(true);
      const projects = await getCachedProjects();

      // Autocomplete for: PROJECT
      if (focusedOption.name === 'project') {
        const typed = (focusedOption.value || '').toLowerCase();
        const filtered = projects.filter(
          (p) => p.title?.toLowerCase().includes(typed) || p.id?.toLowerCase().includes(typed)
        );
        return interaction.respond(
          filtered.slice(0, 25).map((p) => ({
            name: `${p.title} (${p.status || 'Active'})`.slice(0, 100),
            value: p.id
          }))
        );
      }

      // Autocomplete for: SHOT
      if (focusedOption.name === 'shot') {
        const selectedProject = interaction.options.getString('project');
        const targetProj = projects.find(
          (p) => p.id === selectedProject || p.title?.toLowerCase().includes((selectedProject || '').toLowerCase())
        );
        if (!targetProj || !targetProj.shots) {
          return interaction.respond([]);
        }

        const typed = (focusedOption.value || '').toLowerCase();
        const filteredShots = targetProj.shots.filter((s) => {
          const label = `Shot ${s.shotNumber} ${s.assignedArtist || ''}`.toLowerCase();
          return label.includes(typed) || s.id?.toLowerCase().includes(typed);
        });

        return interaction.respond(
          filteredShots.slice(0, 25).map((s) => ({
            name: `Shot ${s.shotNumber} (${s.assignedArtist || 'Unassigned'}) — ${s.panels?.length || 0} panels`.slice(0, 100),
            value: s.id
          }))
        );
      }

      // Autocomplete for: PANEL
      if (focusedOption.name === 'panel') {
        const selectedProject = interaction.options.getString('project');
        const selectedShot = interaction.options.getString('shot');
        const targetProj = projects.find(
          (p) => p.id === selectedProject || p.title?.toLowerCase().includes((selectedProject || '').toLowerCase())
        );
        const targetShot = targetProj?.shots?.find(
          (s) => s.id === selectedShot || s.shotNumber === parseInt(selectedShot || '', 10)
        );
        if (!targetShot || !targetShot.panels) {
          return interaction.respond([]);
        }

        const typed = (focusedOption.value || '').toLowerCase();
        const filteredPanels = targetShot.panels.filter((pn) => {
          const code = (pn.panelCode || pn.panelLetter || `${pn.panelNumber}`).toLowerCase();
          const status = (pn.status || '').toLowerCase();
          return code.includes(typed) || status.includes(typed) || pn.id?.toLowerCase().includes(typed);
        });

        return interaction.respond(
          filteredPanels.slice(0, 25).map((pn) => {
            const code = pn.panelCode || pn.panelLetter || `Panel ${pn.panelNumber}`;
            const status = pn.status || 'Not Started';
            return {
              name: `Panel ${code} [${status}]${pn.artist ? ` • ${pn.artist}` : ''}`.slice(0, 100),
              value: pn.id
            };
          })
        );
      }
    } catch (err) {
      console.error('Error handling autocomplete:', err);
      return interaction.respond([]).catch(() => {});
    }
  }

  if (!interaction.isChatInputCommand()) return;

  // --- /artstatus ---
  if (interaction.commandName === 'artstatus') {
    await interaction.deferReply();

    try {
      const response = await fetch(`${API_BASE}/discord/feed`);
      if (!response.ok) {
        return interaction.editReply(`❌ Could not connect to RECD API: ${response.statusText}`);
      }

      const { feed } = await response.json();

      if (!feed || feed.length === 0) {
        return interaction.editReply('No active projects found in the studio database.');
      }

      const embed = new EmbedBuilder()
        .setTitle('🎬 RECD Studios — Production Progress Feed')
        .setColor(0xF59E0B)
        .setTimestamp()
        .setFooter({ text: 'RECD ERP Live Sync' });

      feed.forEach((proj) => {
        const percent = proj.artProgress?.percent ?? 0;
        const total = proj.artProgress?.total ?? 0;
        const completed = proj.artProgress?.completed ?? 0;
        
        const filledBars = Math.round(percent / 10);
        const emptyBars = 10 - filledBars;
        const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);

        const lastUpdated = proj.lastUpdated 
          ? new Date(proj.lastUpdated).toLocaleDateString() 
          : 'N/A';

        embed.addFields({
          name: `${proj.title} (${proj.status || 'Active'})`,
          value: [
            `**Director:** ${proj.director || 'Unassigned'}`,
            `\`[${progressBar}]\` **${percent}%**`,
            `**Panels:** ${completed}/${total} completed`,
            `**Last Touched:** ${lastUpdated}`
          ].join('\n'),
          inline: true
        });
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Error fetching RECD feed:', err);
      await interaction.editReply('❌ Failed to fetch studio status from the RECD backend.');
    }
  }

  // --- /bottlenecks ---
  if (interaction.commandName === 'bottlenecks') {
    await interaction.deferReply();

    try {
      const response = await fetch(`${API_BASE}/bottlenecks`);
      if (!response.ok) {
        return interaction.editReply(`❌ Could not connect to RECD API: ${response.statusText}`);
      }

      const data = await response.json();
      const bottlenecks = data.bottlenecks || [];

      if (bottlenecks.length === 0) {
        const clearEmbed = new EmbedBuilder()
          .setTitle('✅ Studio Bottleneck Report')
          .setColor(0x10B981)
          .setDescription('Smooth sailing! No overdue shots, unassigned scenes, or director lag detected.')
          .setTimestamp();
        return interaction.editReply({ embeds: [clearEmbed] });
      }

      const embed = new EmbedBuilder()
        .setTitle(`⚠️ Studio Bottlenecks & Overdue Alert (${bottlenecks.length} Items)`)
        .setColor(data.highSeverityCount > 0 ? 0xEF4444 : 0xF59E0B)
        .setDescription(`Found **${data.highSeverityCount}** high severity and **${bottlenecks.length - data.highSeverityCount}** medium issues requiring attention.`)
        .setTimestamp()
        .setFooter({ text: 'RECD ERP Live Bottleneck Analysis' });

      bottlenecks.slice(0, 6).forEach((b) => {
        const severityIcon = b.severity === 'high' ? '🔴 **[HIGH]**' : '🟡 **[MEDIUM]**';
        embed.addFields({
          name: `${severityIcon} ${b.projectTitle} — ${b.title}`,
          value: [
            `**Responsible:** ${b.responsibleParty}`,
            `**Details:** ${b.details}`,
            `**Inactive:** ${b.daysInactive} days`
          ].join('\n'),
          inline: false
        });
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Error fetching bottlenecks:', err);
      await interaction.editReply('❌ Failed to analyze studio bottlenecks.');
    }
  }

  // --- /health ---
  if (interaction.commandName === 'health') {
    await interaction.deferReply();

    try {
      const response = await fetch(`${API_BASE}/health`);
      if (!response.ok) {
        return interaction.editReply(`❌ RECD Backend returned error: ${response.statusText}`);
      }

      const data = await response.json();

      const embed = new EmbedBuilder()
        .setTitle('🛰️ RECD Studios System Health')
        .setColor(0x10B981)
        .addFields(
          { name: 'Server Status', value: `🟢 ${data.status || 'online'}`, inline: true },
          { name: 'Database', value: `🗄️ ${data.database || 'Active'}`, inline: true },
          { name: 'Backend Message', value: data.message || 'Running smoothly', inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Health check failed:', err);
      await interaction.editReply('🔴 RECD Backend appears to be offline or unreachable at ' + API_BASE);
    }
  }

  // --- /roster ---
  if (interaction.commandName === 'roster') {
    await interaction.deferReply();

    try {
      const response = await fetch(`${API_BASE}/team`);
      if (!response.ok) {
        return interaction.editReply(`❌ Could not fetch team roster: ${response.statusText}`);
      }

      const team = await response.json();

      if (!team || team.length === 0) {
        return interaction.editReply('No team members found in the database.');
      }

      const embed = new EmbedBuilder()
        .setTitle('👥 RECD Studios — Production Team Roster')
        .setColor(0x5865F2)
        .setDescription(`Registered studio roster: **${team.length}** members`)
        .setTimestamp()
        .setFooter({ text: 'RECD Studios Team Directory' });

      team.forEach((member) => {
        const roles = [];
        if (member.isArtist) roles.push('🎨 Artist');
        if (member.isVoiceActor) roles.push('🎙️ VA');
        const roleLabel = roles.length > 0 ? roles.join(', ') : 'Team Member';

        embed.addFields({
          name: member.name,
          value: [
            `**Discord:** ${member.discordHandle || '*Not linked*'}`,
            `**Role:** ${roleLabel}`,
            `**Specialty:** ${member.specialty || 'General'}`
          ].join('\n'),
          inline: true
        });
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Error fetching roster:', err);
      await interaction.editReply('❌ Failed to fetch team roster from the RECD backend.');
    }
  }

  // --- /panels ---
  if (interaction.commandName === 'panels') {
    await interaction.deferReply();

    const projectInput = interaction.options.getString('project');
    const shotInput = interaction.options.getString('shot');

    try {
      const projects = await getCachedProjects();
      const targetProj = projects.find(
        (p) => p.id === projectInput || p.title?.toLowerCase().includes((projectInput || '').toLowerCase())
      );

      if (!targetProj) {
        return interaction.editReply(`❌ Project matching "${projectInput}" not found.`);
      }

      // If a specific shot was selected: show its panels
      if (shotInput) {
        const targetShot = targetProj.shots?.find(
          (s) => s.id === shotInput || s.shotNumber === parseInt(shotInput, 10)
        );

        if (!targetShot) {
          return interaction.editReply(`❌ Shot "${shotInput}" not found in project "${targetProj.title}".`);
        }

        const panels = targetShot.panels || [];
        const embed = new EmbedBuilder()
          .setTitle(`🎬 ${targetProj.title} — Shot ${targetShot.shotNumber} Panels`)
          .setColor(0x3B82F6)
          .setDescription(`**Artist:** ${targetShot.assignedArtist || 'Unassigned'} • **Total Panels:** ${panels.length}`)
          .setTimestamp();

        if (panels.length === 0) {
          embed.addFields({ name: 'Panels', value: '*No panels created yet.*' });
        } else {
          panels.forEach((pn) => {
            const code = pn.panelCode || pn.panelLetter || `Panel ${pn.panelNumber}`;
            const statusEmoji = 
              pn.status === 'Completed' ? '🟢' :
              pn.status === 'Lined' ? '🟡' :
              pn.status === 'Colored' ? '🟣' :
              pn.status === 'Sketched' ? '🟠' : '⚪';

            const drivePart = pn.driveLink ? ` • [Drive Link](${pn.driveLink})` : '';
            embed.addFields({
              name: `${statusEmoji} Panel ${code} (${pn.status || 'Not Started'})`,
              value: `${pn.scriptSegment ? `*"${pn.scriptSegment}"*\n` : ''}${pn.directionNotes ? `${pn.directionNotes.slice(0, 120)}...\n` : ''}${drivePart || '*No upload link yet*'}`,
              inline: false
            });
          });
        }

        return interaction.editReply({ embeds: [embed] });
      }

      // If no specific shot was selected: show shot overview for project
      const shots = targetProj.shots || [];
      const embed = new EmbedBuilder()
        .setTitle(`🎬 ${targetProj.title} — Shot Overview`)
        .setColor(0x3B82F6)
        .setDescription(`Total Shots: **${shots.length}** | Director: **${targetProj.director || 'Unassigned'}**`)
        .setTimestamp();

      shots.slice(0, 20).forEach((s) => {
        const completedCount = s.panels?.filter((p) => p.status === 'Completed').length || 0;
        const totalCount = s.panels?.length || 0;
        const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        embed.addFields({
          name: `Shot ${s.shotNumber} (${s.assignedArtist || 'Unassigned'})`,
          value: `**Progress:** ${completedCount}/${totalCount} (${percent}%)\n**Panels:** ${s.panels?.map(p => p.panelCode || p.panelLetter).filter(Boolean).join(', ') || 'None'}`,
          inline: true
        });
      });

      if (shots.length > 20) {
        embed.setFooter({ text: `Showing first 20 of ${shots.length} shots. Select a shot to view full panel details.` });
      }

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Error in /panels:', err);
      await interaction.editReply('❌ Failed to fetch panels.');
    }
  }

  // --- /updatepanel ---
  if (interaction.commandName === 'updatepanel') {
    await interaction.deferReply();

    const projectInput = interaction.options.getString('project');
    const shotInput = interaction.options.getString('shot');
    const panelInput = interaction.options.getString('panel');
    const newStatus = interaction.options.getString('status');
    const driveLink = interaction.options.getString('drive_link');

    if (!newStatus && !driveLink) {
      return interaction.editReply('⚠️ Please specify at least one change to make: `status` or `drive_link`.');
    }

    try {
      const projects = await getCachedProjects(true);

      const targetProj = projects.find(
        (p) => p.id === projectInput || p.title?.toLowerCase().includes((projectInput || '').toLowerCase())
      );
      if (!targetProj) {
        return interaction.editReply(`❌ Project matching "${projectInput}" not found.`);
      }

      const targetShot = targetProj.shots?.find(
        (s) => s.id === shotInput || s.shotNumber === parseInt(shotInput || '', 10)
      );
      if (!targetShot) {
        return interaction.editReply(`❌ Shot "${shotInput}" not found in project "${targetProj.title}".`);
      }

      const targetPanel = targetShot.panels?.find(
        (pn) =>
          pn.id === panelInput ||
          pn.panelCode?.toLowerCase() === (panelInput || '').toLowerCase() ||
          pn.panelLetter?.toLowerCase() === (panelInput || '').toLowerCase() ||
          pn.panelNumber === parseInt(panelInput || '', 10)
      );
      if (!targetPanel) {
        return interaction.editReply(
          `❌ Panel "${panelInput}" not found in Shot ${targetShot.shotNumber || targetShot.id}.`
        );
      }

      const updates = {};
      if (newStatus) updates.status = newStatus;
      if (driveLink) updates.driveLink = driveLink;

      const updateRes = await fetch(
        `${API_BASE}/projects/${targetProj.id}/shots/${targetShot.id}/panels/${targetPanel.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        }
      );

      if (!updateRes.ok) {
        const errJson = await updateRes.json().catch(() => ({}));
        return interaction.editReply(`❌ Failed to update panel: ${errJson.error || updateRes.statusText}`);
      }

      const result = await updateRes.json();
      lastProjectsFetch = 0; // Invalidate cache so changes reflect immediately

      const embed = new EmbedBuilder()
        .setTitle('🎨 Panel Updated Successfully!')
        .setColor(0x10B981)
        .addFields(
          { name: 'Project', value: targetProj.title, inline: true },
          { 
            name: 'Shot & Panel', 
            value: `Shot **${targetShot.shotNumber}** — Panel **${targetPanel.panelCode || targetPanel.panelLetter || targetPanel.id}**`, 
            inline: true 
          },
          { name: 'Status', value: result.panel?.status || targetPanel.status, inline: true },
          { 
            name: 'Google Drive Link', 
            value: result.panel?.driveLink ? `[Open Artwork](${result.panel.driveLink})` : '*None specified*', 
            inline: false 
          },
          { name: 'Updated By', value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
          { name: 'Timestamp', value: new Date().toLocaleTimeString(), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'RECD ERP Real-Time Sync' });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Error in /updatepanel:', err);
      await interaction.editReply('❌ An error occurred while updating the panel.');
    }
  }
});

// 4. Start the Bot
let isBotStarted = false;

export async function startBot() {
  if (isBotStarted) return client;
  if (!process.env.DISCORD_TOKEN) {
    console.log('ℹ️ [Discord Bot] DISCORD_TOKEN is not configured. Skipping bot startup.');
    return null;
  }

  isBotStarted = true;

  client.once('ready', () => {
    console.log(`🤖 [Discord Bot] Logged in as ${client.user.tag}!`);
    registerCommands();
  });

  try {
    await client.login(process.env.DISCORD_TOKEN);
    return client;
  } catch (err) {
    isBotStarted = false;
    console.error('❌ [Discord Bot] Login failed:', err);
    return null;
  }
}

// 5. Auto-start if invoked directly via `node bot.js`
const isDirectExecution = process.argv[1] && (
  process.argv[1].endsWith('bot.js') || 
  process.argv[1].endsWith('bot')
);
if (isDirectExecution) {
  startBot();
}

export { client };
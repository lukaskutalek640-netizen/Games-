import 'dotenv/config';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder
} from 'discord.js';

const requiredEnv = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID', 'VERIFIED_ROLE_ID', 'VERIFY_CHANNEL_ID', 'LOG_CHANNEL_ID'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const cfg = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  verifiedRoleId: process.env.VERIFIED_ROLE_ID,
  unverifiedRoleId: process.env.UNVERIFIED_ROLE_ID || null,
  verifyChannelId: process.env.VERIFY_CHANNEL_ID,
  logChannelId: process.env.LOG_CHANNEL_ID,
  raidJoinLimit: Number(process.env.RAID_JOIN_LIMIT || 8),
  raidWindowSeconds: Number(process.env.RAID_WINDOW_SECONDS || 20),
  raidLockSeconds: Number(process.env.RAID_LOCK_SECONDS || 600),
  minAccountAgeDays: Number(process.env.MIN_ACCOUNT_AGE_DAYS || 14),
  spamLimit: Number(process.env.SPAM_LIMIT || 6),
  spamWindowSeconds: Number(process.env.SPAM_WINDOW_SECONDS || 10),
  timeoutMinutes: Number(process.env.TIMEOUT_MINUTES || 10)
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const joinTimes = new Map();
const userMessageTimes = new Map();
let raidLockUntil = 0;

const commands = [
  new SlashCommandBuilder()
    .setName('setup-verify')
    .setDescription('Pošle verifikační tlačítko do verifikačního kanálu')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName('raid-status')
    .setDescription('Ukáže aktuální stav anti-raid ochrany')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
].map((c) => c.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(cfg.token);
  await rest.put(Routes.applicationGuildCommands(cfg.clientId, cfg.guildId), { body: commands });
}

function nowMs() {
  return Date.now();
}

function isRaidLocked() {
  return nowMs() < raidLockUntil;
}

function addJoinTimestamp(guildId) {
  const arr = joinTimes.get(guildId) || [];
  const threshold = nowMs() - cfg.raidWindowSeconds * 1000;
  const pruned = arr.filter((x) => x >= threshold);
  pruned.push(nowMs());
  joinTimes.set(guildId, pruned);
  return pruned.length;
}

function accountAgeDays(user) {
  return (nowMs() - user.createdTimestamp) / (1000 * 60 * 60 * 24);
}

async function securityLog(guild, message) {
  const ch = await guild.channels.fetch(cfg.logChannelId).catch(() => null);
  if (ch && ch.type === ChannelType.GuildText) {
    await ch.send(`🛡️ ${message}`).catch(() => {});
  }
}

async function activateRaidLock(guild, reason) {
  raidLockUntil = nowMs() + cfg.raidLockSeconds * 1000;
  await securityLog(guild, `RAID LOCK aktivní na ${Math.round(cfg.raidLockSeconds / 60)} min. Důvod: ${reason}`);
}

function pushUserMessageTimestamp(userId) {
  const arr = userMessageTimes.get(userId) || [];
  const threshold = nowMs() - cfg.spamWindowSeconds * 1000;
  const pruned = arr.filter((x) => x >= threshold);
  pruned.push(nowMs());
  userMessageTimes.set(userId, pruned);
  return pruned.length;
}

function containsDiscordInvite(content) {
  return /(discord\.gg\/|discord\.com\/invite\/)/i.test(content);
}

client.once(Events.ClientReady, async () => {
  await registerCommands();
  console.log(`Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'setup-verify') {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify_me').setStyle(ButtonStyle.Success).setLabel('✅ Ověřit účet')
      );

      const channel = await interaction.guild.channels.fetch(cfg.verifyChannelId).catch(() => null);
      if (!channel || channel.type !== ChannelType.GuildText) {
        await interaction.reply({ content: 'Verifikační kanál nebyl nalezen.', ephemeral: true });
        return;
      }

      await channel.send({
        content:
          '## Oasis Verify\nKlikni na tlačítko níže pro ověření. Bez ověření se nedostaneš do plné části serveru.',
        components: [row]
      });

      await interaction.reply({ content: 'Verifikační zpráva byla odeslána.', ephemeral: true });
      return;
    }

    if (interaction.commandName === 'raid-status') {
      const locked = isRaidLocked();
      const text = locked
        ? `Anti-raid: AKTIVNÍ (do ${new Date(raidLockUntil).toLocaleTimeString('cs-CZ')})`
        : 'Anti-raid: neaktivní';
      await interaction.reply({ content: text, ephemeral: true });
      return;
    }
  }

  if (interaction.isButton() && interaction.customId === 'verify_me') {
    if (!interaction.member) {
      await interaction.reply({ content: 'Nepodařilo se načíst uživatele.', ephemeral: true });
      return;
    }

    const member = interaction.member;
    const age = accountAgeDays(interaction.user);
    if (age < cfg.minAccountAgeDays) {
      await interaction.reply({
        content: `Účet je příliš nový (${Math.floor(age)} dní). Ověření je dostupné až od ${cfg.minAccountAgeDays} dní stáří účtu.`,
        ephemeral: true
      });
      return;
    }

    await member.roles.add(cfg.verifiedRoleId).catch(() => {});
    if (cfg.unverifiedRoleId) {
      await member.roles.remove(cfg.unverifiedRoleId).catch(() => {});
    }

    await interaction.reply({ content: 'Hotovo! Byl jsi ověřen ✅', ephemeral: true });
    await securityLog(interaction.guild, `Uživatel ${interaction.user.tag} byl ověřen.`);
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  const joinCount = addJoinTimestamp(member.guild.id);
  const age = accountAgeDays(member.user);

  if (joinCount >= cfg.raidJoinLimit && !isRaidLocked()) {
    await activateRaidLock(member.guild, `detekováno ${joinCount} joinů během ${cfg.raidWindowSeconds}s`);
  }

  if (isRaidLocked() && age < cfg.minAccountAgeDays) {
    await securityLog(
      member.guild,
      `Kick během RAID LOCK: ${member.user.tag} (stáří účtu ${Math.floor(age)} dní, minimum ${cfg.minAccountAgeDays})`
    );
    await member.kick('Anti-raid: nový účet během raid locku').catch(() => {});
    return;
  }

  if (cfg.unverifiedRoleId) {
    await member.roles.add(cfg.unverifiedRoleId).catch(() => {});
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (!message.guild || message.author.bot) return;

  const msgCount = pushUserMessageTimestamp(message.author.id);
  if (msgCount >= cfg.spamLimit) {
    await message.member.timeout(cfg.timeoutMinutes * 60 * 1000, 'Anti-spam').catch(() => {});
    await securityLog(message.guild, `Timeout za spam: ${message.author.tag} (${msgCount} zpráv/${cfg.spamWindowSeconds}s)`);
    return;
  }

  if (containsDiscordInvite(message.content)) {
    const isMod = message.member.permissions.has(PermissionFlagsBits.ManageGuild);
    if (!isMod) {
      await message.delete().catch(() => {});
      await message.member.timeout(cfg.timeoutMinutes * 60 * 1000, 'Nepovolený Discord invite link').catch(() => {});
      await securityLog(message.guild, `Smazán invite link a timeout: ${message.author.tag}`);
    }
  }
});

client.login(cfg.token);

const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    REST,
    Routes,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const { createCustomTranscript } = require('./transcript');
require('dotenv').config();
const fs = require('fs');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const counterFile = './ticket-counter.json';
const dataFile = './ticket-data.json';
const banner = 'https://i.postimg.cc/XNdm9Wvw/file-00000000fac881f4bf8abe24be69b5d2.png';

const tickets = {
    other: { name: 'ØªÙ‚Ø¯ÙŠÙ… Ø¹Ù„ÙŠ Editor Team', emoji: 'âœ‚ï¸', category: process.env.CATEGORY_OTHER, role: process.env.ROLE_OTHER },
    report: { name: 'Ø´ÙƒØ§ÙˆÙŠ', emoji: 'âš ï¸', category: process.env.CATEGORY_REPORT, role: process.env.ROLE_REPORT },
    support: { name: 'Ø¯Ø¹Ù… ÙÙ†ÙŠ', emoji: 'ðŸ–¥ï¸', category: process.env.CATEGORY_SUPPORT, role: process.env.ROLE_SUPPORT },
    management: { name: 'ØªÙ‚Ø¯ÙŠÙ… Ø¹Ù„ÙŠ Mod Kick', emoji: '<:Kick:1529200674783629433>', category: process.env.CATEGORY_MANAGEMENT, role: process.env.ROLE_MANAGEMENT }
};

const staffRoles = () => [process.env.STAFF_ROLE_1, process.env.STAFF_ROLE_2].filter(Boolean);

function readJSON(file, fallback = {}) {
    try {
        if (!fs.existsSync(file)) return fallback;
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch { return fallback; }
}

function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const ticketData = readJSON(dataFile, {});

function saveTicketData() { writeJSON(dataFile, ticketData); }

function getTicketNumber() {
    const data = readJSON(counterFile, { counter: 1 });
    const number = Number(data.counter) || 1;
    writeJSON(counterFile, { counter: number + 1 });
    return number;
}

function isStaff(member) {
    return staffRoles().some(role => member?.roles?.cache?.has(role));
}

function isClaimedBy(member, channelId) {
    return ticketData[channelId]?.claimedBy === member.id;
}

function canManageTicket(member, channelId) {
    // Management is available to every configured Staff member.
    return isStaff(member);
}

function ticketNumber(channel) {
    return ticketData[channel.id]?.number || channel.name.match(/\d+/)?.[0] || '0000';
}

function getOwnerId(channel) {
    return ticketData[channel.id]?.ownerId || channel.permissionOverwrites.cache.find(o =>
        o.type === 1 && o.allow.has(PermissionsBitField.Flags.ViewChannel)
    )?.id;
}

function getTypeName(channel) {
    return ticketData[channel.id]?.typeName || 'ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ';
}

function baseLogEmbed(data) {
    const status = data.status || 'Ù…ÙØªÙˆØ­Ø©';
    return new EmbedBuilder()
        .setColor(status === 'Ù…ØºÙ„Ù‚Ø©' ? '#ff4d4d' : status === 'Ù…Ø¹Ù„Ù‚Ø©' ? '#ffaa00' : '#584702')
        .setTitle('ðŸŽ« Ticket Log')
        .setDescription(`**${data.typeName || 'Ticket'}** â€¢ ${data.channelMention || 'ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ'}`)
        .addFields(
            { name: 'ðŸŽŸï¸ Ø±Ù‚Ù… Ø§Ù„ØªØ°ÙƒØ±Ø©', value: `\`${data.number || '0000'}\``, inline: true },
            { name: 'ðŸ“ Ø§Ù„Ù‚Ø³Ù…', value: data.typeName || 'ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ', inline: true },
            { name: 'ðŸ‘¤ ØµØ§Ø­Ø¨ Ø§Ù„ØªØ°ÙƒØ±Ø©', value: data.ownerId ? `<@${data.ownerId}>` : 'ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ', inline: true },
            { name: 'ðŸ“¥ ÙØªØ­ Ø§Ù„ØªØ°ÙƒØ±Ø©', value: data.openedBy ? `<@${data.openedBy}>` : 'ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ', inline: true },
            { name: 'ðŸ“Œ Ø§Ù„Ù…Ø³ØªÙ„Ù… Ø§Ù„Ø­Ø§Ù„ÙŠ', value: data.claimedBy ? `<@${data.claimedBy}>` : 'Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù…', inline: true },
            { name: 'ðŸ“Š Ø§Ù„Ø­Ø§Ù„Ø©', value: data.status || 'Ù…ÙØªÙˆØ­Ø©', inline: true },
            { name: 'ðŸ”’ Ø§Ù„Ø¥ØºÙ„Ø§Ù‚', value: data.closedBy ? `<@${data.closedBy}>\n**Ø§Ù„Ø³Ø¨Ø¨:** ${data.closeReason || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯'}` : 'Ù„Ù… ØªÙØºÙ„Ù‚ Ø¨Ø¹Ø¯', inline: false },
            { name: 'ðŸ—‘ï¸ Ø§Ù„Ø­Ø°Ù', value: data.deletedBy ? `<@${data.deletedBy}>` : 'Ù„Ù… ØªÙØ­Ø°Ù Ø¨Ø¹Ø¯', inline: false }
        )
        .setTimestamp(new Date())
        .setFooter({ text: 'Elsisy Community â€¢ Ticket System' });
}

async function getLogChannel() {
    const guildId = process.env.LOG_GUILD_ID;
    const channelId = process.env.LOG_CHANNEL_ID;
    if (!guildId || !channelId) return null;
    try {
        const guild = await client.guilds.fetch(guildId);
        return await guild.channels.fetch(channelId);
    } catch (e) {
        console.error('Log channel error:', e.message);
        return null;
    }
}

async function updateTicketLog(channelId) {
    const data = ticketData[channelId];
    if (!data) return null;
    const logChannel = await getLogChannel();
    if (!logChannel?.isTextBased()) return null;

    const embed = baseLogEmbed(data);
    let message = null;
    if (data.logMessageId) {
        try { message = await logChannel.messages.fetch(data.logMessageId); } catch {}
    }

    if (message) await message.edit({ embeds: [embed] });
    else {
        message = await logChannel.send({ embeds: [embed] });
        data.logMessageId = message.id;
        saveTicketData();
    }
    return message;
}

async function sendActionLog(channelId) {
    return updateTicketLog(channelId);
}

function managementRow(disabled = false) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket_management')
        .setPlaceholder('âš™ï¸ Ø§Ø®ØªØ± Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©')
        .setDisabled(disabled)
        .addOptions(
            { label: 'Ø¥Ø¶Ø§ÙØ© Ø¹Ø¶Ùˆ', description: 'Ù…Ù†Ø­ Ø¹Ø¶Ùˆ ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„Ø¯Ø®ÙˆÙ„ Ù„Ù„ØªØ°ÙƒØ±Ø©', value: 'add_member', emoji: 'âž•' },
            { label: 'Ø­Ø°Ù Ø¹Ø¶Ùˆ', description: 'Ø¥Ø²Ø§Ù„Ø© Ø¹Ø¶Ùˆ Ù…Ù† Ø§Ù„ØªØ°ÙƒØ±Ø©', value: 'remove_member', emoji: 'âž–' },
            { label: 'ØªØºÙŠÙŠØ± Ø§Ø³Ù… Ø§Ù„ØªØ°ÙƒØ±Ø©', description: 'ØªØ¹Ø¯ÙŠÙ„ Ø§Ø³Ù… Ù‚Ù†Ø§Ø© Ø§Ù„ØªØ°ÙƒØ±Ø©', value: 'rename', emoji: 'âœï¸' },
            { label: 'Ù†Ù‚Ù„ Ø§Ù„ØªØ°ÙƒØ±Ø©', description: 'Ù†Ù‚Ù„ Ø§Ù„ØªØ°ÙƒØ±Ø© Ø¥Ù„Ù‰ Ù‚Ø³Ù… Ø¢Ø®Ø±', value: 'move', emoji: 'ðŸ“‚' },
            { label: 'Ø¥Ø±Ø³Ø§Ù„ ØªÙ†Ø¨ÙŠÙ‡', description: 'ØªÙ†Ø¨ÙŠÙ‡ ØµØ§Ø­Ø¨ Ø§Ù„ØªØ°ÙƒØ±Ø© Ø¯Ø§Ø®Ù„ Ø§Ù„Ù‚Ù†Ø§Ø©', value: 'notify', emoji: 'ðŸ””' },
            { label: 'ØªØºÙŠÙŠØ± Ø­Ø§Ù„Ø© Ø§Ù„ØªØ°ÙƒØ±Ø©', description: 'ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„ØªØ°ÙƒØ±Ø©', value: 'status', emoji: 'ðŸ“Š' },
            { label: 'Ù†Ù‚Ù„ Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„', description: 'ØªØ³Ù„ÙŠÙ… Ø§Ù„ØªØ°ÙƒØ±Ø© Ù„Ù…Ø³Ø¤ÙˆÙ„ Ø¢Ø®Ø±', value: 'transfer', emoji: 'ðŸ‘¤' }
        );
    return new ActionRowBuilder().addComponents(menu);
}

function ticketButtons(closed = false) {
    if (closed) {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('delete_ticket').setLabel('Ø­Ø°Ù Ø§Ù„ØªØ°ÙƒØ±Ø©').setEmoji('ðŸ—‘ï¸').setStyle(ButtonStyle.Danger)
        );
    }
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('claim_ticket').setLabel('Ø§Ø³ØªÙ„Ø§Ù…').setEmoji('ðŸ“Œ').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('close_ticket').setLabel('Ø§ØºÙ„Ø§Ù‚').setEmoji('ðŸ”’').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('manage_ticket').setLabel('Ø¥Ø¯Ø§Ø±Ø©').setEmoji('âš™ï¸').setStyle(ButtonStyle.Secondary)
    );
}

const panelEmbed = new EmbedBuilder()
    .setColor('#584702')
    .setTitle('ðŸ“© Elsisy Support Center')
    .setDescription(`**
## ðŸŽŸï¸ Ù†Ø¸Ø§Ù… Ø§Ù„ØªØ°Ø§ÙƒØ±
### Elsisy Ù…Ø±Ø­Ø¨Ù‹Ø§ Ø¨Ùƒ ÙÙŠ Ù…Ø±ÙƒØ² Ø§Ù„Ø¯Ø¹Ù… Ø§Ù„Ø®Ø§Øµ Ø¨Ù€

ÙŠÙ…ÙƒÙ†Ùƒ ÙØªØ­ Ø§Ù„ØªØ°Ø§ÙƒØ± Ù…Ù† Ù‡Ù†Ø§ Ø¹Ù† Ø·Ø±ÙŠÙ‚ Ø§Ù„Ø¶ØºØ· Ø¹Ù„Ù‰ Ø§Ù„Ø²Ø± Ø§Ù„Ù…Ù†Ø§Ø³Ø¨ Ø­Ø³Ø¨ Ø§Ø®ØªÙŠØ§Ø±Ùƒ.

### ðŸŽ« ØªØ°ÙƒØ±Ø© ÙƒÙŠÙƒ
Ù„Ù„ØªÙ‚Ø¯ÙŠÙ… Ø¹Ù„Ù‰ ÙØ±ÙŠÙ‚ Ø§Ù„Ù…ÙˆØ¯Ø§Øª.

### ðŸ› ï¸ Ø¯Ø¹Ù… ÙÙ†ÙŠ
Ù„ØªÙ‚Ø¯ÙŠÙ… Ø´ÙƒÙˆÙ‰ Ø£Ùˆ Ø·Ù„Ø¨ Ù…Ø³Ø§Ø¹Ø¯Ø©.

### âš ï¸ Ø´ÙƒØ§ÙˆÙŠ
Ù„ØªÙ‚Ø¯ÙŠÙ… Ø´ÙƒÙˆÙ‰ Ø¹Ù„Ù‰ Ø£Ø­Ø¯ Ø£Ø¹Ø¶Ø§Ø¡ Ø§Ù„Ø³ÙŠØ±ÙØ± Ø£Ùˆ Ø£Ø­Ø¯ Ø£ÙØ±Ø§Ø¯ Ø§Ù„Ø·Ø§Ù‚Ù…
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

### ðŸ“œ Ù‚ÙˆØ§Ù†ÙŠÙ† Ø§Ù„ØªØ°Ø§ÙƒØ±

â€¢ ÙŠÙ…Ù†Ø¹ ÙØªØ­ Ø£ÙŠ ØªÙŠÙƒÙŠØª ÙˆØ¥ØºÙ„Ø§Ù‚Ù‡ Ø¨Ø¯ÙˆÙ† Ø³Ø¨Ø¨ØŒ ÙˆÙÙŠ Ø­Ø§Ù„ Ø§Ù„Ù…Ø®Ø§Ù„ÙØ© Ø³ÙŠØªÙ… Ø¥Ø¹Ø·Ø§Ø¤Ùƒ ØªØ§ÙŠÙ… Ø§ÙˆØª
â€¢ ÙŠÙ…Ù†Ø¹ ÙØªØ­ Ø£ÙƒØ«Ø± Ù…Ù† ØªÙŠÙƒÙŠØª Ù„Ù†ÙØ³ Ø§Ù„Ø³Ø¨Ø¨
â€¢ ÙŠØ±Ø¬Ù‰ Ø§Ø­ØªØ±Ø§Ù… Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© ÙˆØ´Ø±Ø­ Ù…Ø´ÙƒÙ„ØªÙƒ Ø¨Ø´ÙƒÙ„ ÙˆØ§Ø¶Ø­ Ø¯Ø§Ø®Ù„ Ø§Ù„ØªØ°ÙƒØ±Ø©.

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
> Ù†ØªÙ…Ù†Ù‰ Ù„ÙƒÙ… ØªØ¬Ø±Ø¨Ø© Ù…Ù…ØªØ¹Ø©
**`)
    .setImage(banner)
    .setFooter({ text: 'Elsisy Community â€¢ Ticket System' });

const panelMenu = new StringSelectMenuBuilder().setCustomId('ticket_menu').setPlaceholder('Ø§Ø®ØªØ± Ø§Ù„Ù‚Ø³Ù…');
Object.entries(tickets).forEach(([key, value]) => panelMenu.addOptions({ label: value.name, value: key, emoji: value.emoji }));
const panelRow = new ActionRowBuilder().addComponents(panelMenu);

client.once('clientReady', () => console.log(`${client.user.tag} Ø¬Ø§Ù‡Ø²`));

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand() && interaction.commandName === 'ticket') {
            if (!interaction.member.roles.cache.has(process.env.TICKET_PANEL_ROLE))
                return interaction.reply({ content: 'âŒ Ù„ÙŠØ³ Ù„Ø¯ÙŠÙƒ ØµÙ„Ø§Ø­ÙŠØ©', ephemeral: true });
            return interaction.reply({ embeds: [panelEmbed], components: [panelRow] });
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_menu') {
            await interaction.deferReply({ ephemeral: true });
            const data = tickets[interaction.values[0]];
            const number = getTicketNumber();
            const channel = await interaction.guild.channels.create({
                name: `ticket_${number}_${interaction.user.username}`.slice(0, 100),
                type: ChannelType.GuildText,
                parent: data.category,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    ...staffRoles().map(id => ({ id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }))
                ]
            });

            let description = '';
            if (interaction.values[0] === 'other') description = `

** ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ ØªØ°ÙƒØ±Ø©:ðŸŽŸï¸
Ø´ÙƒØ±Ø§Ù‹ Ù„ØªÙˆØ§ØµÙ„Ùƒ Ù…Ø¹Ù†Ø§ ðŸ‘¤ ${interaction.user}
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ“Œ Ù†ÙˆØ¹ Ø§Ù„ØªØ°ÙƒØ±Ø©
ØªÙ‚Ø¯ÙŠÙ… Ø¹Ù„ÙŠ Editor Team
ðŸ”Ž Ø´Ø±Ø­ Ø§Ù„ØªØ°ÙƒØ±Ø©
Ù…Ø±Ø­Ø¨Ù‹Ø§ Ø¨Ùƒ ÙÙŠ Ù‚Ø³Ù… Ø§Ù„ØªÙ‚Ø¯ÙŠÙ… Ø¹Ù„Ù‰ Team Editors.

ÙŠØ±Ø¬Ù‰ Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£Ø³Ø¦Ù„Ø© Ø§Ù„ØªØ§Ù„ÙŠØ©:

â€¢ Ø§Ù„Ø§Ø³Ù…:
â€¢ Ø§Ù„Ø¹Ù…Ø±:
â€¢ Ø§Ù„Ø¨Ø±Ø§Ù…Ø¬ Ø§Ù„ØªÙŠ ØªØ³ØªØ®Ø¯Ù…Ù‡Ø§:
â€¢ Ù‡Ù„ Ù„Ø¯ÙŠÙƒ Ø®Ø¨Ø±Ø© Ø³Ø§Ø¨Ù‚Ø©ØŸ
â€¢ Ù„Ù…Ø§Ø°Ø§ ØªØ±ØºØ¨ ÙÙŠ Ø§Ù„Ø§Ù†Ø¶Ù…Ø§Ù… Ø¥Ù„Ù‰ Team EditorsØŸ

Ø¨Ø¹Ø¯ Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø¬Ø§Ø¨Ø§ØªÙƒØŒ Ø³ÙŠØªÙ… Ù…Ø±Ø§Ø¬Ø¹Ø© Ø·Ù„Ø¨Ùƒ ÙˆØ§Ù„Ø±Ø¯ Ø¹Ù„ÙŠÙƒ ÙÙŠ Ø£Ù‚Ø±Ø¨ ÙˆÙ‚Øª Ù…Ù…ÙƒÙ†.
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ’¡ Ù†ØµØ§Ø¦Ø­ Ù…Ù‡Ù…Ø©:
â€¢ ÙƒÙ† ÙˆØ§Ø¶Ø­Ø§Ù‹ ÙˆÙ…ÙØµÙ„Ø§Ù‹ ÙÙŠ Ø´Ø±Ø­Ùƒ
â€¢ Ù„Ø§ ØªØ´Ø§Ø±Ùƒ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø´Ø®ØµÙŠØ© Ø­Ø³Ø§Ø³Ø©
â€¢ Ø§Ù†ØªØ¸Ø± Ø§Ù„Ø±Ø¯ Ø¨ØµØ¨Ø±
â€¢ Ø´ÙƒØ±Ø§Ù‹ Ù„ØµØ¨Ø±Ùƒ! ðŸ™
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
             **   `;
            if (interaction.values[0] === 'report') description = `**
ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ ØªØ°ÙƒØ±Ø©:ðŸŽŸï¸
Ø´ÙƒØ±Ø§Ù‹ Ù„ØªÙˆØ§ØµÙ„Ùƒ Ù…Ø¹Ù†Ø§ ðŸ‘¤ ${interaction.user}
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ“Œ Ù†ÙˆØ¹ Ø§Ù„ØªØ°ÙƒØ±Ø©
Ø´ÙƒÙˆÙŠ
ðŸ”Ž Ø´Ø±Ø­ Ø§Ù„ØªØ°ÙƒØ±Ø©

ðŸ“ Ù…Ø§Ø°Ø§ ÙŠØ­Ø¯Ø« Ø§Ù„Ø¢Ù†ØŸ
âœ… ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ù‚Ù†Ø§Ø© Ø®Ø§ØµØ© Ù„Ùƒ
âœ… Ø³ÙŠÙ‚ÙˆÙ… ÙØ±ÙŠÙ‚ Ø§Ù„Ø¯Ø¹Ù… Ø¨Ø§Ù„Ø±Ø¯ Ø¹Ù„ÙŠÙƒ Ù‚Ø±ÙŠØ¨Ø§Ù‹
âœ… ÙŠØ±Ø¬Ù‰ Ø´Ø±Ø­ Ø§Ù„Ù…Ø´ÙƒÙ„Ø© Ø¨Ø§Ù„ØªÙØµÙŠÙ„
âœ… Ø§Ø­Ø±Øµ Ø¹Ù„Ù‰ Ø§Ù„Ø±Ø¯ Ø¨Ø³Ø±Ø¹Ø©
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
âš¡ Ø§Ù„Ø®Ø·ÙˆØ§Øª Ø§Ù„ØªØ§Ù„ÙŠØ©:
1ï¸âƒ£ Ø§Ø´Ø±Ø­ Ø§Ù„Ù…Ø´ÙƒÙ„Ø© Ø£Ùˆ Ø§Ù„Ø·Ù„Ø¨ Ø¨Ø§Ù„ØªÙØµÙŠÙ„
2ï¸âƒ£ Ø§Ù†ØªØ¸Ø± Ø±Ø¯ ÙØ±ÙŠÙ‚ Ø§Ù„Ø¯Ø¹Ù…
3ï¸âƒ£ Ø¹Ù†Ø¯Ù…Ø§ ØªÙ†ØªÙ‡ÙŠ Ø§Ø¶ØºØ· "Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„ØªÙŠÙƒØª"
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ’¡ Ù†ØµØ§Ø¦Ø­ Ù…Ù‡Ù…Ø©:
â€¢ ÙƒÙ† ÙˆØ§Ø¶Ø­Ø§Ù‹ ÙˆÙ…ÙØµÙ„Ø§Ù‹ ÙÙŠ Ø´Ø±Ø­Ùƒ
â€¢ Ù„Ø§ ØªØ´Ø§Ø±Ùƒ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø´Ø®ØµÙŠØ© Ø­Ø³Ø§Ø³Ø©
â€¢ Ø§Ù†ØªØ¸Ø± Ø§Ù„Ø±Ø¯ Ø¨ØµØ¨Ø±
â€¢ Ø´ÙƒØ±Ø§Ù‹ Ù„ØµØ¨Ø±Ùƒ! ðŸ™
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
              **  `;
            if (interaction.values[0] === 'support') description = `**
 ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ ØªØ°ÙƒØ±Ø©:ðŸŽŸï¸
Ø´ÙƒØ±Ø§Ù‹ Ù„ØªÙˆØ§ØµÙ„Ùƒ Ù…Ø¹Ù†Ø§ ðŸ‘¤ ${interaction.user}
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ“Œ Ù†ÙˆØ¹ Ø§Ù„ØªØ°ÙƒØ±Ø©
Ø¯Ø¹Ù… ÙÙ†ÙŠ
ðŸ”Ž Ø´Ø±Ø­ Ø§Ù„ØªØ°ÙƒØ±Ø©
Ù„Ù„Ø­ØµÙˆÙ„ Ø¹Ù„ÙŠ Ø§ÙŠ Ù…Ø³Ø§Ø¹Ø¯Ù‡
ðŸ“ Ù…Ø§Ø°Ø§ ÙŠØ­Ø¯Ø« Ø§Ù„Ø¢Ù†ØŸ
âœ… ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ù‚Ù†Ø§Ø© Ø®Ø§ØµØ© Ù„Ùƒ
âœ… Ø³ÙŠÙ‚ÙˆÙ… ÙØ±ÙŠÙ‚ Ø§Ù„Ø¯Ø¹Ù… Ø¨Ø§Ù„Ø±Ø¯ Ø¹Ù„ÙŠÙƒ Ù‚Ø±ÙŠØ¨Ø§Ù‹
âœ… ÙŠØ±Ø¬Ù‰ Ø´Ø±Ø­ Ø§Ù„Ù…Ø´ÙƒÙ„Ø© Ø¨Ø§Ù„ØªÙØµÙŠÙ„
âœ… Ø§Ø­Ø±Øµ Ø¹Ù„Ù‰ Ø§Ù„Ø±Ø¯ Ø¨Ø³Ø±Ø¹Ø©
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
âš¡ Ø§Ù„Ø®Ø·ÙˆØ§Øª Ø§Ù„ØªØ§Ù„ÙŠØ©:
1ï¸âƒ£ Ø§Ø´Ø±Ø­ Ø§Ù„Ù…Ø´ÙƒÙ„Ø© Ø£Ùˆ Ø§Ù„Ø·Ù„Ø¨ Ø¨Ø§Ù„ØªÙØµÙŠÙ„
2ï¸âƒ£ Ø§Ù†ØªØ¸Ø± Ø±Ø¯ ÙØ±ÙŠÙ‚ Ø§Ù„Ø¯Ø¹Ù…
3ï¸âƒ£ Ø¹Ù†Ø¯Ù…Ø§ ØªÙ†ØªÙ‡ÙŠ Ø§Ø¶ØºØ· "Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„ØªÙŠÙƒØª"
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ’¡ Ù†ØµØ§Ø¦Ø­ Ù…Ù‡Ù…Ø©:
â€¢ ÙƒÙ† ÙˆØ§Ø¶Ø­Ø§Ù‹ ÙˆÙ…ÙØµÙ„Ø§Ù‹ ÙÙŠ Ø´Ø±Ø­Ùƒ
â€¢ Ù„Ø§ ØªØ´Ø§Ø±Ùƒ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø´Ø®ØµÙŠØ© Ø­Ø³Ø§Ø³Ø©
â€¢ Ø§Ù†ØªØ¸Ø± Ø§Ù„Ø±Ø¯ Ø¨ØµØ¨Ø±
â€¢ Ø´ÙƒØ±Ø§Ù‹ Ù„ØµØ¨Ø±Ùƒ! ðŸ™
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
             **   `;
            if (interaction.values[0] === 'management') description = `

** ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ ØªØ°ÙƒØ±Ø©:ðŸŽŸï¸
Ø´ÙƒØ±Ø§Ù‹ Ù„ØªÙˆØ§ØµÙ„Ùƒ Ù…Ø¹Ù†Ø§ ðŸ‘¤ ${interaction.user}
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ØªÙ‚Ø¯ÙŠÙ… Ø¹Ù„ÙŠ Mod Kick

ðŸ”Ž Ø´Ø±Ø­ Ø§Ù„ØªØ°ÙƒØ±Ø©
Ù…Ø±Ø­Ø¨Ù‹Ø§ Ø¨Ùƒ ÙÙŠ Ù‚Ø³Ù… Ø§Ù„ØªÙ‚Ø¯ÙŠÙ… Ø¹Ù„Ù‰ ÙØ±ÙŠÙ‚ Mod Kick.

ÙŠØ±Ø¬Ù‰ Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£Ø³Ø¦Ù„Ø© Ø§Ù„ØªØ§Ù„ÙŠØ©:

â€¢ Ø§Ù„Ø§Ø³Ù…:
â€¢ Ø§Ù„Ø¹Ù…Ø±:
â€¢ Ø¹Ø¯Ø¯ Ø³Ø§Ø¹Ø§Øª Ø§Ù„ØªÙˆØ§Ø¬Ø¯ Ø§Ù„ÙŠÙˆÙ…ÙŠØ©:
â€¢ Ù„Ù…Ø§Ø°Ø§ ØªØ±ØºØ¨ ÙÙŠ Ø§Ù„Ø§Ù†Ø¶Ù…Ø§Ù… Ø¥Ù„Ù‰ ÙØ±ÙŠÙ‚ Mod KickØŸ
â€¢ Ù‡Ù„ Ù„Ø¯ÙŠÙƒ Ø£ÙŠ Ø®Ø¨Ø±Ø© Ø³Ø§Ø¨Ù‚Ø©ØŸ

Ø¨Ø¹Ø¯ Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø¬Ø§Ø¨Ø§ØªÙƒØŒ ÙŠØ±Ø¬Ù‰ Ø§Ù†ØªØ¸Ø§Ø± Ø±Ø¯ Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© ÙˆØ¹Ø¯Ù… Ø¹Ù…Ù„ Ù…Ù†Ø´Ù† Ø£Ùˆ Ø§Ù„Ø§Ø³ØªÙØ³Ø§Ø± Ø¹Ù† Ø­Ø§Ù„Ø© Ø·Ù„Ø¨Ùƒ Ø­ØªÙ‰ ÙŠØªÙ… Ù…Ø±Ø§Ø¬Ø¹ØªÙ‡.
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ’¡ Ù†ØµØ§Ø¦Ø­ Ù…Ù‡Ù…Ø©:
â€¢ ÙƒÙ† ÙˆØ§Ø¶Ø­Ø§Ù‹ ÙˆÙ…ÙØµÙ„Ø§Ù‹ ÙÙŠ Ø´Ø±Ø­Ùƒ
â€¢ Ù„Ø§ ØªØ´Ø§Ø±Ùƒ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø´Ø®ØµÙŠØ© Ø­Ø³Ø§Ø³Ø©
â€¢ Ø§Ù†ØªØ¸Ø± Ø§Ù„Ø±Ø¯ Ø¨ØµØ¨Ø±
â€¢ Ø´ÙƒØ±Ø§Ù‹ Ù„ØµØ¨Ø±Ùƒ! ðŸ™
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
              **  `;

            ticketData[channel.id] = {
                number: String(number), type: interaction.values[0], typeName: data.name,
                ownerId: interaction.user.id, openedBy: interaction.user.id,
                claimedBy: null, status: 'Ù…ÙØªÙˆØ­Ø©', channelMention: `<#${channel.id}>`,
                createdAt: Date.now()
            };
            saveTicketData();

            const ticketEmbed = new EmbedBuilder().setColor('#584702').setTitle(`${data.emoji} ${data.name}`)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true })).setDescription(description).setImage(banner)
                .setFooter({ text: 'Elsisy Community â€¢ Ticket System' });

            await channel.send({ content: `<@&${data.role}> | ${interaction.user}`, embeds: [ticketEmbed], components: [ticketButtons()] });
            await updateTicketLog(channel.id);
            return interaction.editReply({ content: `âœ… ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„ØªØ°ÙƒØ±Ø© ${channel}` });
        }

        if (interaction.isButton() && interaction.customId === 'claim_ticket') {
            if (!isStaff(interaction.member)) return interaction.reply({ content: 'âŒ Ù„ÙŠØ³ Ù„Ø¯ÙŠÙƒ ØµÙ„Ø§Ø­ÙŠØ© Ø§Ø³ØªÙ„Ø§Ù… Ù‡Ø°Ø§ Ø§Ù„ØªÙƒØª', ephemeral: true });
            const data = ticketData[interaction.channel.id];
            if (!data) return interaction.reply({ content: 'âŒ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØªØ°ÙƒØ±Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©.', ephemeral: true });
            if (data.claimedBy && data.claimedBy !== interaction.user.id) return interaction.reply({ content: `âŒ Ø§Ù„ØªØ°ÙƒØ±Ø© Ù…Ø³ØªÙ„Ù…Ø© Ø¨Ø§Ù„ÙØ¹Ù„ Ø¨ÙˆØ§Ø³Ø·Ø© <@${data.claimedBy}>`, ephemeral: true });
            data.claimedBy = interaction.user.id;
            data.status = 'Ù‚ÙŠØ¯ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©';
            const num = data.number;
            await interaction.channel.setName(`${num}_claimed_${interaction.user.username}`.slice(0, 100));
            saveTicketData();
            await updateTicketLog(interaction.channel.id);
            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#00ff00').setTitle('âœ… ØªÙ… Ø§Ø³ØªÙ„Ø§Ù… Ø§Ù„ØªØ°ÙƒØ±Ø©').setDescription(`ØªÙ… Ø§Ø³ØªÙ„Ø§Ù… Ø§Ù„ØªØ°ÙƒØ±Ø© Ø¨ÙˆØ§Ø³Ø·Ø© ${interaction.user}\n\nØ³ÙŠØªÙ… Ø§Ù„Ø±Ø¯ Ø¹Ù„ÙŠÙƒ Ù‚Ø±ÙŠØ¨Ø§Ù‹.`)] });
        }

        if (interaction.isButton() && interaction.customId === 'manage_ticket') {
            if (!isStaff(interaction.member)) return interaction.reply({ content: 'âŒ Ø²Ø± Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ù…ØªØ§Ø­ ÙÙ‚Ø· Ù„Ø£Ø¹Ø¶Ø§Ø¡ Ø§Ù„Ù€ Staff.', ephemeral: true });
            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#584702').setTitle('âš™ï¸ Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ØªØ°ÙƒØ±Ø©').setDescription('Ø§Ø®ØªØ± Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ø°ÙŠ ØªØ±ÙŠØ¯ ØªÙ†ÙÙŠØ°Ù‡ Ù…Ù† Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„ØªØ§Ù„ÙŠØ©.')], components: [managementRow()], ephemeral: true });
        }

        if (interaction.isButton() && interaction.customId === 'close_ticket') {
            const data = ticketData[interaction.channel.id];
            if (!isStaff(interaction.member)) return interaction.reply({ content: 'âŒ Ø²Ø± Ø§Ù„Ø¥ØºÙ„Ø§Ù‚ Ù…ØªØ§Ø­ ÙÙ‚Ø· Ù„Ø£Ø¹Ø¶Ø§Ø¡ Ø§Ù„Ù€ Staff.', ephemeral: true });
            const modal = new ModalBuilder().setCustomId('close_ticket_modal').setTitle('ðŸ”’ Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„ØªØ°ÙƒØ±Ø©');
            const reason = new TextInputBuilder().setCustomId('close_reason').setLabel('Ø³Ø¨Ø¨ Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„ØªØ°ÙƒØ±Ø©').setPlaceholder('Ø§ÙƒØªØ¨ Ø³Ø¨Ø¨ Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„ØªØ°ÙƒØ±Ø© Ù‡Ù†Ø§...').setStyle(TextInputStyle.Paragraph).setRequired(true).setMinLength(3).setMaxLength(500);
            modal.addComponents(new ActionRowBuilder().addComponents(reason));
            return interaction.showModal(modal);
        }

        if (interaction.isButton() && interaction.customId === 'delete_ticket') {
            const data = ticketData[interaction.channel.id];
            if (!isStaff(interaction.member)) return interaction.reply({ content: 'âŒ Ù„ÙŠØ³ Ù„Ø¯ÙŠÙƒ ØµÙ„Ø§Ø­ÙŠØ© Ø­Ø°Ù Ø§Ù„ØªØ°ÙƒØ±Ø©.', ephemeral: true });
            if (data.status !== 'Ù…ØºÙ„Ù‚Ø©') return interaction.reply({ content: 'âŒ ÙŠØ¬Ø¨ Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„ØªØ°ÙƒØ±Ø© Ø£ÙˆÙ„Ø§Ù‹.', ephemeral: true });

            await interaction.deferReply({ ephemeral: true });
            data.deletedBy = interaction.user.id;
            data.deletedAt = Date.now();
            saveTicketData();
            await updateTicketLog(interaction.channel.id);

            const ownerMember = await interaction.guild.members.fetch(data.ownerId).catch(() => null);
            const claimedMember = data.claimedBy ? await interaction.guild.members.fetch(data.claimedBy).catch(() => null) : null;
            const transcript = await createCustomTranscript(interaction.channel, {
                ticketNumber: data.number,
                owner: ownerMember?.displayName || ownerMember?.user?.globalName || ownerMember?.user?.username || 'ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ',
                type: data.typeName,
                claimedBy: claimedMember?.displayName || claimedMember?.user?.globalName || claimedMember?.user?.username || 'Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù…',
                openedBy: data.openedBy,
                closedBy: data.closedBy,
                deletedBy: data.deletedBy,
                closeReason: data.closeReason,
                guild: interaction.guild
            });

            const logChannel = await getLogChannel();
            if (logChannel?.isTextBased()) await logChannel.send({ content: `ðŸ“„ **Transcript Ø§Ù„ØªØ°ÙƒØ±Ø© ${data.number}**`, files: [transcript] });

            await interaction.editReply({ content: 'âœ… ØªÙ… Ø­ÙØ¸ Ø§Ù„Ù€ Transcript ÙˆØ³ÙŠØªÙ… Ø­Ø°Ù Ø§Ù„ØªØ°ÙƒØ±Ø© Ø®Ù„Ø§Ù„ 5 Ø«ÙˆØ§Ù†ÙŠ.' });
            setTimeout(async () => { try { await interaction.channel.delete(); } catch {} }, 5000);
            return;
        }

        if (interaction.isModalSubmit() && interaction.customId === 'close_ticket_modal') {
            const data = ticketData[interaction.channel.id];
            if (!isStaff(interaction.member)) return interaction.reply({ content: 'âŒ Ù„Ø§ ÙŠÙ…ÙƒÙ†Ùƒ Ø¥ØºÙ„Ø§Ù‚ Ù‡Ø°Ù‡ Ø§Ù„ØªØ°ÙƒØ±Ø© Ø¥Ù„Ø§ Ø¥Ø°Ø§ ÙƒÙ†Øª Ù…Ù† Ø§Ù„Ù€ Staff.', ephemeral: true });
            const reason = interaction.fields.getTextInputValue('close_reason');
            data.closedBy = interaction.user.id; data.closeReason = reason; data.status = 'Ù…ØºÙ„Ù‚Ø©'; data.closedAt = Date.now();
            await interaction.channel.permissionOverwrites.edit(data.ownerId, { SendMessages: false });
            saveTicketData();
            const claimedMember = data.claimedBy ? await interaction.guild.members.fetch(data.claimedBy).catch(() => null) : null;
            const claimedName = claimedMember?.user?.username || claimedMember?.displayName || 'unclaimed';
            await interaction.channel.setName(`Closed-Climed-${data.number}-${claimedName}`.slice(0, 100));
            await updateTicketLog(interaction.channel.id);
            const closeEmbed = new EmbedBuilder().setColor('#ffaa00').setTitle('ðŸ”’ ØªÙ… Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„ØªØ°ÙƒØ±Ø©').setDescription(`ØªÙ… Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„ØªØ°ÙƒØ±Ø© Ø¨ÙˆØ§Ø³Ø·Ø© ${interaction.user}\n\nðŸ“ **Ø³Ø¨Ø¨ Ø§Ù„Ø¥ØºÙ„Ø§Ù‚:**\n> ${reason}`).setTimestamp();
            return interaction.reply({ embeds: [closeEmbed], components: [ticketButtons(true)] });
        }

        if (interaction.isModalSubmit() && interaction.customId === 'rename_modal') {
            const data = ticketData[interaction.channel.id];
            if (!isStaff(interaction.member)) return interaction.reply({ content: 'âŒ Ù‡Ø°Ù‡ Ø§Ù„Ø®Ø§ØµÙŠØ© Ù…ØªØ§Ø­Ø© ÙÙ‚Ø· Ù„Ø£Ø¹Ø¶Ø§Ø¡ Ø§Ù„Ù€ Staff.', ephemeral: true });
            const newName = interaction.fields.getTextInputValue('ticket_name').trim().toLowerCase().replace(/[^a-zA-Z0-9\u0600-\u06FF-_]/g, '-').slice(0, 80);
            await interaction.channel.setName(`${data.number}_${newName}`.slice(0, 100));
            data.currentName = interaction.channel.name; saveTicketData();
            return interaction.reply({ content: `âœ… ØªÙ… ØªØºÙŠÙŠØ± Ø§Ø³Ù… Ø§Ù„ØªØ°ÙƒØ±Ø© Ø¥Ù„Ù‰ \`${interaction.channel.name}\``, ephemeral: true });
        }

        if (interaction.isModalSubmit() && interaction.customId === 'status_modal') {
            const data = ticketData[interaction.channel.id];
            const status = interaction.fields.getTextInputValue('ticket_status').trim();
            const allowed = ['Ù…ÙØªÙˆØ­Ø©', 'Ù‚ÙŠØ¯ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©', 'Ù…Ø¹Ù„Ù‚Ø©', 'Ù…ØºÙ„Ù‚Ø©'];
            if (!allowed.includes(status)) return interaction.reply({ content: `âŒ Ø§Ù„Ø­Ø§Ù„Ø© ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† ÙˆØ§Ø­Ø¯Ø© Ù…Ù†: ${allowed.join('ØŒ ')}`, ephemeral: true });
            if (status === 'Ù…ØºÙ„Ù‚Ø©') return interaction.reply({ content: 'âŒ Ø§Ø³ØªØ®Ø¯Ù… Ø²Ø± Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„ØªØ°ÙƒØ±Ø© Ù„Ø¥ØºÙ„Ø§Ù‚Ù‡Ø§ ÙˆØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø³Ø¨Ø¨.', ephemeral: true });
            data.status = status; saveTicketData(); await updateTicketLog(interaction.channel.id);
            return interaction.reply({ content: `âœ… ØªÙ… ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„ØªØ°ÙƒØ±Ø© Ø¥Ù„Ù‰ **${status}**.`, ephemeral: true });
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_management') {
            if (!isStaff(interaction.member)) return interaction.reply({ content: 'âŒ Ù‡Ø°Ù‡ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ù…ØªØ§Ø­Ø© ÙÙ‚Ø· Ù„Ø£Ø¹Ø¶Ø§Ø¡ Ø§Ù„Ù€ Staff.', ephemeral: true });
            const action = interaction.values[0];
            if (action === 'add_member' || action === 'remove_member' || action === 'transfer') {
                const customId = action === 'add_member' ? 'add_member_select' : action === 'remove_member' ? 'remove_member_select' : 'transfer_member_select';
                const title = action === 'add_member' ? 'âž• Ø¥Ø¶Ø§ÙØ© Ø¹Ø¶Ùˆ' : action === 'remove_member' ? 'âž– Ø­Ø°Ù Ø¹Ø¶Ùˆ' : 'ðŸ‘¤ Ù†Ù‚Ù„ Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„';
                const select = new UserSelectMenuBuilder().setCustomId(customId).setPlaceholder('Ø§Ø®ØªØ± Ø§Ù„Ø¹Ø¶Ùˆ').setMinValues(1).setMaxValues(1);
                return interaction.update({ embeds: [new EmbedBuilder().setColor('#584702').setTitle(title).setDescription('Ø§Ø®ØªØ± Ø§Ù„Ø¹Ø¶Ùˆ Ù…Ù† Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„ØªØ§Ù„ÙŠØ©.')], components: [new ActionRowBuilder().addComponents(select)] });
            }
            if (action === 'rename') {
                const data = ticketData[interaction.channel.id];
                if (!data?.claimedBy) return interaction.reply({ content: 'âŒ Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØºÙŠÙŠØ± Ø§Ø³Ù… Ø§Ù„ØªØ°ÙƒØ±Ø© Ø¥Ù„Ø§ Ø¨Ø¹Ø¯ Ø§Ø³ØªÙ„Ø§Ù…Ù‡Ø§.', ephemeral: true });
                const modal = new ModalBuilder().setCustomId('rename_modal').setTitle('âœï¸ ØªØºÙŠÙŠØ± Ø§Ø³Ù… Ø§Ù„ØªØ°ÙƒØ±Ø©');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_name').setLabel('Ø§Ù„Ø§Ø³Ù… Ø§Ù„Ø¬Ø¯ÙŠØ¯').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80)));
                return interaction.showModal(modal);
            }
            if (action === 'move') {
                const menu = new StringSelectMenuBuilder().setCustomId('move_ticket_select').setPlaceholder('Ø§Ø®ØªØ± Ø§Ù„Ù‚Ø³Ù… Ø§Ù„Ø¬Ø¯ÙŠØ¯');
                Object.entries(tickets).forEach(([key, value]) => menu.addOptions({ label: value.name, value: key, emoji: value.emoji }));
                return interaction.update({ embeds: [new EmbedBuilder().setColor('#584702').setTitle('ðŸ“‚ Ù†Ù‚Ù„ Ø§Ù„ØªØ°ÙƒØ±Ø©').setDescription('Ø§Ø®ØªØ± Ø§Ù„Ù‚Ø³Ù… Ø§Ù„Ø°ÙŠ ØªØ±ÙŠØ¯ Ù†Ù‚Ù„ Ø§Ù„ØªØ°ÙƒØ±Ø© Ø¥Ù„ÙŠÙ‡.')], components: [new ActionRowBuilder().addComponents(menu)] });
            }
            if (action === 'notify') {
                const owner = getOwnerId(interaction.channel);
                if (!owner) return interaction.reply({ content: 'âŒ Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ ØµØ§Ø­Ø¨ Ø§Ù„ØªØ°ÙƒØ±Ø©.', ephemeral: true });
                const ownerMember = await interaction.guild.members.fetch(owner).catch(() => null);
                const ownerName = ownerMember?.displayName || ownerMember?.user?.globalName || ownerMember?.user?.username || 'ØµØ§Ø­Ø¨ Ø§Ù„ØªØ°ÙƒØ±Ø©';
                const notifyEmbed = new EmbedBuilder()
                    .setColor('#ffd000')
                    .setTitle('ðŸ”” ØªÙ†Ø¨ÙŠÙ‡ ØµØ§Ø­Ø¨ Ø§Ù„ØªØ°ÙƒØ±Ø©')
                    .setDescription(`**${ownerName}**ØŒ Ù„Ø¯ÙŠÙƒ ØªÙ†Ø¨ÙŠÙ‡ Ø¬Ø¯ÙŠØ¯ Ù…Ù† ÙØ±ÙŠÙ‚ Ø§Ù„Ø¯Ø¹Ù… Ø¯Ø§Ø®Ù„ Ø§Ù„ØªØ°ÙƒØ±Ø©.`)
                    .addFields({ name: 'ðŸ‘® Ø¨ÙˆØ§Ø³Ø·Ø©', value: interaction.member.displayName, inline: true })
                    .setTimestamp()
                    .setFooter({ text: 'Elsisy Community â€¢ Ticket System' });
                // Mention stays outside the embed so Discord actually notifies the user.
                await interaction.channel.send({ content: `<@${owner}>`, embeds: [notifyEmbed] });
                return interaction.reply({ content: 'âœ… ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡ ÙƒÙ€ Embed Ù…Ø¹ Ù…Ù†Ø´Ù† Ù„ØµØ§Ø­Ø¨ Ø§Ù„ØªØ°ÙƒØ±Ø©.', ephemeral: true });
            }
            if (action === 'status') {
                const menu = new StringSelectMenuBuilder().setCustomId('status_select').setPlaceholder('Ø§Ø®ØªØ± Ø§Ù„Ø­Ø§Ù„Ø©').addOptions(
                    { label: 'Ù…ÙØªÙˆØ­Ø©', value: 'Ù…ÙØªÙˆØ­Ø©', emoji: 'ðŸŸ¢' },
                    { label: 'Ù‚ÙŠØ¯ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©', value: 'Ù‚ÙŠØ¯ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©', emoji: 'ðŸŸ¡' },
                    { label: 'Ù…Ø¹Ù„Ù‚Ø©', value: 'Ù…Ø¹Ù„Ù‚Ø©', emoji: 'ðŸŸ ' }
                );
                return interaction.update({ embeds: [new EmbedBuilder().setColor('#584702').setTitle('ðŸ“Š Ø­Ø§Ù„Ø© Ø§Ù„ØªØ°ÙƒØ±Ø©').setDescription('Ø§Ø®ØªØ± Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© Ù„Ù„ØªØ°ÙƒØ±Ø©.')], components: [new ActionRowBuilder().addComponents(menu)] });
            }
        }

        if (interaction.isUserSelectMenu()) {
            if (!isStaff(interaction.member)) return interaction.reply({ content: 'âŒ Ù‡Ø°Ù‡ Ø§Ù„Ø®Ø§ØµÙŠØ© Ù…ØªØ§Ø­Ø© ÙÙ‚Ø· Ù„Ø£Ø¹Ø¶Ø§Ø¡ Ø§Ù„Ù€ Staff.', ephemeral: true });
            const targetId = interaction.values[0];
            const data = ticketData[interaction.channel.id];
            if (interaction.customId === 'add_member_select') {
                await interaction.channel.permissionOverwrites.edit(targetId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
                return interaction.update({ embeds: [new EmbedBuilder().setColor('#00ff00').setTitle('âž• ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø¹Ø¶Ùˆ').setDescription(`ØªÙ… Ù…Ù†Ø­ <@${targetId}> ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„Ø¯Ø®ÙˆÙ„ Ù„Ù„ØªØ°ÙƒØ±Ø©.`)], components: [managementRow()] });
            }
            if (interaction.customId === 'remove_member_select') {
                if (targetId === data.ownerId) return interaction.reply({ content: 'âŒ Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø¥Ø²Ø§Ù„Ø© ØµØ§Ø­Ø¨ Ø§Ù„ØªØ°ÙƒØ±Ø©.', ephemeral: true });
                await interaction.channel.permissionOverwrites.delete(targetId).catch(() => {});
                return interaction.update({ embeds: [new EmbedBuilder().setColor('#00ff00').setTitle('âž– ØªÙ…Øª Ø¥Ø²Ø§Ù„Ø© Ø§Ù„Ø¹Ø¶Ùˆ').setDescription(`ØªÙ… Ø¥Ø²Ø§Ù„Ø© <@${targetId}> Ù…Ù† Ø§Ù„ØªØ°ÙƒØ±Ø©.`)], components: [managementRow()] });
            }
            if (interaction.customId === 'transfer_member_select') {
                const target = await interaction.guild.members.fetch(targetId).catch(() => null);
                if (!target || !isStaff(target)) return interaction.reply({ content: 'âŒ ÙŠØ¬Ø¨ Ø§Ø®ØªÙŠØ§Ø± Ù…Ø³Ø¤ÙˆÙ„ Ù„Ø¯ÙŠÙ‡ Ø£Ø­Ø¯ Ø±ÙˆÙ„Ø§Øª Ø§Ù„Ù€ Staff Ø§Ù„Ù…Ø­Ø¯Ø¯Ø©.', ephemeral: true });
                data.claimedBy = targetId; data.status = 'Ù‚ÙŠØ¯ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©'; saveTicketData();
                await interaction.channel.setName(`${data.number}_claimed_${target.user.username}`.slice(0, 100));
                await updateTicketLog(interaction.channel.id);
                return interaction.update({ embeds: [new EmbedBuilder().setColor('#00ff00').setTitle('ðŸ‘¤ ØªÙ… Ù†Ù‚Ù„ Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„').setDescription(`ØªÙ… ØªØ³Ù„ÙŠÙ… Ø§Ù„ØªØ°ÙƒØ±Ø© Ø¥Ù„Ù‰ <@${targetId}>.`)], components: [managementRow()] });
            }
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'move_ticket_select') {
            if (!isStaff(interaction.member)) return interaction.reply({ content: 'âŒ Ù‡Ø°Ù‡ Ø§Ù„Ø®Ø§ØµÙŠØ© Ù…ØªØ§Ø­Ø© ÙÙ‚Ø· Ù„Ø£Ø¹Ø¶Ø§Ø¡ Ø§Ù„Ù€ Staff.', ephemeral: true });
            const type = tickets[interaction.values[0]];
            if (!type?.category) return interaction.reply({ content: 'âŒ Ø§Ù„Ù€ Category ØºÙŠØ± Ù…Ø¶Ø¨ÙˆØ· ÙÙŠ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª.', ephemeral: true });
            await interaction.channel.setParent(type.category, { lockPermissions: false });
            const data = ticketData[interaction.channel.id]; data.type = interaction.values[0]; data.typeName = type.name; saveTicketData(); await updateTicketLog(interaction.channel.id);
            return interaction.update({ embeds: [new EmbedBuilder().setColor('#00ff00').setTitle('ðŸ“‚ ØªÙ… Ù†Ù‚Ù„ Ø§Ù„ØªØ°ÙƒØ±Ø©').setDescription(`ØªÙ… Ù†Ù‚Ù„ Ø§Ù„ØªØ°ÙƒØ±Ø© Ø¥Ù„Ù‰ Ù‚Ø³Ù… **${type.name}**.`)], components: [managementRow()] });
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'status_select') {
            if (!isStaff(interaction.member)) return interaction.reply({ content: 'âŒ Ù‡Ø°Ù‡ Ø§Ù„Ø®Ø§ØµÙŠØ© Ù…ØªØ§Ø­Ø© ÙÙ‚Ø· Ù„Ø£Ø¹Ø¶Ø§Ø¡ Ø§Ù„Ù€ Staff.', ephemeral: true });
            const data = ticketData[interaction.channel.id]; data.status = interaction.values[0]; saveTicketData(); await updateTicketLog(interaction.channel.id);
            return interaction.update({ embeds: [new EmbedBuilder().setColor('#00ff00').setTitle('ðŸ“Š ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø§Ù„Ø©').setDescription(`Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©: **${data.status}**`)], components: [managementRow()] });
        }
    } catch (error) {
        console.error(error);
        if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: 'âŒ Ø­Ø¯Ø« Ø®Ø·Ø£ ØºÙŠØ± Ù…ØªÙˆÙ‚Ø¹.', ephemeral: true }).catch(() => {});
    }
});

client.once('ready', async () => {
    const commands = [new SlashCommandBuilder().setName('ticket').setDescription('Ø§Ø±Ø³Ø§Ù„ Ø¨Ø§Ù†Ù„ Ø§Ù„ØªØ°Ø§ÙƒØ±')];
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands.map(c => c.toJSON()) });
        console.log('Slash Commands Loaded');
    } catch (e) { console.error('Command deploy error:', e); }
});

client.login(process.env.TOKEN);

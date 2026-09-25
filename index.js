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
    other: { name: 'تقديم علي Editor Team', emoji: '✂️', category: process.env.CATEGORY_OTHER, role: process.env.ROLE_OTHER },
    report: { name: 'شكاوي', emoji: '⚠️', category: process.env.CATEGORY_REPORT, role: process.env.ROLE_REPORT },
    support: { name: 'دعم فني', emoji: '🖥️', category: process.env.CATEGORY_SUPPORT, role: process.env.ROLE_SUPPORT },
    management: { name: 'تقديم علي Mod Kick', emoji: '<:Kick:1529200674783629433>', category: process.env.CATEGORY_MANAGEMENT, role: process.env.ROLE_MANAGEMENT }
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
    return ticketData[channel.id]?.typeName || 'غير معروف';
}

function baseLogEmbed(data) {
    const status = data.status || 'مفتوحة';
    return new EmbedBuilder()
        .setColor(status === 'مغلقة' ? '#ff4d4d' : status === 'معلقة' ? '#ffaa00' : '#584702')
        .setTitle('🎫 Ticket Log')
        .setDescription(`**${data.typeName || 'Ticket'}** • ${data.channelMention || 'غير معروف'}`)
        .addFields(
            { name: '🎟️ رقم التذكرة', value: `\`${data.number || '0000'}\``, inline: true },
            { name: '📁 القسم', value: data.typeName || 'غير معروف', inline: true },
            { name: '👤 صاحب التذكرة', value: data.ownerId ? `<@${data.ownerId}>` : 'غير معروف', inline: true },
            { name: '📥 فتح التذكرة', value: data.openedBy ? `<@${data.openedBy}>` : 'غير معروف', inline: true },
            { name: '📌 المستلم الحالي', value: data.claimedBy ? `<@${data.claimedBy}>` : 'لم يتم الاستلام', inline: true },
            { name: '📊 الحالة', value: data.status || 'مفتوحة', inline: true },
            { name: '🔒 الإغلاق', value: data.closedBy ? `<@${data.closedBy}>\n**السبب:** ${data.closeReason || 'غير محدد'}` : 'لم تُغلق بعد', inline: false },
            { name: '🗑️ الحذف', value: data.deletedBy ? `<@${data.deletedBy}>` : 'لم تُحذف بعد', inline: false }
        )
        .setTimestamp(new Date())
        .setFooter({ text: 'Elsisy Community • Ticket System' });
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
        .setPlaceholder('⚙️ اختر إجراء الإدارة')
        .setDisabled(disabled)
        .addOptions(
            { label: 'إضافة عضو', description: 'منح عضو صلاحية الدخول للتذكرة', value: 'add_member', emoji: '➕' },
            { label: 'حذف عضو', description: 'إزالة عضو من التذكرة', value: 'remove_member', emoji: '➖' },
            { label: 'تغيير اسم التذكرة', description: 'تعديل اسم قناة التذكرة', value: 'rename', emoji: '✏️' },
            { label: 'نقل التذكرة', description: 'نقل التذكرة إلى قسم آخر', value: 'move', emoji: '📂' },
            { label: 'إرسال تنبيه', description: 'تنبيه صاحب التذكرة داخل القناة', value: 'notify', emoji: '🔔' },
            { label: 'تغيير حالة التذكرة', description: 'تحديث حالة التذكرة', value: 'status', emoji: '📊' },
            { label: 'نقل المسؤول', description: 'تسليم التذكرة لمسؤول آخر', value: 'transfer', emoji: '👤' }
        );
    return new ActionRowBuilder().addComponents(menu);
}

function ticketButtons(closed = false) {
    if (closed) {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('delete_ticket').setLabel('حذف التذكرة').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
        );
    }
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('claim_ticket').setLabel('استلام').setEmoji('📌').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('close_ticket').setLabel('اغلاق').setEmoji('🔒').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('manage_ticket').setLabel('إدارة').setEmoji('⚙️').setStyle(ButtonStyle.Secondary)
    );
}

const panelEmbed = new EmbedBuilder()
    .setColor('#584702')
    .setTitle('📩 Elsisy Support Center')
    .setDescription(`**
## 🎟️ نظام التذاكر
### Elsisy مرحبًا بك في مركز الدعم الخاص بـ

يمكنك فتح التذاكر من هنا عن طريق الضغط على الزر المناسب حسب اختيارك.

### 🎫 تذكرة كيك
للتقديم على فريق المودات.

### 🛠️ دعم فني
لتقديم شكوى أو طلب مساعدة.

### ⚠️ شكاوي
لتقديم شكوى على أحد أعضاء السيرفر أو أحد أفراد الطاقم
━━━━━━━━━━━━━━━━━━━━━━━

### 📜 قوانين التذاكر

• يمنع فتح أي تيكيت وإغلاقه بدون سبب، وفي حال المخالفة سيتم إعطاؤك تايم اوت
• يمنع فتح أكثر من تيكيت لنفس السبب
• يرجى احترام الإدارة وشرح مشكلتك بشكل واضح داخل التذكرة.

━━━━━━━━━━━━━━━━━━━━━━━
> نتمنى لكم تجربة ممتعة
**`)
    .setImage(banner)
    .setFooter({ text: 'Elsisy Community • Ticket System' });

const panelMenu = new StringSelectMenuBuilder().setCustomId('ticket_menu').setPlaceholder('اختر القسم');
Object.entries(tickets).forEach(([key, value]) => panelMenu.addOptions({ label: value.name, value: key, emoji: value.emoji }));
const panelRow = new ActionRowBuilder().addComponents(panelMenu);

client.once('clientReady', () => console.log(`${client.user.tag} جاهز`));

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand() && interaction.commandName === 'ticket') {
            if (!interaction.member.roles.cache.has(process.env.TICKET_PANEL_ROLE))
                return interaction.reply({ content: '❌ ليس لديك صلاحية', ephemeral: true });
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

** تم إنشاء تذكرة:🎟️
شكراً لتواصلك معنا 👤 ${interaction.user}
━━━━━━━━━━━━━━━━━━━━━━━
📌 نوع التذكرة
تقديم علي Editor Team
🔎 شرح التذكرة
مرحبًا بك في قسم التقديم على Team Editors.

يرجى الإجابة على الأسئلة التالية:

• الاسم:
• العمر:
• البرامج التي تستخدمها:
• هل لديك خبرة سابقة؟
• لماذا ترغب في الانضمام إلى Team Editors؟

بعد إرسال إجاباتك، سيتم مراجعة طلبك والرد عليك في أقرب وقت ممكن.
━━━━━━━━━━━━━━━━━━━━━━━
💡 نصائح مهمة:
• كن واضحاً ومفصلاً في شرحك
• لا تشارك معلومات شخصية حساسة
• انتظر الرد بصبر
• شكراً لصبرك! 🙏
━━━━━━━━━━━━━━━━━━━━━━━
             **   `;
            if (interaction.values[0] === 'report') description = `**
تم إنشاء تذكرة:🎟️
شكراً لتواصلك معنا 👤 ${interaction.user}
━━━━━━━━━━━━━━━━━━━━━━━
📌 نوع التذكرة
شكوي
🔎 شرح التذكرة

📝 ماذا يحدث الآن؟
✅ تم إنشاء قناة خاصة لك
✅ سيقوم فريق الدعم بالرد عليك قريباً
✅ يرجى شرح المشكلة بالتفصيل
✅ احرص على الرد بسرعة
━━━━━━━━━━━━━━━━━━━━━━━
⚡ الخطوات التالية:
1️⃣ اشرح المشكلة أو الطلب بالتفصيل
2️⃣ انتظر رد فريق الدعم
3️⃣ عندما تنتهي اضغط "إغلاق التيكت"
━━━━━━━━━━━━━━━━━━━━━━━
💡 نصائح مهمة:
• كن واضحاً ومفصلاً في شرحك
• لا تشارك معلومات شخصية حساسة
• انتظر الرد بصبر
• شكراً لصبرك! 🙏
━━━━━━━━━━━━━━━━━━━━━━━
              **  `;
            if (interaction.values[0] === 'support') description = `**
 تم إنشاء تذكرة:🎟️
شكراً لتواصلك معنا 👤 ${interaction.user}
━━━━━━━━━━━━━━━━━━━━━━━
📌 نوع التذكرة
دعم فني
🔎 شرح التذكرة
للحصول علي اي مساعده
📝 ماذا يحدث الآن؟
✅ تم إنشاء قناة خاصة لك
✅ سيقوم فريق الدعم بالرد عليك قريباً
✅ يرجى شرح المشكلة بالتفصيل
✅ احرص على الرد بسرعة
━━━━━━━━━━━━━━━━━━━━━━━
⚡ الخطوات التالية:
1️⃣ اشرح المشكلة أو الطلب بالتفصيل
2️⃣ انتظر رد فريق الدعم
3️⃣ عندما تنتهي اضغط "إغلاق التيكت"
━━━━━━━━━━━━━━━━━━━━━━━
💡 نصائح مهمة:
• كن واضحاً ومفصلاً في شرحك
• لا تشارك معلومات شخصية حساسة
• انتظر الرد بصبر
• شكراً لصبرك! 🙏
━━━━━━━━━━━━━━━━━━━━━━━
             **   `;
            if (interaction.values[0] === 'management') description = `

** تم إنشاء تذكرة:🎟️
شكراً لتواصلك معنا 👤 ${interaction.user}
━━━━━━━━━━━━━━━━━━━━━━━
تقديم علي Mod Kick

🔎 شرح التذكرة
مرحبًا بك في قسم التقديم على فريق Mod Kick.

يرجى الإجابة على الأسئلة التالية:

• الاسم:
• العمر:
• عدد ساعات التواجد اليومية:
• لماذا ترغب في الانضمام إلى فريق Mod Kick؟
• هل لديك أي خبرة سابقة؟

بعد إرسال إجاباتك، يرجى انتظار رد الإدارة وعدم عمل منشن أو الاستفسار عن حالة طلبك حتى يتم مراجعته.
━━━━━━━━━━━━━━━━━━━━━━━
💡 نصائح مهمة:
• كن واضحاً ومفصلاً في شرحك
• لا تشارك معلومات شخصية حساسة
• انتظر الرد بصبر
• شكراً لصبرك! 🙏
━━━━━━━━━━━━━━━━━━━━━━━
              **  `;

            ticketData[channel.id] = {
                number: String(number), type: interaction.values[0], typeName: data.name,
                ownerId: interaction.user.id, openedBy: interaction.user.id,
                claimedBy: null, status: 'مفتوحة', channelMention: `<#${channel.id}>`,
                createdAt: Date.now()
            };
            saveTicketData();

            const ticketEmbed = new EmbedBuilder().setColor('#584702').setTitle(`${data.emoji} ${data.name}`)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true })).setDescription(description).setImage(banner)
                .setFooter({ text: 'Elsisy Community • Ticket System' });

            await channel.send({ content: `<@&${data.role}> | ${interaction.user}`, embeds: [ticketEmbed], components: [ticketButtons()] });
            await updateTicketLog(channel.id);
            return interaction.editReply({ content: `✅ تم إنشاء التذكرة ${channel}` });
        }

        if (interaction.isButton() && interaction.customId === 'claim_ticket') {
            if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ ليس لديك صلاحية استلام هذا التكت', ephemeral: true });
            const data = ticketData[interaction.channel.id];
            if (!data) return interaction.reply({ content: '❌ بيانات التذكرة غير موجودة.', ephemeral: true });
            if (data.claimedBy && data.claimedBy !== interaction.user.id) return interaction.reply({ content: `❌ التذكرة مستلمة بالفعل بواسطة <@${data.claimedBy}>`, ephemeral: true });
            data.claimedBy = interaction.user.id;
            data.status = 'قيد المتابعة';
            const num = data.number;
            await interaction.channel.setName(`${num}_claimed_${interaction.user.username}`.slice(0, 100));
            saveTicketData();
            await updateTicketLog(interaction.channel.id);
            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#00ff00').setTitle('✅ تم استلام التذكرة').setDescription(`تم استلام التذكرة بواسطة ${interaction.user}\n\nسيتم الرد عليك قريباً.`)] });
        }

        if (interaction.isButton() && interaction.customId === 'manage_ticket') {
            if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ زر الإدارة متاح فقط لأعضاء الـ Staff.', ephemeral: true });
            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#584702').setTitle('⚙️ إدارة التذكرة').setDescription('اختر الإجراء الذي تريد تنفيذه من القائمة التالية.')], components: [managementRow()], ephemeral: true });
        }

        if (interaction.isButton() && interaction.customId === 'close_ticket') {
            const data = ticketData[interaction.channel.id];
            if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ زر الإغلاق متاح فقط لأعضاء الـ Staff.', ephemeral: true });
            const modal = new ModalBuilder().setCustomId('close_ticket_modal').setTitle('🔒 إغلاق التذكرة');
            const reason = new TextInputBuilder().setCustomId('close_reason').setLabel('سبب إغلاق التذكرة').setPlaceholder('اكتب سبب إغلاق التذكرة هنا...').setStyle(TextInputStyle.Paragraph).setRequired(true).setMinLength(3).setMaxLength(500);
            modal.addComponents(new ActionRowBuilder().addComponents(reason));
            return interaction.showModal(modal);
        }

        if (interaction.isButton() && interaction.customId === 'delete_ticket') {
            const data = ticketData[interaction.channel.id];
            if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ ليس لديك صلاحية حذف التذكرة.', ephemeral: true });
            await interaction.deferReply({ ephemeral: true });
            data.deletedBy = interaction.user.id;
            data.deletedAt = Date.now();
            saveTicketData();
            await updateTicketLog(interaction.channel.id);

            const ownerMember = await interaction.guild.members.fetch(data.ownerId).catch(() => null);
            const claimedMember = data.claimedBy ? await interaction.guild.members.fetch(data.claimedBy).catch(() => null) : null;
            const transcript = await createCustomTranscript(interaction.channel, {
                ticketNumber: data.number,
                owner: ownerMember?.displayName || ownerMember?.user?.globalName || ownerMember?.user?.username || 'غير معروف',
                type: data.typeName,
                claimedBy: claimedMember?.displayName || claimedMember?.user?.globalName || claimedMember?.user?.username || 'لم يتم الاستلام',
                openedBy: data.openedBy,
                closedBy: data.closedBy,
                deletedBy: data.deletedBy,
                closeReason: data.closeReason,
                guild: interaction.guild
            });

            const logChannel = await getLogChannel();
            if (logChannel?.isTextBased()) await logChannel.send({ content: `📄 **Transcript التذكرة ${data.number}**`, files: [transcript] });

            await interaction.editReply({ content: '✅ تم حفظ الـ Transcript وسيتم حذف التذكرة خلال 5 ثواني.' });
            setTimeout(async () => { try { await interaction.channel.delete(); } catch {} }, 5000);
            return;
        }

        if (interaction.isModalSubmit() && interaction.customId === 'close_ticket_modal') {
            const data = ticketData[interaction.channel.id];
            if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ لا يمكنك إغلاق هذه التذكرة إلا إذا كنت من الـ Staff.', ephemeral: true });
            const reason = interaction.fields.getTextInputValue('close_reason');
            data.closedBy = interaction.user.id; data.closeReason = reason; data.status = 'مغلقة'; data.closedAt = Date.now();
            await interaction.channel.permissionOverwrites.edit(data.ownerId, { SendMessages: false });
            saveTicketData();
            const claimedMember = data.claimedBy ? await interaction.guild.members.fetch(data.claimedBy).catch(() => null) : null;
            const claimedName = claimedMember?.user?.username || claimedMember?.displayName || 'unclaimed';
            await interaction.channel.setName(`Closed-Climed-${data.number}-${claimedName}`.slice(0, 100));
            await updateTicketLog(interaction.channel.id);
            const closeEmbed = new EmbedBuilder().setColor('#ffaa00').setTitle('🔒 تم إغلاق التذكرة').setDescription(`تم إغلاق التذكرة بواسطة ${interaction.user}\n\n📝 **سبب الإغلاق:**\n> ${reason}`).setTimestamp();
            return interaction.reply({ embeds: [closeEmbed], components: [ticketButtons(true)] });
        }

        if (interaction.isModalSubmit() && interaction.customId === 'rename_modal') {
            const data = ticketData[interaction.channel.id];
            if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ هذه الخاصية متاحة فقط لأعضاء الـ Staff.', ephemeral: true });
            const newName = interaction.fields.getTextInputValue('ticket_name').trim().toLowerCase().replace(/[^a-zA-Z0-9\u0600-\u06FF-_]/g, '-').slice(0, 80);
            await interaction.channel.setName(`${data.number}_${newName}`.slice(0, 100));
            data.currentName = interaction.channel.name; saveTicketData();
            return interaction.reply({ content: `✅ تم تغيير اسم التذكرة إلى \`${interaction.channel.name}\``, ephemeral: true });
        }

        if (interaction.isModalSubmit() && interaction.customId === 'status_modal') {
            const data = ticketData[interaction.channel.id];
            const status = interaction.fields.getTextInputValue('ticket_status').trim();
            const allowed = ['مفتوحة', 'قيد المتابعة', 'معلقة', 'مغلقة'];
            if (!allowed.includes(status)) return interaction.reply({ content: `❌ الحالة يجب أن تكون واحدة من: ${allowed.join('، ')}`, ephemeral: true });
            if (status === 'مغلقة') return interaction.reply({ content: '❌ استخدم زر إغلاق التذكرة لإغلاقها وتسجيل السبب.', ephemeral: true });
            data.status = status; saveTicketData(); await updateTicketLog(interaction.channel.id);
            return interaction.reply({ content: `✅ تم تحديث حالة التذكرة إلى **${status}**.`, ephemeral: true });
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_management') {
            if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ هذه القائمة متاحة فقط لأعضاء الـ Staff.', ephemeral: true });
            const action = interaction.values[0];
            if (action === 'add_member' || action === 'remove_member' || action === 'transfer') {
                const customId = action === 'add_member' ? 'add_member_select' : action === 'remove_member' ? 'remove_member_select' : 'transfer_member_select';
                const title = action === 'add_member' ? '➕ إضافة عضو' : action === 'remove_member' ? '➖ حذف عضو' : '👤 نقل المسؤول';
                const select = new UserSelectMenuBuilder().setCustomId(customId).setPlaceholder('اختر العضو').setMinValues(1).setMaxValues(1);
                return interaction.update({ embeds: [new EmbedBuilder().setColor('#584702').setTitle(title).setDescription('اختر العضو من القائمة التالية.')], components: [new ActionRowBuilder().addComponents(select)] });
            }
            if (action === 'rename') {
                const data = ticketData[interaction.channel.id];
                if (!data?.claimedBy) return interaction.reply({ content: '❌ لا يمكن تغيير اسم التذكرة إلا بعد استلامها.', ephemeral: true });
                const modal = new ModalBuilder().setCustomId('rename_modal').setTitle('✏️ تغيير اسم التذكرة');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_name').setLabel('الاسم الجديد').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80)));
                return interaction.showModal(modal);
            }
            if (action === 'move') {
                const menu = new StringSelectMenuBuilder().setCustomId('move_ticket_select').setPlaceholder('اختر القسم الجديد');
                Object.entries(tickets).forEach(([key, value]) => menu.addOptions({ label: value.name, value: key, emoji: value.emoji }));
                return interaction.update({ embeds: [new EmbedBuilder().setColor('#584702').setTitle('📂 نقل التذكرة').setDescription('اختر القسم الذي تريد نقل التذكرة إليه.')], components: [new ActionRowBuilder().addComponents(menu)] });
            }
            if (action === 'notify') {
                const owner = getOwnerId(interaction.channel);
                if (!owner) return interaction.reply({ content: '❌ لم يتم العثور على صاحب التذكرة.', ephemeral: true });
                const ownerMember = await interaction.guild.members.fetch(owner).catch(() => null);
                const ownerName = ownerMember?.displayName || ownerMember?.user?.globalName || ownerMember?.user?.username || 'صاحب التذكرة';
                const notifyEmbed = new EmbedBuilder()
                    .setColor('#ffd000')
                    .setTitle('🔔 تنبيه صاحب التذكرة')
                    .setDescription(`**${ownerName}**، لديك تنبيه جديد من فريق الدعم داخل التذكرة.`)
                    .addFields({ name: '👮 بواسطة', value: interaction.member.displayName, inline: true })
                    .setTimestamp()
                    .setFooter({ text: 'Elsisy Community • Ticket System' });
                // Mention stays outside the embed so Discord actually notifies the user.
                await interaction.channel.send({ content: `<@${owner}>`, embeds: [notifyEmbed] });
                return interaction.reply({ content: '✅ تم إرسال التنبيه كـ Embed مع منشن لصاحب التذكرة.', ephemeral: true });
            }
            if (action === 'status') {
                const menu = new StringSelectMenuBuilder().setCustomId('status_select').setPlaceholder('اختر الحالة').addOptions(
                    { label: 'مفتوحة', value: 'مفتوحة', emoji: '🟢' },
                    { label: 'قيد المتابعة', value: 'قيد المتابعة', emoji: '🟡' },
                    { label: 'معلقة', value: 'معلقة', emoji: '🟠' }
                );
                return interaction.update({ embeds: [new EmbedBuilder().setColor('#584702').setTitle('📊 حالة التذكرة').setDescription('اختر الحالة الجديدة للتذكرة.')], components: [new ActionRowBuilder().addComponents(menu)] });
            }
        }

        if (interaction.isUserSelectMenu()) {
            if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ هذه الخاصية متاحة فقط لأعضاء الـ Staff.', ephemeral: true });
            const targetId = interaction.values[0];
            const data = ticketData[interaction.channel.id];
            if (interaction.customId === 'add_member_select') {
                await interaction.channel.permissionOverwrites.edit(targetId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
                return interaction.update({ embeds: [new EmbedBuilder().setColor('#00ff00').setTitle('➕ تمت إضافة العضو').setDescription(`تم منح <@${targetId}> صلاحية الدخول للتذكرة.`)], components: [managementRow()] });
            }
            if (interaction.customId === 'remove_member_select') {
                if (targetId === data.ownerId) return interaction.reply({ content: '❌ لا يمكن إزالة صاحب التذكرة.', ephemeral: true });
                await interaction.channel.permissionOverwrites.delete(targetId).catch(() => {});
                return interaction.update({ embeds: [new EmbedBuilder().setColor('#00ff00').setTitle('➖ تمت إزالة العضو').setDescription(`تم إزالة <@${targetId}> من التذكرة.`)], components: [managementRow()] });
            }
            if (interaction.customId === 'transfer_member_select') {
                const target = await interaction.guild.members.fetch(targetId).catch(() => null);
                if (!target || !isStaff(target)) return interaction.reply({ content: '❌ يجب اختيار مسؤول لديه أحد رولات الـ Staff المحددة.', ephemeral: true });
                data.claimedBy = targetId; data.status = 'قيد المتابعة'; saveTicketData();
                await updateTicketLog(interaction.channel.id);
                return interaction.update({ embeds: [new EmbedBuilder().setColor('#00ff00').setTitle('👤 تم نقل المسؤول').setDescription(`تم تسليم التذكرة إلى <@${targetId}>.`)], components: [managementRow()] });
            }
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'move_ticket_select') {
            if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ هذه الخاصية متاحة فقط لأعضاء الـ Staff.', ephemeral: true });
            const type = tickets[interaction.values[0]];
            if (!type?.category) return interaction.reply({ content: '❌ الـ Category غير مضبوط في الإعدادات.', ephemeral: true });
            await interaction.channel.setParent(type.category, { lockPermissions: false });
            const data = ticketData[interaction.channel.id]; data.type = interaction.values[0]; data.typeName = type.name; saveTicketData(); await updateTicketLog(interaction.channel.id);
            return interaction.update({ embeds: [new EmbedBuilder().setColor('#00ff00').setTitle('📂 تم نقل التذكرة').setDescription(`تم نقل التذكرة إلى قسم **${type.name}**.`)], components: [managementRow()] });
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'status_select') {
            if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ هذه الخاصية متاحة فقط لأعضاء الـ Staff.', ephemeral: true });
            const data = ticketData[interaction.channel.id]; data.status = interaction.values[0]; saveTicketData(); await updateTicketLog(interaction.channel.id);
            return interaction.update({ embeds: [new EmbedBuilder().setColor('#00ff00').setTitle('📊 تم تحديث الحالة').setDescription(`الحالة الجديدة: **${data.status}**`)], components: [managementRow()] });
        }
    } catch (error) {
        console.error(error);
        if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ حدث خطأ غير متوقع.', ephemeral: true }).catch(() => {});
    }
});

client.once('ready', async () => {
    const commands = [new SlashCommandBuilder().setName('ticket').setDescription('ارسال بانل التذاكر')];
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands.map(c => c.toJSON()) });
        console.log('Slash Commands Loaded');
    } catch (e) { console.error('Command deploy error:', e); }
});

client.login(process.env.TOKEN);

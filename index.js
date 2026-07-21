const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    REST,
    Routes,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const transcripts = require('discord-html-transcripts');

const claimedTickets = new Map();

require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

function isStaff(member) {
    return (
        member.roles.cache.has(process.env.STAFF_ROLE_1) ||
        member.roles.cache.has(process.env.STAFF_ROLE_2)
    );
}

const banner = 'https://i.postimg.cc/XNdm9Wvw/file-00000000fac881f4bf8abe24be69b5d2.png';

const tickets = {


    other: {
        name: ' تقديم علي Editor Team',
        emoji: '✂️',
        category: process.env.CATEGORY_OTHER,
        role: process.env.ROLE_OTHER
    },

    report: {
        name: 'شكاوي',
        emoji: '⚠️',
        category: process.env.CATEGORY_REPORT,
        role: process.env.ROLE_REPORT
    },


    support: {
        name: 'دعم فني',
        emoji: '🖥️',
        category: process.env.CATEGORY_SUPPORT,
        role: process.env.ROLE_SUPPORT
    },
    management: {
        name: 'تقديم علي Mod Kick',
        emoji: '<:Kick:1529200674783629433>',
        category: process.env.CATEGORY_MANAGEMENT,
        role: process.env.ROLE_MANAGEMENT
    }
};

client.once('clientReady', async () => {
    console.log(`${client.user.tag} جاهز`);
});

    const embed = new EmbedBuilder()
        .setColor('#584702')
        .setTitle('📩 Elsisy Support Center')
        .setDescription(`**
## 🎟️ نظام التذاكر
###  Elsisy مرحبًا بك في مركز الدعم الخاص بـ 

يمكنك فتح التذاكر من هنا عن طريق الضغط على الزر المناسب حسب اختيارك.

### 🎫 تذكرة كيك
للتقديم على فريق المودات.

### 🛠️ دعم فني
لتقديم شكوى أو طلب مساعدة.

### ⚠️ شكاوي 
لتقديم شكوى على أحد أعضاء السيرفر أو أحد أفراد الطاقم
━━━━━━━━━━━━━━━━━━━━━━━

### 📜 قوانين التذاكر

• يمنع فتح أي تيكيت وإغلاقه بدون سبب، وفي حال المخالفة سيتم إعطاؤك تايم

• يمنع فتح أكثر من تيكيت لنفس السبب

• يرجى احترام الإدارة وشرح مشكلتك بشكل واضح داخل التذكرة.

━━━━━━━━━━━━━━━━━━━━━━━

> نتمنى لكم تجربة ممتعة

      **  `)
        .setImage(banner)
        .setFooter({
            text: 'Elsisy Community • Ticket System'
        });

    const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket_menu')
        .setPlaceholder('اختر القسم');

    Object.entries(tickets).forEach(([key, value]) => {
        menu.addOptions({
            label: value.name,
            value: key,
            emoji: value.emoji
        });
    });

    const row = new ActionRowBuilder().addComponents(menu);


client.on('interactionCreate', async interaction => {

    if (interaction.isChatInputCommand()) {

    if (interaction.commandName === 'ticket') {

        if (
            !interaction.member.roles.cache.has(process.env.TICKET_PANEL_ROLE)
        ) {
            return interaction.reply({
                content: '❌ ليس لديك صلاحية',
                ephemeral: true
            });
        }

await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: false
});

    }
}

    if (interaction.isStringSelectMenu()) {

        if (interaction.customId === 'ticket_menu') {

            await interaction.deferReply({ ephemeral: true });

            const data = tickets[interaction.values[0]];

            const channel = await interaction.guild.channels.create({
                name: `تذكرة_${data.name}_${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: data.category,

                permissionOverwrites: [

                    {
                        id: interaction.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },

                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ]
                    },

                    {
    id: process.env.STAFF_ROLE_1,
    allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
    ]
},
{
    id: process.env.STAFF_ROLE_2,
    allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
    ]
}
                ]
            });

            let description = ``;

            // ================= تقديم علي Editor Team =================

            if (interaction.values[0] === 'other') {

                description = `

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
            }

            // ================= REPORT =================

            if (interaction.values[0] === 'report') {

                description = `**
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
            }



            // ================= SUPPORT =================

            if (interaction.values[0] === 'support') {

                description = `**
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
            }


            // ================= Mod Kick =================

            if (interaction.values[0] === 'management') {

                description = `

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
            }

            const ticketEmbed = new EmbedBuilder()
    .setColor('#584702')
    .setTitle(`${data.emoji} ${data.name}`)
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
    .setDescription(description)
    .setImage(banner)
    .setFooter({
        text: 'Elsisy Community • Ticket System'
    });

const buttons = new ActionRowBuilder().addComponents(

     new ButtonBuilder()
        .setCustomId('claim_ticket')
        .setLabel('استلام')
        .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('اغلاق')
        .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
        .setCustomId('delete_ticket')
        .setLabel('حذف')
        .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
        .setCustomId('rename_ticket')
        .setLabel('تغيير الاسم')
        .setStyle(ButtonStyle.Primary)
);

            await channel.send({
    content: `<@&${data.role}> | ${interaction.user}`,
    embeds: [ticketEmbed],
    components: [buttons]
});

            const logChannel = client.channels.cache.get(process.env.LOG_CHANNEL_ID);

            const logEmbed = new EmbedBuilder()
                .setColor('#584702')
                .setTitle('📥 Ticket Opened')
                .setDescription(`
👤 ${interaction.user}

📁 ${channel}

📌 ${data.name}
                `)
                .setTimestamp();

            await logChannel.send({
                embeds: [logEmbed]
            });

            await interaction.editReply({
                content: `✅ تم إنشاء التذكرة ${channel}`,
            });
        }
   }

if (interaction.isModalSubmit()) {

    if (interaction.customId === 'rename_modal') {

        const newName = interaction.fields.getTextInputValue('ticket_name');

        await interaction.channel.setName(
            newName
                .toLowerCase()
                .replace(/[^a-zA-Z0-9\u0600-\u06FF-_]/g, '-')
                .slice(0, 90)
        );

        return await interaction.reply({
            content: `✅ تم تغيير اسم التذكرة الي ${newName}`,
            flags: 64
        });
    }
}

    if (interaction.isButton()) {

        if (interaction.customId === 'rename_ticket') {

    const modal = new ModalBuilder()
        .setCustomId('rename_modal')
        .setTitle('تغيير اسم التذكرة');

    const input = new TextInputBuilder()
        .setCustomId('ticket_name')
        .setLabel('الاسم الجديد')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);

    modal.addComponents(row);

    return await interaction.showModal(modal);
}

        if (interaction.customId === 'claim_ticket') {

    const ticketType = Object.keys(tickets).find(key =>
        interaction.channel.name.includes(tickets[key].name)
    );


    if (!isStaff(interaction.member)) {
    return interaction.reply({
        content: '❌ ليس لديك صلاحية استلام هذا التكت',
        ephemeral: true
    });
}

    await interaction.channel.setName(
    `Claimed_${interaction.user.username}`
);

claimedTickets.set(interaction.channel.id, interaction.user.id);

const logChannel = interaction.guild.channels.cache.get(process.env.LOG_CHANNEL_ID);

await logChannel.send({
    embeds: [
        new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('📌 Ticket Claimed')
            .addFields(
                { name: '👤 Claimed By', value: `<@${interaction.user.id}>` },
                { name: '📁 Channel', value: `${interaction.channel}` }
            )
            .setTimestamp()
    ]
});

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ تم استلام التذكرة')
        .setDescription(`تم استلام التذكرة بواسطة ${interaction.user}

سيتم الرد عليك قريباً.`);

    await interaction.reply({
        embeds: [embed]
    });
}

        if (interaction.customId === 'close_ticket') {

           const logChannel = interaction.guild.channels.cache.get(process.env.LOG_CHANNEL_ID);

await logChannel.send({
    embeds: [
        new EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle('🔒 Ticket Closed')
            .addFields(
                { name: '🔒 Closed By', value: `<@${interaction.user.id}>` },
                { name: '📁 Channel', value: `${interaction.channel}` }
            )
            .setTimestamp()
    ]
});
            await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
                SendMessages: false
            });

            await interaction.channel.setName(`closed-claimed-${interaction.user.username}`);

            const embed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('🔒 تم إغلاق التذكرة')
                .setDescription(`
تم اغلاق التذكرة بواسطة ${interaction.user}
                `)

            await interaction.reply({
                embeds: [embed]
            });
        }

       if (interaction.customId === 'delete_ticket') {

        const claimedBy = claimedTickets.get(interaction.channel.id);

const transcript = await transcripts.createTranscript(interaction.channel, {
    limit: -1,
    returnType: 'attachment',
    fileName: `${interaction.channel.name}.html`
});

const logChannel = interaction.guild.channels.cache.get(process.env.LOG_CHANNEL_ID);

await logChannel.send({
    embeds: [
        new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('🗑️ Ticket Deleted')
            .addFields(
                { name: 'Deleted By', value: `<@${interaction.user.id}>` },
                { name: 'Claimed By', value: claimedBy ? `<@${claimedBy}>` : 'Not Claimed' }
            )
    ],
    files: [transcript]
});


    if (!isStaff(interaction.member)) {
    return interaction.reply({
        content: '❌ ليس لديك صلاحية حذف هذا التكت',
        ephemeral: true
    });
}

    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🗑️ حذف التذكرة')
        .setDescription('سيتم حذف التذكرة بعد 5 ثواني.');

    await interaction.reply({ embeds: [embed] });

    setTimeout(() => {
        interaction.channel.delete();
    }, 5000);
}
    }

});

client.once('ready', async () => {

    const commands = [
        new SlashCommandBuilder()
            .setName('ticket')
            .setDescription('ارسال بانل التذاكر')
    ];

    const rest = new REST({ version: '10' })
        .setToken(process.env.TOKEN);

    await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands }
    );

    console.log('Slash Commands Loaded');
});

client.login(process.env.TOKEN);

const { AttachmentBuilder } = require('discord.js');

function escapeHTML(text = '') {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function safeUrl(url = '') {
    const value = String(url);
    return /^(https?:\/\/|data:image\/)/i.test(value) ? escapeHTML(value) : '#';
}

function formatTime(date) {
    return new Date(date).toLocaleString('ar-EG', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Africa/Cairo'
    });
}

function replaceMentions(text, maps = {}) {
    let value = String(text || '');
    value = value.replace(/<@!?(\d+)>/g, (_, id) => `@${maps.users?.[id] || id}`);
    value = value.replace(/<@&(\d+)>/g, (_, id) => `@${maps.roles?.[id] || id}`);
    value = value.replace(/<#(\d+)>/g, (_, id) => `#${maps.channels?.[id] || id}`);
    return value;
}

function renderEmbed(embed, maps) {
    const data = typeof embed?.toJSON === 'function' ? embed.toJSON() : (embed?.data || embed || {});
    const color = typeof data.color === 'number'
        ? `#${data.color.toString(16).padStart(6, '0')}`
        : '#5865f2';

    const author = data.author?.name
        ? `<div class="embed-author">${escapeHTML(replaceMentions(data.author.name, maps))}</div>`
        : '';
    const title = data.title
        ? `<div class="embed-title">${escapeHTML(replaceMentions(data.title, maps))}</div>`
        : '';
    const url = data.url ? safeUrl(data.url) : '';
    const titleHTML = title && url ? `<a href="${url}" target="_blank" rel="noreferrer" class="embed-title-link">${title}</a>` : title;
    const description = data.description
        ? `<div class="embed-description">${escapeHTML(replaceMentions(data.description, maps)).replace(/\n/g, '<br>')}</div>`
        : '';

    const fields = Array.isArray(data.fields) ? data.fields.map(field => `
        <div class="embed-field ${field.inline ? 'inline' : ''}">
            <div class="embed-field-name">${escapeHTML(replaceMentions(field.name || '', maps))}</div>
            <div class="embed-field-value">${escapeHTML(replaceMentions(field.value || '', maps)).replace(/\n/g, '<br>')}</div>
        </div>`).join('') : '';

    const thumbnail = data.thumbnail?.url
        ? `<img class="embed-thumb" src="${safeUrl(data.thumbnail.url)}" alt="">`
        : '';
    const image = data.image?.url
        ? `<img class="embed-image" src="${safeUrl(data.image.url)}" alt="">`
        : '';
    const footer = data.footer?.text
        ? `<div class="embed-footer">${escapeHTML(replaceMentions(data.footer.text, maps))}</div>`
        : '';

    return `<div class="discord-embed" style="--embed-color:${color}">
        <div class="embed-main">
            ${author}${titleHTML}${description}
            ${fields ? `<div class="embed-fields">${fields}</div>` : ''}
            ${image}
            ${footer}
        </div>
        ${thumbnail}
    </div>`;
}

async function buildMentionMaps(channel, messages) {
    const guild = channel.guild;
    const users = {};
    const roles = {};
    const channels = {};

    for (const [id, role] of guild.roles.cache) roles[id] = role.name;
    for (const [id, ch] of guild.channels.cache) channels[id] = ch.name;

    const ids = new Set();
    for (const message of messages) {
        const content = message.content || '';
        for (const match of content.matchAll(/<@!?(\d+)>/g)) ids.add(match[1]);
        for (const mention of message.mentions?.users?.keys?.() || []) ids.add(mention);
    }

    await Promise.all([...ids].map(async id => {
        const member = guild.members.cache.get(id) || await guild.members.fetch(id).catch(() => null);
        users[id] = member?.displayName || member?.user?.globalName || member?.user?.username || id;
    }));

    return { users, roles, channels };
}

async function createCustomTranscript(channel, info = {}) {
    const messages = [];
    let lastId;

    while (true) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;
        const batch = await channel.messages.fetch(options);
        if (!batch.size) break;
        messages.push(...batch.values());
        lastId = batch.last().id;
        if (batch.size < 100) break;
    }
    messages.reverse();

    const maps = await buildMentionMaps(channel, messages);
    const guild = channel.guild;
    const ownerName = info.owner || 'غير معروف';
    const claimedName = info.claimedBy || 'لم يتم الاستلام';

    const messageHTML = messages.map(message => {
        const avatar = message.author.displayAvatarURL({ extension: 'png', size: 128 });
        const username = escapeHTML(message.member?.displayName || message.author.globalName || message.author.username);
        const tag = escapeHTML(message.author.username);
        const content = escapeHTML(replaceMentions(message.content || '', maps));
        const time = formatTime(message.createdAt);
        let attachments = '';

        if (message.attachments.size) {
            attachments = `<div class="attachments">${[...message.attachments.values()].map(file => {
                const url = safeUrl(file.url);
                const name = escapeHTML(file.name || 'Attachment');
                if (file.contentType?.startsWith('image/')) {
                    return `<a href="${url}" target="_blank" rel="noreferrer"><img class="attachment-image" src="${url}" alt="${name}"></a>`;
                }
                return `<a class="attachment-file" href="${url}" target="_blank" rel="noreferrer">📎 ${name}</a>`;
            }).join('')}</div>`;
        }

        const embeds = message.embeds?.length
            ? `<div class="message-embeds">${message.embeds.map(embed => renderEmbed(embed, maps)).join('')}</div>`
            : '';

        return `<article class="message">
            <img class="avatar" src="${safeUrl(avatar)}" alt="">
            <div class="message-content">
                <div class="message-header">
                    <span class="username">${username}</span>
                    <span class="tag">@${tag}</span>
                    <time>${time}</time>
                </div>
                ${content ? `<div class="text">${content}</div>` : ''}
                ${attachments}
                ${embeds}
            </div>
        </article>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Ticket ${escapeHTML(info.ticketNumber || '0000')} • Transcript</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#08090b;color:#eee;font-family:Arial,"Segoe UI",Tahoma,sans-serif;min-height:100vh}
body:before{content:"";position:fixed;inset:0;background:radial-gradient(circle at 15% 0%,rgba(255,208,0,.07),transparent 32%),radial-gradient(circle at 90% 20%,rgba(88,101,242,.05),transparent 30%);pointer-events:none}
.wrap{position:relative;max-width:1180px;margin:auto;padding:28px 18px 48px}
.hero{background:linear-gradient(145deg,#17130a,#101114 65%);border:1px solid rgba(255,208,0,.2);border-radius:24px;padding:25px;box-shadow:0 20px 70px rgba(0,0,0,.42);margin-bottom:18px}
.brand{display:flex;align-items:center;gap:14px}.logo{width:62px;height:62px;border-radius:18px;background:#211b0c;border:1px solid rgba(255,208,0,.28);display:grid;place-items:center;font-size:30px}.title{font-size:27px;font-weight:900;color:#ffd000}.sub{color:#92939a;margin-top:5px;font-size:13px}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:22px}.card{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:17px;padding:16px;min-width:0;box-shadow:inset 0 1px rgba(255,255,255,.025)}.label{font-size:11px;color:#85868c;margin-bottom:8px}.value{font-weight:800;color:#f2d45b;overflow-wrap:anywhere;line-height:1.55}
.summary{margin-top:12px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:17px;padding:15px}.summary-title{font-weight:900;color:#ffd000;margin-bottom:9px}.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;color:#b9bac0;font-size:13px}.summary-grid b{color:#eee}
.messages{background:#101114;border:1px solid rgba(255,255,255,.06);border-radius:22px;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,.3)}
.message{display:flex;direction:rtl;gap:13px;padding:17px 19px;border-bottom:1px solid rgba(255,255,255,.045)}.message:hover{background:rgba(255,208,0,.018)}.avatar{width:44px;height:44px;border-radius:50%;object-fit:cover;flex:none}.message-content{min-width:0;flex:1}.message-header{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:6px}.username{font-weight:900;color:#ffd000}.tag{font-size:12px;color:#73747b;direction:ltr}.message-header time{font-size:11px;color:#666870}.text{font-size:14px;line-height:1.75;color:#ddd;white-space:pre-wrap;overflow-wrap:anywhere}
.attachments{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.attachment-image{max-width:430px;max-height:390px;border-radius:12px;border:1px solid rgba(255,208,0,.15);display:block}.attachment-file{background:#1a1a1e;border:1px solid rgba(255,255,255,.08);padding:8px 12px;border-radius:9px;color:#e7ca55;text-decoration:none}
.message-embeds{display:flex;flex-direction:column;gap:10px;margin-top:11px}.discord-embed{display:flex;direction:ltr;background:#1b1d21;border-radius:8px;border-left:4px solid var(--embed-color);padding:12px;gap:12px;max-width:760px;box-shadow:0 5px 20px rgba(0,0,0,.18)}.embed-main{min-width:0;flex:1;text-align:left}.embed-author{font-size:12px;color:#ddd;font-weight:700;margin-bottom:7px}.embed-title,.embed-title-link{font-size:16px;color:#fff;font-weight:800;text-decoration:none;margin-bottom:7px}.embed-description{font-size:13px;color:#dcdee1;line-height:1.55;white-space:normal}.embed-fields{display:grid;grid-template-columns:1fr;gap:9px;margin-top:11px}.embed-field.inline{display:inline-block;width:31%;vertical-align:top;margin-right:2%}.embed-field-name{font-size:12px;font-weight:800;color:#fff;margin-bottom:3px}.embed-field-value{font-size:12px;color:#c9cbd0;line-height:1.5;white-space:normal}.embed-image{display:block;max-width:100%;max-height:330px;border-radius:7px;margin-top:11px}.embed-thumb{width:80px;height:80px;object-fit:cover;border-radius:7px;flex:none}.embed-footer{border-top:1px solid rgba(255,255,255,.07);margin-top:11px;padding-top:8px;color:#9a9ca2;font-size:11px}
.footer{text-align:center;color:#65656b;padding:22px 0 0;font-size:12px}.footer b{color:#b79b28}
@media(max-width:800px){.cards{grid-template-columns:repeat(2,1fr)}.summary-grid{grid-template-columns:1fr 1fr}.embed-field.inline{width:100%;margin:0}}
@media(max-width:520px){.wrap{padding:14px 10px 30px}.cards{grid-template-columns:1fr 1fr;gap:8px}.hero{padding:18px}.message{padding:13px 12px}.avatar{width:37px;height:37px}.title{font-size:21px}.summary-grid{grid-template-columns:1fr}.discord-embed{max-width:100%}.embed-thumb{width:60px;height:60px}}
</style>
</head>
<body>
<div class="wrap">
<section class="hero">
    <div class="brand"><div class="logo">🎟️</div><div><div class="title">Elsisy Community</div><div class="sub">Ticket Transcript • سجل كامل للتذكرة</div></div></div>
    <div class="cards">
        <div class="card"><div class="label">🎟️ رقم التذكرة</div><div class="value">${escapeHTML(info.ticketNumber || '0000')}</div></div>
        <div class="card"><div class="label">👤 صاحب التذكرة</div><div class="value">${escapeHTML(ownerName)}</div></div>
        <div class="card"><div class="label">📁 القسم</div><div class="value">${escapeHTML(info.type || 'غير معروف')}</div></div>
        <div class="card"><div class="label">📌 المسؤول</div><div class="value">${escapeHTML(claimedName)}</div></div>
    </div>
    <div class="summary">
        <div class="summary-title">📋 ملخص التذكرة</div>
        <div class="summary-grid">
            <div>فتح بواسطة: <b>${escapeHTML(await resolveMemberName(guild, info.openedBy))}</b></div>
            <div>أغلقت بواسطة: <b>${escapeHTML(await resolveMemberName(guild, info.closedBy))}</b></div>
            <div>حذفت بواسطة: <b>${escapeHTML(await resolveMemberName(guild, info.deletedBy))}</b></div>
            <div>سبب الإغلاق: <b>${escapeHTML(info.closeReason || 'غير محدد')}</b></div>
            <div>القناة: <b>#${escapeHTML(channel.name)}</b></div>
            <div>عدد الرسائل: <b>${messages.length}</b></div>
        </div>
    </div>
</section>
<section class="messages">${messageHTML || '<div style="padding:30px;text-align:center;color:#777">لا توجد رسائل في التذكرة.</div>'}</section>
<div class="footer"><b>Elsisy Community</b> • Ticket System • Cairo Time</div>
</div>
</body>
</html>`;

    return new AttachmentBuilder(Buffer.from(html, 'utf8'), {
        name: `${info.ticketNumber || 'ticket'}-transcript.html`
    });
}

async function resolveMemberName(guild, id) {
    if (!id) return '—';
    const member = guild.members.cache.get(id) || await guild.members.fetch(id).catch(() => null);
    return member?.displayName || member?.user?.globalName || member?.user?.username || id;
}

module.exports = { createCustomTranscript };

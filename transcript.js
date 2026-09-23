const { AttachmentBuilder } = require('discord.js');

function escapeHTML(text = '') {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
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

    const messageHTML = messages.map(message => {
        const avatar = message.author.displayAvatarURL({ extension: 'png', size: 128 });
        const username = escapeHTML(message.member?.displayName || message.author.globalName || message.author.username);
        const tag = escapeHTML(message.author.username);
        const content = escapeHTML(message.content || '');
        const time = message.createdAt.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' });
        let attachments = '';
        if (message.attachments.size) {
            attachments = `<div class="attachments">${message.attachments.map(file => {
                const url = escapeHTML(file.url); const name = escapeHTML(file.name || 'Attachment');
                if (file.contentType?.startsWith('image/')) return `<a href="${url}" target="_blank"><img class="attachment-image" src="${url}" alt="${name}"></a>`;
                return `<a class="attachment-file" href="${url}" target="_blank">📎 ${name}</a>`;
            }).join('')}</div>`;
        }
        return `<article class="message"><img class="avatar" src="${avatar}"><div class="message-content"><div class="message-header"><span class="username">${username}</span><span class="tag">@${tag}</span><time>${time}</time></div>${content ? `<div class="text">${content}</div>` : ''}${attachments}</div></article>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Ticket #${escapeHTML(info.ticketNumber || '0000')} • Transcript</title><style>
*{box-sizing:border-box}body{margin:0;background:#0b0b0d;color:#eee;font-family:Arial,"Segoe UI",Tahoma,sans-serif;min-height:100vh}.wrap{max-width:1120px;margin:auto;padding:28px 18px 40px}.hero{background:linear-gradient(145deg,#19150b,#0f0f12);border:1px solid rgba(255,208,0,.22);border-radius:22px;padding:26px;box-shadow:0 18px 55px rgba(0,0,0,.35);margin-bottom:18px}.brand{display:flex;align-items:center;gap:14px}.logo{width:58px;height:58px;border-radius:17px;background:#211b0c;border:1px solid rgba(255,208,0,.3);display:grid;place-items:center;font-size:28px}.title{font-size:25px;font-weight:900;color:#ffd000}.sub{color:#8f8f95;margin-top:5px;font-size:13px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:22px}.card{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:15px;padding:15px;min-width:0}.label{font-size:11px;color:#8f8f95;margin-bottom:8px}.value{font-weight:800;color:#f2d45b;overflow-wrap:anywhere}.messages{background:#101114;border:1px solid rgba(255,255,255,.06);border-radius:20px;overflow:hidden;box-shadow:0 18px 55px rgba(0,0,0,.25)}.message{display:flex;direction:rtl;gap:13px;padding:16px 19px;border-bottom:1px solid rgba(255,255,255,.045)}.message:hover{background:rgba(255,208,0,.025)}.avatar{width:43px;height:43px;border-radius:50%;object-fit:cover;flex:none}.message-content{min-width:0;flex:1}.message-header{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:5px}.username{font-weight:900;color:#ffd000}.tag{font-size:12px;color:#73747b;direction:ltr}.message-header time{font-size:11px;color:#666870}.text{font-size:14px;line-height:1.75;color:#ddd;white-space:pre-wrap;overflow-wrap:anywhere}.attachments{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.attachment-image{max-width:430px;max-height:390px;border-radius:12px;border:1px solid rgba(255,208,0,.15)}.attachment-file{background:#1a1a1e;border:1px solid rgba(255,255,255,.08);padding:8px 12px;border-radius:9px;color:#e7ca55;text-decoration:none}.footer{text-align:center;color:#65656b;padding:22px;font-size:12px}.footer b{color:#b79b28}@media(max-width:800px){.cards{grid-template-columns:repeat(2,1fr)}}@media(max-width:520px){.wrap{padding:14px 10px}.cards{grid-template-columns:1fr 1fr}.hero{padding:18px}.message{padding:13px 12px}.avatar{width:37px;height:37px}.title{font-size:20px}}
</style></head><body><div class="wrap"><section class="hero"><div class="brand"><div class="logo">🎟️</div><div><div class="title">Elsisy Community</div><div class="sub">Ticket Transcript • سجل كامل للتذكرة</div></div></div><div class="cards"><div class="card"><div class="label">🎟️ رقم التذكرة</div><div class="value">#${escapeHTML(info.ticketNumber || '0000')}</div></div><div class="card"><div class="label">👤 صاحب التذكرة</div><div class="value">${escapeHTML(info.owner || 'غير معروف')}</div></div><div class="card"><div class="label">📁 القسم</div><div class="value">${escapeHTML(info.type || 'غير معروف')}</div></div><div class="card"><div class="label">📌 المسؤول</div><div class="value">${escapeHTML(info.claimedBy || 'لم يتم الاستلام')}</div></div></div></section><section class="messages">${messageHTML || '<div style="padding:30px;text-align:center;color:#777">لا توجد رسائل في التذكرة.</div>'}</section><div class="footer"><b>Elsisy Community</b> • Ticket System • Cairo Time</div></div></body></html>`;
    return new AttachmentBuilder(Buffer.from(html, 'utf8'), { name: `${info.ticketNumber || 'ticket'}-transcript.html` });
}

module.exports = { createCustomTranscript };

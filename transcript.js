const {
    AttachmentBuilder
} = require("discord.js");

function escapeHTML(text = "") {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function createCustomTranscript(channel, info = {}) {

    let messages = [];
    let lastId;

    while (true) {

        const options = {
            limit: 100
        };

        if (lastId) {
            options.before = lastId;
        }

        const batch = await channel.messages.fetch(options);

        if (!batch.size) break;

        messages.push(...batch.values());

        lastId = batch.last().id;

        if (batch.size < 100) break;
    }

    messages.reverse();

    const messageHTML = messages.map(message => {

        const avatar = message.author.displayAvatarURL({
            extension: "png",
            size: 128
        });

        const username = escapeHTML(
            message.member?.displayName ||
            message.author.globalName ||
            message.author.username
        );

        const content = escapeHTML(message.content || "");

        const time = message.createdAt.toLocaleString("ar-EG", {
            dateStyle: "short",
            timeStyle: "short"
        });

        let attachmentsHTML = "";

        if (message.attachments.size) {

            attachmentsHTML = `
                <div class="attachments">
                    ${message.attachments.map(file => {

                        const url = escapeHTML(file.url);
                        const name = escapeHTML(file.name || "Attachment");

                        if (
                            file.contentType &&
                            file.contentType.startsWith("image/")
                        ) {
                            return `
                                <a href="${url}" target="_blank">
                                    <img
                                        class="attachment-image"
                                        src="${url}"
                                        alt="${name}"
                                    >
                                </a>
                            `;
                        }

                        return `
                            <a
                                class="attachment-file"
                                href="${url}"
                                target="_blank"
                            >
                                📎 ${name}
                            </a>
                        `;

                    }).join("")}
                </div>
            `;
        }

        return `
            <div class="message">

                <img
                    class="avatar"
                    src="${avatar}"
                >

                <div class="message-content">

                    <div class="message-header">

                        <span class="username">
                            ${username}
                        </span>

                        <span class="discord-tag">
                            ${escapeHTML(message.author.username)}
                        </span>

                        <span class="timestamp">
                            ${time}
                        </span>

                    </div>

                    ${
                        content
                            ? `<div class="text">${content}</div>`
                            : ""
                    }

                    ${attachmentsHTML}

                </div>

            </div>
        `;

    }).join("");

    const html = `
<!DOCTYPE html>

<html lang="ar" dir="rtl">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>
    ${escapeHTML(info.ticketNumber || "Ticket")} • Transcript
</title>

<style>

* {
    box-sizing: border-box;
}

body {

    margin: 0;

    background:
        radial-gradient(
            circle at top,
            #3a2b0d 0%,
            #21190b 35%,
            #100d08 100%
        );

    color: #eee;

    font-family:
        Arial,
        "Segoe UI",
        Tahoma,
        sans-serif;

    min-height: 100vh;
}

/* =========================
   HEADER
========================= */

.header {

    background:
        linear-gradient(
            135deg,
            #33250b,
            #1d1609
        );

    border-bottom:
        1px solid
        rgba(255, 210, 0, .25);

    padding: 28px 20px;

    box-shadow:
        0 10px 35px
        rgba(0,0,0,.45);
}

.header-inner {

    max-width: 1050px;

    margin: auto;

    display: flex;

    align-items: center;

    gap: 18px;
}

.logo {

    width: 58px;

    height: 58px;

    border-radius: 15px;

    background: #171107;

    border:
        1px solid
        rgba(255, 208, 0, .5);

    display: flex;

    align-items: center;

    justify-content: center;

    font-size: 27px;

    color: #ffd000;

    box-shadow:
        0 0 25px
        rgba(255,208,0,.12);
}

.header-title {

    font-size: 25px;

    font-weight: 800;

    color: #ffd000;
}

.header-subtitle {

    color: #aaa;

    margin-top: 5px;

    font-size: 14px;
}

/* =========================
   INFO
========================= */

.container {

    width: min(1050px, 94%);

    margin: 25px auto;
}

.info {

    display: grid;

    grid-template-columns:
        repeat(
            auto-fit,
            minmax(190px, 1fr)
        );

    gap: 12px;

    margin-bottom: 25px;
}

.info-box {

    background:
        rgba(40, 31, 14, .85);

    border:
        1px solid
        rgba(255, 208, 0, .14);

    border-radius: 12px;

    padding: 15px;

    box-shadow:
        0 8px 25px
        rgba(0,0,0,.2);
}

.info-label {

    color: #9f936e;

    font-size: 12px;

    margin-bottom: 7px;
}

.info-value {

    color: #f4d65b;

    font-weight: 700;

    word-break: break-word;
}

/* =========================
   MESSAGES
========================= */

.messages {

    background:
        rgba(18, 14, 8, .9);

    border:
        1px solid
        rgba(255,208,0,.1);

    border-radius: 15px;

    padding: 10px 0;

    box-shadow:
        0 15px 50px
        rgba(0,0,0,.35);
}

.message {

    display: flex;

    direction: rtl;

    gap: 13px;

    padding: 13px 18px;

    transition: .15s;
}

.message:hover {

    background:
        rgba(255,208,0,.035);
}

.avatar {

    width: 42px;

    height: 42px;

    border-radius: 50%;

    object-fit: cover;

    flex-shrink: 0;
}

.message-content {

    min-width: 0;

    flex: 1;
}

.message-header {

    display: flex;

    align-items: center;

    flex-wrap: wrap;

    gap: 8px;

    margin-bottom: 5px;
}

.username {

    color: #ffd000;

    font-weight: 800;

    font-size: 15px;
}

.discord-tag {

    color: #777;

    font-size: 12px;

    direction: ltr;
}

.timestamp {

    color: #666;

    font-size: 11px;
}

.text {

    color: #ddd;

    font-size: 14px;

    line-height: 1.7;

    white-space: pre-wrap;

    overflow-wrap: anywhere;
}

/* =========================
   ATTACHMENTS
========================= */

.attachments {

    display: flex;

    flex-direction: column;

    align-items: flex-start;

    gap: 8px;

    margin-top: 10px;
}

.attachment-image {

    max-width: 420px;

    max-height: 400px;

    border-radius: 10px;

    border:
        1px solid
        rgba(255,208,0,.15);

    display: block;
}

.attachment-file {

    display: inline-block;

    background: #2b220f;

    color: #e6c84e;

    text-decoration: none;

    padding: 8px 12px;

    border-radius: 8px;

    border:
        1px solid
        rgba(255,208,0,.12);
}

.attachment-file:hover {

    background: #3a2d12;
}

/* =========================
   FOOTER
========================= */

.footer {

    text-align: center;

    color: #665d43;

    padding: 30px 10px;

    font-size: 12px;
}

.footer strong {

    color: #b99b24;
}

/* =========================
   MOBILE
========================= */

@media (max-width: 600px) {

    .header-title {
        font-size: 20px;
    }

    .message {
        padding: 12px;
    }

    .avatar {
        width: 36px;
        height: 36px;
    }

    .attachment-image {
        max-width: 100%;
    }

}

</style>

</head>

<body>

<header class="header">

    <div class="header-inner">

        <div class="logo">
            🎟️
        </div>

        <div>

            <div class="header-title">
                Elsisy Community
            </div>

            <div class="header-subtitle">
                Ticket Transcript
            </div>

        </div>

    </div>

</header>

<main class="container">

    <section class="info">

        <div class="info-box">

            <div class="info-label">
                🎟️ رقم التذكرة
            </div>

            <div class="info-value">
                ${escapeHTML(info.ticketNumber || "غير معروف")}
            </div>

        </div>

        <div class="info-box">

            <div class="info-label">
                👤 صاحب التذكرة
            </div>

            <div class="info-value">
                ${escapeHTML(info.owner || "غير معروف")}
            </div>

        </div>

        <div class="info-box">

            <div class="info-label">
                📁 القسم
            </div>

            <div class="info-value">
                ${escapeHTML(info.type || "غير معروف")}
            </div>

        </div>

        <div class="info-box">

            <div class="info-label">
                👮 المستلم
            </div>

            <div class="info-value">
                ${escapeHTML(info.claimedBy || "لم يتم الاستلام")}
            </div>

        </div>

    </section>

    <section class="messages">

        ${messageHTML}

    </section>

</main>

<footer class="footer">

    <strong>Elsisy Community</strong>
    • Ticket System

</footer>

</body>

</html>
`;

    const buffer = Buffer.from(html, "utf8");

    return new AttachmentBuilder(
        buffer,
        {
            name:
                `${info.ticketNumber || "ticket"}-transcript.html`
        }
    );
}

module.exports = {
    createCustomTranscript
};
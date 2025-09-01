// bot.cjs
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const { exec } = require('child_process');

const authFolder = './auth_info';
const error_img = path.join(__dirname, './assets/media/img/error.png');

function sendErrorImage(sock, sender, msg, error, cmd) {
    try {
        const imageBuffer = fs.readFileSync(error_img);
        sock.sendMessage(sender, {
            image: imageBuffer,
            caption: `*|════| 𝐄𝐑𝐑𝐎𝐑 |════|*\n\n*🔑 CMD:*\n> ${cmd}\n*📞 TRL:*\n> ${error}`
        }, { quoted: msg });
    } catch (err) {
        console.error("❌ Error al enviar imagen de error:", err.message);
    }
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P().child({ level: 'silent' })),
        },
    });

    sock.ev.on('connection.update', update => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("📲 Escanea el QR localmente:");
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') console.log("✅ Bot conectado a WhatsApp.");

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("❌ Conexión cerrada. ¿Reiniciar?", shouldReconnect);
            if (shouldReconnect) startBot();
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const user = text.trim().toLowerCase();

        console.log(`📩 Mensaje de ${sender}: ${text}`);

        if (user === '!hola') {
            const imageUrl = 'https://raw.githubusercontent.com/skriftna/BOT/main/assets/media/img/error.png';
            try {
                const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(imageRes.data, 'binary');

                await sock.sendMessage(sender, {
                    image: buffer,
                    caption: `¡Hola!`
                }, { quoted: msg });
            } catch (err) {
                sendErrorImage(sock, sender, msg);
            }
        }

        if (user === '!voz') {
            try {
                const audioPath = path.join(__dirname, 'audios', 'saludo.mp3');
                const audioBuffer = fs.readFileSync(audioPath);

                await sock.sendMessage(sender, {
                    audio: audioBuffer,
                    mimetype: 'audio/mp4',
                    ptt: true
                }, { quoted: msg });
            } catch (err) {
                sendErrorImage(sock, sender, msg);
            }
        }
    });
}

async function main() {
    while (true) {
        try {
            await startBot();
            break;
        } catch (err) {
            console.error("❌ Error crítico:", err.message);
            console.log("🔄 Reiniciando bot en 4 segundos...");
            await new Promise(res => setTimeout(res, 4000));
        }
    }
}

main();

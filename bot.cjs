// ======================
// BOT RUBI – Railway Ready
// ======================

// Dependencias
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    downloadMediaMessage,
} = require('@whiskeysockets/baileys');
const P = require('pino');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { exec } = require('child_process');

// Express para mantener Railway activo
const express = require('express');
const app = express();
app.get('/ping', (req, res) => res.send('✅ Bot activo'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Servidor HTTP activo en puerto ${PORT}`));

// Carpeta de autenticación
const authFolder = './auth_info';
const error_img = path.join(__dirname, './assets/media/img/error.png');

// Función para enviar imagen de error
function sendErrorImage(sock, sender, msg, error, cmd) {
    try {
        const imageBuffer = fs.readFileSync(error_img);
        sock.sendMessage(sender, {
            image: imageBuffer,
            caption: `*|════| 𝐄𝐑𝐑𝐎𝐑 |════|*\n\n*🔑 CMD:* > ${cmd}\n*📞 TRL:* > ${error}`
        }, { quoted: msg });
    } catch (err) {
        console.error("❌ Error al enviar imagen de error:", err.message);
    }
}

// Función principal del bot
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P().child({ level: 'silent' })),
        },
    });

    // QR y conexión
    sock.ev.on("connection.update", (update) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr) qrcode.generate(qr, { small: true });

        if (connection === "open") console.log("✅ Bot conectado a WhatsApp.");

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("❌ Conexión cerrada. ¿Reiniciar?", shouldReconnect);
            if (shouldReconnect) setTimeout(startBot, 10000); // 10 segundos antes de reconectar
        }
    });

    sock.ev.on("creds.update", saveCreds);

    // Mensajes entrantes
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        const user = text.trim().toLowerCase();

        console.log(`📩 Mensaje de ${sender}: ${text}`);

        // Comando !hola
        if (user === "!hola") {
            const imageUrl = 'https://raw.githubusercontent.com/skriftna/BOT/main/assets/media/img/hola.jpg';
            try {
                const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(imageRes.data, 'binary');

                await sock.sendMessage(sender, {
                    image: buffer,
                    caption: `👋 ¡Hola!`,
                }, { quoted: msg });
            } catch (err) {
                sendErrorImage(sock, sender, msg, err.message, "!hola");
            }
        }

        // Comando !voz
        if (user === "!voz") {
            try {
                const audioPath = path.join(__dirname, 'audios', 'saludo.mp3');
                const audioBuffer = fs.readFileSync(audioPath);

                await sock.sendMessage(sender, {
                    audio: audioBuffer,
                    mimetype: 'audio/mp4',
                    ptt: true
                }, { quoted: msg });
            } catch (err) {
                sendErrorImage(sock, sender, msg, err.message, "!voz");
            }
        }

        // Comando !encender
        if (user === "!encender" || user === "!cargar") {
            exec('python assets/plugins/carga/encender.py', (err, stdout) => {
                const salida = stdout.trim();
                if (err || salida.startsWith("Error")) sendErrorImage(sock, sender, msg, stdout, "!encender");
                else sock.sendMessage(sender, { text: salida || "Sin salida." }, { quoted: msg });
            });
        }

        // Comando !apagar
        if (user === "!apagar") {
            exec('python assets/plugins/carga/apagar.py', (err, stdout) => {
                const salida = stdout.trim();
                if (err || salida.startsWith("Error")) sendErrorImage(sock, sender, msg, stdout, "!apagar");
                else sock.sendMessage(sender, { text: salida || "Sin salida." }, { quoted: msg });
            });
        }
    });

    // Bienvenida a nuevos miembros
    sock.ev.on("group-participants.update", async (update) => {
        const imageUrl = 'https://raw.githubusercontent.com/skriftna/BOT/main/assets/media/img/hola.jpg';
        const { id, participants, action } = update;

        if (action === 'add') {
            try {
                const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(imageRes.data, 'binary');

                for (const user of participants) {
                    await sock.sendMessage(id, {
                        image: buffer,
                        caption: `👋 ¡Bienvenido @${user.split('@')[0]} al grupo!`,
                        mentions: [user],
                    });
                }
            } catch (err) {
                console.error("❌ Error al enviar imagen de bienvenida:", err.message);
            }
        }
    });
}

// Reinicio en caso de error
async function main() {
    while (true) {
        try {
            await startBot();
            break;
        } catch (err) {
            console.error("❌ Error crítico:", err.message);
            console.log("🔄 Reiniciando bot en 10 segundos...");
            await new Promise(res => setTimeout(res, 10000));
        }
    }
}

main();

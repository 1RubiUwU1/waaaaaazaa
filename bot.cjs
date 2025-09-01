// bot.cjs
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const P = require('pino');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { exec } = require('child_process');
const qrcode = require('qrcode-terminal');

const app = express();
const PORT = process.env.PORT || 8080;

// Carpeta para guardar credenciales
const authFolder = './auth_info';

// Servidor HTTP simple para Railway (mantener vivo el contenedor)
app.get('/', (req, res) => res.send('🤖 Bot activo en Railway'));
app.listen(PORT, () => console.log(`🌐 Servidor HTTP activo en puerto ${PORT}`));

// Función para enviar imagen de error
function sendErrorImage(sock, sender, msg, error = "Error desconocido", cmd = "") {
    try {
        const error_img = path.join(__dirname, './assets/media/img/error.png');
        const imageBuffer = fs.readFileSync(error_img);
        sock.sendMessage(sender, {
            image: imageBuffer,
            caption: `*|════| 𝐄𝐑𝐑𝐎𝐑 |════|*\n\n*🔑 CMD:* ${cmd}\n*📞 TRL:* ${error}`
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

    // Escucha conexión y QR
    sock.ev.on('connection.update', (update) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr) {
            console.log("📲 Escanea el QR con WhatsApp:");
            qrcode.generate(qr, { small: true });
        }

        if (connection === "open") console.log("✅ Bot conectado a WhatsApp.");

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("❌ Conexión cerrada. ¿Reiniciar?", shouldReconnect);
            if (shouldReconnect) {
                console.log("🔄 Reconectando en 10 segundos...");
                setTimeout(startBot, 10000);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Escucha mensajes
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== "notify") return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        const user = text.trim().toLowerCase();

        console.log(`📩 Mensaje de ${sender}: ${text}`);

        // Comando de ejemplo !hola
        if (user === "!hola") {
            const imageUrl = 'https://raw.githubusercontent.com/skriftna/BOT/main/assets/media/img/hola.jpg';
            try {
                const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(imageRes.data, 'binary');

                await sock.sendMessage(sender, { image: buffer, caption: '👋 ¡Hola! Estoy activo.' }, { quoted: msg });
                console.log("✅ Imagen enviada correctamente.");
            } catch (err) {
                sendErrorImage(sock, sender, msg);
            }
        }

        // Comando !voz de ejemplo
        if (user === "!voz") {
            try {
                const audioPath = path.join(__dirname, 'audios', 'saludo.mp3');
                const audioBuffer = fs.readFileSync(audioPath);

                await sock.sendMessage(sender, { audio: audioBuffer, mimetype: 'audio/mp4', ptt: true }, { quoted: msg });
                console.log("✅ Audio enviado correctamente.");
            } catch (err) {
                sendErrorImage(sock, sender, msg);
            }
        }

        // Comando !encender (ejemplo Python)
        if (user === "!encender") {
            exec('python assets/plugins/carga/encender.py', (err, stdout) => {
                const salida = stdout.trim();
                if (err || salida.toLowerCase().includes("error")) sendErrorImage(sock, sender, msg, salida, "!encender");
                else sock.sendMessage(sender, { text: salida || "Comando ejecutado" }, { quoted: msg });
            });
        }
    });
}

// Inicializa bot con manejo de errores y reconexión
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

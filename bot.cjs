const {
    default: makeWASocket,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require('@whiskeysockets/baileys');

const P = require('pino');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const express = require('express');

// Servidor HTTP para Railway (ping alive)
const app = express();
const PORT = process.env.PORT || 8080;
app.get('/', (req, res) => res.send('Bot activo.'));
app.listen(PORT, () => console.log(`🌐 Servidor HTTP activo en puerto ${PORT}`));

// Firebase auth info
const firebaseBase = "https://firebasestorage.googleapis.com/v0/b/fotos-b8a54.appspot.com/o/auth_info%2F";
const credFiles = ["creds.json", "session.json", "keys.json"];
const error_img = path.join(__dirname, './assets/media/img/error.png');

async function sendErrorImage(sock, sender, msg, error, cmd) {
    try {
        const buffer = fs.readFileSync(error_img);
        await sock.sendMessage(sender, {
            image: buffer,
            caption: `*|════| 𝐄𝐑𝐑𝐎𝐑 |════|*\n\n*🔑 CMD:*\n> ${cmd || "N/A"}\n*📞 TRL:*\n> ${error || "Error desconocido"}`
        }, { quoted: msg });
    } catch (err) {
        console.error("❌ Error enviando imagen:", err.message);
    }
}

async function loadAuthFromFirebase() {
    const state = { creds: {}, keys: {} };
    for (const file of credFiles) {
        const url = `${firebaseBase}${encodeURIComponent(file)}?alt=media`;
        try {
            const res = await axios.get(url);
            const data = res.data;
            if (file === "creds.json") state.creds = data;
            else state.keys[file] = data;
        } catch (err) {
            console.error("❌ Error cargando credencial:", file, err.message);
        }
    }
    return state;
}

async function startBot() {
    const state = await loadAuthFromFirebase();
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P().child({ level: 'silent' })),
        },
    });

    console.log("✅ Bot iniciado.");

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) console.log("📲 QR recibido. Escanéalo desde tu app.");
        if (connection === "open") console.log("✅ Conectado a WhatsApp.");
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("❌ Conexión cerrada. ¿Reiniciar?", shouldReconnect);
            if (shouldReconnect) setTimeout(startBot, 10000); // espera 10s antes de reconectar
        }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        const user = text.trim().toLowerCase();

        console.log(`📩 Mensaje de ${sender}: ${text}`);

        if (user === "!hola") {
            const url = 'https://firebasestorage.googleapis.com/v0/b/fotos-b8a54.appspot.com/o/517410938_122175310514383922_6719064626741466107_n.jpg?alt=media';
            try {
                const res = await axios.get(url, { responseType: 'arraybuffer' });
                await sock.sendMessage(sender, { image: Buffer.from(res.data), caption: "----" }, { quoted: msg });
            } catch (err) { sendErrorImage(sock, sender, msg, err.message, "!hola"); }
        }

        if (user === "!voz") {
            try {
                const audioPath = path.join(__dirname, 'audios', 'saludo.mp3');
                const audioBuffer = fs.readFileSync(audioPath);
                await sock.sendMessage(sender, { audio: audioBuffer, mimetype: 'audio/mp4', ptt: true }, { quoted: msg });
            } catch (err) { sendErrorImage(sock, sender, msg, err.message, "!voz"); }
        }

        if (user === "!encender" || user === "!cargar") {
            exec('python assets/plugins/carga/encender.py', (err, stdout) => {
                const salida = stdout.trim();
                if (err || salida.includes("Error")) sendErrorImage(sock, sender, msg, salida, "!encender");
                else sock.sendMessage(sender, { text: salida || "Sin salida." }, { quoted: msg });
            });
        }

        if (user === "!apagar") {
            exec('python assets/plugins/carga/apagar.py', (err, stdout) => {
                const salida = stdout.trim();
                if (err || salida.includes("Error")) sendErrorImage(sock, sender, msg, salida, "!apagar");
                else sock.sendMessage(sender, { text: salida || "Sin salida." }, { quoted: msg });
            });
        }
    });

    sock.ev.on("group-participants.update", async (update) => {
        const { id, participants, action } = update;
        if (action === 'add') {
            const url = 'https://firebasestorage.googleapis.com/v0/b/fotos-b8a54.appspot.com/o/517410938_122175310514383922_6719064626741466107_n.jpg?alt=media';
            try {
                const res = await axios.get(url, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(res.data);
                for (const user of participants) {
                    await sock.sendMessage(id, { image: buffer, caption: `👋 ¡Bienvenido @${user.split('@')[0]}!`, mentions: [user] });
                }
            } catch (err) { console.error("❌ Error enviando bienvenida:", err.message); }
        }
    });
}

// main con reconexión
async function main() {
    while (true) {
        try {
            await startBot();
            break;
        } catch (err) {
            console.error("❌ Error crítico:", err.message);
            console.log("🔄 Reiniciando en 10 segundos...");
            await new Promise(res => setTimeout(res, 10000));
        }
    }
}

main();

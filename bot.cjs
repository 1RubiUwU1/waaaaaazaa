// bot.cjs
const makeWASocket = require('@whiskeysockets/baileys').default;
const {
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    downloadMediaMessage
} = require('@whiskeysockets/baileys');
const P = require('pino');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { exec } = require('child_process');

// Configuración
const authFolder = './auth_info';
const error_img = path.join(__dirname, './assets/media/error.png');

function sendErrorImage(sock, sender, msg, error = '', cmd = '') {
    try {
        const buffer = fs.readFileSync(error_img);
        sock.sendMessage(sender, {
            image: buffer,
            caption: `*|════| 𝐄𝐑𝐑𝐎𝐑 |════|*\n\n*🔑 CMD:* ${cmd}\n*📞 TRL:* ${error}`
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
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P().child({ level: 'silent' }))
        }
    });

    // Eventos de conexión
    sock.ev.on("connection.update", (update) => {
        const { connection, qr, lastDisconnect } = update;
        if (qr) qrcode.generate(qr, { small: true });
        if (connection === "open") console.log("✅ Bot conectado a WhatsApp.");
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("❌ Conexión cerrada. ¿Reiniciar?", shouldReconnect);
            if (shouldReconnect) setTimeout(startBot, 5000);
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
            const imgURL = 'https://firebasestorage.googleapis.com/v0/b/fotos-b8a54.appspot.com/o/517410938_122175310514383922_6719064626741466107_n.jpg?alt=media';
            try {
                const res = await axios.get(imgURL, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(res.data, 'binary');
                await sock.sendMessage(sender, { image: buffer, caption: "👋 Hola!" }, { quoted: msg });
            } catch (err) {
                sendErrorImage(sock, sender, msg, err.message, "!hola");
            }
        }

        // Comando !voz
        if (user === "!voz") {
            try {
                const audioPath = path.join(__dirname, 'assets/audios/saludo.mp3');
                const audioBuffer = fs.readFileSync(audioPath);
                await sock.sendMessage(sender, { audio: audioBuffer, mimetype: 'audio/mp4', ptt: true }, { quoted: msg });
            } catch (err) {
                sendErrorImage(sock, sender, msg, err.message, "!voz");
            }
        }

        // Comando !encender
        if (user === "!encender" || user === "!cargar") {
            exec('python assets/plugins/carga/encender.py', (err, stdout) => {
                if (err) sendErrorImage(sock, sender, msg, err.message, "!encender");
                else sock.sendMessage(sender, { text: stdout || "Sin salida." }, { quoted: msg });
            });
        }

        // Comando !apagar
        if (user === "!apagar") {
            exec('python assets/plugins/carga/apagar.py', (err, stdout) => {
                if (err) sendErrorImage(sock, sender, msg, err.message, "!apagar");
                else sock.sendMessage(sender, { text: stdout || "Sin salida." }, { quoted: msg });
            });
        }
    });

    // Bienvenida a nuevos participantes
    sock.ev.on("group-participants.update", async (update) => {
        const { id, participants, action } = update;
        if (action !== 'add') return;

        const imgURL = 'https://firebasestorage.googleapis.com/v0/b/fotos-b8a54.appspot.com/o/517410938_122175310514383922_6719064626741466107_n.jpg?alt=media';
        try {
            const res = await axios.get(imgURL, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(res.data, 'binary');
            for (const user of participants) {
                await sock.sendMessage(id, { image: buffer, caption: `👋 Bienvenido @${user.split('@')[0]}`, mentions: [user] });
            }
        } catch (err) {
            console.error("❌ Error al enviar imagen de bienvenida:", err.message);
        }
    });
}

// Loop principal con retry
async function main() {
    let retry = 0;
    while (retry < 5) {
        try {
            await startBot();
            break;
        } catch (err) {
            console.error("❌ Error crítico:", err.message);
            retry++;
            console.log("🔄 Reiniciando bot en 5 segundos...");
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

main();

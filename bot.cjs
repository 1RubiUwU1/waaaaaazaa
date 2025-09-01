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
const credFiles = [
 "app-state-sync-key-AAAAAAol.json",
 "app-state-sync-version-critical_block.json",
 "app-state-sync-version-regular.json",
 "app-state-sync-version-regular_high.json",
 "app-state-sync-version-regular_low.json",
 "creds.json",
 "pre-key-12.json",
 "pre-key-18.json",
 "pre-key-2.json",
 "pre-key-25.json",
 "pre-key-3.json",
 "pre-key-31.json",
 "pre-key-32.json",
 "pre-key-33.json",
 "pre-key-34.json",
 "pre-key-35.json",
 "pre-key-36.json",
 "pre-key-37.json",
 "pre-key-38.json",
 "pre-key-39.json",
 "pre-key-4.json",
 "pre-key-40.json",
 "pre-key-41.json",
 "pre-key-42.json",
 "pre-key-43.json",
 "pre-key-44.json",
 "pre-key-45.json",
 "pre-key-46.json",
 "pre-key-47.json",
 "pre-key-48.json",
 "pre-key-49.json",
 "pre-key-50.json",
 "pre-key-51.json",
 "pre-key-52.json",
 "pre-key-53.json",
 "pre-key-54.json",
 "pre-key-55.json",
 "pre-key-56.json",
 "pre-key-57.json",
 "pre-key-58.json",
 "pre-key-59.json",
 "pre-key-60.json",
 "sender-key-120363416947662538@g.us--141931556417728--0.json",
 "sender-key-120363416947662538@g.us--48498904928439--0.json",
 "sender-key-120363416947662538@g.us--51948207950--2.json",
 "sender-key-120363416947662538@g.us--70287408263203--0.json",
 "sender-key-120363420351253530@g.us--117871518711820--0.json",
 "sender-key-120363420351253530@g.us--117871518711820--14.json",
 "sender-key-120363420351253530@g.us--119366284783627--0.json",
 "sender-key-120363420351253530@g.us--131027137753280--0.json",
 "sender-key-120363420351253530@g.us--141317745172643--0.json",
 "sender-key-120363420351253530@g.us--14775274762295--0.json",
 "sender-key-120363420351253530@g.us--152918653157404--0.json",
 "sender-key-120363420351253530@g.us--16690259742854--0.json",
 "sender-key-120363420351253530@g.us--179899100852393--0.json",
 "sender-key-120363420351253530@g.us--184937584033869--0.json",
 "sender-key-120363420351253530@g.us--191590471577731--0.json",
 "sender-key-120363420351253530@g.us--214937544720619--0.json",
 "sender-key-120363420351253530@g.us--235970368675857--0.json",
 "sender-key-120363420351253530@g.us--254365747155006--0.json",
 "sender-key-120363420351253530@g.us--256560492191870--0.json",
 "sender-key-120363420351253530@g.us--273383912677556--0.json",
 "sender-key-120363420351253530@g.us--3290364424336--0.json",
 "sender-key-120363420351253530@g.us--3784034009096--0.json",
 "sender-key-120363420351253530@g.us--43864702353525--0.json",
 "sender-key-120363420351253530@g.us--51948207950--2.json",
 "sender-key-120363420351253530@g.us--6197990191260--0.json",
 "sender-key-120363420351253530@g.us--63226331017278--0.json",
 "sender-key-120363420351253530@g.us--69213716766829--0.json",
 "sender-key-120363420351253530@g.us--74685739982887--0.json",
 "sender-key-120363420351253530@g.us--89825482907800--0.json",
 "sender-key-120363420351253530@g.us--9440774328340--0.json",
 "sender-key-memory-120363416947662538@g.us.json",
 "sender-key-memory-120363420351253530@g.us.json",
 "session-105153684328557.0.json",
 "session-117871518711820.0.json",
 "session-117871518711820.14.json",
 "session-118708768899325.0.json",
 "session-119366284783627.0.json",
 "session-130021712781493.0.json",
 "session-130021712781493.94.json",
 "session-130021712781493.95.json",
 "session-130021712781493.96.json",
 "session-131027137753280.0.json",
 "session-131027137753280.6.json",
 "session-141317745172643.0.json",
 "session-141317745172643.42.json",
 "session-141931556417728.0.json",
 "session-141931556417728.47.json",
 "session-141931556417728.48.json",
 "session-141931556417728.50.json",
 "session-147580008804393.0.json",
 "session-147580008804393.19.json",
 "session-147580008804393.21.json",
 "session-147580008804393.27.json",
 "session-14775274762295.0.json",
 "session-14775274762295.1.json",
 "session-14775274762295.3.json",
 "session-14775274762295.4.json",
 "session-152918653157404.0.json",
 "session-16690259742854.0.json",
 "session-175690569789510.0.json",
 "session-175690569789510.1.json",
 "session-175690569789510.2.json",
 "session-179899100852393.0.json",
 "session-179899100852393.64.json",
 "session-18374239191175.0.json",
 "session-18374239191175.31.json",
 "session-18374239191175.32.json",
 "session-184937584033869.0.json",
 "session-184937584033869.20.json",
 "session-189571719553275.0.json",
 "session-189571719553275.10.json",
 "session-189717932957748.0.json",
 "session-191590471577731.0.json",
 "session-21028378013892.0.json",
 "session-21028378013892.39.json",
 "session-212807744266475.0.json",
 "session-214937544720619.0.json",
 "session-214937544720619.75.json",
 "session-235970368675857.0.json",
 "session-235970368675857.8.json",
 "session-235970368675857.9.json",
 "session-254365747155006.0.json",
 "session-256560492191870.0.json",
 "session-273383912677556.0.json",
 "session-273383912677556.23.json",
 "session-276587773730948.0.json",
 "session-30850951442595.0.json",
 "session-30850951442595.81.json",
 "session-3290364424336.0.json",
 "session-3290364424336.49.json",
 "session-3784034009096.0.json",
 "session-40441814749309.0.json",
 "session-43070485721287.0.json",
 "session-43864702353525.0.json",
 "session-43864702353525.41.json",
 "session-43864702353525.42.json",
 "session-48498904928439.0.json",
 "session-48611060629587.0.json",
 "session-51901176071.0.json",
 "session-51901176071.28.json",
 "session-51901176071.35.json",
 "session-51901176071.42.json",
 "session-51901176071.43.json",
 "session-51948207950.0.json",
 "session-51948207950.1.json",
 "session-51952318976.0.json",
 "session-521234567890.0.json",
 "session-6197990191260.0.json",
 "session-62273133527044.0.json",
 "session-63226331017278.0.json",
 "session-65223826399416.0.json",
 "session-65223826399416.9.json",
 "session-67830468849863.0.json",
 "session-67830468849863.87.json",
 "session-67830468849863.88.json",
 "session-69213716766829.0.json",
 "session-69213716766829.10.json",
 "session-70287408263203.0.json",
 "session-70287408263203.79.json",
 "session-74685739982887.0.json",
 "session-74685739982887.6.json",
 "session-76944657883166.0.json",
 "session-76944657883166.94.json",
 "session-76944657883166.98.json",
 "session-81497088348241.0.json",
 "session-81497088348241.28.json",
 "session-81497088348241.35.json",
 "session-81497088348241.43.json",
 "session-84517037547729.0.json",
 "session-87574852989118.0.json",
 "session-89825482907800.0.json",
 "session-89825482907800.19.json",
 "session-9440774328340.0.json",
 "session-9440774328340.29.json",
    
];
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

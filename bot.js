// bot.mjs
import fs from 'fs';
import path from 'path';
import makeWASocket, {
  fetchLatestBaileysVersion,
  DisconnectReason
} from '@whiskeysockets/baileys';
import P from 'pino';
import qrcode from 'qrcode-terminal';

// Carpeta local con todas las credenciales
const authFolder = path.resolve('./auth_info');

// Leer todos los archivos de sesión
function loadLocalSession() {
  const state = {};
  if (!fs.existsSync(authFolder)) {
    console.warn("⚠️ Carpeta auth_info no encontrada.");
    return state;
  }

  const files = fs.readdirSync(authFolder);
  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(authFolder, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        state[file.replace('.json','')] = data;
      } catch (err) {
        console.warn(`⚠️ Error leyendo ${file}: ${err.message}`);
      }
    }
  }
  return state;
}

// Guardar estado actualizado (opcional)
function saveStateLocal(state) {
  for (const key in state) {
    const filePath = path.join(authFolder, key + '.json');
    fs.writeFileSync(filePath, JSON.stringify(state[key], null, 2));
  }
  console.log("💾 Credenciales locales actualizadas.");
}

// Arrancar el bot
async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  const authState = loadLocalSession();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    auth: authState,
    connectTimeoutMs: 60000
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("📲 Escanea este QR con WhatsApp:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") console.log("✅ Bot conectado a WhatsApp.");

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const reason = DisconnectReason[code] || code;
      console.log(`❌ Conexión cerrada: ${reason}`);
      if (reason !== "loggedOut") {
        console.log("🔄 Reconectando en 5s...");
        setTimeout(startBot, 5000);
      }
    }
  });

  sock.ev.on("creds.update", () => {
    console.log("💾 Credenciales actualizadas.");
    saveStateLocal(sock.authState);
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

    console.log(`📩 Mensaje de ${sender}: ${text}`);

    if (text.toLowerCase() === "!hola") {
      await sock.sendMessage(sender, { text: "¡Hola! 👋" }, { quoted: msg });
    }
  });
}

startBot();

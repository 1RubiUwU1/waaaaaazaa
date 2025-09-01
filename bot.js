// bot.mjs
import makeWASocket, {
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason
} from '@whiskeysockets/baileys';
import P from 'pino';
import axios from 'axios';
import qrcode from 'qrcode-terminal';

const firebaseBase = "https://firebasestorage.googleapis.com/v0/b/fotos-b8a54.appspot.com/o/auth_info%2F";

// Lista de archivos de sesión
const sessionFiles = [
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
 "sender-key-120363420351253530@g.us--6197990191260--0.json",
 "sender-key-120363420351253530@g.us--63226331017278--0.json",
 "sender-key-120363420351253530@g.us--69213716766829--0.json",
 "sender-key-120363420351253530@g.us--74685739982887--0.json",
 "sender-key-120363420351253530@g.us--89825482907800--0.json",
 "sender-key-120363420351253530@g.us--9440774328340--0.json",
 "sender-key-memory-120363416947662538@g.us.json",
 "session-105153684328557.0.json",
 "session-117871518711820.0.json",
 "session-117871518711820.14.json",
 "session-119366284783627.0.json",
 "session-130021712781493.0.json",
 "session-130021712781493.94.json",
 "session-130021712781493.95.json",
 "session-130021712781493.96.json",
 "session-131027137753280.0.json",
 "session-141317745172643.0.json",
 "session-141931556417728.0.json",
 "session-141931556417728.47.json",
 "session-141931556417728.48.json",
 "session-141931556417728.50.json",
 "session-147580008804393.0.json",
 "session-14775274762295.0.json",
 "session-152918653157404.0.json",
 "session-16690259742854.0.json",
 "session-175690569789510.0.json",
 "session-175690569789510.1.json",
 "session-175690569789510.2.json",
 "session-179899100852393.0.json",
 "session-184937584033869.0.json",
 "session-191590471577731.0.json",
 "session-214937544720619.0.json",
 "session-235970368675857.0.json",
 "session-254365747155006.0.json",
 "session-256560492191870.0.json",
 "session-273383912677556.0.json",
 "session-3290364424336.0.json",
 "session-3784034009096.0.json",
 "session-40441814749309.0.json",
 "session-43864702353525.0.json",
 "session-48498904928439.0.json",
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
 "session-63226331017278.0.json",
 "session-69213716766829.0.json",
 "session-70287408263203.0.json",
 "session-70287408263203.79.json",
 "session-74685739982887.0.json",
 "session-76944657883166.0.json",
 "session-76944657883166.94.json",
 "session-76944657883166.98.json",
 "session-81497088348241.0.json",
 "session-81497088348241.28.json",
 "session-81497088348241.35.json",
 "session-81497088348241.43.json",
 "session-89825482907800.0.json",
 "session-9440774328340.0.json",

];

// Cargar sesión desde Firebase
async function loadSessionFromFirebase() {
  const state = {};
  for (const file of sessionFiles) {
    const url = `${firebaseBase}${encodeURIComponent(file)}?alt=media`;
    try {
      const res = await axios.get(url);
      state[file.replace('.json','')] = res.data;
    } catch (err) {
      console.warn(`⚠️ No se pudo cargar ${file}: ${err.message}`);
    }
  }
  return state;
}

// Guardar estado actualizado (opcional)
async function saveStateToFirebase(state) {
  console.log("💾 Guardar credenciales actualizadas en Firebase si quieres.");
}

// Crear el bot
async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  const authState = await loadSessionFromFirebase();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    auth: authState,
    connectTimeoutMs: 60000  // 60s timeout
  });

  sock.ev.on("connection.update", async (update) => {
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
        console.log("🔄 Intentando reconectar en 5s...");
        setTimeout(startBot, 5000);
      }
    }
  });

  sock.ev.on("creds.update", async () => {
    console.log("💾 Credenciales actualizadas.");
    await saveStateToFirebase(sock.authState);
  });

  // Comandos simples
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

    // Ejemplo de comando con imagen
    if (text.toLowerCase() === "!imagen") {
      try {
        const url = 'https://firebasestorage.googleapis.com/v0/b/fotos-b8a54.appspot.com/o/517410938_122175310514383922_6719064626741466107_n.jpg?alt=media';
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(res.data, 'binary');
        await sock.sendMessage(sender, { image: buffer, caption: "Imagen desde Firebase" }, { quoted: msg });
      } catch (err) {
        console.error("❌ Error al enviar imagen:", err.message);
      }
    }
  });
}

// Arrancar bot
startBot();

import makeWASocket, {
    fetchLatestBaileysVersion,
    DisconnectReason
} from "@whiskeysockets/baileys";
import P from "pino";
import fs from "fs";
import path from "path";
import qrcode from "qrcode-terminal";

// Carpeta local con todas las credenciales
const authFolder = "./auth_info";

// Cargar credenciales desde la carpeta local
function loadAuthState() {
    const state = {};
    const files = fs.readdirSync(authFolder);
    for (const file of files) {
        if (file.endsWith(".json")) {
            const fullPath = path.join(authFolder, file);
            const key = path.basename(file, ".json");
            state[key] = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
        }
    }
    return state;
}

// Guardar credenciales actualizadas (opcional)
function saveAuthState(authState) {
    console.log("💾 Actualizando credenciales en auth_info...");
    for (const key in authState) {
        const fullPath = path.join(authFolder, key + ".json");
        fs.writeFileSync(fullPath, JSON.stringify(authState[key], null, 2));
    }
}

// Inicializar el bot
async function startBot() {
    const { version } = await fetchLatestBaileysVersion();
    const authState = loadAuthState();

    const sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        auth: authState
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
            const reason = DisconnectReason[code] || code || "unknown";
            console.log(`❌ Conexión cerrada: ${reason}`);
            if (reason !== "loggedOut") {
                console.log("🔄 Reconectando en 5s...");
                setTimeout(startBot, 5000);
            }
        }
    });

    sock.ev.on("creds.update", () => {
        console.log("💾 Credenciales actualizadas.");
        saveAuthState(sock.authState);
    });

    // Ejemplo: responder a mensajes
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

import makeWASocket, {
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} from '@whiskeysockets/baileys';
import P from 'pino';
import fs from 'fs';
import path from 'path';
import qrcode from 'qrcode-terminal';

const authFolder = './auth_info'; // tu carpeta con todas las credenciales

// Cargar sesión desde archivos locales
function loadAuthState() {
    const state = {
        creds: {},
        keys: makeCacheableSignalKeyStore({})
    };

    const files = fs.readdirSync(authFolder);
    for (const file of files) {
        if (file.endsWith('.json')) {
            const data = JSON.parse(fs.readFileSync(path.join(authFolder, file)));
            state.creds = data; // Para simplificar, sobreescribimos creds, normalmente usarías todos los archivos según Baileys
        }
    }

    return state;
}

async function startBot() {
    const { version } = await fetchLatestBaileysVersion();
    const auth = loadAuthState();

    const sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        auth
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('📲 Escanea este QR con WhatsApp:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') console.log('✅ Bot conectado a WhatsApp.');

        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            const reason = DisconnectReason[code] || code;
            console.log(`❌ Conexión cerrada: ${reason}`);
            if (reason !== 'loggedOut') setTimeout(startBot, 5000); // reconectar
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        console.log(`📩 Mensaje de ${sender}: ${text}`);

        if (text.toLowerCase() === '!hola') {
            await sock.sendMessage(sender, { text: '¡Hola! 👋' }, { quoted: msg });
        }
    });
}

startBot();

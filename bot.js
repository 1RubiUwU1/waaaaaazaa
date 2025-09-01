// bot.js
import makeWASocket, { useSingleFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import fs from 'fs';
import P from 'pino';

// Cargar estado de autenticación
const { state, saveState } = useSingleFileAuthState('./auth_info/state.json');

async function startBot() {
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Ya no se usa, manejar QR con connection.update si quieres
        logger: P({ level: 'silent' }),
    });

    sock.ev.on('creds.update', saveState);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Conexión cerrada', lastDisconnect?.error, shouldReconnect ? '🔄 Reconectando...' : '');
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ Conectado al servidor de WhatsApp');
        }
    });

    // Ejemplo de escucha de mensajes
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (!msg.key.fromMe && msg.message?.conversation) {
                const text = msg.message.conversation;
                console.log('Mensaje recibido:', text);
                await sock.sendMessage(msg.key.remoteJid, { text: 'Recibido: ' + text });
            }
        }
    });
}

// Iniciar bot
startBot();

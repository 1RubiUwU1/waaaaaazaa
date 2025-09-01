import makeWASocket, { fetchLatestBaileysVersion, DisconnectReason } from "@whiskeysockets/baileys";
import P from "pino";
import fs from "fs";
import path from "path";
import qrcode from "qrcode-terminal";

const authPath = path.join('./auth_info');

async function loadAuth() {
  const files = fs.readdirSync(authPath);
  const state = {};
  for (const file of files) {
    if (file.endsWith('.json')) {
      state[file.replace('.json','')] = JSON.parse(fs.readFileSync(path.join(authPath, file)));
    }
  }
  return state;
}

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  const authState = await loadAuth();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    auth: authState
  });

  sock.ev.on('connection.update', update => {
  if (update.qr) {
    // Guardar QR como imagen o mostrar en web, no en terminal si es un servidor
    console.log('QR generado. Escanéalo desde otro dispositivo.');
  }
});


  sock.ev.on("messages.upsert", ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    console.log(`📩 Mensaje: ${text}`);
  });
}

startBot();


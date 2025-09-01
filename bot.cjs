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



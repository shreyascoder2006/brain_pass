import express from 'express';
import cors from 'cors';
import pino from 'pino';
import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic import for Baileys ES module compatibility
const baileys = await import('@whiskeysockets/baileys');
const makeWASocket = baileys.default?.default || baileys.default || baileys.makeWASocket;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = baileys;

const PORT = process.env.PORT || 3001;
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8008';
const AUTH_DIR = path.join(__dirname, 'auth_info');

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const logger = pino({ level: 'info' });

let sock = null;
let currentQrRaw = null;
let currentQrDataUrl = null;
let currentPairingCode = null;
let currentPairingPhone = null;
let isConnected = false;
let connectedUser = null;

function normalizeJid(phone) {
  if (!phone) return null;
  const str = String(phone).trim();
  if (str.endsWith('@s.whatsapp.net') || str.endsWith('@lid')) {
    return str;
  }
  let digits = str.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) {
    digits = '91' + digits;
  }
  return `${digits}@s.whatsapp.net`;
}

function sanitizePhone(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    digits = '91' + digits; // Default to India prefix if 10-digit standard Indian mobile
  }
  return digits;
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let version = [2, 3000, 1043857760];
  try {
    const fetched = await fetchLatestBaileysVersion();
    if (fetched?.version) version = fetched.version;
  } catch (_) {}

  logger.info({ version }, 'Connecting to WhatsApp via Baileys...');

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }), // Suppress noisy internal websocket logs
    browser: Browsers ? Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '22.04.4'],
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQrRaw = qr;
      currentQrDataUrl = await QRCode.toDataURL(qr);
      logger.info('New WhatsApp QR code received. Ready for scan:');
      qrcodeTerminal.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      isConnected = false;
      connectedUser = null;

      logger.warn({ statusCode, shouldReconnect }, 'WhatsApp connection closed');
      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 3000);
      } else {
        logger.error('Session logged out or expired. Clear session and pair again.');
      }
    } else if (connection === 'open') {
      isConnected = true;
      currentQrRaw = null;
      currentQrDataUrl = null;
      currentPairingCode = null;
      currentPairingPhone = null;
      connectedUser = sock.user;
      logger.info({ user: sock.user }, 'WhatsApp connected successfully via Baileys!');
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue; // Ignore messages sent by self
      if (msg.key.remoteJid === 'status@broadcast') continue; // Ignore status updates

      const senderJid = msg.key.remoteJid;
      const senderPhone = senderJid.endsWith('@s.whatsapp.net')
        ? senderJid.replace('@s.whatsapp.net', '')
        : senderJid;

      // Extract text content across different message formats
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.documentMessage?.caption ||
        '';

      if (!text.trim()) continue;

      logger.info({ senderPhone, text }, 'Received incoming WhatsApp message');

      // Forward to FastAPI backend pipeline
      try {
        const response = await fetch(`${FASTAPI_URL}/api/whatsapp/incoming`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderPhone,
            senderJid,
            text,
            messageId: msg.key.id,
            timestamp: msg.messageTimestamp,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          // If backend generated a direct reply message, send it back immediately
          if (result && result.replyText) {
            await sock.sendMessage(senderJid, { text: result.replyText });
            logger.info({ senderPhone, reply: result.replyText }, 'Dispatched automatic reply');
          }
        } else {
          logger.warn({ status: response.status }, 'FastAPI incoming webhook responded with non-200');
        }
      } catch (err) {
        logger.error({ err: err.message }, 'Failed to forward incoming message to FastAPI');
      }
    }
  });
}

// REST API Endpoints for FastAPI & Frontend
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    bridge: 'baileys',
    connected: isConnected,
  });
});

app.get('/status', (req, res) => {
  res.json({
    connected: isConnected,
    user: connectedUser,
    hasQr: !!currentQrDataUrl,
    qrDataUrl: currentQrDataUrl,
    pairingCode: currentPairingCode,
    pairingPhone: currentPairingPhone,
  });
});

app.get('/qr', (req, res) => {
  if (!currentQrDataUrl) {
    if (isConnected) {
      return res.status(200).send('<h3>WhatsApp is already connected!</h3>');
    }
    return res.status(404).send('<h3>Generating QR code... Please refresh in a moment.</h3>');
  }
  const img = Buffer.from(currentQrDataUrl.split(',')[1], 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': img.length,
  });
  res.end(img);
});

// Request an 8-character Pairing Code for a given phone number
app.post('/request-pairing-code', async (req, res) => {
  try {
    const rawPhone = req.body?.phone;
    if (!rawPhone) {
      return res.status(400).json({ ok: false, error: 'Phone number is required' });
    }

    const clean = sanitizePhone(rawPhone);
    if (!clean || clean.length < 10) {
      return res.status(400).json({ ok: false, error: 'Invalid phone number format' });
    }

    if (isConnected) {
      return res.json({ ok: false, error: 'WhatsApp is already connected' });
    }

    if (!sock) {
      return res.status(503).json({ ok: false, error: 'WhatsApp socket initializing, please try again in 2 seconds' });
    }

    let rawCode;
    try {
      logger.info({ clean }, 'Requesting WhatsApp 8-digit pairing code from Baileys...');
      rawCode = await sock.requestPairingCode(clean);
    } catch (pairErr) {
      logger.warn({ err: pairErr.message }, 'Pairing code request failed, performing automatic socket refresh...');
      try {
        if (sock) sock.end(undefined);
      } catch (_) {}
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }
      await connectToWhatsApp();
      await new Promise((r) => setTimeout(r, 2500));
      rawCode = await sock.requestPairingCode(clean);
    }

    // Format code e.g. 1234-5678 for easy readability
    const formattedCode =
      rawCode && rawCode.length === 8 ? `${rawCode.slice(0, 4)}-${rawCode.slice(4)}` : rawCode;

    currentPairingCode = formattedCode;
    currentPairingPhone = clean;

    logger.info({ phone: clean, pairingCode: formattedCode }, 'Pairing code generated successfully');

    return res.json({
      ok: true,
      code: formattedCode,
      rawCode,
      phone: clean,
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to generate pairing code');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Reset session and clear credentials
app.post('/reset-session', async (req, res) => {
  try {
    logger.info('Resetting WhatsApp session and clearing credentials directory...');
    if (sock) {
      try {
        sock.end(undefined);
      } catch (_) {}
      sock = null;
    }

    isConnected = false;
    connectedUser = null;
    currentQrRaw = null;
    currentQrDataUrl = null;
    currentPairingCode = null;
    currentPairingPhone = null;

    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    setTimeout(() => {
      connectToWhatsApp().catch((err) => {
        logger.error({ err: err.message }, 'Error reconnecting after reset');
      });
    }, 1000);

    res.json({ ok: true, message: 'Session reset and auth credentials cleared' });
  } catch (err) {
    logger.error({ err: err.message }, 'Error in reset-session');
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Outbound message sending: Text
app.post('/send-text', async (req, res) => {
  if (!isConnected || !sock) {
    return res.status(503).json({ ok: false, error: 'WhatsApp bridge is not connected' });
  }

  const { phone, text } = req.body;
  const jid = normalizeJid(phone);
  if (!jid || !text) {
    return res.status(400).json({ ok: false, error: 'Missing phone or text parameter' });
  }

  try {
    const result = await sock.sendMessage(jid, { text });
    logger.info({ jid, textSnippet: text.slice(0, 50) }, 'Sent text message');
    res.json({ ok: true, messageId: result.key.id });
  } catch (err) {
    logger.error({ err: err.message, jid }, 'Failed to send text message');
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Outbound message sending: Document (PDF)
app.post('/send-document', async (req, res) => {
  if (!isConnected || !sock) {
    return res.status(503).json({ ok: false, error: 'WhatsApp bridge is not connected' });
  }

  const { phone, filename, caption, pdfBase64 } = req.body;
  const jid = normalizeJid(phone);

  if (!jid || !pdfBase64) {
    return res.status(400).json({ ok: false, error: 'Missing phone or pdfBase64 parameter' });
  }

  try {
    const buffer = Buffer.from(pdfBase64, 'base64');
    const result = await sock.sendMessage(jid, {
      document: buffer,
      mimetype: 'application/pdf',
      fileName: filename || 'NeuroScope_Report.pdf',
      caption: caption || 'Here is your NeuroScope 3D Medical Diagnostic Report.',
    });

    logger.info({ jid, filename, sizeBytes: buffer.length }, 'Sent PDF document');
    res.json({ ok: true, messageId: result.key.id });
  } catch (err) {
    logger.error({ err: err.message, jid }, 'Failed to send document');
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Process-level crash prevention to keep service running 24/7 at all times
process.on('uncaughtException', (err) => {
  logger.error({ err: err?.message || err }, 'Process caught uncaught exception (kept alive)');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason: reason?.message || reason }, 'Process caught unhandled rejection (kept alive)');
});

// Periodic keepalive watchdog: re-verifies socket every 30s
setInterval(() => {
  if (!sock && !isConnected) {
    logger.info('Watchdog: Re-verifying WhatsApp socket connection...');
    connectToWhatsApp().catch(() => {});
  }
}, 30000);

// Start Express server and connect Baileys
app.listen(PORT, '127.0.0.1', () => {
  logger.info(`NeuroScope WhatsApp Bridge running on http://127.0.0.1:${PORT}`);
  connectToWhatsApp().catch((err) => {
    logger.error({ err: err.message }, 'Fatal error starting Baileys');
  });
});

import { Capacitor } from '@capacitor/core';
import { DEVICES, ALARMS, S7 } from '../config';

// ─────────────────────────────────────────────────────────────────────────────
// Layout DbCasa (DB6) — lettura GET/PUT diretta (senza DB ausiliaria)
//
//   UtCasa stride = 542 B  (String[254]×2 + Bool/Real/Int/DTL/UDInt×2)
//     Utenze[i].Attiva  @ i*542 + 512   Bool, bit 0
//     Utenze[i].Temp    @ i*542 + 514   Real BE 4B
//     Utenze[i].Req     @ i*542 + 518   Int  BE 2B  (write only)
//
//   UtAllarme stride = 528 B  (String[254]×2 + Bool×6 + DTL + UInt)
//     Allarmi[j] base   = 8672 + j*528
//     Allarmi[j].Attivo @ base + 512  bit 1  (bit 0 = Abilitato)
//
// PREREQUISITO: DbCasa → TIA → "Accesso ottimizzato al blocco" = OFF
// ─────────────────────────────────────────────────────────────────────────────

const UT_STRIDE     = 542;
const UT_ATTIVA_REL = 512;   // bit 0
const UT_TEMP_REL   = 514;   // float32 BE
const UT_REQ_REL    = 518;   // Int16 BE (write)

const AL_BASE       = 8672;  // byte assoluto Allarmi[0]
const AL_STRIDE     = 528;
const AL_ATTIVO_REL = 512;   // bit 1 del byte (bit 0 = Abilitato)

// Batch read 1 — utenze: da Attiva[0] (byte 512) a Temp[15]+3 (byte 8647)
const UT_READ_START = UT_ATTIVA_REL;           // 512
const UT_READ_SIZE  = 15 * UT_STRIDE + 6;      // 8136

// Batch read 2 — allarmi: da Allarmi[0].byte512 a Allarmi[7].byte512
const NUM_AL_DEFINED = 8;
const AL_READ_START  = AL_BASE + AL_ATTIVO_REL;                     // 9184
const AL_READ_SIZE   = (NUM_AL_DEFINED - 1) * AL_STRIDE + 1;       // 3697

let S7Plugin = null;

export function s7Init() {
  if (Capacitor.isNativePlatform()) {
    try {
      S7Plugin = Capacitor.Plugins.S7Plugin;
    } catch (e) {
      console.warn('Plugin S7 non disponibile:', e);
    }
  }
}

export async function s7Connect() {
  if (!S7Plugin) throw new Error('S7 non disponibile');
  return await S7Plugin.connect({
    host: S7.host,
    rack: S7.rack,
    slot: S7.slot,
  });
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function s7ReadAll() {
  if (!S7Plugin) throw new Error('S7 non disponibile');

  // ── lettura utenze (Attiva + Temp) ──────────────────────────────────────
  const utRes  = await S7Plugin.readBlock({ db: S7.db, start: UT_READ_START, size: UT_READ_SIZE });
  const utBytes = b64ToBytes(utRes.data);
  const utView  = new DataView(utBytes.buffer, utBytes.byteOffset, utBytes.byteLength);

  // ── lettura allarmi (Attivo) ─────────────────────────────────────────────
  const alRes   = await S7Plugin.readBlock({ db: S7.db, start: AL_READ_START, size: AL_READ_SIZE });
  const alBytes = b64ToBytes(alRes.data);

  // ── parse utenze ─────────────────────────────────────────────────────────
  const devices = [];
  for (let i = 0; i < DEVICES.length; i++) {
    const def = DEVICES[i];
    if (!def) continue;
    // indice relativo al buffer (che parte da UT_READ_START = 512)
    const off = i * UT_STRIDE;
    const acceso = (utBytes[off] & 1) === 1;                           // bit 0
    const temp   = def.hasTemp
      ? utView.getFloat32(off + (UT_TEMP_REL - UT_ATTIVA_REL), false) // off+2
      : null;
    devices.push({ idx: i, ...def, acceso, temp });
  }

  // ── parse allarmi ─────────────────────────────────────────────────────────
  const alarms = [];
  for (let i = 0; i < ALARMS.length; i++) {
    const def = ALARMS[i];
    if (!def) continue;
    // indice relativo al buffer (che parte da AL_READ_START = 9184)
    const off    = i * AL_STRIDE;
    const attivo = ((alBytes[off] >> 1) & 1) === 1;  // bit 1
    alarms.push({
      idx: i, ...def,
      attivo,
      nuovo: false,
      code: attivo ? '1' : '0',
    });
  }

  return { devices, alarms };
}

export async function s7SendCommand(idx, on) {
  if (!S7Plugin) throw new Error('S7 non disponibile');
  await S7Plugin.writeInt({
    db: S7.db,
    offset: idx * UT_STRIDE + UT_REQ_REL,  // idx*542 + 518
    value: on ? 1 : 2,
  });
}

export async function s7Disconnect() {
  if (S7Plugin) {
    try { await S7Plugin.disconnect(); } catch (e) {}
  }
}

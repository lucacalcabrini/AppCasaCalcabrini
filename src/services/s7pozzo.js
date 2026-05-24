import { Capacitor } from '@capacitor/core';
import { PLC_POZZO_IP } from '../config';

// ─────────────────────────────────────────────────────────────────────────────
// PLC Pozzo — 192.168.178.252
// S7 GET/PUT via S7Plugin.connectorPozzo (metodi *Pozzo del plugin)
// PREREQUISITO: "Accesso ottimizzato al blocco" = OFF su DB2 e DB11
// ─────────────────────────────────────────────────────────────────────────────

// ── DB2 — GestionePompa (layout verificato da TIA Portal / pozzo.pdf) ────────
//   0-3:  SetupEnbTime.Start  (Time_Of_Day)
//   4-7:  SetupEnbTime.Stop   (Time_Of_Day)
//   8.0:  DisableDaHMI        (Bool) — 1=pompa disabilitata da HMI
//   8.1:  ResetEV             (Bool) — impulso reset elettrovalvola (write)
//   9:    padding
//  10.0:  Enb.orario          (Bool) — 1=abilitazione oraria attiva
//  10.1:  Enb.assorbimento    (Bool) — 1=abilitazione per assorbimento attiva
//  11:    padding
//  12.0:  Bypass.Orario       (Bool)
//  12.1:  Bypass.Assorbimento (Bool)
//  13:    padding
//  14-15: STS_Pompa           (Int16 BE) — 0=off, 1=running
//  16.0:  AllarmeTempoAvvio   (Bool)
//  17:    padding
//  18-21: SetupTempoAllarme   (Time = DInt, default T#2H)
//
// DB11 — ContEnergia (stessa struttura del PLC principale, DB11 su 192.168.178.252)
//   8:  Actual_Kw    (Real Float32 BE)
//  12:  Kwh_Giorno   (Real Float32 BE)
//  20:  Kwh_Ora      (Real Float32 BE)

const DB_POMPA   = 2;
const DB_ENERGIA = 11;

let plugin = null;

export function s7PozzoInit() {
  if (Capacitor.isNativePlatform()) {
    try { plugin = Capacitor.Plugins.S7Plugin; }
    catch (e) { console.warn('[S7Pozzo] S7Plugin non disponibile:', e); }
  }
}

export async function s7PozzoConnect() {
  if (!plugin) throw new Error('S7Plugin non disponibile');
  await plugin.connectPozzo({ host: PLC_POZZO_IP, rack: 0, slot: 1 });
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bit(byte, n) { return ((byte >> n) & 1) === 1; }

// ── Lettura stato pompa ───────────────────────────────────────────────────────

export async function s7ReadPozzo() {
  if (!plugin) throw new Error('S7Pozzo non disponibile');
  const r = await plugin.readBlockPozzo({ db: DB_POMPA, start: 0, size: 22 });
  const buf = b64ToBytes(r.data);
  const dv  = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  const stsPompa = dv.getInt16(14, false); // 0=off, 1=running

  return {
    on:               stsPompa > 0,
    stsPompa,
    disableDaHMI:     bit(buf[8],  0),
    resetEV:          bit(buf[8],  1),
    enbOrario:        bit(buf[10], 0),
    enbAssorbimento:  bit(buf[10], 1),
    bypassOrario:     bit(buf[12], 0),
    bypassAssorbimento: bit(buf[12], 1),
    allarmeTempoAvvio: bit(buf[16], 0),
  };
}

// ── Scrittura DisableDaHMI (bit 0 di byte 8) ─────────────────────────────────

export async function s7WritePozzoDisable(disable) {
  if (!plugin) throw new Error('S7Pozzo non disponibile');
  const r = await plugin.readBlockPozzo({ db: DB_POMPA, start: 8, size: 2 });
  const bytes = b64ToBytes(r.data);
  let b = bytes[0];
  if (disable) b |= 0x01; else b &= 0xFE;
  await plugin.writeBytePozzo({ db: DB_POMPA, offset: 8, value: b });
}

// ── Scrittura ResetEV (bit 1 di byte 8) — impulso breve ─────────────────────

export async function s7WritePozzoResetEV() {
  if (!plugin) throw new Error('S7Pozzo non disponibile');
  const r = await plugin.readBlockPozzo({ db: DB_POMPA, start: 8, size: 2 });
  const bytes = b64ToBytes(r.data);
  // SET bit 1
  await plugin.writeBytePozzo({ db: DB_POMPA, offset: 8, value: bytes[0] | 0x02 });
  // CLEAR dopo 500ms (il PLC lo gestisce via DB8 DelayResetEV, ma lo ripuliamo anche lato app)
  setTimeout(async () => {
    try {
      const r2 = await plugin.readBlockPozzo({ db: DB_POMPA, start: 8, size: 2 });
      const b2 = b64ToBytes(r2.data);
      await plugin.writeBytePozzo({ db: DB_POMPA, offset: 8, value: b2[0] & 0xFD });
    } catch (_) {}
  }, 500);
}

// ── Lettura energia POZZO (DB11 — stessa struttura del PLC principale) ────────
// Consumo_KWH: Array[1..7] of Struct { KWH[0..23]: 96B, Data: 2B, Total_KWH: 4B }
// stride 102B, parte da offset 32

const ENERGIA_CONSUMO_START = 32;
const ENERGIA_DAY_STRIDE    = 102;

export async function s7ReadEnergiaPozzo() {
  if (!plugin) throw new Error('S7Pozzo non disponibile');
  // Legge header (32B) + Consumo_KWH 7 giorni (714B) + Indice (2B) = 748B
  const r = await plugin.readBlockPozzo({ db: DB_ENERGIA, start: 0, size: 748 });
  const dv = new DataView(b64ToBytes(r.data).buffer);

  const kw      = dv.getFloat32(8,  false);
  const kwhDay  = dv.getFloat32(12, false);
  const kwhHour = dv.getFloat32(20, false);

  // 7-day history (stessa logica del PLC principale)
  const history = [];
  for (let d = 0; d < 7; d++) {
    const base = ENERGIA_CONSUMO_START + d * ENERGIA_DAY_STRIDE;
    const hours = [];
    for (let h = 0; h < 24; h++) {
      hours.push(dv.getFloat32(base + h * 4, false));
    }
    const dateDays = dv.getUint16(base + 96, false);
    const date = dateDays > 0
      ? new Date(Date.UTC(1990, 0, 1) + dateDays * 86400000).toISOString().slice(0, 10)
      : null;
    const total = dv.getFloat32(base + 98, false);
    history.push({ date, total, hours });
  }

  return { kw, kwhDay, kwhHour, history };
}

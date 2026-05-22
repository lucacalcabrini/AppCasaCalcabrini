import { Capacitor } from '@capacitor/core';

// ─────────────────────────────────────────────────────────────────────────────
// DB1 = DbRiscaldamento — InstanceDB, layout verificato da tia_db_dump.xml
// PREREQUISITO: "Accesso ottimizzato al blocco" = OFF — dim. totale: 10033 byte
// ─────────────────────────────────────────────────────────────────────────────

const DB = 1;

// ── Setup (base 5544) ─────────────────────────────────────────────────────────
// byte 0 (offset 5544): bit0=EstateInverno, bit1=GasEnable, bit2=PelletEnable, bit3=PelletPriority
const SETUP_BASE       = 5544;
const TEMP_COLLETT     = 5592; // Real Float32 BE — temperatura collettore
const PELLET_NON_AVV   = 5596; // byte, bit 0

// ── Zone TempStanze — DatiHMI base addresses ──────────────────────────────────
// Stride: 162 byte. Fonte: DbRiscaldamento InstanceDB (tia_db_dump.xml)
const ZONE_HMI_BASE = {
  camera:       5610,
  cameretta:    5772,
  ingresso:     5934,
  studio:       6096,
  corridoio:    6258,
  cantina:      6420,
  salone:       6582,
  cucina:       6744,
  bagno_blu:    6906,
  bagno_bianco: 7068,
};

// Offset relativi a ZONE_HMI_BASE[id]:
const R_ENABLE   = 0;   // byte, bit 0 — 0=zona disabilitata
const R_MAN_AUTO = 2;   // byte, bit 0 — 0=Manuale, 1=Automatico
const R_SP_MAN   = 4;   // Real Float32 BE — SetpointMAN (da scrivere in modalità manuale)
const R_ACT_SP   = 120; // Real Float32 BE — ActSetpoint (calcolato dal PLC)
const R_OUT      = 126; // byte, bit 0 — 1=zona richiede calore (ON/OFF, non %)

// ── Caldaia Pellet — DatiHMI (DatiCaldaia, 30B) @ 7230 ───────────────────────
const PELLET_STATO   = 7230; // byte: bit0=Avviamento, bit1=On, bit2=Spegnimento, bit3=Allarme, bit5=Disabilitata
const PELLET_STAINT  = 7232; // Int16 BE: 100=avv,120=ON,140=speg,160=allarme,180=att,200=dis
const PELLET_LOCAL   = 7246; // byte: bit0=AutoLocal, bit1=ManOn (write)

// ── Caldaia Gas — DatiHMI @ 7268 ─────────────────────────────────────────────
const GAS_STATO   = 7268; // byte: bit1=On, bit5=Disabilitata
const GAS_STAINT  = 7270; // Int16 BE
const GAS_LOCAL   = 7284; // byte: bit1=ManOn

// ── Pompe — DatiHMI ──────────────────────────────────────────────────────────
const ALTA_STATO  = 7306; // byte: bit1=On
const ALTA_LOCAL  = 7320; // byte: bit1=ManOn
const BASSA_STATO = 7340; // byte: bit1=On
const BASSA_LOCAL = 7354; // byte: bit1=ManOn
const GASP_STATO  = 7374; // byte: bit1=On
const GASP_LOCAL  = 7388; // byte: bit1=ManOn

// ── Batch read unico — tutto da SETUP_BASE a fine impianti ───────────────────
// Range: 5544..7400 = 1856 byte, copre setup + tutte le zone + caldaie + pompe
const BATCH_START = SETUP_BASE; // 5544
const BATCH_SIZE  = 1856;       // copre fino a offset 7400

// ── Helpers ──────────────────────────────────────────────────────────────────

let S7Plugin = null;

export function s7ClimaInit() {
  if (Capacitor.isNativePlatform()) {
    try { S7Plugin = Capacitor.Plugins.S7Plugin; }
    catch (e) { console.warn('[S7Clima] S7Plugin non disponibile:', e); }
  }
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function readF32(dv, offset) { return dv.getFloat32(offset, false); }
function readI16(dv, offset) { return dv.getInt16(offset, false); }
function bit(byte, n) { return ((byte >> n) & 1) === 1; }

// Offset nel buffer del batch (assoluto → relativo a BATCH_START)
const B = (abs) => abs - BATCH_START;

// ── Estate / Inverno ─────────────────────────────────────────────────────────

export async function s7ReadEstateInverno() {
  if (!S7Plugin) throw new Error('S7 non disponibile');
  const r = await S7Plugin.readBlock({ db: DB, start: SETUP_BASE, size: 2 });
  const b = b64ToBytes(r.data);
  return bit(b[0], 0); // 0=Estate, 1=Inverno
}

export async function s7WriteEstateInverno(value) {
  if (!S7Plugin) throw new Error('S7 non disponibile');
  const r = await S7Plugin.readBlock({ db: DB, start: SETUP_BASE, size: 2 });
  const bytes = b64ToBytes(r.data);
  let byte0 = bytes[0];
  if (value) byte0 |= 0x01; else byte0 &= 0xFE;
  await S7Plugin.writeByte({ db: DB, offset: SETUP_BASE, value: byte0 });
}

// ── Lettura tutte le zone (batch) ────────────────────────────────────────────

export async function s7ReadClimaAll(zoneList) {
  if (!S7Plugin) throw new Error('S7 non disponibile');
  const r = await S7Plugin.readBlock({ db: DB, start: BATCH_START, size: BATCH_SIZE });
  const buf = b64ToBytes(r.data);
  const dv  = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  const result = {};
  for (const zona of zoneList) {
    const base = ZONE_HMI_BASE[zona.id];
    if (base === undefined) continue;
    const o = B(base);
    result[zona.id] = {
      enabled:     bit(buf[o + R_ENABLE],   0),
      manuale:     !bit(buf[o + R_MAN_AUTO], 0), // 0=manuale→true, 1=auto→false
      setpoint:    readF32(dv, o + R_ACT_SP),     // setpoint attivo calcolato dal PLC
      setpointMAN: readF32(dv, o + R_SP_MAN),     // setpoint manuale
      riscalda:    bit(buf[o + R_OUT], 0),          // true = richiede calore
    };
  }
  return result;
}

// ── Scrittura setpoint + attivazione manuale ─────────────────────────────────

export async function s7WriteSetpoint(zoneId, value) {
  if (!S7Plugin) throw new Error('S7 non disponibile');
  const base = ZONE_HMI_BASE[zoneId];
  if (base === undefined) throw new Error(`Zona sconosciuta: ${zoneId}`);
  await S7Plugin.writeFloat({ db: DB, offset: base + R_SP_MAN, value });
  await S7Plugin.writeByte({ db: DB, offset: base + R_MAN_AUTO, value: 0 }); // 0=Manuale
}

export async function s7WriteManAuto(zoneId, manuale) {
  if (!S7Plugin) throw new Error('S7 non disponibile');
  const base = ZONE_HMI_BASE[zoneId];
  if (base === undefined) throw new Error(`Zona sconosciuta: ${zoneId}`);
  // 0=Manuale, 1=Automatico
  await S7Plugin.writeByte({ db: DB, offset: base + R_MAN_AUTO, value: manuale ? 0 : 1 });
}

// ── Lettura impianti (batch condiviso con zone) ───────────────────────────────

export async function s7ReadImpianti() {
  if (!S7Plugin) throw new Error('S7 non disponibile');
  const r = await S7Plugin.readBlock({ db: DB, start: BATCH_START, size: BATCH_SIZE });
  const buf = b64ToBytes(r.data);
  const dv  = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const o   = B; // alias

  const pelletByte = buf[o(PELLET_STATO)];
  const gasByte    = buf[o(GAS_STATO)];

  return {
    caldaiaPellet: {
      on:           bit(pelletByte, 1),
      allarme:      bit(pelletByte, 3),
      disabilitata: bit(pelletByte, 5),
      statoInt:     readI16(dv, o(PELLET_STAINT)),
      manOn:        bit(buf[o(PELLET_LOCAL)], 1),
    },
    caldaiaGas: {
      on:           bit(gasByte, 1),
      disabilitata: bit(gasByte, 5),
      statoInt:     readI16(dv, o(GAS_STAINT)),
      manOn:        bit(buf[o(GAS_LOCAL)], 1),
    },
    pompaAlta:  { on: bit(buf[o(ALTA_STATO)],  1), manOn: bit(buf[o(ALTA_LOCAL)],  1) },
    pompaBassa: { on: bit(buf[o(BASSA_STATO)], 1), manOn: bit(buf[o(BASSA_LOCAL)], 1) },
    pompaGas:   { on: bit(buf[o(GASP_STATO)],  1), manOn: bit(buf[o(GASP_LOCAL)],  1) },
    tempCollettore: readF32(dv, o(TEMP_COLLETT)),
    pelletNonAvv:   bit(buf[o(PELLET_NON_AVV)], 0),
  };
}

// ── Scrittura ManOn impianti (read-modify-write del byte Local) ───────────────

async function writeManOn(localOffset, value) {
  if (!S7Plugin) throw new Error('S7 non disponibile');
  const r = await S7Plugin.readBlock({ db: DB, start: localOffset, size: 2 });
  const bytes = b64ToBytes(r.data);
  let b = bytes[0];
  if (value) b |= 0x02; else b &= 0xFD; // bit 1 = ManOn
  await S7Plugin.writeByte({ db: DB, offset: localOffset, value: b });
}

export const s7WritePelletManOn = (v) => writeManOn(PELLET_LOCAL, v);
export const s7WriteGasManOn    = (v) => writeManOn(GAS_LOCAL,    v);
export const s7WriteAltaManOn   = (v) => writeManOn(ALTA_LOCAL,   v);
export const s7WriteBassaManOn  = (v) => writeManOn(BASSA_LOCAL,  v);
export const s7WriteGasPManOn   = (v) => writeManOn(GASP_LOCAL,   v);

// ── Energia (DB11 — ContEnergia) ─────────────────────────────────────────────
// PREREQUISITO: "Accesso ottimizzato al blocco" = OFF su DB11
// Struttura verificata da tia_db_dump.xml — dim. totale: 1462 byte
//   0: OldH (USInt), 1: OldD, 2: OldMin, 4: T_Diff (Real)
//   8: Actual_Kw (Real), 12: Kwh_Giorno (Real), 16: Kwh_GiornoOld (Real)
//  20: Kwh_Ora (Real), 24: ContPulseGiorno (Real), 28: ContPulseOra (Real)
//  32: Consumo_KWH (DatiConteggio) → Consumo[1..7], stride 102B:
//       +0..+95: KWH[0..23] (24×Real), +96: Data (Date 2B), +98: Total_KWH (Real)
// 746: Indice old (Int)
// 748: Consumo (secondo array, FIFO esteso — non usato dall'app)

const DB11 = 11;
const ENERGIA_DAY_STRIDE  = 102;
const ENERGIA_CONSUMO_START = 32;

export async function s7ReadEnergia() {
  if (!S7Plugin) throw new Error('S7 non disponibile');
  // Legge i primi 748 byte (header + Consumo_KWH + Indice old)
  const r = await S7Plugin.readBlock({ db: DB11, start: 0, size: 748 });
  const buf = b64ToBytes(r.data);
  const dv  = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  const kw      = dv.getFloat32(8,  false);
  const kwhDay  = dv.getFloat32(12, false);
  const kwhHour = dv.getFloat32(20, false);

  // 7-day history: Consumo[1..7]
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

  return {
    casa: { kw, kwhDay, kwhHour, history },
    pozzo: null,
  };
}

// Legge solo i valori istantanei (lettura leggera, 32 byte)
export async function s7ReadEnergiaFast() {
  if (!S7Plugin) throw new Error('S7 non disponibile');
  const r = await S7Plugin.readBlock({ db: DB11, start: 0, size: 32 });
  const dv = new DataView(b64ToBytes(r.data).buffer);
  return {
    casa: {
      kw:      dv.getFloat32(8,  false),
      kwhDay:  dv.getFloat32(12, false),
      kwhHour: dv.getFloat32(20, false),
    },
    pozzo: null,
  };
}

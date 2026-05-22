import { Capacitor } from '@capacitor/core';

// ─────────────────────────────────────────────────────────────────────────────
// DB1 = DbRiscaldamento — layout verificato da TIA Portal (vedi PLC_REFERENCE.md)
// PREREQUISITO: "Accesso ottimizzato al blocco" = OFF su DB1
// ─────────────────────────────────────────────────────────────────────────────

const DB = 1; // DbRiscaldamento

// ── Setup (offset 0) ─────────────────────────────────────────────────────────
// byte 0: bit0=EstateInverno (0=Estate, 1=Inverno), bit1=GasEnable, bit2=PelletEnable

// ── Zone TempStanze — basi assolute in DB1 ───────────────────────────────────
const ZONE_BASE = {
  camera:       10,
  cameretta:    218,
  ingresso:     426,
  studio:       634,
  corridoio:    842,
  cantina:     1050,
  salone:      1258,
  cucina:      1466,
  bagno_blu:   1674,
  bagno_bianco:1882,
};

// Offset relativi a zone_base:
const R_MAN_AUTO  = 20;  // byte, bit 0 — 0=Manuale 1=Automatico
const R_SP_MAN    = 22;  // Real Float32 BE — setpoint manuale (da scrivere)
const R_ACT_SP    = 138; // Real Float32 BE — setpoint attivo calcolato dal PLC
const R_OUT       = 144; // byte, bit 0 — 1=richiede calore (ON/OFF, non percentuale)

// ── Impianti — offset assoluti in DB1 ────────────────────────────────────────
const PELLET_STATO   = 2094; // byte: bit1=On, bit3=Allarme, bit5=Disabilitata
const PELLET_STAINT  = 2096; // Int16 BE: 100=avv,120=ON,140=speg,160=allarme,180=att,200=dis
const PELLET_LOCAL   = 2110; // byte: bit0=AutoLocal, bit1=ManOn (write)
const GAS_STATO      = 2178; // byte: bit1=On, bit5=Disabilitata
const GAS_STAINT     = 2180; // Int16 BE
const GAS_LOCAL      = 2194; // byte: bit1=ManOn
const ALTA_STATO     = 2262; // byte: bit1=On
const ALTA_LOCAL     = 2276; // byte: bit1=ManOn
const BASSA_STATO    = 2342; // byte: bit1=On
const BASSA_LOCAL    = 2356; // byte: bit1=ManOn
const GASP_STATO     = 2422; // byte: bit1=On
const GASP_LOCAL     = 2436; // byte: bit1=ManOn
const TEMP_COLLETT   = 2534; // Real Float32 BE — temperatura collettore
const PELLET_NON_AVV = 2538; // byte, bit 0

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

function readF32(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getFloat32(offset, false);
}

function readI16(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt16(offset, false);
}

function bit(byte, n) { return ((byte >> n) & 1) === 1; }

// ── Estate / Inverno ─────────────────────────────────────────────────────────

export async function s7ReadEstateInverno() {
  if (!S7Plugin) throw new Error('S7 non disponibile');
  const r = await S7Plugin.readBlock({ db: DB, start: 0, size: 2 });
  const b = b64ToBytes(r.data);
  return bit(b[0], 0); // 0=Estate, 1=Inverno (raw PLC bit)
}

export async function s7WriteEstateInverno(value) {
  if (!S7Plugin) throw new Error('S7 non disponibile');
  // Read-modify-write per preservare GasEnable/PelletEnable nello stesso byte
  const r = await S7Plugin.readBlock({ db: DB, start: 0, size: 2 });
  const bytes = b64ToBytes(r.data);
  let byte0 = bytes[0];
  if (value) byte0 |= 0x01; else byte0 &= 0xFE;
  await S7Plugin.writeByte({ db: DB, offset: 0, value: byte0 });
}

// ── Lettura tutte le zone (batch) ────────────────────────────────────────────

export async function s7ReadClimaAll(zoneList) {
  if (!S7Plugin) throw new Error('S7 non disponibile');
  // Copre setup(0) + tutte le zone (ultima BagnoBianco: 1882+144+1 = 2027)
  const START = 0, SIZE = 2028;
  const r = await S7Plugin.readBlock({ db: DB, start: START, size: SIZE });
  const buf = b64ToBytes(r.data);

  const result = {};
  for (const zona of zoneList) {
    const base = ZONE_BASE[zona.id];
    if (base === undefined) continue;
    const o = base - START;
    result[zona.id] = {
      manuale:     !bit(buf[o + R_MAN_AUTO], 0), // 0=manuale→true, 1=auto→false
      setpoint:    readF32(buf, o + R_ACT_SP),    // setpoint attivo PLC
      setpointMAN: readF32(buf, o + R_SP_MAN),    // setpoint manuale scritto
      riscalda:    bit(buf[o + R_OUT], 0),         // true = richiede calore
    };
  }
  return result;
}

// ── Scrittura setpoint + attivazione manuale ─────────────────────────────────

export async function s7WriteSetpoint(zoneId, value) {
  if (!S7Plugin) throw new Error('S7 non disponibile');
  const base = ZONE_BASE[zoneId];
  if (base === undefined) throw new Error(`Zona sconosciuta: ${zoneId}`);
  await S7Plugin.writeFloat({ db: DB, offset: base + R_SP_MAN, value });
  await S7Plugin.writeByte({ db: DB, offset: base + R_MAN_AUTO, value: 0 }); // 0=Manuale
}

export async function s7WriteManAuto(zoneId, manuale) {
  if (!S7Plugin) throw new Error('S7 non disponibile');
  const base = ZONE_BASE[zoneId];
  if (base === undefined) throw new Error(`Zona sconosciuta: ${zoneId}`);
  // 0=Manuale, 1=Automatico
  await S7Plugin.writeByte({ db: DB, offset: base + R_MAN_AUTO, value: manuale ? 0 : 1 });
}

// ── Lettura impianti (batch) ──────────────────────────────────────────────────

export async function s7ReadImpianti() {
  if (!S7Plugin) throw new Error('S7 non disponibile');
  const START = 2090, SIZE = 452;
  const r = await S7Plugin.readBlock({ db: DB, start: START, size: SIZE });
  const buf = b64ToBytes(r.data);
  const o = (abs) => abs - START;

  const pelletByte = buf[o(PELLET_STATO)];
  const gasByte    = buf[o(GAS_STATO)];

  return {
    caldaiaPellet: {
      on:          bit(pelletByte, 1),
      allarme:     bit(pelletByte, 3),
      disabilitata:bit(pelletByte, 5),
      statoInt:    readI16(buf, o(PELLET_STAINT)),
      manOn:       bit(buf[o(PELLET_LOCAL)], 1),
    },
    caldaiaGas: {
      on:          bit(gasByte, 1),
      disabilitata:bit(gasByte, 5),
      statoInt:    readI16(buf, o(GAS_STAINT)),
      manOn:       bit(buf[o(GAS_LOCAL)], 1),
    },
    pompaAlta:  { on: bit(buf[o(ALTA_STATO)],  1), manOn: bit(buf[o(ALTA_LOCAL)],  1) },
    pompaBassa: { on: bit(buf[o(BASSA_STATO)], 1), manOn: bit(buf[o(BASSA_LOCAL)], 1) },
    pompaGas:   { on: bit(buf[o(GASP_STATO)],  1), manOn: bit(buf[o(GASP_LOCAL)],  1) },
    tempCollettore: readF32(buf, o(TEMP_COLLETT)),
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

// ── Energia (DB11 — in attesa struttura da TIA Portal) ───────────────────────
// Implementare quando arrivano gli offset di DB11 (ContEnergia)
export async function s7ReadEnergia() {
  return null; // placeholder
}

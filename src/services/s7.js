import { Capacitor } from '@capacitor/core';
import { DEVICES, ALARMS, S7 } from '../config';

// ─────────────────────────────────────────────────────────────────────────────
// DB2 GestioneLuci (InstanceDB, 7119 B) — LOCAL mode via S7 GET/PUT
//
//   IO_UtCasa: 12 entries × 542 B da offset 8
//     IO_UtCasa[i].Temp   @ 8 + i*542 + 514   Real BE 4B
//
//   DatiHMI — comandi e stato luci (byte assoluto nel DB):
//     LuciCucina (3_Pulse) @ 6536
//       PB_Luce   @ 6536  bit 0   (impulso ON)
//       PB_Off    @ 6536  bit 1   (impulso OFF)
//       OutLuce_1 @ 6544  bit 1   (stato uscita)
//     Luci_1P × 11, stride 22 B, da 6560
//       PB_Luce   @ hmiBase    bit 0
//       PB_Off    @ hmiBase    bit 1
//       OutLuce   @ hmiBase+2  bit 1
//
// DB6 DbCasa — allarmi invariati (Allarmi[j].Attivo @ 8672+j*528+512, bit 1)
//
// PREREQUISITO: DB2 e DB6 → TIA → "Accesso ottimizzato" = OFF
// ─────────────────────────────────────────────────────────────────────────────

const DB2 = 2;
const DB6 = 6;  // solo allarmi

// ── DB2 DatiHMI: DEVICES index → { hmiBase, outLuceOff } ────────────────────
//   hmiBase   = byte dove si trovano PB_Luce (bit 0) e PB_Off (bit 1)
//   outLuceOff = byte dove leggere OutLuce (bit 1)
const DATI_HMI = {
  0:  { hmiBase: 6670, outLuceOff: 6672 },  // luce_camera
  1:  { hmiBase: 6536, outLuceOff: 6544 },  // luce_cucina  (3_Pulse → OutLuce_1)
  2:  { hmiBase: 6604, outLuceOff: 6606 },  // luce_sala
  3:  { hmiBase: 6714, outLuceOff: 6716 },  // luce_studio
  4:  { hmiBase: 6692, outLuceOff: 6694 },  // luce_bagno_bianco
  5:  { hmiBase: 6648, outLuceOff: 6650 },  // luce_cameretta
  6:  { hmiBase: 6626, outLuceOff: 6628 },  // luce_scale
  7:  { hmiBase: 6758, outLuceOff: 6760 },  // luce_esterna
  8:  { hmiBase: 6582, outLuceOff: 6584 },  // luce_bagno_blu
  9:  { hmiBase: 6736, outLuceOff: 6738 },  // luce_ingresso
  10: { hmiBase: 6560, outLuceOff: 6562 },  // luce_cantina
  // 11 caldaia_pellet → DB1/TabImpianti, gestita altrove
  // 12 luce_corridoio → solo temperatura, nessun DatiHMI in DB2
  13: { hmiBase: 6780, outLuceOff: 6782 },  // luce_crepuscolare
};

// Batch read DatiHMI: da cucina hmiBase (6536) a creposcolare outLuceOff (6782) incluso
const HMI_READ_START = 6536;
const HMI_READ_SIZE  = 247;  // 6536..6782 → 247 byte

// ── DB2 IO_UtCasa: DEVICES index → IO_UtCasa index (per temperatura) ─────────
// Ordine FBs in GestioneLuci: LuciCucina=0, luceCantina=1, LuceBagnoBlu=2,
//   LuceSala=3, LuceScale=4, LuceCameretta=5, LuceCamera=6, LuceBagnoBianco=7,
//   LuceStudio=8, LuceIngresso=9, LuceEsterna=10, LuceCreposcolare=11
const DEV_TO_IO = {
  1:  0,   // luce_cucina       → IO[0]
  10: 1,   // luce_cantina      → IO[1]
  8:  2,   // luce_bagno_blu    → IO[2]
  2:  3,   // luce_sala         → IO[3]
  6:  4,   // luce_scale        → IO[4]
  5:  5,   // luce_cameretta    → IO[5]
  0:  6,   // luce_camera       → IO[6]
  4:  7,   // luce_bagno_bianco → IO[7]
  3:  8,   // luce_studio       → IO[8]
  9:  9,   // luce_ingresso     → IO[9]
  7:  10,  // luce_esterna      → IO[10]
  13: 11,  // luce_creposcolare → IO[11]
};

const IO_UT_STRIDE   = 542;
const IO_UT_TEMP_REL = 514;
const IO_UT_BASE     = 8;

// IO_UtCasa[i].Temp = IO_UT_BASE + i*IO_UT_STRIDE + IO_UT_TEMP_REL = 522 + i*542
// Batch read: IO[0].Temp=522 … IO[11].Temp+3=6487  → size 5966
const TEMP_READ_START = IO_UT_BASE + IO_UT_TEMP_REL;  // 522
const TEMP_READ_SIZE  = 11 * IO_UT_STRIDE + 4;        // 5966

// ── DB6 allarmi ───────────────────────────────────────────────────────────────
const AL_BASE        = 8672;
const AL_STRIDE      = 528;
const AL_ATTIVO_REL  = 512;   // bit 1 (bit 0 = Abilitato)
const NUM_AL_DEFINED = 8;
const AL_READ_START  = AL_BASE + AL_ATTIVO_REL;                  // 9184
const AL_READ_SIZE   = (NUM_AL_DEFINED - 1) * AL_STRIDE + 1;    // 3697

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

  // ── stati OutLuce da DB2 DatiHMI ──────────────────────────────────────────
  const hmiRes   = await S7Plugin.readBlock({ db: DB2, start: HMI_READ_START, size: HMI_READ_SIZE });
  const hmiBytes = b64ToBytes(hmiRes.data);

  // ── temperature IO_UtCasa da DB2 ──────────────────────────────────────────
  const tmpRes  = await S7Plugin.readBlock({ db: DB2, start: TEMP_READ_START, size: TEMP_READ_SIZE });
  const tmpBytes = b64ToBytes(tmpRes.data);
  const tmpView  = new DataView(tmpBytes.buffer, tmpBytes.byteOffset, tmpBytes.byteLength);

  // ── allarmi da DB6 ────────────────────────────────────────────────────────
  const alRes   = await S7Plugin.readBlock({ db: DB6, start: AL_READ_START, size: AL_READ_SIZE });
  const alBytes = b64ToBytes(alRes.data);

  // ── parse devices ─────────────────────────────────────────────────────────
  const devices = [];
  for (let i = 0; i < DEVICES.length; i++) {
    const def = DEVICES[i];
    if (!def) continue;

    // stato luce: OutLuce (bit 1) nel buffer HMI
    const hmi = DATI_HMI[i];
    const acceso = hmi
      ? ((hmiBytes[hmi.outLuceOff - HMI_READ_START] >> 1) & 1) === 1
      : false;

    // temperatura: IO_UtCasa[ioIdx].Temp nel buffer temperature
    // offset relativo = ioIdx * IO_UT_STRIDE (perché TEMP_READ_START = IO[0].Temp)
    const ioIdx = DEV_TO_IO[i];
    const temp = (def.hasTemp && ioIdx !== undefined)
      ? tmpView.getFloat32(ioIdx * IO_UT_STRIDE, false)  // big-endian
      : null;

    devices.push({ idx: i, ...def, acceso, temp });
  }

  // ── parse allarmi ─────────────────────────────────────────────────────────
  const alarms = [];
  for (let i = 0; i < ALARMS.length; i++) {
    const def = ALARMS[i];
    if (!def) continue;
    const attivo = ((alBytes[i * AL_STRIDE] >> 1) & 1) === 1;  // bit 1
    alarms.push({ idx: i, ...def, attivo, nuovo: false, code: attivo ? '1' : '0' });
  }

  return { devices, alarms };
}

/**
 * Invia comando luce via DB2 DatiHMI.
 *   ON  → imposta PB_Luce (bit 0) a true @ hmiBase
 *   OFF → imposta PB_Off  (bit 1) a true @ hmiBase
 * Il FB PLC rileva il fronte di salita e gestisce il reset.
 */
export async function s7SendCommand(idx, on) {
  if (!S7Plugin) throw new Error('S7 non disponibile');
  const hmi = DATI_HMI[idx];
  if (!hmi) return;  // caldaia_pellet / luce_corridoio → non gestite qui
  await S7Plugin.writeBool({
    db:     DB2,
    offset: hmi.hmiBase,
    bit:    on ? 0 : 1,
    value:  true,
  });
}

export async function s7Disconnect() {
  if (S7Plugin) {
    try { await S7Plugin.disconnect(); } catch (e) {}
  }
}

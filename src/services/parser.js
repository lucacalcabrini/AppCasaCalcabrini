// ============================================================
// parser.js — Parser payload compatto PLC ↔ App
//
// Payload: "1:20.9;0:19.9;...;0;0|0;0;A;0;1;N;0;..."
//           ← 16 utenze →  |  ← 32 allarmi →
// ============================================================

import { DEVICES, ALARMS } from '../config';

/**
 * Parsa il payload compatto dal PLC.
 * @param {string} raw - payload grezzo da casa/stato
 * @returns {{ devices: Array, alarms: Array }}
 */
export function parsePayload(raw) {
  if (!raw || typeof raw !== 'string') return { devices: [], alarms: [] };

  const [devSection, almSection] = raw.split('|');
  const devices = parseDevices(devSection || '');
  const alarms = parseAlarms(almSection || '');
  return { devices, alarms };
}

function parseDevices(section) {
  const campi = section.split(';').filter(s => s.length > 0);
  return campi.map((campo, idx) => {
    const def = DEVICES[idx];
    if (!def) return null;

    const parti = campo.split(':');
    const acceso = parti[0] === '1';
    const temp = parti.length > 1 ? parseFloat(parti[1]) : null;

    return {
      idx,
      ...def,
      acceso,
      temp,
    };
  }).filter(Boolean);
}

function parseAlarms(section) {
  const campi = section.split(';').filter(s => s.length > 0);
  return campi.map((campo, idx) => {
    const def = ALARMS[idx];
    if (!def) return null;

    const code = campo.trim();
    const attivo = code !== '0';
    const nuovo = code === 'A' || code === 'N';
    const alta = code === 'A';

    return {
      idx,
      ...def,
      attivo,
      nuovo,
      alta: alta || def.alta,
      code,
    };
  }).filter(Boolean);
}

/**
 * Costruisce il comando compatto per il PLC.
 * @param {number} idx - indice dispositivo (0-15)
 * @param {boolean} on - true=ON, false=OFF
 * @returns {string} es. "0:1"
 */
export function buildCommand(idx, on) {
  return `${idx}:${on ? '1' : '0'}`;
}

/**
 * Comando per forzare publish completo.
 */
export function buildStatoRequest() {
  return 'STATO';
}

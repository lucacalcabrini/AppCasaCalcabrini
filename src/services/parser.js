import { DEVICES, ALARMS } from '../config';

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

    return { idx, ...def, acceso, temp };
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

    return { idx, ...def, attivo, nuovo, alta: alta || def.alta, code };
  }).filter(Boolean);
}

export function buildCommand(idx, on) {
  return `${idx}:${on ? '1' : '0'}`;
}

export function buildStatoRequest() {
  return 'STATO';
}

import { PLC_IP, PING_TIMEOUT_MS } from '../config';
import { mqttConnect, mqttSendCommand, mqttDisconnect, onMqttData, onMqttStatus } from './mqtt';
import { s7Init, s7Connect, s7ReadAll, s7SendCommand, s7Disconnect } from './s7';
import { s7ClimaInit } from './s7clima';
import { s7PozzoInit, s7PozzoConnect } from './s7pozzo';
import { buildCommand, buildStatoRequest } from './parser';

let mode = null;
let dataCallback = null;
let statusCallback = null;
let pollTimer = null;

// null = auto-detect via ping
// 'local'  = forza S7 GET/PUT (anche se PLC non raggiungibile — mostra errore)
// 'remote' = forza MQTT/AWS IoT
let forcedMode = null;

export function setForcedMode(m) { forcedMode = m; }
export function getForcedMode() { return forcedMode; }

export async function connectionStart() {
  const local = forcedMode === 'local' || (forcedMode !== 'remote' && await isPlcReachable());

  if (local) {
    mode = 'local';
    if (statusCallback) statusCallback('local', 'connecting');
    try {
      s7Init();
      s7ClimaInit();
      s7PozzoInit();
      await s7Connect();
      // Connessione POZZO — non bloccante: se il pozzo non risponde, il resto funziona
      s7PozzoConnect().catch(e => console.warn('[S7Pozzo] connessione fallita (non critica):', e.message));
      if (statusCallback) statusCallback('local', 'connected');
      startLocalPolling();
    } catch (e) {
      if (forcedMode === 'local') {
        // modalità forzata → non fare fallback a MQTT, mostra errore
        console.error('S7 GET/PUT non disponibile:', e);
        if (statusCallback) statusCallback('local', 'error');
      } else {
        console.warn('S7 GET/PUT fallito, passo a remoto:', e);
        mode = 'remote';
        startRemote();
      }
    }
  } else {
    mode = 'remote';
    startRemote();
  }
}

function startRemote() {
  if (statusCallback) statusCallback('remote', 'connecting');
  onMqttData((data) => { if (dataCallback) dataCallback(data); });
  onMqttStatus((s) => {
    if (statusCallback) statusCallback('remote', s);
  });
  mqttConnect();
}

function startLocalPolling() {
  const poll = async () => {
    try {
      const data = await s7ReadAll();
      if (dataCallback) dataCallback(data);
    } catch (e) {
      console.error('S7 lettura fallita:', e);
      if (statusCallback) statusCallback('local', 'error');
    }
  };
  poll();
  pollTimer = setInterval(poll, 2000);
}

export async function sendCommand(idx, on) {
  if (mode === 'local') {
    await s7SendCommand(idx, on);
  } else {
    mqttSendCommand(buildCommand(idx, on));
  }
}

export function requestFullState() {
  if (mode === 'remote') {
    mqttSendCommand(buildStatoRequest());
  }
}

export async function connectionStop() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  if (mode === 'local') await s7Disconnect();
  if (mode === 'remote') mqttDisconnect();
  mode = null;
}

export function onData(cb) { dataCallback = cb; }
export function onStatus(cb) { statusCallback = cb; }
export function getMode() { return mode; }

async function isPlcReachable() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    await fetch(`http://${PLC_IP}/`, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return true;
  } catch (e) {
    return false;
  }
}

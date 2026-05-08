// ============================================================
// connection.js — Gestore dual-path
//
// All'avvio: ping PLC_IP
//   → risponde  → modalità LOCALE (OPC UA, polling 2s)
//   → non risponde → modalità REMOTA (MQTT via AWS IoT Core)
//
// L'app espone un'unica interfaccia: onData, sendCommand
// indipendentemente dal path attivo.
// ============================================================

import { PLC_IP, PING_TIMEOUT_MS } from '../config';
import { mqttConnect, mqttSendCommand, mqttDisconnect, onMqttData, onMqttStatus } from './mqtt';
import { opcuaInit, opcuaConnect, opcuaReadAll, opcuaSendCommand, opcuaDisconnect } from './opcua';
import { buildCommand, buildStatoRequest } from './parser';

let mode = null;           // 'local' | 'remote' | null
let dataCallback = null;
let statusCallback = null;
let pollTimer = null;

/**
 * Rileva la modalità e si connette.
 */
export async function connectionStart() {
  const local = await isPlcReachable();

  if (local) {
    mode = 'local';
    if (statusCallback) statusCallback('local', 'connecting');
    try {
      opcuaInit();
      await opcuaConnect();
      if (statusCallback) statusCallback('local', 'connected');
      startLocalPolling();
    } catch (e) {
      console.warn('OPC UA fallito, passo a remoto:', e);
      mode = 'remote';
      startRemote();
    }
  } else {
    mode = 'remote';
    startRemote();
  }
}

function startRemote() {
  if (statusCallback) statusCallback('remote', 'connecting');
  onMqttData((data) => { if (dataCallback) dataCallback(data); });
  onMqttStatus((s) => { if (statusCallback) statusCallback('remote', s); });
  mqttConnect();
}

function startLocalPolling() {
  // Polling ogni 2 secondi in locale
  const poll = async () => {
    try {
      const data = await opcuaReadAll();
      if (dataCallback) dataCallback(data);
    } catch (e) {
      console.error('OPC UA lettura fallita:', e);
    }
  };
  poll(); // Prima lettura immediata
  pollTimer = setInterval(poll, 2000);
}

/**
 * Invia comando ON/OFF.
 */
export async function sendCommand(idx, on) {
  if (mode === 'local') {
    await opcuaSendCommand(idx, on);
  } else {
    mqttSendCommand(buildCommand(idx, on));
  }
}

/**
 * Forza richiesta stato completo.
 */
export function requestFullState() {
  if (mode === 'remote') {
    mqttSendCommand(buildStatoRequest());
  }
  // In locale il polling aggiorna automaticamente
}

/**
 * Disconnette tutto.
 */
export async function connectionStop() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  if (mode === 'local') await opcuaDisconnect();
  if (mode === 'remote') mqttDisconnect();
  mode = null;
}

/**
 * Registra callback dati. Riceve { devices, alarms }
 */
export function onData(cb) { dataCallback = cb; }

/**
 * Registra callback stato. Riceve (mode, status)
 */
export function onStatus(cb) { statusCallback = cb; }

/**
 * Ritorna la modalità corrente.
 */
export function getMode() { return mode; }

/**
 * Ping al PLC per capire se siamo in rete locale.
 */
async function isPlcReachable() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const resp = await fetch(`http://${PLC_IP}/`, {
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

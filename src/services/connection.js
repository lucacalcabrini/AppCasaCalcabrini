import { PLC_IP, PING_TIMEOUT_MS } from '../config';
import { mqttConnect, mqttSendCommand, mqttDisconnect, onMqttData, onMqttStatus } from './mqtt';
import { opcuaInit, opcuaConnect, opcuaReadAll, opcuaSendCommand, opcuaDisconnect } from './opcua';
import { buildCommand, buildStatoRequest } from './parser';

let mode = null;
let dataCallback = null;
let statusCallback = null;
let pollTimer = null;

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
  onMqttStatus((s) => {
    if (statusCallback) statusCallback('remote', s);
    // Appena connesso chiede al PLC lo stato completo
    if (s === 'connected') mqttSendCommand(buildStatoRequest());
  });
  mqttConnect();
}

function startLocalPolling() {
  const poll = async () => {
    try {
      const data = await opcuaReadAll();
      if (dataCallback) dataCallback(data);
    } catch (e) {
      console.error('OPC UA lettura fallita:', e);
    }
  };
  poll();
  pollTimer = setInterval(poll, 2000);
}

export async function sendCommand(idx, on) {
  if (mode === 'local') {
    await opcuaSendCommand(idx, on);
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
  if (mode === 'local') await opcuaDisconnect();
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

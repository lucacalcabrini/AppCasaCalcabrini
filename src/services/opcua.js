// ============================================================
// opcua.js — Connessione OPC UA locale al S7-1200
//
// In modalità WiFi casa, l'app comunica direttamente col PLC
// via OPC UA (porta 4840).
//
// Su Capacitor/Android, OPC UA richiede un plugin nativo
// (Eclipse Milo via bridge Java→JS). Qui definiamo l'interfaccia
// JS che il plugin nativo espone.
//
// Struttura nodi OPC UA su S7-1200:
//   "DbCasa".Utenze[0].Attiva  → ns=3;s="DbCasa".Utenze[0].Attiva
//   "DbCasa".Utenze[0].Temp    → ns=3;s="DbCasa".Utenze[0].Temp
//   "DbCasa".Utenze[0].Req     → ns=3;s="DbCasa".Utenze[0].Req
//   "DbCasa".Allarmi[0].Attivo → ns=3;s="DbCasa".Allarmi[0].Attivo
// ============================================================

import { Capacitor } from '@capacitor/core';
import { DEVICES, ALARMS, PLC_IP, PLC_OPCUA_PORT } from '../config';

// Il plugin nativo viene registrato da Capacitor
let OpcUaPlugin = null;

/**
 * Inizializza il plugin OPC UA nativo.
 */
export function opcuaInit() {
  if (Capacitor.isNativePlatform()) {
    try {
      OpcUaPlugin = Capacitor.Plugins.OpcUaPlugin;
    } catch (e) {
      console.warn('Plugin OPC UA non disponibile:', e);
    }
  }
}

/**
 * Connette al PLC via OPC UA.
 */
export async function opcuaConnect() {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');
  return await OpcUaPlugin.connect({
    endpoint: `opc.tcp://${PLC_IP}:${PLC_OPCUA_PORT}`,
  });
}

/**
 * Legge tutti gli stati dal PLC e ritorna nel formato standard.
 * @returns {{ devices: Array, alarms: Array }}
 */
export async function opcuaReadAll() {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');

  const devices = [];
  for (let i = 0; i < DEVICES.length; i++) {
    const def = DEVICES[i];
    if (!def) continue;

    const attiva = await OpcUaPlugin.readBool({
      nodeId: `ns=3;s="DbCasa".Utenze[${i}].Attiva`
    });
    const temp = def.hasTemp ? await OpcUaPlugin.readReal({
      nodeId: `ns=3;s="DbCasa".Utenze[${i}].Temp`
    }) : null;

    devices.push({
      idx: i, ...def,
      acceso: attiva.value,
      temp: temp ? temp.value : null,
    });
  }

  const alarms = [];
  for (let i = 0; i < ALARMS.length; i++) {
    const def = ALARMS[i];
    if (!def) continue;

    const attivo = await OpcUaPlugin.readBool({
      nodeId: `ns=3;s="DbCasa".Allarmi[${i}].Attivo`
    });

    alarms.push({
      idx: i, ...def,
      attivo: attivo.value,
      nuovo: false,
      code: attivo.value ? '1' : '0',
    });
  }

  return { devices, alarms };
}

/**
 * Invia comando ON/OFF al PLC via OPC UA.
 * Scrive Req: 1=ON, 2=OFF
 */
export async function opcuaSendCommand(idx, on) {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');
  await OpcUaPlugin.writeInt({
    nodeId: `ns=3;s="DbCasa".Utenze[${idx}].Req`,
    value: on ? 1 : 2,
  });
}

/**
 * Disconnette OPC UA.
 */
export async function opcuaDisconnect() {
  if (OpcUaPlugin) {
    try { await OpcUaPlugin.disconnect(); } catch (e) {}
  }
}

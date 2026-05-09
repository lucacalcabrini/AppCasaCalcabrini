import { Capacitor } from '@capacitor/core';
import { DEVICES, ALARMS, PLC_IP, PLC_OPCUA_PORT } from '../config';

let OpcUaPlugin = null;

export function opcuaInit() {
  if (Capacitor.isNativePlatform()) {
    try {
      OpcUaPlugin = Capacitor.Plugins.OpcUaPlugin;
    } catch (e) {
      console.warn('Plugin OPC UA non disponibile:', e);
    }
  }
}

export async function opcuaConnect() {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');
  return await OpcUaPlugin.connect({
    endpoint: `opc.tcp://${PLC_IP}:${PLC_OPCUA_PORT}`,
  });
}

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

export async function opcuaSendCommand(idx, on) {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');
  await OpcUaPlugin.writeInt({
    nodeId: `ns=3;s="DbCasa".Utenze[${idx}].Req`,
    value: on ? 1 : 2,
  });
}

export async function opcuaDisconnect() {
  if (OpcUaPlugin) {
    try { await OpcUaPlugin.disconnect(); } catch (e) {}
  }
}

import { Capacitor } from '@capacitor/core';
import { DEVICES, ALARMS, PLC_IP, PLC_OPCUA_PORT, ZONE_RISCALDAMENTO, OPC_NODES, getRiscaldamentoNodes } from '../config';

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

// ── Helpers generici ─────────────────────────────────────────────────────────

async function readBool(nodeId) {
  const r = await OpcUaPlugin.readBool({ nodeId });
  return r.value;
}

async function readReal(nodeId) {
  const r = await OpcUaPlugin.readReal({ nodeId });
  return r.value;
}

async function writeBool(nodeId, value) {
  await OpcUaPlugin.writeBool({ nodeId, value });
}

async function writeReal(nodeId, value) {
  await OpcUaPlugin.writeReal({ nodeId, value });
}

// ── Lettura stato base (luci + allarmi) ──────────────────────────────────────

export async function opcuaReadAll() {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');

  const devices = [];
  for (let i = 0; i < DEVICES.length; i++) {
    const def = DEVICES[i];
    if (!def) continue;
    const attiva = await OpcUaPlugin.readBool({ nodeId: `ns=3;s="DbCasa".Utenze[${i}].Attiva` });
    const temp = def.hasTemp
      ? await OpcUaPlugin.readReal({ nodeId: `ns=3;s="DbCasa".Utenze[${i}].Temp` })
      : null;
    devices.push({ idx: i, ...def, acceso: attiva.value, temp: temp ? temp.value : null });
  }

  const alarms = [];
  for (let i = 0; i < ALARMS.length; i++) {
    const def = ALARMS[i];
    if (!def) continue;
    const attivo = await OpcUaPlugin.readBool({ nodeId: `ns=3;s="DbCasa".Allarmi[${i}].Attivo` });
    alarms.push({ idx: i, ...def, attivo: attivo.value, nuovo: false, code: attivo.value ? '1' : '0' });
  }

  return { devices, alarms };
}

export async function opcuaSendCommand(idx, on) {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');
  await OpcUaPlugin.writeInt({ nodeId: `ns=3;s="DbCasa".Utenze[${idx}].Req`, value: on ? 1 : 2 });
}

// ── Clima — lettura zone riscaldamento ───────────────────────────────────────

export async function opcuaReadClimaZona(zone) {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');
  const nodes = getRiscaldamentoNodes(zone);
  try {
    const [tempAttuale, setpoint, valvolaOut, manuale, on, disabilitata] = await Promise.all([
      readReal(nodes.tempAttuale),
      readReal(nodes.setpoint),
      readReal(nodes.valvolaOut),
      readBool(nodes.manuale),
      readBool(nodes.on),
      readBool(nodes.disabilitata),
    ]);
    return { tempAttuale, setpoint, valvolaOut, manuale, on, disabilitata };
  } catch (e) {
    console.warn(`[OPC] Lettura clima ${zone} fallita:`, e.message);
    return null;
  }
}

export async function opcuaReadClimaAll() {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');
  const result = {};
  for (const zona of ZONE_RISCALDAMENTO) {
    result[zona.id] = await opcuaReadClimaZona(zona.zone); // usa .zone (verificato da HMITags)
  }
  return result;
}

export async function opcuaWriteSetpoint(zone, value) {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');
  const nodes = getRiscaldamentoNodes(zone);
  await writeReal(nodes.setpointMan, value);
  await writeBool(nodes.manuale, true); // attiva modalità manuale
}

export async function opcuaSetAutoManuale(zone, manuale) {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');
  const nodes = getRiscaldamentoNodes(zone);
  await writeBool(nodes.manuale, manuale);
}

export async function opcuaReadEstateInverno() {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');
  return await readBool(OPC_NODES.estateInverno);
}

export async function opcuaWriteEstateInverno(estate) {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');
  await writeBool(OPC_NODES.estateInverno, estate);
}

// ── Impianti ─────────────────────────────────────────────────────────────────

export async function opcuaReadImpianti() {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');
  try {
    const [
      caldaiaPellet_On, caldaiaPellet_Man, caldaiaPellet_Temp, caldaiaPellet_Out,
      caldaiaGas_On, caldaiaGas_Man,
      pompaAlta_On, pompaAlta_Man,
      pompaBassa_On, pompaBassa_Man,
      pompaGas_On, pompaGas_Man,
      pompaPozzo_STS, pompaPozzo_Scatto, pompaPozzo_Disable, pompaPozzo_EnbOra, pompaPozzo_Bypass,
    ] = await Promise.all([
      readBool(OPC_NODES.caldaiaPellet_On),
      readBool(OPC_NODES.caldaiaPellet_Man),
      readReal(OPC_NODES.caldaiaPellet_Temp).catch(() => null),
      readReal(OPC_NODES.caldaiaPellet_Out).catch(() => null),
      readBool(OPC_NODES.caldaiaGas_On),
      readBool(OPC_NODES.caldaiaGas_Man),
      readBool(OPC_NODES.pompaAlta_On),
      readBool(OPC_NODES.pompaAlta_Man),
      readBool(OPC_NODES.pompaBassa_On),
      readBool(OPC_NODES.pompaBassa_Man),
      readBool(OPC_NODES.pompaGas_On),
      readBool(OPC_NODES.pompaGas_Man),
      readReal(OPC_NODES.pompaPozzo_STS).catch(() => 0), // Int su PLC, leggo come Real
      readBool(OPC_NODES.pompaPozzo_Scatto),
      readBool(OPC_NODES.pompaPozzo_Disable),
      readBool(OPC_NODES.pompaPozzo_EnbOra),
      readBool(OPC_NODES.pompaPozzo_Bypass),
    ]);
    return {
      caldaiaPellet: { on: caldaiaPellet_On, manuale: caldaiaPellet_Man, temp: caldaiaPellet_Temp, out: caldaiaPellet_Out },
      caldaiaGas:    { on: caldaiaGas_On, manuale: caldaiaGas_Man },
      pompaAlta:     { on: pompaAlta_On, manuale: pompaAlta_Man },
      pompaBassa:    { on: pompaBassa_On, manuale: pompaBassa_Man },
      pompaGas:      { on: pompaGas_On, manuale: pompaGas_Man },
      pompaPozzo:    { inMarcia: pompaPozzo_STS > 0, scattoTermico: pompaPozzo_Scatto, disabilitata: pompaPozzo_Disable, enbOrario: pompaPozzo_EnbOra, bypass: pompaPozzo_Bypass },
    };
  } catch (e) {
    console.warn('[OPC] Lettura impianti fallita:', e.message);
    return null;
  }
}

export async function opcuaWriteImpiantoManOn(nodeManOn, value) {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');
  await writeBool(nodeManOn, value);
}

export async function opcuaResetEV() {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');
  await writeBool(OPC_NODES.pompaPozzo_Reset, true);
  setTimeout(() => writeBool(OPC_NODES.pompaPozzo_Reset, false), 500);
}

export async function opcuaSetPompaPozzo_Disable(value) {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');
  await writeBool(OPC_NODES.pompaPozzo_Disable, value);
}

export async function opcuaSetPompaPozzo_Bypass(value) {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');
  await writeBool(OPC_NODES.pompaPozzo_Bypass, value);
}

// ── Energia ──────────────────────────────────────────────────────────────────

export async function opcuaReadEnergia() {
  if (!OpcUaPlugin) throw new Error('OPC UA non disponibile');
  try {
    const [
      casaKw, casaKwhDay, casaKwhHour, casaMedia,
      pozzoKw, pozzoKwhDay,
    ] = await Promise.all([
      readReal(OPC_NODES.energiaCasa_Kw),
      readReal(OPC_NODES.energiaCasa_KwhDay),
      readReal(OPC_NODES.energiaCasa_KwhHour),
      readReal(OPC_NODES.energiaMedia),
      readReal(OPC_NODES.energiaPozzo_Kw).catch(() => null),
      readReal(OPC_NODES.energiaPozzo_KwhDay).catch(() => null),
    ]);
    return {
      casa:  { kw: casaKw, kwhDay: casaKwhDay, kwhHour: casaKwhHour, media: casaMedia },
      pozzo: { kw: pozzoKw, kwhDay: pozzoKwhDay },
    };
  } catch (e) {
    console.warn('[OPC] Lettura energia fallita:', e.message);
    return null;
  }
}

// ── Disconnect ───────────────────────────────────────────────────────────────

export async function opcuaDisconnect() {
  if (OpcUaPlugin) {
    try { await OpcUaPlugin.disconnect(); } catch (e) {}
  }
}

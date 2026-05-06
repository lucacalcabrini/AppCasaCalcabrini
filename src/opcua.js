// Wrapper OPC UA per Capacitor (Android nativo) + fallback mock per browser
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const PLC_ENDPOINT = 'opc.tcp://192.168.178.250:4840';

// Node IDs OPC UA per S7-1200 (namespace 3, sintassi Siemens)
export const NODE = {
  // ── LUCI ──────────────────────────────────────────────────────────────────
  luci: {
    LuceBagnoBlu:     { status: '"GestioneLuci"."LuceBagnoBlu"."DatiHMI"."Status"."OutLuce"',    on: '"GestioneLuci"."LuceBagnoBlu"."DatiHMI"."Manuale"."PB_Luce"',    off: '"GestioneLuci"."LuceBagnoBlu"."DatiHMI"."Manuale"."PB_Off"' },
    LuceBagnoBianco:  { status: '"GestioneLuci"."LuceBagnoBianco"."DatiHMI"."Status"."OutLuce"', on: '"GestioneLuci"."LuceBagnoBianco"."DatiHMI"."Manuale"."PB_Luce"', off: '"GestioneLuci"."LuceBagnoBianco"."DatiHMI"."Manuale"."PB_Off"' },
    LuceCamera:       { status: '"GestioneLuci"."LuceCamera"."DatiHMI"."Status"."OutLuce"',      on: '"GestioneLuci"."LuceCamera"."DatiHMI"."Manuale"."PB_Luce"',      off: '"GestioneLuci"."LuceCamera"."DatiHMI"."Manuale"."PB_Off"' },
    LuceCameretta:    { status: '"GestioneLuci"."LuceCameretta"."DatiHMI"."Status"."OutLuce"',   on: '"GestioneLuci"."LuceCameretta"."DatiHMI"."Manuale"."PB_Luce"',   off: '"GestioneLuci"."LuceCameretta"."DatiHMI"."Manuale"."PB_Off"' },
    luceCantina:      { status: '"GestioneLuci"."luceCantina"."DatiHMI"."Status"."OutLuce"',     on: '"GestioneLuci"."luceCantina"."DatiHMI"."Manuale"."PB_Luce"',     off: '"GestioneLuci"."luceCantina"."DatiHMI"."Manuale"."PB_Off"' },
    LuciCucina:       { status: '"GestioneLuci"."LuciCucina"."DatiHMI"."Status"."OutLuce_1"',   on: '"GestioneLuci"."LuciCucina"."DatiHMI"."Manuale"."PB_Luce"',     off: '"GestioneLuci"."LuciCucina"."DatiHMI"."Manuale"."PB_Off"' },
    LuceEsterna:      { status: '"GestioneLuci"."LuceEsterna"."DatiHMI"."Status"."OutLuce"',     on: '"GestioneLuci"."LuceEsterna"."DatiHMI"."Manuale"."PB_Luce"',     off: '"GestioneLuci"."LuceEsterna"."DatiHMI"."Manuale"."PB_Off"' },
    LuceCrepuscolare: { status: '"GestioneLuci"."LuceCrepuscolare"."DatiHMI"."Status"."OutLuce"',on: '"GestioneLuci"."LuceCrepuscolare"."DatiHMI"."Manuale"."PB_Luce"',off: '"GestioneLuci"."LuceCrepuscolare"."DatiHMI"."Manuale"."PB_Off"' },
    LuceIngresso:     { status: '"GestioneLuci"."LuceIngresso"."DatiHMI"."Status"."OutLuce"',   on: '"GestioneLuci"."LuceIngresso"."DatiHMI"."Manuale"."PB_Luce"',   off: '"GestioneLuci"."LuceIngresso"."DatiHMI"."Manuale"."PB_Off"' },
    LuceSala:         { status: '"GestioneLuci"."LuceSala"."DatiHMI"."Status"."OutLuce"',        on: '"GestioneLuci"."LuceSala"."DatiHMI"."Manuale"."PB_Luce"',        off: '"GestioneLuci"."LuceSala"."DatiHMI"."Manuale"."PB_Off"' },
    LuceScale:        { status: '"GestioneLuci"."LuceScale"."DatiHMI"."Status"."OutLuce"',       on: '"GestioneLuci"."LuceScale"."DatiHMI"."Manuale"."PB_Luce"',       off: '"GestioneLuci"."LuceScale"."DatiHMI"."Manuale"."PB_Off"' },
    LuceStudio:       { status: '"GestioneLuci"."LuceStudio"."DatiHMI"."Status"."OutLuce"',      on: '"GestioneLuci"."LuceStudio"."DatiHMI"."Manuale"."PB_Luce"',      off: '"GestioneLuci"."LuceStudio"."DatiHMI"."Manuale"."PB_Off"' },
  },
  // ── RISCALDAMENTO ──────────────────────────────────────────────────────────
  risc: {
    EstateInverno: '"DbRiscaldamento"."Setup"."EstateInverno"',
    ExtEnable:     '"DbRiscaldamento"."Setup"."ExtSetpointEnable"',
    ExtGradi:      '"DbRiscaldamento"."Setup"."ExtSetpointGradi"',
  },
  zonaNodes: (nome) => ({
    temp:    `"DbRiscaldamento"."${nome}"."DatiHMI"."Status"."ActTemp"`,
    setpAtt: `"DbRiscaldamento"."${nome}"."DatiHMI"."Status"."ActSetpoint"`,
    out:     `"DbRiscaldamento"."${nome}"."DatiHMI"."Status"."Out"`,
    enable:  `"DbRiscaldamento"."${nome}"."DatiHMI"."Enable"`,
    manAuto: `"DbRiscaldamento"."${nome}"."DatiHMI"."Manuale"."ManAuto"`,
    setMAN:  `"DbRiscaldamento"."${nome}"."DatiHMI"."Manuale"."SetpointMAN"`,
    sp: (h)=> `"DbRiscaldamento"."${nome}"."DatiHMI"."Setup"."Setpoint[${h}]"`,
  }),
};

// ── Client OPC UA ─────────────────────────────────────────────────────────────
class OpcUaClient {
  constructor() { this.connected = false; this.plugin = null; }

  async init() {
    if (!isNative) return false;
    const { OpcUa } = await import('@capacitor/core').then(
      () => ({ OpcUa: Capacitor.Plugins.OpcUa })
    );
    this.plugin = OpcUa;
    return !!this.plugin;
  }

  async connect() {
    if (!this.plugin) return false;
    try {
      await this.plugin.connect({ endpoint: PLC_ENDPOINT });
      this.connected = true;
      return true;
    } catch(e) { console.warn('OPC UA connect:', e); return false; }
  }

  async disconnect() {
    if (!this.plugin || !this.connected) return;
    await this.plugin.disconnect().catch(()=>{});
    this.connected = false;
  }

  async readBool(node) {
    if (!this.connected) return null;
    try { const r = await this.plugin.readBool({node}); return r.value; }
    catch { return null; }
  }

  async readReal(node) {
    if (!this.connected) return null;
    try { const r = await this.plugin.readReal({node}); return r.value; }
    catch { return null; }
  }

  async writeBool(node, value) {
    if (!this.connected) return false;
    try { const r = await this.plugin.writeBool({node, value}); return r.ok; }
    catch { return false; }
  }

  async writeReal(node, value) {
    if (!this.connected) return false;
    try { const r = await this.plugin.writeReal({node, value}); return r.ok; }
    catch { return false; }
  }

  async pulse(node) {
    await this.writeBool(node, true);
    await new Promise(r => setTimeout(r, 150));
    await this.writeBool(node, false);
  }
}

export const opcua = new OpcUaClient();

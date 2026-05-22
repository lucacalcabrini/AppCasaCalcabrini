import React, { useState, useEffect, useCallback } from 'react';
import { OPC_NODES } from '../config';
import {
  opcuaReadImpianti,
  opcuaWriteImpiantoManOn,
  opcuaResetEV,
  opcuaSetPompaPozzo_Disable,
  opcuaSetPompaPozzo_Bypass,
} from '../services/opcua';

const POLL_INTERVAL = 4000;

/* ── Card impianto generica ─────────────────────────────────────────────── */
function ImpiantoCard({ icona, nome, on, manuale, temp, out, onManOn, onManOff, children }) {
  return (
    <div className={`impianto-card ${on ? 'on' : ''}`}>
      <div className="impianto-header">
        <div className="impianto-title">
          <span className="impianto-icona">{icona}</span>
          <span className="impianto-nome">{nome}</span>
        </div>
        <div className={`impianto-badge ${on ? 'badge-on' : 'badge-off'}`}>
          {on ? '● ACCESO' : '○ SPENTO'}
        </div>
      </div>

      {temp !== undefined && temp !== null && (
        <div className="impianto-temp-row">
          <span className="impianto-temp-label">Temperatura uscita</span>
          <span className="impianto-temp-val">{temp.toFixed(1)}°C</span>
        </div>
      )}

      {out !== undefined && out !== null && (
        <div className="valvola-row" style={{ marginTop: 8 }}>
          <div className="valvola-bar">
            <div className="valvola-fill" style={{ width: `${Math.min(100, Math.max(0, out))}%` }} />
          </div>
          <span className="valvola-pct">{Math.round(out)}%</span>
        </div>
      )}

      <div className="impianto-controls">
        <div className="segmented" style={{ flex: 1 }}>
          <button className={`seg-btn ${!manuale ? 'active' : ''}`} onClick={onManOff}>AUTO</button>
          <button className={`seg-btn ${manuale ? 'active' : ''}`}  onClick={onManOn}>MAN ON</button>
        </div>
      </div>

      {children}
    </div>
  );
}

/* ── Componente principale ──────────────────────────────────────────────── */
export default function TabImpianti({ connMode }) {
  const isLocal = connMode === 'local';

  const [data, setData]       = useState(null);
  const [error, setError]     = useState(false);
  const [resetFlash, setReset]= useState(false);

  /* ── Polling ──────────────────────────────────────────────────────────── */
  const poll = useCallback(async () => {
    try {
      const d = await opcuaReadImpianti();
      if (d) { setData(d); setError(false); }
      else setError(true);
    } catch (e) {
      console.warn('[Impianti] poll error:', e.message);
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (!isLocal) return;
    poll();
    const t = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [isLocal, poll]);

  /* ── Helpers comando + aggiornamento ottimistico ────────────────────── */
  const setManOn = async (section, nodeManOn, value) => {
    setData(p => p ? { ...p, [section]: { ...p[section], manuale: value } } : p);
    try { await opcuaWriteImpiantoManOn(nodeManOn, value); }
    catch (e) { setData(p => p ? { ...p, [section]: { ...p[section], manuale: !value } } : p); }
  };

  const handleResetEV = async () => {
    setReset(true);
    try { await opcuaResetEV(); } catch (e) {}
    setTimeout(() => setReset(false), 1500);
  };

  const handlePompaDisable = async (value) => {
    setData(p => p ? { ...p, pompaPozzo: { ...p.pompaPozzo, disabilitata: value } } : p);
    try { await opcuaSetPompaPozzo_Disable(value); }
    catch (e) { setData(p => p ? { ...p, pompaPozzo: { ...p.pompaPozzo, disabilitata: !value } } : p); }
  };

  const handlePompaBypass = async (value) => {
    setData(p => p ? { ...p, pompaPozzo: { ...p.pompaPozzo, bypass: value } } : p);
    try { await opcuaSetPompaPozzo_Bypass(value); }
    catch (e) { setData(p => p ? { ...p, pompaPozzo: { ...p.pompaPozzo, bypass: !value } } : p); }
  };

  /* ── Locked state (REMOTE) ──────────────────────────────────────────── */
  if (!isLocal) {
    return (
      <div className="empty-state" style={{ paddingTop: 60 }}>
        <div className="emoji">🔒</div>
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          Solo su WiFi casa
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 260, margin: '0 auto' }}>
          Il controllo impianti richiede connessione diretta al PLC tramite OPC UA.
        </p>
      </div>
    );
  }

  /* ── Loading / Error ────────────────────────────────────────────────── */
  if (!data && !error) {
    return (
      <div className="empty-state">
        <div className="emoji">⚙️</div>
        <p>Lettura impianti in corso...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="empty-state">
        <div className="emoji">⚠️</div>
        <p>Impossibile leggere gli impianti.<br />Verifica la connessione OPC UA.</p>
      </div>
    );
  }

  const { caldaiaPellet, caldaiaGas, pompaAlta, pompaBassa, pompaGas, pompaPozzo } = data;

  return (
    <>
      <div className="section-title">Riscaldamento</div>

      {/* ── Caldaia Pellet ── */}
      <ImpiantoCard
        icona="🔥" nome="Caldaia Pellet"
        on={caldaiaPellet.on}
        manuale={caldaiaPellet.manuale}
        temp={caldaiaPellet.temp}
        out={caldaiaPellet.out}
        onManOn={() => setManOn('caldaiaPellet', OPC_NODES.caldaiaPellet_ManOn, true)}
        onManOff={() => setManOn('caldaiaPellet', OPC_NODES.caldaiaPellet_ManOn, false)}
      />

      {/* ── Caldaia Gas ── */}
      <ImpiantoCard
        icona="🔵" nome="Caldaia Gas"
        on={caldaiaGas.on}
        manuale={caldaiaGas.manuale}
        onManOn={() => setManOn('caldaiaGas', OPC_NODES.caldaiaGas_ManOn, true)}
        onManOff={() => setManOn('caldaiaGas', OPC_NODES.caldaiaGas_ManOn, false)}
      />

      {/* ── Pompa Alta Temp ── */}
      <ImpiantoCard
        icona="🔄" nome="Pompa Circ. Alta Temp"
        on={pompaAlta.on}
        manuale={pompaAlta.manuale}
        onManOn={() => setManOn('pompaAlta', OPC_NODES.pompaAlta_ManOn, true)}
        onManOff={() => setManOn('pompaAlta', OPC_NODES.pompaAlta_ManOn, false)}
      />

      {/* ── Pompa Bassa Temp ── */}
      <ImpiantoCard
        icona="🔄" nome="Pompa Circ. Bassa Temp"
        on={pompaBassa.on}
        manuale={pompaBassa.manuale}
        onManOn={() => setManOn('pompaBassa', OPC_NODES.pompaBassa_ManOn, true)}
        onManOff={() => setManOn('pompaBassa', OPC_NODES.pompaBassa_ManOn, false)}
      />

      {/* ── Pompa Gas ── */}
      <ImpiantoCard
        icona="🔄" nome="Pompa Gas"
        on={pompaGas.on}
        manuale={pompaGas.manuale}
        onManOn={() => setManOn('pompaGas', OPC_NODES.pompaGas_ManOn, true)}
        onManOff={() => setManOn('pompaGas', OPC_NODES.pompaGas_ManOn, false)}
      />

      <div className="section-title" style={{ marginTop: 24 }}>Pompa Pozzo</div>

      {/* ── Pompa Pozzo ── */}
      <div className={`impianto-card ${pompaPozzo.inMarcia ? 'on' : ''}`}>
        <div className="impianto-header">
          <div className="impianto-title">
            <span className="impianto-icona">💧</span>
            <span className="impianto-nome">Pompa Pozzo</span>
          </div>
          <div className={`impianto-badge ${pompaPozzo.inMarcia ? 'badge-on' : 'badge-off'}`}>
            {pompaPozzo.inMarcia ? '● IN MARCIA' : '○ FERMA'}
          </div>
        </div>

        {/* Scatto Termico */}
        <div className="pozzo-status-row">
          <span className="pozzo-status-label">Scatto termico</span>
          <span className={`pozzo-status-val ${pompaPozzo.scattoTermico ? 'val-error' : 'val-ok'}`}>
            {pompaPozzo.scattoTermico ? '⚠️ SCATTATO' : '✓ OK'}
          </span>
        </div>

        {/* Abilitazione oraria */}
        <div className="pozzo-status-row">
          <span className="pozzo-status-label">Abil. oraria</span>
          <span className={`pozzo-status-val ${pompaPozzo.enbOrario ? 'val-ok' : 'val-warn'}`}>
            {pompaPozzo.enbOrario ? '✓ Abilitata' : '○ Fuori orario'}
          </span>
        </div>

        {/* Toggle Disabilita da HMI */}
        <div className="impianto-controls" style={{ marginTop: 12 }}>
          <div className="segmented" style={{ flex: 1 }}>
            <button
              className={`seg-btn ${!pompaPozzo.disabilitata ? 'active' : ''}`}
              onClick={() => pompaPozzo.disabilitata && handlePompaDisable(false)}
            >ABILITATA</button>
            <button
              className={`seg-btn ${pompaPozzo.disabilitata ? 'active danger' : ''}`}
              onClick={() => !pompaPozzo.disabilitata && handlePompaDisable(true)}
            >DISABILITATA</button>
          </div>
        </div>

        {/* Bypass orario */}
        <div className="impianto-controls" style={{ marginTop: 8 }}>
          <span className="pozzo-status-label" style={{ flex: 1 }}>Bypass orario</span>
          <div
            className={`toggle ${pompaPozzo.bypass ? 'on' : ''}`}
            onClick={() => handlePompaBypass(!pompaPozzo.bypass)}
          >
            <div className="toggle-knob" />
          </div>
        </div>

        {/* Reset EV */}
        <button
          className={`btn-reset-ev ${resetFlash ? 'flash' : ''}`}
          onClick={handleResetEV}
        >
          {resetFlash ? '✓ Reset inviato' : '⚡ Reset Elettrovalvola'}
        </button>
      </div>
    </>
  );
}

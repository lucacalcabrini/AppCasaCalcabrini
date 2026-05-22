import React, { useState, useEffect, useCallback } from 'react';
import {
  s7ReadImpianti,
  s7WritePelletManOn,
  s7WriteGasManOn,
  s7WriteAltaManOn,
  s7WriteBassaManOn,
  s7WriteGasPManOn,
} from '../services/s7clima';

const POLL_INTERVAL = 4000;

// Mappa statoInt → stringa leggibile (caldaie)
function statoLabel(v) {
  if (v === 100) return 'Avviamento';
  if (v === 120) return 'Accesa';
  if (v === 140) return 'Spegnimento';
  if (v === 160) return '⚠️ Allarme';
  if (v === 180) return 'In attesa';
  if (v === 200) return 'Disabilitata';
  return v !== undefined ? `Stato ${v}` : '—';
}

/* ── Card impianto generica ─────────────────────────────────────────────── */
function ImpiantoCard({ icona, nome, on, manOn, statoInt, children, onManOn, onManOff }) {
  return (
    <div className={`impianto-card ${on ? 'on' : ''}`}>
      <div className="impianto-header">
        <div className="impianto-title">
          <span className="impianto-icona">{icona}</span>
          <span className="impianto-nome">{nome}</span>
        </div>
        <div className={`impianto-badge ${on ? 'badge-on' : 'badge-off'}`}>
          {on ? '● ACCESA' : '○ SPENTA'}
        </div>
      </div>

      {statoInt !== undefined && (
        <div className="impianto-stato-row">
          <span className="impianto-stato-label">Stato PLC</span>
          <span className="impianto-stato-val">{statoLabel(statoInt)}</span>
        </div>
      )}

      <div className="impianto-controls">
        <div className="segmented" style={{ flex: 1 }}>
          <button className={`seg-btn ${!manOn ? 'active' : ''}`} onClick={onManOff}>AUTO</button>
          <button className={`seg-btn ${manOn ? 'active' : ''}`}  onClick={onManOn}>MAN ON</button>
        </div>
      </div>

      {children}
    </div>
  );
}

/* ── Componente principale ──────────────────────────────────────────────── */
export default function TabImpianti({ connMode }) {
  const isLocal = connMode === 'local';

  const [data, setData]        = useState(null);
  const [error, setError]      = useState(false);
  const [resetFlash, setReset] = useState(false);

  /* ── Polling ──────────────────────────────────────────────────────────── */
  const poll = useCallback(async () => {
    try {
      const d = await s7ReadImpianti();
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

  /* ── Helper aggiornamento ottimistico ManOn ─────────────────────────── */
  const toggleManOn = async (section, writeFn, value) => {
    setData(p => p ? { ...p, [section]: { ...p[section], manOn: value } } : p);
    try { await writeFn(value); }
    catch (e) { setData(p => p ? { ...p, [section]: { ...p[section], manOn: !value } } : p); }
  };

  /* ── Locked state (REMOTE) ──────────────────────────────────────────── */
  if (!isLocal) {
    return (
      <div className="empty-state" style={{ paddingTop: 60 }}>
        <div className="emoji">🔒</div>
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Solo su WiFi casa</p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 260, margin: '0 auto' }}>
          Il controllo impianti richiede connessione diretta al PLC.
        </p>
      </div>
    );
  }

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
        <p>Impossibile leggere gli impianti.<br />Verifica la connessione S7.</p>
      </div>
    );
  }

  const { caldaiaPellet, caldaiaGas, pompaAlta, pompaBassa, pompaGas, tempCollettore, pelletNonAvv } = data;

  return (
    <>
      <div className="section-title">Riscaldamento</div>

      {/* ── Temperatura collettore ── */}
      {tempCollettore !== null && (
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>🌡️ Temperatura collettore</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-orange)' }}>
            {tempCollettore.toFixed(1)}°C
          </span>
        </div>
      )}

      {/* ── Caldaia Pellet ── */}
      <ImpiantoCard
        icona="🔥" nome="Caldaia Pellet"
        on={caldaiaPellet.on}
        manOn={caldaiaPellet.manOn}
        statoInt={caldaiaPellet.statoInt}
        onManOn={() => toggleManOn('caldaiaPellet', s7WritePelletManOn, true)}
        onManOff={() => toggleManOn('caldaiaPellet', s7WritePelletManOn, false)}
      >
        {caldaiaPellet.allarme && (
          <div className="impianto-alert">⚠️ Allarme caldaia pellet</div>
        )}
        {pelletNonAvv && (
          <div className="impianto-alert">⚠️ Pellet non avviato</div>
        )}
      </ImpiantoCard>

      {/* ── Caldaia Gas ── */}
      <ImpiantoCard
        icona="🔵" nome="Caldaia Gas"
        on={caldaiaGas.on}
        manOn={caldaiaGas.manOn}
        statoInt={caldaiaGas.statoInt}
        onManOn={() => toggleManOn('caldaiaGas', s7WriteGasManOn, true)}
        onManOff={() => toggleManOn('caldaiaGas', s7WriteGasManOn, false)}
      />

      <div className="section-title" style={{ marginTop: 24 }}>Pompe circolazione</div>

      {/* ── Pompa Alta Temp ── */}
      <ImpiantoCard
        icona="🔄" nome="Pompa Alta Temp"
        on={pompaAlta.on}
        manOn={pompaAlta.manOn}
        onManOn={() => toggleManOn('pompaAlta', s7WriteAltaManOn, true)}
        onManOff={() => toggleManOn('pompaAlta', s7WriteAltaManOn, false)}
      />

      {/* ── Pompa Bassa Temp ── */}
      <ImpiantoCard
        icona="🔄" nome="Pompa Bassa Temp"
        on={pompaBassa.on}
        manOn={pompaBassa.manOn}
        onManOn={() => toggleManOn('pompaBassa', s7WriteBassaManOn, true)}
        onManOff={() => toggleManOn('pompaBassa', s7WriteBassaManOn, false)}
      />

      {/* ── Pompa Gas ── */}
      <ImpiantoCard
        icona="🔄" nome="Pompa Gas"
        on={pompaGas.on}
        manOn={pompaGas.manOn}
        onManOn={() => toggleManOn('pompaGas', s7WriteGasPManOn, true)}
        onManOff={() => toggleManOn('pompaGas', s7WriteGasPManOn, false)}
      />

      <div className="section-title" style={{ marginTop: 24 }}>Pompa Pozzo</div>
      <div className="empty-state" style={{ paddingTop: 20, paddingBottom: 20 }}>
        <div className="emoji" style={{ fontSize: 28 }}>💧</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          In attesa della struttura DB del PLC pozzo (192.168.178.252)
        </p>
      </div>
    </>
  );
}

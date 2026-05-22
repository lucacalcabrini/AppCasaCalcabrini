import React, { useState, useEffect, useCallback } from 'react';
import { s7ReadEnergia } from '../services/s7clima';

const POLL_INTERVAL = 10000;

function EnergyCard({ icona, nome, data }) {
  if (!data) return null;
  const { kw, kwhDay, kwhHour, media } = data;

  const barMax = 6; // kW massimi per la barra
  const barPct = kw !== null ? Math.min(100, (kw / barMax) * 100) : 0;
  const barColor = kw > 4 ? 'var(--accent-red)' : kw > 2.5 ? 'var(--accent-amber)' : 'var(--accent-green)';

  return (
    <div className="energia-card">
      <div className="energia-header">
        <span className="energia-icona">{icona}</span>
        <span className="energia-nome">{nome}</span>
      </div>

      {/* Potenza attuale — grande */}
      <div className="energia-kw">
        <span className="energia-kw-val" style={{ color: barColor }}>
          {kw !== null ? kw.toFixed(2) : '—'}
        </span>
        <span className="energia-kw-unit">kW</span>
      </div>

      {/* Barra carico */}
      <div className="valvola-bar" style={{ marginBottom: 16 }}>
        <div
          className="valvola-fill"
          style={{ width: `${barPct}%`, background: barColor, transition: 'width 1s ease, background 0.5s' }}
        />
      </div>

      {/* Griglia dati */}
      <div className="energia-grid">
        <div className="energia-stat">
          <span className="energia-stat-val">{kwhDay !== null ? kwhDay.toFixed(1) : '—'}</span>
          <span className="energia-stat-label">kWh oggi</span>
        </div>
        {kwhHour !== undefined && (
          <div className="energia-stat">
            <span className="energia-stat-val">{kwhHour !== null ? kwhHour.toFixed(2) : '—'}</span>
            <span className="energia-stat-label">kWh ora</span>
          </div>
        )}
        {media !== undefined && (
          <div className="energia-stat">
            <span className="energia-stat-val">{media !== null ? media.toFixed(2) : '—'}</span>
            <span className="energia-stat-label">Media kW</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TabEnergia({ connMode }) {
  const isLocal = connMode === 'local';
  const [energia, setEnergia] = useState(null);
  const [error, setError]     = useState(false);

  const poll = useCallback(async () => {
    try {
      const d = await s7ReadEnergia();
      if (d) { setEnergia(d); setError(false); }
      else setError(true);
    } catch (e) {
      console.warn('[Energia] poll error:', e.message);
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (!isLocal) return;
    poll();
    const t = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [isLocal, poll]);

  if (!isLocal) {
    return (
      <div className="empty-state" style={{ paddingTop: 60 }}>
        <div className="emoji">🔒</div>
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Solo su WiFi casa</p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 260, margin: '0 auto' }}>
          Il monitoraggio energia richiede connessione diretta al PLC tramite OPC UA.
        </p>
      </div>
    );
  }

  if (!energia && !error) {
    return (
      <div className="empty-state">
        <div className="emoji">⚡</div>
        <p>Lettura contatori in corso...</p>
      </div>
    );
  }

  if (error || !energia) {
    return (
      <div className="empty-state">
        <div className="emoji">⚠️</div>
        <p>Impossibile leggere i contatori energia.</p>
      </div>
    );
  }

  const totaleKw = (energia.casa?.kw ?? 0) + (energia.pozzo?.kw ?? 0);

  return (
    <>
      {/* Totale istantaneo */}
      <div className="card" style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
          Potenza totale istantanea
        </div>
        <div style={{ fontSize: 42, fontWeight: 700, color: totaleKw > 5 ? 'var(--accent-red)' : totaleKw > 3 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
          {totaleKw.toFixed(2)}
          <span style={{ fontSize: 18, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 6 }}>kW</span>
        </div>
      </div>

      <div className="section-title">Contatori</div>
      <EnergyCard icona="🏠" nome="Casa" data={energia.casa} />
      {energia.pozzo?.kw !== null && (
        <EnergyCard icona="💧" nome="Pozzo" data={energia.pozzo} />
      )}
    </>
  );
}

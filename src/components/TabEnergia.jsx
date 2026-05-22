import React, { useState, useEffect, useCallback } from 'react';
import { s7ReadEnergia, s7ReadEnergiaFast } from '../services/s7clima';
import { s7ReadEnergiaPozzo } from '../services/s7pozzo';

const POLL_FAST_MS  = 5000;  // aggiorna kW istantaneo ogni 5s
const POLL_FULL_MS  = 60000; // aggiorna history ogni 60s

// ── Etichette ore ─────────────────────────────────────────────────────────────
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i}h`);

// ── Grafico barre 24h ─────────────────────────────────────────────────────────
function HourChart({ hours, date }) {
  if (!hours || hours.length === 0) return null;
  const max = Math.max(...hours, 0.01);
  const label = date
    ? new Date(date + 'T12:00:00Z').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
    : '—';

  return (
    <div className="hour-chart">
      <div className="hour-chart-title">{label}</div>
      <div className="hour-chart-bars">
        {hours.map((v, h) => {
          const pct = (v / max) * 100;
          const color = v > 2 ? 'var(--accent-orange)' : v > 0.5 ? 'var(--accent-green)' : 'var(--text-muted)';
          return (
            <div key={h} className="hour-bar-wrap" title={`${HOUR_LABELS[h]}: ${v.toFixed(3)} kWh`}>
              <div className="hour-bar" style={{ height: `${pct}%`, background: color }} />
            </div>
          );
        })}
      </div>
      <div className="hour-chart-footer">
        <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
      </div>
    </div>
  );
}

// ── Card principale ───────────────────────────────────────────────────────────
function EnergyCard({ icona, nome, data }) {
  if (!data) return null;
  const { kw, kwhDay, kwhHour } = data;

  const barMax = 6;
  const barPct = kw !== null ? Math.min(100, (kw / barMax) * 100) : 0;
  const barColor = kw > 4 ? 'var(--accent-red)' : kw > 2.5 ? 'var(--accent-amber)' : 'var(--accent-green)';

  return (
    <div className="energia-card">
      <div className="energia-header">
        <span className="energia-icona">{icona}</span>
        <span className="energia-nome">{nome}</span>
      </div>

      <div className="energia-kw">
        <span className="energia-kw-val" style={{ color: barColor }}>
          {kw !== null ? kw.toFixed(2) : '—'}
        </span>
        <span className="energia-kw-unit">kW</span>
      </div>

      <div className="valvola-bar" style={{ marginBottom: 16 }}>
        <div
          className="valvola-fill"
          style={{ width: `${barPct}%`, background: barColor, transition: 'width 1s ease, background 0.5s' }}
        />
      </div>

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
      </div>
    </div>
  );
}

// ── Riquadro storico 7 giorni ─────────────────────────────────────────────────
function Storia7Giorni({ history }) {
  const [selected, setSelected] = useState(0);
  if (!history || history.length === 0) return null;

  // Ordina per data decrescente (più recente prima), filtra slot vuoti
  const giorni = [...history]
    .filter(g => g.date !== null && g.total > 0)
    .sort((a, b) => (b.date > a.date ? 1 : -1));

  if (giorni.length === 0) return null;

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        Storico 7 giorni
      </div>

      {/* Selezione giorno */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
        {giorni.map((g, i) => {
          const lbl = new Date(g.date + 'T12:00:00Z').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
          return (
            <button
              key={g.date}
              onClick={() => setSelected(i)}
              style={{
                flex: '0 0 auto',
                padding: '4px 10px',
                borderRadius: 8,
                border: 'none',
                fontSize: 12,
                fontWeight: selected === i ? 700 : 400,
                background: selected === i ? 'var(--accent-green)' : 'var(--surface-2)',
                color: selected === i ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {lbl}
            </button>
          );
        })}
      </div>

      {/* Grafico ore del giorno selezionato */}
      <HourChart hours={giorni[selected]?.hours} date={giorni[selected]?.date} />

      {/* Totale giorno */}
      <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
        Totale: <strong style={{ color: 'var(--text-primary)' }}>{giorni[selected]?.total.toFixed(2)} kWh</strong>
      </div>
    </div>
  );
}

// ── Componente principale ─────────────────────────────────────────────────────
export default function TabEnergia({ connMode }) {
  const isLocal = connMode === 'local';
  const [energia, setEnergia]   = useState(null);
  const [error, setError]       = useState(false);

  // Lettura completa (con history) — ogni minuto
  const pollFull = useCallback(async () => {
    try {
      const [d, pz] = await Promise.allSettled([s7ReadEnergia(), s7ReadEnergiaPozzo()]);
      const casa = d.status === 'fulfilled' ? d.value : null;
      const pozzo = pz.status === 'fulfilled' ? pz.value : null;
      if (casa) {
        setEnergia({ ...casa, pozzo });
        setError(false);
      } else setError(true);
    } catch (e) {
      console.warn('[Energia] poll full error:', e.message);
      setError(true);
    }
  }, []);

  // Lettura veloce (solo kW istantaneo) — ogni 5s
  const pollFast = useCallback(async () => {
    try {
      const [d, pz] = await Promise.allSettled([s7ReadEnergiaFast(), s7ReadEnergiaPozzo()]);
      const fast = d.status === 'fulfilled' ? d.value : null;
      const pozzo = pz.status === 'fulfilled' ? pz.value : null;
      if (fast) {
        setEnergia(prev => prev
          ? { ...prev, casa: { ...prev.casa, kw: fast.casa.kw, kwhDay: fast.casa.kwhDay, kwhHour: fast.casa.kwhHour }, pozzo }
          : { ...fast, pozzo }
        );
      }
    } catch (e) {
      console.warn('[Energia] poll fast error:', e.message);
    }
  }, []);

  useEffect(() => {
    if (!isLocal) return;
    pollFull();
    const tFull = setInterval(pollFull, POLL_FULL_MS);
    const tFast = setInterval(pollFast, POLL_FAST_MS);
    return () => { clearInterval(tFull); clearInterval(tFast); };
  }, [isLocal, pollFull, pollFast]);

  if (!isLocal) {
    return (
      <div className="empty-state" style={{ paddingTop: 60 }}>
        <div className="emoji">🔒</div>
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Solo su WiFi casa</p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 260, margin: '0 auto' }}>
          Il monitoraggio energia richiede connessione diretta al PLC.
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

  const casaKw  = energia.casa?.kw  ?? 0;
  const pozzoKw = energia.pozzo?.kw ?? 0;
  const totaleKw = casaKw + pozzoKw;

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

      {/* Grafico storico 7 giorni Casa */}
      {energia.casa?.history && <Storia7Giorni history={energia.casa.history} />}

      {/* Pompa Pozzo */}
      {energia.pozzo && <EnergyCard icona="💧" nome="Pompa Pozzo" data={energia.pozzo} />}
    </>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { ZONE_RISCALDAMENTO } from '../config';
import {
  opcuaReadClimaAll,
  opcuaWriteSetpoint,
  opcuaSetAutoManuale,
  opcuaReadEstateInverno,
  opcuaWriteEstateInverno,
} from '../services/opcua';

const POLL_INTERVAL = 5000;

export default function TabClima({ devices, connMode }) {
  const isLocal = connMode === 'local';

  const [zonaData, setZonaData]       = useState({});
  const [estateInverno, setEI]        = useState(false);
  const [loadingZone, setLoadingZone] = useState({});

  /* ── Polling LOCAL ──────────────────────────────────────────────────── */
  const pollClima = useCallback(async () => {
    try {
      const data = await opcuaReadClimaAll();
      setZonaData(data);
      const ei = await opcuaReadEstateInverno();
      setEI(ei);
    } catch (e) {
      console.warn('[Clima] poll error:', e.message);
    }
  }, []);

  useEffect(() => {
    if (!isLocal) return;
    pollClima();
    const t = setInterval(pollClima, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [isLocal, pollClima]);

  /* ── Helper: temp da devices (disponibile sempre, MQTT + OPC UA) ───── */
  const getTempDevice = (deviceId) => {
    const d = devices.find(x => x.id === deviceId);
    return d?.temp ?? null;
  };

  /* ── Setpoint +/- ───────────────────────────────────────────────────── */
  const handleSetpoint = async (zona, delta) => {
    const current = zonaData[zona.id]?.setpoint ?? 20;
    const next = Math.round((current + delta) * 2) / 2; // step 0.5°C
    if (next < 10 || next > 30) return;
    setLoadingZone(p => ({ ...p, [zona.id]: true }));
    setZonaData(p => ({ ...p, [zona.id]: { ...(p[zona.id] || {}), setpoint: next } }));
    try {
      await opcuaWriteSetpoint(zona.zone, next);
    } catch (e) {
      setZonaData(p => ({ ...p, [zona.id]: { ...(p[zona.id] || {}), setpoint: current } }));
    } finally {
      setLoadingZone(p => ({ ...p, [zona.id]: false }));
    }
  };

  /* ── Auto/Man toggle ────────────────────────────────────────────────── */
  const handleAutoMan = async (zona) => {
    const isMan = zonaData[zona.id]?.manuale ?? false;
    try {
      await opcuaSetAutoManuale(zona.zone, !isMan);
      setZonaData(p => ({ ...p, [zona.id]: { ...(p[zona.id] || {}), manuale: !isMan } }));
    } catch (e) {}
  };

  /* ── Stagione ───────────────────────────────────────────────────────── */
  const handleStagione = async (estate) => {
    setEI(estate);
    try { await opcuaWriteEstateInverno(estate); } catch (e) { setEI(!estate); }
  };

  /* ── Media temperature disponibili ──────────────────────────────────── */
  const temps = ZONE_RISCALDAMENTO.map(z => getTempDevice(z.deviceId)).filter(t => t !== null && t > 0);
  const media = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;

  /* ── Colore temperatura ─────────────────────────────────────────────── */
  const tempColor = (t) =>
    t === null ? 'var(--text-muted)'
    : t < 17   ? '#818cf8'
    : t > 25   ? 'var(--accent-orange)'
    :             'var(--accent-green)';

  return (
    <>
      {/* ── Header stagione (solo LOCAL) ── */}
      {isLocal && (
        <div className="clima-stagione-bar">
          <span className="clima-stagione-label">Stagione</span>
          <div className="segmented">
            <button
              className={`seg-btn ${!estateInverno ? 'active' : ''}`}
              onClick={() => handleStagione(false)}
            >❄️ Inverno</button>
            <button
              className={`seg-btn ${estateInverno ? 'active' : ''}`}
              onClick={() => handleStagione(true)}
            >☀️ Estate</button>
          </div>
        </div>
      )}

      <div className="section-title">
        {media !== null ? `Media casa: ${media.toFixed(1)}°C` : 'Temperature stanze'}
      </div>

      {ZONE_RISCALDAMENTO.map(zona => {
        const temp    = getTempDevice(zona.deviceId);
        const data    = zonaData[zona.id] || {};
        const setpt   = data.setpoint;
        const valvola = data.valvolaOut;
        const riscalda = valvola !== undefined ? valvola > 5 : null;
        const isMan   = data.manuale ?? false;
        const loading = loadingZone[zona.id];

        return (
          <div key={zona.id} className="zona-card">
            {/* Riga superiore: icona + nome + temp attuale */}
            <div className="zona-card-top">
              <div className="zona-left">
                <span className="zona-icona">{zona.icona}</span>
                <div>
                  <div className="zona-nome">{zona.nome}</div>
                  {riscalda !== null && (
                    <div className={`zona-stato ${riscalda ? 'riscalda' : ''}`}>
                      {riscalda ? '🔴 Riscalda' : '⚫ In temp.'}
                    </div>
                  )}
                </div>
              </div>
              <div className="zona-temp-att" style={{ color: tempColor(temp) }}>
                {temp !== null ? `${temp.toFixed(1)}°` : '—°'}
              </div>
            </div>

            {/* Barra valvola (solo LOCAL) */}
            {isLocal && valvola !== undefined && (
              <div className="valvola-row">
                <div className="valvola-bar">
                  <div
                    className="valvola-fill"
                    style={{ width: `${Math.min(100, Math.max(0, valvola))}%` }}
                  />
                </div>
                <span className="valvola-pct">{Math.round(valvola)}%</span>
              </div>
            )}

            {/* Controllo setpoint (solo LOCAL) */}
            {isLocal ? (
              <div className="zona-controls">
                <div className="zona-autoман">
                  <button
                    className={`mode-btn ${!isMan ? 'active' : ''}`}
                    onClick={() => isMan && handleAutoMan(zona)}
                  >AUTO</button>
                  <button
                    className={`mode-btn ${isMan ? 'active' : ''}`}
                    onClick={() => !isMan && handleAutoMan(zona)}
                  >MAN</button>
                </div>
                <div className="setpoint-ctrl">
                  <span className="setpoint-label">Setpoint</span>
                  <button
                    className="sp-btn"
                    onClick={() => handleSetpoint(zona, -0.5)}
                    disabled={loading}
                  >−</button>
                  <span className="sp-val">
                    {setpt !== undefined ? `${setpt.toFixed(1)}°C` : '···'}
                  </span>
                  <button
                    className="sp-btn"
                    onClick={() => handleSetpoint(zona, +0.5)}
                    disabled={loading}
                  >+</button>
                </div>
              </div>
            ) : (
              <div className="zona-locked-bar">
                🔒 Modifica setpoint solo su WiFi casa
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

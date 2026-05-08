import React, { useState } from 'react';

export default function TabLuci({ devices, onToggle, onSpegniTutte }) {
  const [confirmSpegni, setConfirmSpegni] = useState(false);

  const luci = devices.filter(d => d.id !== 'caldaia_pellet');
  const caldaia = devices.find(d => d.id === 'caldaia_pellet');
  const accese = luci.filter(d => d.acceso).length;

  const handleSpegni = () => {
    if (!confirmSpegni) {
      setConfirmSpegni(true);
      setTimeout(() => setConfirmSpegni(false), 3000);
      return;
    }
    onSpegniTutte();
    setConfirmSpegni(false);
  };

  return (
    <>
      <div className="section-title">
        Luci — {accese} accese su {luci.length}
      </div>

      {luci.map(d => (
        <div key={d.idx} className="device-row">
          <div className="device-info">
            <span className="device-icon">{d.icona}</span>
            <div>
              <div className="device-name">{d.nome}</div>
              {d.temp !== null && (
                <div className="device-temp">{d.temp.toFixed(1)}°C</div>
              )}
            </div>
          </div>
          <div
            className={`toggle ${d.acceso ? 'on' : ''}`}
            onClick={() => onToggle(d.idx, d.acceso)}
          >
            <div className="toggle-knob" />
          </div>
        </div>
      ))}

      {caldaia && (
        <>
          <div className="section-title">Riscaldamento</div>
          <div className="device-row">
            <div className="device-info">
              <span className="device-icon">{caldaia.icona}</span>
              <div>
                <div className="device-name">{caldaia.nome}</div>
              </div>
            </div>
            <div
              className={`toggle ${caldaia.acceso ? 'on' : ''}`}
              onClick={() => onToggle(caldaia.idx, caldaia.acceso)}
            >
              <div className="toggle-knob" />
            </div>
          </div>
        </>
      )}

      {accese > 0 && (
        <button
          className="btn-danger"
          onClick={handleSpegni}
        >
          {confirmSpegni ? '⚠️ Conferma — Spegni tutte?' : '🌑 Spegni tutte le luci'}
        </button>
      )}
    </>
  );
}

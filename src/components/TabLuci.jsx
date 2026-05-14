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

      <div className="device-grid">
        {luci.map(d => (
          <div
            key={d.idx}
            className={`device-card ${d.acceso ? 'on' : ''}`}
            onClick={() => onToggle(d.idx, d.acceso)}
          >
            <div className="device-card-header">
              <span className="device-card-icon">{d.icona}</span>
              <div className={`toggle ${d.acceso ? 'on' : ''}`}>
                <div className="toggle-knob" />
              </div>
            </div>
            <div className="device-card-name">{d.nome}</div>
            {d.hasTemp && d.temp !== null && (
              <div className="device-card-temp">{d.temp.toFixed(1)}°C</div>
            )}
          </div>
        ))}
      </div>

      {caldaia && (
        <>
          <div className="section-title">Riscaldamento</div>
          <div
            className={`device-row ${caldaia.acceso ? 'on' : ''}`}
            onClick={() => onToggle(caldaia.idx, caldaia.acceso)}
          >
            <div className="device-info">
              <span className="device-icon">{caldaia.icona}</span>
              <div>
                <div className="device-name">{caldaia.nome}</div>
                {caldaia.temp !== null && (
                  <div className="device-temp">{caldaia.temp.toFixed(1)}°C</div>
                )}
              </div>
            </div>
            <div className={`toggle ${caldaia.acceso ? 'on' : ''}`}>
              <div className="toggle-knob" />
            </div>
          </div>
        </>
      )}

      {accese > 0 && (
        <button className="btn-danger" onClick={handleSpegni}>
          {confirmSpegni ? '⚠️ Conferma — Spegni tutte?' : '🌑 Spegni tutte le luci'}
        </button>
      )}
    </>
  );
}

import React from 'react';

export default function TabClima({ devices }) {
  const conTemp = devices.filter(d => d.temp !== null && d.temp > 0);

  if (conTemp.length === 0) {
    return (
      <div className="empty-state">
        <div className="emoji">🌡️</div>
        <p>In attesa dei dati temperatura...</p>
      </div>
    );
  }

  // Temperatura media
  const media = conTemp.reduce((s, d) => s + d.temp, 0) / conTemp.length;

  return (
    <>
      <div className="section-title">
        Temperatura media: {media.toFixed(1)}°C
      </div>

      {conTemp.map(d => (
        <div key={d.idx} className="device-row">
          <div className="device-info">
            <span className="device-icon">🌡️</span>
            <div>
              <div className="device-name">{d.nome}</div>
            </div>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 18,
            fontWeight: 700,
            color: d.temp < 18 ? 'var(--accent-blue)'
              : d.temp > 24 ? 'var(--accent-orange)'
              : 'var(--accent-green)',
          }}>
            {d.temp.toFixed(1)}°
          </div>
        </div>
      ))}
    </>
  );
}

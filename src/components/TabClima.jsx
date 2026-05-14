import React from 'react';

export default function TabClima({ devices }) {
  const conTemp = devices.filter(d => d.hasTemp && d.temp !== null && d.temp > 0);

  if (conTemp.length === 0) {
    return (
      <div className="empty-state">
        <div className="emoji">🌡️</div>
        <p>In attesa dei dati temperatura...</p>
      </div>
    );
  }

  const media = conTemp.reduce((s, d) => s + d.temp, 0) / conTemp.length;

  return (
    <>
      <div className="section-title">
        Temperatura media: {media.toFixed(1)}°C
      </div>

      {conTemp.map(d => {
        const color = d.temp < 18 ? '#818cf8'
          : d.temp > 24 ? 'var(--accent-orange)'
          : 'var(--accent-green)';
        return (
          <div key={d.idx} className="clima-row">
            <div className="clima-info">
              <span className="clima-icon">🌡️</span>
              <div className="clima-name">{d.nome}</div>
            </div>
            <div className="clima-temp" style={{ color }}>
              {d.temp.toFixed(1)}°
            </div>
          </div>
        );
      })}
    </>
  );
}

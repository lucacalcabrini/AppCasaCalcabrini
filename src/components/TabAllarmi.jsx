import React from 'react';

export default function TabAllarmi({ alarms }) {
  const attivi = alarms.filter(a => a.attivo);
  const inattivi = alarms.filter(a => !a.attivo);

  if (alarms.length === 0) {
    return (
      <div className="empty-state">
        <div className="emoji">🔔</div>
        <p>In attesa dei dati allarmi...</p>
      </div>
    );
  }

  return (
    <>
      {/* Allarmi attivi */}
      {attivi.length > 0 && (
        <>
          <div className="section-title" style={{ color: 'var(--accent-red)' }}>
            ⚠️ Allarmi attivi — {attivi.length}
          </div>
          {attivi.map(a => (
            <div
              key={a.idx}
              className={`alarm-card alarm-active ${a.nuovo ? 'alarm-new' : ''}`}
            >
              <div className="alarm-dot alarm-dot-active" />
              <div className="alarm-name">{a.nome}</div>
              <div className={`alarm-priority ${a.alta ? 'prio-alta' : 'prio-normale'}`}>
                {a.alta ? 'ALTA' : 'NORM'}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Tutto ok */}
      {attivi.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Nessun allarme attivo</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {alarms.length} allarmi monitorati
          </div>
        </div>
      )}

      {/* Allarmi inattivi (lista compatta) */}
      {inattivi.length > 0 && (
        <>
          <div className="section-title">Monitorati</div>
          {inattivi.map(a => (
            <div key={a.idx} className="alarm-card alarm-inactive">
              <div className="alarm-dot alarm-dot-inactive" />
              <div className="alarm-name" style={{ color: 'var(--text-secondary)' }}>
                {a.nome}
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}

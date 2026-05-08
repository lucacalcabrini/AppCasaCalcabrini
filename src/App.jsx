import React, { useState, useEffect, useCallback } from 'react';
import { connectionStart, connectionStop, onData, onStatus, getMode, sendCommand } from './services/connection';
import TabLuci from './components/TabLuci';
import TabClima from './components/TabClima';
import TabAllarmi from './components/TabAllarmi';

const TABS = [
  { key: 'luci',    label: 'Luci',    icon: '💡' },
  { key: 'clima',   label: 'Clima',   icon: '🌡️' },
  { key: 'allarmi', label: 'Allarmi', icon: '🔔' },
];

export default function App() {
  const [tab, setTab] = useState('luci');
  const [devices, setDevices] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [connMode, setConnMode] = useState(null);
  const [connStatus, setConnStatus] = useState('connecting');

  useEffect(() => {
    onData((data) => {
      setDevices(data.devices);
      setAlarms(data.alarms);
    });
    onStatus((mode, status) => {
      setConnMode(mode);
      setConnStatus(status);
    });
    connectionStart();
    return () => { connectionStop(); };
  }, []);

  const handleToggle = useCallback(async (idx, currentState) => {
    // Ottimistic update
    setDevices(prev => prev.map(d =>
      d.idx === idx ? { ...d, acceso: !currentState } : d
    ));
    try {
      await sendCommand(idx, !currentState);
    } catch (e) {
      // Rollback
      setDevices(prev => prev.map(d =>
        d.idx === idx ? { ...d, acceso: currentState } : d
      ));
    }
  }, []);

  const handleSpegniTutte = useCallback(async () => {
    const accese = devices.filter(d => d.acceso);
    for (const d of accese) {
      await sendCommand(d.idx, false);
    }
  }, [devices]);

  const allarmiAttivi = alarms.filter(a => a.attivo).length;

  const statusClass = !connMode ? 'status-offline'
    : connMode === 'local' ? 'status-local'
    : 'status-remote';

  const statusLabel = !connMode ? 'Offline'
    : connMode === 'local' ? 'OPC UA'
    : connStatus === 'connected' ? 'AWS IoT' : 'Connessione...';

  return (
    <>
      {/* Header */}
      <div className="header">
        <h1>Casa</h1>
        <div className={`header-status ${statusClass}`}>
          <span className="status-dot" />
          {statusLabel}
        </div>
      </div>

      {/* Content */}
      <div className="content">
        {tab === 'luci' && (
          <TabLuci
            devices={devices}
            onToggle={handleToggle}
            onSpegniTutte={handleSpegniTutte}
          />
        )}
        {tab === 'clima' && (
          <TabClima devices={devices} />
        )}
        {tab === 'allarmi' && (
          <TabAllarmi alarms={alarms} />
        )}
      </div>

      {/* Tab Bar */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
            style={{ position: 'relative' }}
          >
            <span className="tab-icon">{t.icon}</span>
            {t.label}
            {t.key === 'allarmi' && allarmiAttivi > 0 && (
              <span className="tab-badge">{allarmiAttivi}</span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

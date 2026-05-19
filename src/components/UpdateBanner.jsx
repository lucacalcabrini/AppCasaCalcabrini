import React, { useState, useEffect } from 'react';
import { checkForUpdate, installUpdate } from '../services/updater';

export default function UpdateBanner() {
  const [update, setUpdate] = useState(null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkForUpdate().then(u => {
      if (u) setUpdate(u);
    });
  }, []);

  if (!update || dismissed) return null;

  const handleInstall = async () => {
    setInstalling(true);
    setError(null);
    try {
      await installUpdate(update.url);
    } catch (e) {
      setError(e?.message || String(e));
      setInstalling(false);
    }
  };

  return (
    <div className="update-banner">
      <div className="update-banner-text">
        <strong>🚀 Aggiornamento disponibile</strong>
        <span>v{update.latest} (attuale v{update.current})</span>
        {error && <span className="update-banner-error">⚠️ {error}</span>}
      </div>
      <div className="update-banner-actions">
        <button
          className="btn-update"
          onClick={handleInstall}
          disabled={installing}
        >
          {installing ? 'Scaricando…' : 'Aggiorna'}
        </button>
        <button
          className="btn-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Chiudi"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { checkForUpdate, installUpdate } from '../services/updater';
import { GITHUB } from '../config';

export default function UpdateBanner() {
  const [status, setStatus]       = useState(null); // { tokenExpired } | { current, latest, url, notes }
  const [installing, setInstalling] = useState(false);
  const [error, setError]         = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkForUpdate().then(s => { if (s) setStatus(s); });
  }, []);

  if (!status || dismissed) return null;

  // ── Token scaduto ──────────────────────────────────────────────────────────
  if (status.tokenExpired) {
    return (
      <div className="update-banner update-banner--warn">
        <div className="update-banner-text">
          <strong>🔑 Token GitHub scaduto</strong>
          <span>Gli aggiornamenti automatici non funzionano — scarica l'APK manualmente</span>
        </div>
        <div className="update-banner-actions">
          <button
            className="btn-update btn-update--warn"
            onClick={() => window.open(GITHUB.releasesUrl, '_blank', 'noopener')}
          >
            Apri Releases
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

  // ── Aggiornamento disponibile ──────────────────────────────────────────────
  const handleInstall = async () => {
    setInstalling(true);
    setError(null);
    try {
      await installUpdate(status.url);
    } catch (e) {
      setError(e?.message || String(e));
      setInstalling(false);
    }
  };

  return (
    <div className="update-banner">
      <div className="update-banner-text">
        <strong>🚀 Aggiornamento disponibile</strong>
        <span>v{status.latest} (attuale v{status.current})</span>
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

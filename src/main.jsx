import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CasaApp from './CasaApp'

// Forza cancellazione vecchi service worker (risolve cache PIN)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  }).then(() => {
    // Da ora in poi: aggiornamento automatico ad ogni nuova versione
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CasaApp />
  </StrictMode>,
)

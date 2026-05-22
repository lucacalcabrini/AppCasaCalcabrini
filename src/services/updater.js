import { Capacitor } from '@capacitor/core';
import { GITHUB } from '../config';

const AppUpdater = Capacitor.Plugins?.AppUpdater;

const API_URL =
  `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/releases/latest`;

function authHeaders() {
  const h = { 'Accept': 'application/vnd.github+json' };
  if (GITHUB.token) h['Authorization'] = `Bearer ${GITHUB.token}`;
  return h;
}

/**
 * Controlla se esiste una versione più recente su GitHub Releases.
 *
 * Ritorna:
 *   { tokenExpired: true }              — token scaduto / non autorizzato (401/403)
 *   { current, latest, url, notes }     — update disponibile
 *   null                                — già aggiornato, errore rete, o non nativo
 */
export async function checkForUpdate() {
  if (!Capacitor.isNativePlatform() || !AppUpdater) return null;

  try {
    const { version: current } = await AppUpdater.getVersion();

    const res = await fetch(API_URL, { headers: authHeaders() });

    if (res.status === 401 || res.status === 403) {
      console.warn('[Updater] Token GitHub scaduto o non autorizzato (HTTP', res.status, ')');
      return { tokenExpired: true };
    }

    if (!res.ok) {
      console.warn('[Updater] GitHub API HTTP', res.status);
      return null;
    }

    const release = await res.json();
    const latest = (release.tag_name || '').replace(/^v/, '');
    if (!latest || latest === current) return null;

    const apkAsset = (release.assets || []).find(a => a.name.endsWith('.apk'));
    if (!apkAsset) {
      console.warn('[Updater] Release senza APK');
      return null;
    }

    return {
      current,
      latest,
      url: apkAsset.browser_download_url,
      notes: release.body || '',
    };
  } catch (e) {
    console.warn('[Updater] check failed:', e);
    return null;
  }
}

/**
 * Scarica l'APK e lancia l'installer Android.
 * Passa il token per repo private (AppUpdaterPlugin aggiunge l'header Authorization).
 */
export async function installUpdate(url) {
  if (!Capacitor.isNativePlatform() || !AppUpdater) return;
  return AppUpdater.downloadAndInstall({ url, authToken: GITHUB.token || '' });
}

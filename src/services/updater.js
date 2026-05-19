import { Capacitor } from '@capacitor/core';
import { GITHUB } from '../config';

const AppUpdater = Capacitor.Plugins?.AppUpdater;

const RELEASES_URL =
  `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/releases/latest`;

/**
 * Confronta versione installata con l'ultima release su GitHub.
 * Ritorna { current, latest, url, notes } se c'è un update, altrimenti null.
 * Su browser ritorna sempre null (nessuna versione "installata").
 * Repo pubblico: nessun token necessario.
 */
export async function checkForUpdate() {
  if (!Capacitor.isNativePlatform() || !AppUpdater) {
    return null;
  }

  try {
    const { version: current } = await AppUpdater.getVersion();

    const res = await fetch(RELEASES_URL, {
      headers: { 'Accept': 'application/vnd.github+json' },
    });
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
 * L'utente vedrà il prompt di sistema per confermare l'installazione.
 */
export async function installUpdate(url) {
  if (!Capacitor.isNativePlatform() || !AppUpdater) return;
  return AppUpdater.downloadAndInstall({ url, authToken: '' });
}

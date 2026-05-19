package it.calcabrini.casa.plugins;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    /**
     * Restituisce versionName e versionCode dell'APK installato.
     * Letti dal PackageManager (iniettati dal CI in build.gradle).
     */
    @PluginMethod
    public void getVersion(PluginCall call) {
        try {
            PackageInfo pInfo = getContext().getPackageManager()
                .getPackageInfo(getContext().getPackageName(), 0);
            JSObject ret = new JSObject();
            ret.put("version", pInfo.versionName);
            ret.put("code", pInfo.versionCode);
            call.resolve(ret);
        } catch (PackageManager.NameNotFoundException e) {
            call.reject("getVersion failed: " + e.getMessage());
        }
    }

    /**
     * Scarica l'APK dall'URL fornito e lancia l'installer Android.
     * Se authToken è valorizzato lo passa come Bearer header (GitHub API).
     * url = endpoint API release asset (`https://api.github.com/.../assets/N`)
     * con header `Accept: application/octet-stream` per ottenere il binary.
     */
    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        final String url = call.getString("url");
        final String authToken = call.getString("authToken", "");
        if (url == null || url.isEmpty()) { call.reject("url required"); return; }

        executor.submit(() -> {
            try {
                File outFile = new File(getContext().getCacheDir(), "update.apk");
                if (outFile.exists()) outFile.delete();

                URL u = new URL(url);
                HttpURLConnection conn = (HttpURLConnection) u.openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setRequestProperty("User-Agent", "CasaCalcabrini-Updater");
                if (authToken != null && !authToken.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + authToken);
                    conn.setRequestProperty("Accept", "application/octet-stream");
                }
                conn.connect();

                int code = conn.getResponseCode();
                if (code < 200 || code >= 400) {
                    call.reject("HTTP " + code + " durante download APK");
                    return;
                }

                try (InputStream in = conn.getInputStream();
                     FileOutputStream out = new FileOutputStream(outFile)) {
                    byte[] buf = new byte[8192];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                }

                Uri apkUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    outFile
                );
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);

                JSObject ret = new JSObject();
                ret.put("ok", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Update failed: " + e.getMessage());
            }
        });
    }
}

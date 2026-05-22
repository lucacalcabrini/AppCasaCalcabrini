package it.calcabrini.casa.plugins;

import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.github.s7connector.api.DaveArea;
import com.github.s7connector.api.S7Connector;
import com.github.s7connector.api.factory.S7ConnectorFactory;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Client S7 GET/PUT (comunicazione S7 / S7comm su porta 102) via s7connector.
 * Sostituisce il vecchio OpcUaPlugin per il percorso LOCAL.
 *
 * Legge/scrive una DB-interfaccia piatta non ottimizzata (DbExt) alimentata
 * dal PLC da DbCasa. Per S7-1200: rack=0, slot=1.
 */
@CapacitorPlugin(name = "S7Plugin")
public class S7Plugin extends Plugin {

    private S7Connector connector = null;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void connect(PluginCall call) {
        String host = call.getString("host", "192.168.178.250");
        int rack = call.getInt("rack", 0);
        int slot = call.getInt("slot", 1);
        executor.submit(() -> {
            try {
                if (connector != null) {
                    try { connector.close(); } catch (Exception ignore) {}
                    connector = null;
                }
                connector = S7ConnectorFactory.buildTCPConnector()
                    .withHost(host)
                    .withRack(rack)
                    .withSlot(slot)
                    .build();
                JSObject ret = new JSObject();
                ret.put("connected", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("S7 connect failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        executor.submit(() -> {
            try {
                if (connector != null) { connector.close(); connector = null; }
                call.resolve();
            } catch (Exception e) { call.reject(e.getMessage()); }
        });
    }

    /** Legge `size` byte dalla DB `db` a partire dall'offset `start`. Ritorna base64. */
    @PluginMethod
    public void readBlock(PluginCall call) {
        if (connector == null) { call.reject("Not connected"); return; }
        int db = call.getInt("db", 0);
        int start = call.getInt("start", 0);
        int size = call.getInt("size", 0);
        executor.submit(() -> {
            try {
                byte[] data = connector.read(DaveArea.DB, db, size, start);
                JSObject ret = new JSObject();
                ret.put("data", Base64.encodeToString(data, Base64.NO_WRAP));
                call.resolve(ret);
            } catch (Exception e) { call.reject(e.getMessage()); }
        });
    }

    /** Scrive un Int (16 bit, big-endian S7) nella DB `db` all'offset `offset`. */
    @PluginMethod
    public void writeInt(PluginCall call) {
        if (connector == null) { call.reject("Not connected"); return; }
        int db = call.getInt("db", 0);
        int offset = call.getInt("offset", 0);
        int value = call.getInt("value", 0);
        executor.submit(() -> {
            try {
                byte[] buf = new byte[] {
                    (byte) ((value >> 8) & 0xFF),
                    (byte) (value & 0xFF)
                };
                connector.write(DaveArea.DB, db, offset, buf);
                JSObject ret = new JSObject();
                ret.put("ok", true);
                call.resolve(ret);
            } catch (Exception e) { call.reject(e.getMessage()); }
        });
    }

    /** Scrive un Real (Float 32 bit, big-endian S7) nella DB `db` all'offset `offset`. */
    @PluginMethod
    public void writeFloat(PluginCall call) {
        if (connector == null) { call.reject("Not connected"); return; }
        int db = call.getInt("db", 0);
        int offset = call.getInt("offset", 0);
        double value = call.getDouble("value", 0.0);
        executor.submit(() -> {
            try {
                int bits = Float.floatToIntBits((float) value);
                byte[] buf = new byte[] {
                    (byte) ((bits >> 24) & 0xFF),
                    (byte) ((bits >> 16) & 0xFF),
                    (byte) ((bits >>  8) & 0xFF),
                    (byte) ( bits        & 0xFF)
                };
                connector.write(DaveArea.DB, db, offset, buf);
                JSObject ret = new JSObject();
                ret.put("ok", true);
                call.resolve(ret);
            } catch (Exception e) { call.reject(e.getMessage()); }
        });
    }

    /** Scrive 1 byte nella DB `db` all'offset `offset`. Usato per Bool (bit manipulation in JS). */
    @PluginMethod
    public void writeByte(PluginCall call) {
        if (connector == null) { call.reject("Not connected"); return; }
        int db = call.getInt("db", 0);
        int offset = call.getInt("offset", 0);
        int value = call.getInt("value", 0);
        executor.submit(() -> {
            try {
                byte[] buf = new byte[] { (byte) (value & 0xFF) };
                connector.write(DaveArea.DB, db, offset, buf);
                JSObject ret = new JSObject();
                ret.put("ok", true);
                call.resolve(ret);
            } catch (Exception e) { call.reject(e.getMessage()); }
        });
    }
}

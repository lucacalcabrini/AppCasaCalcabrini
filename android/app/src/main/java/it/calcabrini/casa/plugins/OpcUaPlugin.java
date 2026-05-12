package it.calcabrini.casa.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.eclipse.milo.opcua.sdk.client.OpcUaClient;
import org.eclipse.milo.opcua.sdk.client.api.config.OpcUaClientConfig;
import org.eclipse.milo.opcua.stack.core.types.builtin.DataValue;
import org.eclipse.milo.opcua.stack.core.types.builtin.NodeId;
import org.eclipse.milo.opcua.stack.core.types.builtin.Variant;
import org.eclipse.milo.opcua.stack.core.types.builtin.StatusCode;
import org.eclipse.milo.opcua.stack.client.DiscoveryClient;
import org.eclipse.milo.opcua.stack.core.types.structured.EndpointDescription;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "OpcUaPlugin")
public class OpcUaPlugin extends Plugin {

    private OpcUaClient client = null;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    // Namespace index 3 = Siemens S7-1200/1500 default
    private static final int NS = 3;

    @PluginMethod
    public void connect(PluginCall call) {
        String endpoint = call.getString("endpoint", "opc.tcp://192.168.178.250:4840");
        executor.submit(() -> {
            try {
                List<EndpointDescription> endpoints = DiscoveryClient.getEndpoints(endpoint).get();
                EndpointDescription ep = endpoints.stream()
                    .filter(e -> e.getSecurityPolicyUri().equals(
                        "http://opcfoundation.org/UA/SecurityPolicy#None"))
                    .findFirst()
                    .orElse(endpoints.get(0));

                OpcUaClientConfig config = OpcUaClientConfig.builder()
                    .setEndpoint(ep)
                    .build();

                client = OpcUaClient.create(config);
                client.connect().get();

                JSObject ret = new JSObject();
                ret.put("connected", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("OPC UA connect failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        executor.submit(() -> {
            try {
                if (client != null) { client.disconnect().get(); client = null; }
                call.resolve();
            } catch (Exception e) { call.reject(e.getMessage()); }
        });
    }

    @PluginMethod
    public void readBool(PluginCall call) {
        String nodeStr = call.getString("nodeId");
        if (client == null) { call.reject("Not connected"); return; }
        executor.submit(() -> {
            try {
                NodeId nodeId = new NodeId(NS, nodeStr);
                DataValue val = client.readValue(0, null, nodeId).get();
                Boolean v = (Boolean) val.getValue().getValue();
                JSObject ret = new JSObject();
                ret.put("value", v != null && v);
                call.resolve(ret);
            } catch (Exception e) { call.reject(e.getMessage()); }
        });
    }

    @PluginMethod
    public void readReal(PluginCall call) {
        String nodeStr = call.getString("nodeId");
        if (client == null) { call.reject("Not connected"); return; }
        executor.submit(() -> {
            try {
                NodeId nodeId = new NodeId(NS, nodeStr);
                DataValue val = client.readValue(0, null, nodeId).get();
                Object v = val.getValue().getValue();
                double d = v instanceof Float ? ((Float)v).doubleValue()
                         : v instanceof Double ? (Double)v : 0.0;
                JSObject ret = new JSObject();
                ret.put("value", d);
                call.resolve(ret);
            } catch (Exception e) { call.reject(e.getMessage()); }
        });
    }

    @PluginMethod
    public void writeBool(PluginCall call) {
        String nodeStr = call.getString("nodeId");
        Boolean value = call.getBoolean("value", false);
        if (client == null) { call.reject("Not connected"); return; }
        executor.submit(() -> {
            try {
                NodeId nodeId = new NodeId(NS, nodeStr);
                DataValue dv = new DataValue(new Variant(value));
                StatusCode sc = client.writeValue(nodeId, dv).get();
                JSObject ret = new JSObject();
                ret.put("ok", sc.isGood());
                call.resolve(ret);
            } catch (Exception e) { call.reject(e.getMessage()); }
        });
    }

    @PluginMethod
    public void writeReal(PluginCall call) {
        String nodeStr = call.getString("nodeId");
        Double value = call.getDouble("value", 0.0);
        if (client == null) { call.reject("Not connected"); return; }
        executor.submit(() -> {
            try {
                NodeId nodeId = new NodeId(NS, nodeStr);
                DataValue dv = new DataValue(new Variant(value.floatValue()));
                StatusCode sc = client.writeValue(nodeId, dv).get();
                JSObject ret = new JSObject();
                ret.put("ok", sc.isGood());
                call.resolve(ret);
            } catch (Exception e) { call.reject(e.getMessage()); }
        });
    }

    @PluginMethod
    public void writeInt(PluginCall call) {
        String nodeStr = call.getString("nodeId");
        Integer value = call.getInt("value", 0);
        if (client == null) { call.reject("Not connected"); return; }
        executor.submit(() -> {
            try {
                NodeId nodeId = new NodeId(NS, nodeStr);
                DataValue dv = new DataValue(new Variant(value));
                StatusCode sc = client.writeValue(nodeId, dv).get();
                JSObject ret = new JSObject();
                ret.put("ok", sc.isGood());
                call.resolve(ret);
            } catch (Exception e) { call.reject(e.getMessage()); }
        });
    }
}

package it.calcabrini.casa;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import it.calcabrini.casa.plugins.OpcUaPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OpcUaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

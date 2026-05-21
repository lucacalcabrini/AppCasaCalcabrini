package it.calcabrini.casa;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import it.calcabrini.casa.plugins.S7Plugin;
import it.calcabrini.casa.plugins.AppUpdaterPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(S7Plugin.class);
        registerPlugin(AppUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

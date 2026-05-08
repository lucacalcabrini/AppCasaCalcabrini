# Casa Calcabrini — App Supervisore V2.0

App Android per supervisione e controllo domotico.

## Comunicazione
- **WiFi casa** → OPC UA diretto al PLC (192.168.178.250:4840)
- **Fuori casa** → AWS IoT Core MQTT (casa/stato, casa/cmd)

## Payload compatto
1:20.9;0:19.9;...;0;0|0;0;A;0;1;N;0;...
← 16 utenze →       |  ← 32 allarmi →

## Build
Ogni push su `main` → GitHub Actions compila l'APK → scaricabile da Actions → Artifacts

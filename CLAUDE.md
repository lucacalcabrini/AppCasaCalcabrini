# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # installa dipendenze (no package-lock.json → no cache CI)
npm run build        # Vite build → dist/
npx cap sync android # copia dist/ in android/app/src/main/assets/public/

# Build APK locale (richiede Android SDK)
cd android && ./gradlew assembleDebug
```

Non ci sono test automatizzati. La CI si attiva ad ogni push su `main` e produce l'APK come artifact GitHub Actions.

## Architettura

App Android ibrida: React/Vite frontend → Capacitor 6 → APK.

### Logica di connessione (`src/services/connection.js`)

Al boot l'app tenta un `fetch HEAD` verso `PLC_IP` con timeout 500ms:
- **Raggiungibile** → OPC UA locale via plugin Java custom (`opcuaConnect` + polling ogni 2s)
- **Non raggiungibile** → MQTT su WebSocket verso AWS IoT Core (`casa/stato`, `casa/cmd`)

Il fallback è automatico: se `opcuaConnect` lancia eccezione, `startRemote()` viene chiamato immediatamente.

### Plugin OPC UA (`android/app/src/main/java/.../plugins/OpcUaPlugin.java`)

Plugin Capacitor custom registrato in `MainActivity.java` via `registerPlugin(OpcUaPlugin.class)`. Annotato `@CapacitorPlugin(name = "OpcUaPlugin")` — questo nome deve corrispondere a `Capacitor.Plugins.OpcUaPlugin` in `opcua.js`.

Tutti i metodi read/write accettano il parametro `nodeId` (stringa). Metodi disponibili: `connect`, `disconnect`, `readBool`, `readReal`, `writeBool`, `writeReal`, `writeInt`.

Dipendenze Gradle: Eclipse Milo 0.6.12, Netty 4.1.86, BouncyCastle 1.78.1. Il `packaging.resources.excludes` in `app/build.gradle` è necessario per risolvere duplicati META-INF da Milo.

### Payload MQTT

Formato stringa compatto definito in `src/services/parser.js`:
```
1:20.9;0:19.9;...;0;0|0;0;A;0;1;N;0;...
←── 16 utenze (stato:temp) ──→|←── 32 allarmi (0/1/A/N) ──→
```
Il separatore `|` divide utenze da allarmi. Codici allarme: `0`=inattivo, `1`=attivo, `A`=attivo alta priorità, `N`=nuovo.

### Nodi OPC UA (PLC Siemens S7, namespace 3)

- Lettura stato utenza: `ns=3;s="DbCasa".Utenze[i].Attiva` (Bool)
- Lettura temperatura: `ns=3;s="DbCasa".Utenze[i].Temp` (Real)
- Scrittura comando: `ns=3;s="DbCasa".Utenze[i].Req` (Int32: 1=accendi, 2=spegni)
- Lettura allarme: `ns=3;s="DbCasa".Allarmi[i].Attivo` (Bool)

### Configurazione (`src/config.js`)

Contiene IP del PLC, endpoint AWS IoT WSS, e le definizioni statiche di `DEVICES` (16 slot, con null per posizioni vuote) e `ALARMS` (32 slot). Gli indici degli array corrispondono direttamente agli indici OPC UA.

## Architettura di connessione

- **LOCAL (WiFi)**: OPC UA via Eclipse Milo → PLC 192.168.178.250:4840 → accesso COMPLETO (luci, caldaia, pompa pozzo, energia, riscaldamento, setpoint)
- **REMOTE (4G)**: MQTT WebSocket → AWS IoT Core eu-west-1 → accesso LIMITATO (solo luci, temperature, allarmi)
- `connection.js` fa ping OPC UA: se risponde entro 3s usa LOCAL, altrimenti fallback REMOTE

## AWS Infrastructure

- IoT endpoint: `a3fmnf8o7o8knx-ats.iot.eu-west-1.amazonaws.com`
- TLS Policy: `IoTSecurityPolicy_TLS12_1_2_2022_10`
- Lambda: `CasaCalcabrini_AlexaHandler_EU` (eu-west-1)
- Alexa Skill ID: `amzn1.ask.skill.c493801d-5579-4f5f-8a57-ee8714b2315f`
- Topic subscribe: `casa/stato` | Topic publish: `casa/cmd`

## PLC

- CPU: Siemens S7-1200 1215C DC/DC/DC, FW V4.6, TIA Portal V18
- IP: `192.168.178.250` | MQTT lib: LMQTT_Client V3.1
- DB principale: `DbCasa` con `Array[0..15] of UtCasa`

## Regole FONDAMENTALI

- **NON toccare mai**: certificati TLS, endpoint AWS, META-INF fixes Gradle, workflow GitHub Actions
- **Modalità REMOTE**: esporre SOLO luci/temperature/allarmi, mai pompa/energia/setpoint
- **Nuove funzionalità** per pompa/energia/riscaldamento: SOLO in modalità LOCAL (OPC UA)

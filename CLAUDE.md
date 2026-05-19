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

Non ci sono test automatizzati. La CI si attiva ad ogni push su `main`, produce l'APK come artifact GitHub Actions e crea una **GitHub Release** con tag `v<package.json.version>.<run_number>` (es. `v2.0.42`) e l'APK come asset.

## Auto-update

L'app controlla all'avvio se c'è una versione più recente su GitHub Releases. Se sì mostra un banner con bottone "Aggiorna" che scarica l'APK e lancia l'installer Android.

**Componenti:**
- `.github/workflows/build-apk.yml` — inietta `versionName`/`versionCode` in `build.gradle` da `package.json.version + run_number`, crea Release con APK
- `android/.../plugins/AppUpdaterPlugin.java` — plugin Capacitor: `getVersion()`, `downloadAndInstall({url, authToken})`
- `src/services/updater.js` — `checkForUpdate()` fetcha `releases/latest` da GitHub API, confronta tag con versione installata
- `src/components/UpdateBanner.jsx` — banner UI mostrato solo se update disponibile
- `src/config.js` → `GITHUB.token` — Personal Access Token fine-grained con scope `Contents: read` (necessario perché il repo è privato)

**Setup iniziale richiesto:**
1. **Token GitHub**: generare PAT fine-grained su https://github.com/settings/personal-access-tokens/new (scope `Contents: read` sul solo repo `AppCasaCalcabrini`) e incollarlo in `src/config.js` → `GITHUB.token`
2. **Debug keystore stabile** (CRITICO): senza questo, ogni APK CI è firmato con keystore diverso → Android rifiuta l'install sopra una versione precedente. Generare una volta:
   ```
   keytool -genkey -v -keystore debug.keystore -storepass android \
     -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 \
     -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
   base64 -w 0 debug.keystore  # output base64
   ```
   Aggiungere come GitHub Secret `DEBUG_KEYSTORE_B64`. Il workflow lo decodifica in `~/.android/debug.keystore` prima del build.
3. **Permessi Android**: `REQUEST_INSTALL_PACKAGES` già nel manifest. La prima volta l'utente deve consentire "Install unknown apps" alla nostra app dalle impostazioni.

## Architettura

App Android ibrida: React/Vite frontend → Capacitor 6 → APK.

### Logica di connessione (`src/services/connection.js`)

Al boot l'app tenta un `fetch HEAD` verso `PLC_IP` con timeout 500ms:
- **Raggiungibile** → OPC UA locale via plugin Java custom (`opcuaConnect` + polling ogni 2s)
- **Non raggiungibile** → MQTT su WebSocket verso AWS IoT Core (`casa/stato`, `casa/cmd`)

Il fallback è automatico: se `opcuaConnect` lancia eccezione, `startRemote()` viene chiamato immediatamente.

### Plugin OPC UA (`android/app/src/main/java/.../plugins/OpcUaPlugin.java`)

Plugin Capacitor custom registrato in `MainActivity.java` via `registerPlugin(OpcUaPlugin.class)`. Annotato `@CapacitorPlugin(name = "OpcUaPlugin")` — questo nome deve corrispondere a `Capacitor.Plugins.OpcUaPlugin` in `opcua.js`.

Tutti i metodi read/write accettano il parametro `nodeId` (stringa formato completo `ns=3;s=...`). Il Java usa `NodeId.parse(nodeStr)` per interpretarlo. Metodi disponibili: `connect`, `disconnect`, `readBool`, `readReal`, `writeBool`, `writeReal`, `writeInt`.

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

## Stato debug connessione MQTT (aggiornato 2026-05-13)

### Approcci tentati e abbandonati
- **Cognito Identity Pool + SigV4** (`@aws-sdk/signature-v4`, `@aws-crypto/sha256-browser`): rimosso. Il presigned URL veniva rifiutato da AWS IoT Core nonostante le credenziali Cognito fossero valide (test Python con stesso algoritmo dava CONNESSO). Il problema era probabilmente Vite bundling dei pacchetti AWS SDK.
- **`crypto.subtle` manuale SigV4**: implementato correttamente ma stesso risultato — connessione rifiutata.

### Approccio attuale: Custom Authorizer
Connessione tramite `CasaAuthorizer` (Lambda AWS IoT Custom Authorizer):
- URL: `wss://endpoint/mqtt?x-amz-customauthorizer-name=CasaAuthorizer&token=...`
- Token in `src/config.js` → `AWS_IOT.authorizerToken`
- **Token attuale**: `CasaCalcabrini2024SecretToken`
- Campo `username` aggiunto a `mqtt.connect()` come secondo vettore per il token (alcuni client strippano i query param prima dell'handshake WS)

### Commit WIP attuale (`2598a5e`)
Contiene debug logging temporaneo da rimuovere dopo il test:
- `console.debug('[MQTT] connecting to:', WS_URL)`
- listener `packetreceive` per tracciare la handshake
- `console.error('[MQTT] error completo:', err)`

Quando la connessione funziona: rimuovere il commit WIP con `git revert 2598a5e` o pulire manualmente i log e fare un nuovo commit.

## Regole FONDAMENTALI

- **NON toccare mai**: certificati TLS, endpoint AWS, META-INF fixes Gradle, workflow GitHub Actions
- **Modalità REMOTE**: esporre SOLO luci/temperature/allarmi, mai pompa/energia/setpoint
- **Nuove funzionalità** per pompa/energia/riscaldamento: SOLO in modalità LOCAL (OPC UA)

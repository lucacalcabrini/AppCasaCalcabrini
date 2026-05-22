# PLC Reference — AppCasaCalcabrini

File di riferimento per Claude. Aggiornare ogni volta che arrivano nuovi dati TIA Portal.

## CPU principale — 192.168.178.250

**Modello**: Siemens S7-1200 1215C DC/DC/DC, FW V4.6, TIA Portal V18  
**Rack**: 0, **Slot**: 1  
**Protocollo LOCAL**: S7 GET/PUT (ISO-on-TCP porta 102)  
**PREREQUISITO**: ogni DB letto per offset assoluto DEVE avere "Accesso ottimizzato al blocco = OFF"

---

## DB6 — DbCasa ✅ (già implementato in s7.js)

**Accesso ottimizzato**: OFF  
**Tipo**: GlobalDB, 1074 byte (struttura da tia_db_report.md)  
**Struttura**: 4 byte header (maxUt+maxAl constants) + `UtCasa[0]` + `UtAllarme[0]`

> ⚠️ Il report TIA esporta solo il primo elemento di ogni array quando i bounds usano costanti simboliche.  
> Formula app (s7.js): `i*542 + 516` per `Attiva` di Utenze[i] (non 512 — c'è header da 4B).

**Struttura `UtCasa` (stride 542 byte)**:

| Variabile | Offset nel elemento | Tipo | Note |
|---|---|---|---|
| `Nome` | +0 | String[256] (256B) | nome leggibile |
| `TopicId` | +256 | String[256] (256B) | ID MQTT es. `luce_camera` |
| `Attiva` | +512 | Bool bit 0 | 1=accesa (scritto dal PLC) |
| `Temp` | +514 | Real (4B) | °C, 0.0 se non disponibile |
| `Req` | +518 | Int16 | 0=nessuna, 1=ON, 2=OFF (write app→PLC) |
| `NotificaAbilitata` | +520 | Bool bit 0 | |
| `UltimaVariazione` | +522 | DTL (12B) | timestamp ultimo cambio |
| `ContAccensioni` | +534 | UDInt (4B) | totale accensioni |
| `ContComandoAlexa` | +538 | UDInt (4B) | comandi Alexa |

**Struttura `UtAllarme` (stride 528 byte)**:

| Variabile | Offset nel elemento | Tipo | Note |
|---|---|---|---|
| `Abilitato` | +512 | Bool bit 0 | |
| `Attivo` | +512 | Bool bit 1 | 1=allarme attivo |
| `PrioritaAlta` | +512 | Bool bit 5 | |
| `UltimaAttivazione` | +514 | DTL (12B) | |
| `ContAttivazioni` | +526 | UInt (2B) | |

---

## DB1 — DbRiscaldamento ✅ (implementato in s7clima.js)

**Accesso ottimizzato**: OFF  
**Tipo**: **InstanceDB** (10033 byte totali) — offset assoluti verificati da tia_db_dump.xml  
**Batch read app**: `start=5544, size=1856` (copre Setup + Zone + Impianti)

### Setup (offset assoluto 5544)

| Variabile | Offset assoluto | Tipo | Note |
|---|---|---|---|
| `EstateInverno` | 5544.0 | Bool bit 0 | 0=Estate, 1=Inverno |
| `GasEnable` | 5544.1 | Bool bit 1 | |
| `PelletEnable` | 5544.2 | Bool bit 2 | |
| `PelletPriority` | 5544.3 | Bool bit 3 | 0=Gas prio, 1=Pellet prio |
| `TemperaturaCollettore` | 5592 | Real Float32 BE | °C collettore |
| `PelletNonAvviato` | 5596.0 | Bool bit 0 | |

### Zone TempStanze (DatiHMI) — stride **162 byte**

| Zona | Base assoluta DB1 |
|---|---|
| Camera | 5610 |
| Cameretta | 5772 |
| Ingresso | 5934 |
| Studio | 6096 |
| Corridoio | 6258 |
| Cantina | 6420 |
| Salone | 6582 |
| Cucina | 6744 |
| BagnoBlu | 6906 |
| BagnoBianco | 7068 |

**Struttura `DatiTemperatura` UDT (128 byte) — offset relativi a zona_base**:

| Campo | Rel | Tipo | Note |
|---|---|---|---|
| `Enable` | +0 | Bool bit 0 | 0=zona disabilitata |
| `Estate/Inverno` | +0 | Bool bit 1 | copia locale del flag globale |
| `Manuale.ManAuto` | +2 | Bool bit 0 | **0=Manuale, 1=Auto** |
| `Manuale.SetpointMAN` | +4 | Real Float32 BE | °C, setpoint manuale da scrivere |
| `Setup.Filtri.FiltroOff` | +8 | Time (4B) | default T#15m |
| `Setup.Filtri.FiltroOn` | +12 | Time (4B) | default T#15m |
| `Setup.Isteresi` | +16 | Real (4B) | default 1.0 °C |
| `Setup.Setpoint[0..23]` | +20..+115 | Real×24 (96B) | setpoint per ora |
| `Status.ActTemp` | +116 | Real Float32 BE | **°C temperatura attuale** |
| `Status.ActSetpoint` | +120 | Real Float32 BE | setpoint attivo calcolato dal PLC |
| `Status.ActIndiceSetpoint` | +124 | Int16 | indice ora corrente (0..23) |
| `Status.Out` | +126 | Bool bit 0 | **1=richiede calore** |

> `Out` è un **Bool**, NON una percentuale. L'interfaccia mostra ON/OFF, non barra.  
> `ActTemp` (+116) è la temperatura corrente misurata — utile per display in app.

### CaldaiaPellet (DatiHMI.Stato base 7230)

| Campo | Offset assoluto | Tipo | Note |
|---|---|---|---|
| `DatiHMI.Stato.On` | 7230.1 | Bool bit 1 | |
| `DatiHMI.Stato.Allarme` | 7230.3 | Bool bit 3 | |
| `DatiHMI.Stato.Disabilitata` | 7230.5 | Bool bit 5 | |
| `DatiHMI.StatoInt` | 7232 | Int16 BE | 100=avv, 120=ON, 140=speg, 160=allrm, 180=attesa, 200=dis |
| `DatiHMI.Local.ManOn` | 7246.1 | Bool bit 1 | write: set/clear bit 1 |

### CaldaiaGas (DatiHMI.Stato base 7268)

| Campo | Offset assoluto | Tipo | Note |
|---|---|---|---|
| `DatiHMI.Stato.On` | 7268.1 | Bool bit 1 | |
| `DatiHMI.Stato.Disabilitata` | 7268.5 | Bool bit 5 | |
| `DatiHMI.StatoInt` | 7270 | Int16 BE | stessi codici caldaia |
| `DatiHMI.Local.ManOn` | 7284.1 | Bool bit 1 | |

### PompaAlta

| Campo | Offset assoluto | Tipo |
|---|---|---|
| `DatiHMI.Stato.On` | 7306.1 | Bool bit 1 |
| `DatiHMI.Local.ManOn` | 7320.1 | Bool bit 1 |

### PompaBassa

| Campo | Offset assoluto | Tipo |
|---|---|---|
| `DatiHMI.Stato.On` | 7340.1 | Bool bit 1 |
| `DatiHMI.Local.ManOn` | 7354.1 | Bool bit 1 |

### PompaGas

| Campo | Offset assoluto | Tipo |
|---|---|---|
| `DatiHMI.Stato.On` | 7374.1 | Bool bit 1 |
| `DatiHMI.Local.ManOn` | 7388.1 | Bool bit 1 |

---

## DB11 — ContEnergia ✅ (implementato in s7clima.js)

**Accesso ottimizzato**: OFF  
**Struttura**: Header (32 byte) + `Consumo[1..7]` (7 giorni × 102 byte) + `Indice old` (2 byte)

### Header (offset assoluti)

| Variabile | Offset | Tipo | Note |
|---|---|---|---|
| `OldH` | 0 | USInt | Ora precedente (fronte cambio ora) |
| `OldD` | 1 | USInt | Giorno precedente |
| `OldMin` | 2 | USInt | Minuto precedente |
| `T_Diff` | 4 | Real | ms tra impulsi contatore |
| `Actual_Kw` | 8 | Real Float32 BE | **Potenza istantanea kW** |
| `Kwh_Giorno` | 12 | Real Float32 BE | **kWh giornata corrente** |
| `Kwh_GiornoOld` | 16 | Real Float32 BE | kWh giorno precedente |
| `Kwh_Ora` | 20 | Real Float32 BE | **kWh ora corrente** |
| `ContPulseGiorno` | 24 | Real | Contatore impulsi oggi |
| `ContPulseOra` | 28 | Real | Contatore impulsi ora corrente |

### Consumo[1..7] — buffer 7 giorni (base 32, stride 102 byte)

`Consumo[d]` base = `32 + (d-1) * 102`

| Campo | Offset rel | Tipo | Note |
|---|---|---|---|
| `KWH[0..23]` | +0..+92 | Real×24 | kWh per ora 0..23 (4 byte ciascuno) |
| `Data` | +96 | Date (Uint16) | Giorni da 1990-01-01 |
| `Total_KWH` | +98 | Real Float32 BE | Totale kWh della giornata |

| Slot | Base assoluta |
|---|---|
| Consumo[1] | 32 |
| Consumo[2] | 134 |
| Consumo[3] | 236 |
| Consumo[4] | 338 |
| Consumo[5] | 440 |
| Consumo[6] | 542 |
| Consumo[7] | 644 |

### Varie

| Variabile | Offset | Tipo | Note |
|---|---|---|---|
| `Indice old` | 746 | Int16 BE | Indice slot attivo nel buffer circolare |

**Lettura app**: `s7ReadEnergia()` legge 748 byte, restituisce `{kw, kwhDay, kwhHour, history[7]}`. `s7ReadEnergiaFast()` legge solo 32 byte per i valori istantanei.

---

## CPU pozzo — 192.168.178.252 ✅ (implementato in s7pozzo.js)

**Modello**: S7-1200 (rack=0, slot=1)  
**Protocollo**: S7 GET/PUT, porta 102  
**PREREQUISITO**: "Accesso ottimizzato al blocco" = OFF su DB2 e DB11

### DB2 — GestionePompa ✅

| Variabile | Offset | Tipo | Note |
|---|---|---|---|
| `SetupEnbTime.Start` | 0 | Time_Of_Day (4B) | ora inizio abilitazione |
| `SetupEnbTime.Stop` | 4 | Time_Of_Day (4B) | ora fine abilitazione |
| `DisableDaHMI` | 8.0 | Bool bit 0 | 1=pompa disabilitata da app (write) |
| `ResetEV` | 8.1 | Bool bit 1 | impulso reset elettrovalvola (write) |
| `Enb.orario` | 10.0 | Bool bit 0 | 1=condizione oraria soddisfatta |
| `Enb.assorbimento` | 10.1 | Bool bit 1 | 1=condizione assorbimento soddisfatta |
| `Bypass.Orario` | 12.0 | Bool bit 0 | bypass orario attivo |
| `Bypass.Assorbimento` | 12.1 | Bool bit 1 | bypass assorbimento attivo |
| `STS_Pompa` | 14 | Int16 BE | **0=off, 1=running** |
| `AllarmeTempoAvvio` | 16.0 | Bool bit 0 | allarme tempo avvio superato |
| `SetupTempoAllarme` | 18 | Time (DInt 4B) | default T#2H |

**Lettura app**: 22 byte da offset 0. `on = STS_Pompa > 0`.

**ScattoTermico** (`%E0.1`): ingresso fisico, inviato via PROFINET al PLC principale → appare come allarme `POMPA_GUASTO` (ALARMS[0]) nel DB6.

### DB11 — ContEnergia (POZZO) ✅

**Stessa struttura identica** del DB11 del PLC principale.  
Traccia l'energia assorbita dalla pompa pozzo.  
Lettura app: `s7ReadEnergiaPozzo()` legge 32 byte (Actual_Kw@8, Kwh_Giorno@12, Kwh_Ora@20).

### Altri DB (non usati dall'app)

| DB | Nome | Contenuto |
|---|---|---|
| DB1 | Com | Struttura comunicazione PROFINET con PLC principale |
| DB10 | Allarmi | Array[1..64] of Bool — allarme[9]=ScattoTermico, allarme[10]=TempoAvvio |
| DB3 | TempoMassimoPompa | TON timer per allarme tempo max |

---

## DB19 — MqttDb (debug MQTT)

**Accesso ottimizzato**: OFF | **Tipo**: GlobalDB | **Dim**: 3474 byte  
**Scopo**: configurazione e stato runtime del client LMQTT_Client V3.1

| Variabile | Offset | Tipo | Note |
|---|---|---|---|
| `control.enable` | 0.0 | Bool | abilita il client MQTT |
| `control.publish` | 0.1 | Bool | trigger publish (set=avvia, clear=stop) |
| `control.subscribe` | 0.2 | Bool | trigger subscribe |
| `output.done` | 2.1 | Bool | operazione completata (impulso) |
| `output.busy` | 2.2 | Bool | operazione in corso |
| `output.error` | 2.3 | Bool | errore presente |
| `output.status` | 4 | Word | **`16#7004`=CONNECTED** — `16#8xxx`=errore |
| `broker` | 3204 | String | `a3fmnf8o7o8knx-ats.iot.eu-west-1.amazonaws.com.` |
| `port` | 3460 | UInt | **8883** (TLS) |
| `tls.enableTls` | 3462.0 | Bool | TRUE |
| `tls.validateServerIdentity` | 3462.1 | Bool | TRUE |
| `tls.brokerCert` | 3464 | UDInt | **12** (certificato CA) |
| `tls.clientCert` | 3468 | UDInt | **13** (certificato PLC) |
| `keepAlive` | 3472 | UInt | **60** secondi |

---

## DB10 — FbMqttCommandi_DB (debug logica MQTT)

**Accesso ottimizzato**: OFF | **Tipo**: InstanceDB | **Dim**: 33 byte  
**Scopo**: stato runtime del FB che gestisce la logica subscribe/publish

| Variabile | Offset | Tipo | Note |
|---|---|---|---|
| `Enable` | 0.0 | Bool | FB abilitato |
| `Connesso` | 0.1 | Bool | **TRUE = PLC connesso al broker** |
| `pubBusy` | 0.2 | Bool | publish in corso |
| `AllarmeAttivo` | 0.3 | Bool | c'è almeno un allarme attivo |
| `ContAllarmiAttivi` | 2 | Int16 | numero allarmi attivi |
| `CmdTotali` | 4 | UDInt | totale comandi ricevuti |
| `CmdSconosciuti` | 8 | UDInt | comandi non riconosciuti |
| `StatoFB` | 12 | Int16 | stato aggregato FB |
| `sState` | 14 | Int16 | **stato machine**: 0=idle, 1=build, 2=wait, 3=publish |
| `sBuildRequest` | 18.0 | Bool | richiesta build payload (set da cmd STATO) |

> **Debug tip**: se `Connesso=FALSE` → problema connessione broker/TLS (vedere `MqttDb.output.status`).  
> Se `sState` fisso a `3` → state machine bloccata in publish (aggiungere timeout).

---

## MQTT (modalità REMOTE)

**Endpoint**: `a3fmnf8o7o8knx-ats.iot.eu-west-1.amazonaws.com`  
**Topic sub**: `casa/stato` | **Topic pub**: `casa/cmd`  
**Auth**: Custom Authorizer `CasaAuthorizer`, token in `.env.local`  
**Payload formato**: `stato:temp;...|allrm0;allrm1;...` (vedere parser.js)

---

---

## DB2 — GestioneLuci (CPU principale)

**Accesso ottimizzato**: OFF | **Tipo**: **InstanceDB** | **Dim**: 7119 byte  
**Nota**: l'app usa **DB6** per luci (stato+comando). DB2 è utile per funzioni future (livelli cucina, state machine interna).

### Struttura DB2 — layout reale da tia_db_dump.xml

**12× `IO_UtCasa`** (stride 542B) a partire da offset 8:

| Indice | Luce | Offset `IO_UtCasa` | `Attiva` | `Req` |
|---|---|---|---|---|
| 0 | (prima luce) | 8 | 520 | 534 |
| 1 | (seconda luce) | 550 | 1062 | 1076 |
| … | … | 8+i×542 | 8+i×542+512 | 8+i×542+526 |
| 11 | (dodicesima) | 5970 | 6482 | 6496 |

**DatiHMI state machine luci** (a partire da offset 6536):

| Luce | DatiHMI base | `OutLuce` / note |
|---|---|---|
| LuciCucina (3_Pulse) | 6536 | OutLuce_1=6544.1, OutLuce_2=6544.2, OutLuce_3=6544.3, ActCounter=6546 |
| luceCantina | 6560 | OutLuce=6562.1 |
| LuceBagnoBlu | 6582 | OutLuce=6584.1 |
| LuceSala | 6604 | OutLuce=6606.1 |
| LuceScale | 6626 | OutLuce=6628.1 |
| LuceCameretta | 6648 | OutLuce=6650.1 |
| LuceCamera | 6670 | OutLuce=6672.1 |
| LuceBagnoBianco | 6692 | OutLuce=6694.1 |
| LuceStudio | 6714 | OutLuce=6716.1 |
| LuceIngresso | 6736 | OutLuce=6738.1 |
| LuceEsterna | 6758 | OutLuce=6760.1 |
| LuceCrepuscolare | 6780 | OutLuce=6782.1 |

> Stride DatiHMI Luci_1P = **22 byte**. `PB_Luce` (toggle) = base+0.0, `PB_Off` = base+0.1.  
> **Idea futura**: leggere DB2 byte 6546 (ActCounter) per mostrare livello cucina (0=spenta, 1-3=livelli).

---

## DB13 — FifoEnergia (storico 31 giorni — futuro)

**Accesso ottimizzato**: OFF | **Tipo**: GlobalDB | **Dim**: 6076 byte  
**Scopo**: buffer circolare 31 giorni per storico mensile (non usato dall'app — sviluppo futuro)

**Struttura** (stride **98 byte** per giorno — NON ha `Total_KWH`):

| Campo | Offset rel | Tipo | Note |
|---|---|---|---|
| `Kwh[0..23]` | +0..+92 | Real×24 (96B) | kWh per ora 0..23 |
| `Data` | +96 | Date (Uint16) | giorni da 1990-01-01 |

`Dato[d]` base = `(d-1) * 98` (d = 1..31). Seconda copia FIFO a offset 3038.

---

## DB15 — Segnalazioni (allarmi/sensori)

**Accesso ottimizzato**: OFF | **Tipo**: GlobalDB | **Dim**: 8 byte  
**Scopo**: stati aggregati sensori porte/finestre/persiane aggiornati ciclicamente dal PLC

### Byte 0 — Allarmi attivi (`_A`)

| Bit | Variabile | Sensore |
|---|---|---|
| 0.0 | `PortaSala_A` | Porta sala |
| 0.1 | `FinestraSala_A` | Finestra sala |
| 0.2 | `Portone_A` | Portone ingresso |
| 0.3 | `FinestraCucina_A` | Finestra cucina |
| 0.4 | `FinestraBagnoBlu_A` | Finestra bagno blu |
| 0.5 | `FinestraCantina_A` | Finestra cantina |
| 0.6 | `FinestraCorridoio_A` | Finestra corridoio |
| 0.7 | `FinestraCamera_A` | Finestra camera |

### Byte 1

| Bit | Variabile | Note |
|---|---|---|
| 1.0 | `FinestraStudio_A` | Finestra studio |
| 1.1 | `AttivatoAllarme` | Allarme attivato (evento) |
| 1.2 | `DisattivatoAllarme` | Allarme disattivato (evento) |
| 1.3 | `FinestraVascaBagnoBianco_A` | Finestra vasca b.bianco |
| 1.4 | `FinestraLavaboBagnoBianco_A` | Finestra lavabo b.bianco |
| 1.5 | `FinestraLettoCameretta_A` | Finestra letto cameretta |
| 1.6 | `FinestraIngressoCameretta_A` | Finestra ingresso cameretta |
| 1.7 | `AntimanomissioneSirena` | Antimanomissione sirena |

### Byte 2

| Bit | Variabile | Note |
|---|---|---|
| 2.0 | `AllarmeScattato` | Allarme scattato |
| 2.1 | `TamperFinestraLettoCameretta` | Tamper finestra letto cameretta |
| 2.2 | `TamperFinestraLavaboBagnoBianco` | Tamper finestra lavabo b.bianco |
| 2.6 | `PersianaCorridoio_A` | Persiana corridoio |
| 2.7 | `PersianaCamera_A` | Persiana camera |

### Byte 3

| Bit | Variabile | Note |
|---|---|---|
| 3.0 | `PersianaStudio_A` | Persiana studio |
| 3.7 | `PelletNonAvviata` | Caldaia pellet non avviata |

### Byte 4–7 — Warning (`_W`, finestre/persiane aperte non allarme)

| Bit | Variabile |
|---|---|
| 4.0 | `PortaSala_W` |
| 4.1 | `FinestraVascaBagnoBianco_W` |
| 4.2 | `FinestraSala_W` |
| 4.3 | `FinestraLavaboBagnoBianco_W` |
| 4.4 | `Portone_W` |
| 4.5 | `FinestraLettoCameretta_W` |
| 4.6 | `FinestraCucina_W` |
| 4.7 | `FinestraIngressoCameretta_W` |
| 5.0 | `FinestraBagnoBlu_W` |
| 5.2 | `FinestraCantina_W` |
| 5.4 | `FinestraCorridoio_W` |
| 5.5 | `PersianaCorridoio_W` |
| 5.6 | `FinestraCamera_W` |
| 5.7 | `PersianaCamera_W` |
| 6.0 | `FinestraStudio_W` |
| 6.1 | `PersianaStudio_W` |

---

## DB3, DB7, DB26 (non usati dall'app)

| DB | Nome | Contenuto |
|---|---|---|
| DB3 | GestioneAllarme_DB | InstanceDB 517B — 16 sensori con Gate/Tamper/AllarmON per zona |
| DB7 | ListaFiFo | FIFO Int+DTL 100 elementi (log eventi) |
| DB26 | Testi | Array[1..32] of String[32] — testi notifiche |
| DB102 | DataOra | InstanceDB 42B — gestione data/ora PLC (DTL#...) |

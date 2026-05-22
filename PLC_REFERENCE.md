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
**Struttura**: `Array[0..15] of UtCasa` + `Array[0..31] of UtAllarme`

| Variabile | Offset | Tipo | Note |
|---|---|---|---|
| `Utenze[i].Attiva` | `i*542 + 512` | Bool bit 0 | stato luce |
| `Utenze[i].Temp` | `i*542 + 514` | Real | °C |
| `Utenze[i].Req` | `i*542 + 518` | Int16 | 1=accendi, 2=spegni (write) |
| `Allarmi[j].Attivo` | `8672 + j*528 + 512` | Bool bit 1 | bit 0 = Abilitato |

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

**Offset relativi a zona_base** (offset assoluto = zona_base + rel):

| Campo | Rel | Tipo | Note |
|---|---|---|---|
| `DatiHMI.Enable` | +0 | Bool bit 0 | 0=zona disabilitata |
| `DatiHMI.Manuale.ManAuto` | +2 | Bool bit 0 | **0=Manuale, 1=Auto** |
| `DatiHMI.Manuale.SetpointMAN` | +4 | Real Float32 BE | °C, setpoint da scrivere |
| `DatiHMI.Status.ActSetpoint` | +120 | Real Float32 BE | setpoint attivo calcolato dal PLC |
| `DatiHMI.Status.Out` | +126 | Bool bit 0 | **1=richiede calore** (on/off, non %) |

> `Out` è un **Bool**, NON una percentuale. L'interfaccia mostra ON/OFF, non barra.

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

## MQTT (modalità REMOTE)

**Endpoint**: `a3fmnf8o7o8knx-ats.iot.eu-west-1.amazonaws.com`  
**Topic sub**: `casa/stato` | **Topic pub**: `casa/cmd`  
**Auth**: Custom Authorizer `CasaAuthorizer`, token in `.env.local`  
**Payload formato**: `stato:temp;...|allrm0;allrm1;...` (vedere parser.js)

---

---

## DB2 — GestioneLuci ✅ documentato (non usato dall'app — controllo via DB6)

**Nota**: l'app usa DB6 per leggere/scrivere le luci. DB2 è utile solo per funzioni avanzate future (es. livelli cucina).

### Luci presenti in DB2

| Nome DB2 | Tipo | Base DB2 | Nota |
|---|---|---|---|
| LuciCucina | Luci_3_Pulse | 0 | **3 livelli** — ActCounter, OutLuce_1/2/3 |
| luceCantina | Luci_1P | 62 | |
| LuceBagnoBlu | Luci_1P | 122 | |
| LuceSala | Luci_1P | 182 | |
| LuceScale | Luci_1P | 242 | |
| LuceCameretta | Luci_1P | 302 | |
| LuceCamera | Luci_1P | 362 | |
| LuceBagnoBianco | Luci_1P | 422 | |
| LuceStudio | Luci_1P | 482 | |
| LuceIngresso | Luci_1P | 542 | |
| LuceEsterna | Luci_1P | 602 | |
| LuceCrepuscolare | Luci_1P | 662 | |

### Struttura Luci_1P (offset relativi a base)

| Campo | Offset rel | Tipo | Note |
|---|---|---|---|
| `DatiHMI.Manuale.PB_Luce` | +10.0 | Bool bit 0 | toggle HMI |
| `DatiHMI.Manuale.PB_Off` | +10.1 | Bool bit 1 | spegni HMI |
| `DatiHMI.Status.OutLuce` | +12.1 | Bool bit 1 | stato output |
| `DatiHMI.Enable.Enable` | +14.0 | Bool bit 0 | abilitazione |

### Struttura Luci_3_Pulse — solo LuciCucina (3 livelli luce)

| Campo | Offset assoluto DB2 | Tipo | Note |
|---|---|---|---|
| `DatiHMI.Status.OutLuce_1` | 18.1 | Bool bit 1 | livello 1 acceso |
| `DatiHMI.Status.OutLuce_2` | 18.2 | Bool bit 2 | livello 2 acceso |
| `DatiHMI.Status.OutLuce_3` | 18.3 | Bool bit 3 | livello 3 acceso |
| `DatiHMI.Status.ActCounter` | 20 | Int16 | quanti livelli attivi (0-3) |

> **Idea futura**: leggere DB2 byte 20 (ActCounter) per mostrare il livello cucina nell'app invece di semplice ON/OFF.

---

## DB3, DB15 (non usati dall'app)

| DB | Nome | Contenuto |
|---|---|---|
| DB3 | GestioneAllarme_DB | ControlloAccessi 16 sensori porte/finestre |
| DB15 | Segnalazioni | 8 byte Bool stati sensori |

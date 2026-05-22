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

**Accesso ottimizzato**: da verificare → impostare OFF  
**Struttura**: Setup (0) + 10 zone TempStanze + CaldaiaPellet + CaldaiaGas + Pompe

### Setup (offset 0)

| Variabile | Offset | Tipo | Note |
|---|---|---|---|
| `EstateInverno` | 0.0 | Bool bit 0 | 0=Estate, 1=Inverno |
| `GasEnable` | 0.1 | Bool bit 1 | |
| `PelletEnable` | 0.2 | Bool bit 2 | |
| `PelletPriority` | 0.3 | Bool bit 3 | 0=Gas prio, 1=Pellet prio |

### Zone TempStanze — stride 208 byte

| Zona | Base assoluta DB1 |
|---|---|
| Camera | 10 |
| Cameretta | 218 |
| Ingresso | 426 |
| Studio | 634 |
| Corridoio | 842 |
| Cantina | 1050 |
| Salone | 1258 |
| Cucina | 1466 |
| BagnoBlu | 1674 |
| BagnoBianco | 1882 |

**Offset relativi a zone_base** (tutti assoluti = zone_base + rel):

| Campo | Rel | Tipo | Note |
|---|---|---|---|
| `DatiHMI.Enable` | +18 | Bool bit 0 | 0=zona disabilitata |
| `DatiHMI.Manuale.ManAuto` | +20 | Bool bit 0 | **0=Manuale, 1=Auto** |
| `DatiHMI.Manuale.SetpointMAN` | +22 | Real Float32 BE | °C, setpoint da scrivere |
| `DatiHMI.Status.ActTemp` | +134 | Real Float32 BE | °C corrente |
| `DatiHMI.Status.ActSetpoint` | +138 | Real Float32 BE | setpoint attivo calcolato |
| `DatiHMI.Status.Out` | +144 | Bool bit 0 | **1=richiede calore** (on/off, non %) |

> `Out` è un **Bool**, NON una percentuale. L'interfaccia mostra ON/OFF, non barra.

### CaldaiaPellet (base 2090)

| Campo | Offset assoluto | Tipo | Note |
|---|---|---|---|
| `DatiHMI.Stato.On` | 2094 | Bool bit 1 | |
| `DatiHMI.Stato.Allarme` | 2094 | Bool bit 3 | |
| `DatiHMI.Stato.Disabilitata` | 2094 | Bool bit 5 | |
| `DatiHMI.StatoInt` | 2096 | Int16 BE | 100=avv, 120=ON, 140=speg, 160=allrm, 180=attesa, 200=dis |
| `DatiHMI.Local.AutoLocal` | 2110 | Bool bit 0 | 0=auto, 1=local (gestito da FB) |
| `DatiHMI.Local.ManOn` | 2110 | Bool bit 1 | write: set/clear bit 1 |

### CaldaiaGas (base 2174)

| Campo | Offset assoluto | Tipo | Note |
|---|---|---|---|
| `DatiHMI.Stato.On` | 2178 | Bool bit 1 | |
| `DatiHMI.Stato.Disabilitata` | 2178 | Bool bit 5 | |
| `DatiHMI.StatoInt` | 2180 | Int16 BE | stessi codici caldaia |
| `DatiHMI.Local.ManOn` | 2194 | Bool bit 1 | |

### PompaAlta (base 2258)

| Campo | Offset assoluto | Tipo |
|---|---|---|
| `DatiHMI.Stato.On` | 2262 | Bool bit 1 |
| `DatiHMI.Local.ManOn` | 2276 | Bool bit 1 |

### PompaBassa (base 2338)

| Campo | Offset assoluto | Tipo |
|---|---|---|
| `DatiHMI.Stato.On` | 2342 | Bool bit 1 |
| `DatiHMI.Local.ManOn` | 2356 | Bool bit 1 |

### PompaGas (base 2418)

| Campo | Offset assoluto | Tipo |
|---|---|---|
| `DatiHMI.Stato.On` | 2422 | Bool bit 1 |
| `DatiHMI.Local.ManOn` | 2436 | Bool bit 1 |

### Varie

| Campo | Offset assoluto | Tipo | Note |
|---|---|---|---|
| `TemperaturaCollettore` | 2534 | Real Float32 BE | °C collettore |
| `PelletNonAvviato` | 2538 | Bool bit 0 | |

---

## DB11 — ContEnergia ⏳ (in attesa dati TIA Portal)

**Accesso ottimizzato**: da verificare  
**Note**: buffer 7gg × 24h di kWh  
Struttura da ricevere dall'utente.

---

## CPU pozzo — 192.168.178.252

**S7 GET/PUT**: IP separato, stessa procedura (rack=0, slot=1 presumibilmente)  
**DB**: da ricevere dall'utente  
**Dati attesi**: GestionePompa, STS_Pompa (Int), ScattoTermico, DisableDaHMI, Enb.orario, Bypass.Orario, ContEnergia, ResetEV

---

## MQTT (modalità REMOTE)

**Endpoint**: `a3fmnf8o7o8knx-ats.iot.eu-west-1.amazonaws.com`  
**Topic sub**: `casa/stato` | **Topic pub**: `casa/cmd`  
**Auth**: Custom Authorizer `CasaAuthorizer`, token in `.env.local`  
**Payload formato**: `stato:temp;...|allrm0;allrm1;...` (vedere parser.js)

---

## DB2, DB3, DB15 (non usati dall'app)

| DB | Nome | Contenuto |
|---|---|---|
| DB2 | GestioneLuci | FB luci (debug) |
| DB3 | GestioneAllarme_DB | ControlloAccessi 16 sensori |
| DB15 | Segnalazioni | 8 byte Bool stati sensori |

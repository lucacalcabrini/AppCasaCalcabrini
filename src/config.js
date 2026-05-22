export const PLC_IP = '192.168.178.250';
export const PING_TIMEOUT_MS = 500;

// Comunicazione S7 GET/PUT (percorso LOCAL).
// Legge/scrive direttamente DbCasa (DB6) — nessuna DB ausiliaria necessaria.
// PREREQUISITO TIA: DbCasa → Proprietà → "Accesso ottimizzato al blocco" = OFF
//   poi Compila + Scarica. Nessun'altra modifica al PLC richiesta.
export const S7 = {
  host: PLC_IP,
  rack: 0,
  slot: 1,
  db: 6,   // DbCasa — accesso ottimizzato DEVE essere disabilitato
};

export const GITHUB = {
  owner: 'lucacalcabrini',
  repo: 'AppCasaCalcabrini',
  // Repo pubblico: nessun token necessario per l'auto-updater
};

export const AWS_IOT = {
  region: 'eu-west-1',
  endpoint: 'd0213360tkzu6jyvy3ua-ats.iot.eu-west-1.amazonaws.com',
  authorizerName: 'CasaAuthorizer',
  // Token letto da variabile d'ambiente (file .env.local, gitignored)
  authorizerToken: import.meta.env.VITE_AWS_IOT_TOKEN || '',
  topicStato: 'casa/stato',
  topicCmd: 'casa/cmd',
};

export const DEVICES = [
  { id: 'luce_camera',       nome: 'Luce Camera',       icona: '💡', hasTemp: true  },
  { id: 'luce_cucina',       nome: 'Luce Cucina',       icona: '💡', hasTemp: true  },
  { id: 'luce_sala',         nome: 'Luce Sala',         icona: '💡', hasTemp: true  },
  { id: 'luce_studio',       nome: 'Luce Studio',       icona: '💡', hasTemp: true  },
  { id: 'luce_bagno_bianco', nome: 'Bagno Bianco',      icona: '💡', hasTemp: true  },
  { id: 'luce_cameretta',    nome: 'Luce Cameretta',    icona: '💡', hasTemp: true  },
  { id: 'luce_scale',        nome: 'Luce Scale',        icona: '💡', hasTemp: false },
  { id: 'luce_esterna',      nome: 'Luce Esterna',      icona: '🌙', hasTemp: false },
  { id: 'luce_bagno_blu',    nome: 'Bagno Blu',         icona: '💡', hasTemp: true  },
  { id: 'luce_ingresso',     nome: 'Luce Ingresso',     icona: '💡', hasTemp: true  },
  { id: 'luce_cantina',      nome: 'Luce Cantina',      icona: '💡', hasTemp: true  },
  { id: 'caldaia_pellet',    nome: 'Caldaia Pellet',    icona: '🔥', hasTemp: false },
  { id: 'luce_corridoio',    nome: 'Luce Corridoio',    icona: '💡', hasTemp: true  },
  { id: 'luce_crepuscolare', nome: 'Crepuscolare',      icona: '🌅', hasTemp: false },
  null,
  null,
];

// ── Zone Riscaldamento (LOCAL / OPC UA only) ──────────────────────────────
// zone: nome del sotto-oggetto in DbRiscaldamento (verificato su HMITags.xlsx)
// deviceId: collega alla temperatura già disponibile via MQTT/OPC UA in DbCasa
export const ZONE_RISCALDAMENTO = [
  { id: 'camera',      nome: 'Camera',      icona: '🛏️', zone: 'Camera',      deviceId: 'luce_camera'       },
  { id: 'cameretta',   nome: 'Cameretta',   icona: '🛏️', zone: 'Cameretta',   deviceId: 'luce_cameretta'    },
  { id: 'salone',      nome: 'Salone',      icona: '🛋️', zone: 'Salone',      deviceId: 'luce_sala'         },
  { id: 'cucina',      nome: 'Cucina',      icona: '🍳',  zone: 'Cucina',      deviceId: 'luce_cucina'       },
  { id: 'studio',      nome: 'Studio',      icona: '💼',  zone: 'Studio',      deviceId: 'luce_studio'       },
  { id: 'corridoio',   nome: 'Corridoio',   icona: '🚪',  zone: 'Corridoio',   deviceId: 'luce_corridoio'    },
  { id: 'ingresso',    nome: 'Ingresso',    icona: '🏠',  zone: 'Ingresso',    deviceId: 'luce_ingresso'     },
  { id: 'bagno_bianco',nome: 'Bagno Bianco',icona: '🚿',  zone: 'BagnoBianco', deviceId: 'luce_bagno_bianco' },
  { id: 'bagno_blu',   nome: 'Bagno Blu',   icona: '🛁',  zone: 'BagnoBlu',    deviceId: 'luce_bagno_blu'    },
  { id: 'cantina',     nome: 'Cantina',     icona: '🔒',  zone: 'Cantina',     deviceId: 'luce_cantina'      },
];

// STRUTTURA CONFERMATA da HMITags.xlsx:
// Un unico DB "DbRiscaldamento" con sotto-struttura zone/caldaie/pompe.
// PLC tag reale: DbRiscaldamento.Camera.DatiHMI  → ns=3;s="DbRiscaldamento".Camera.DatiHMI
export function getRiscaldamentoNodes(zone) {
  const b = `ns=3;s="DbRiscaldamento".${zone}.DatiHMI`;
  return {
    tempAttuale:  `${b}.Status.ActTemp`,
    setpoint:     `${b}.Status.ActSetpoint`,
    valvolaOut:   `${b}.Status.Out`,
    manuale:      `${b}.Manuale.ManAuto`,
    setpointMan:  `${b}.Manuale.SetpointMAN`,
    on:           `${b}.Stato.On`,
    disabilitata: `${b}.Stato.Disabilitata`,
  };
}

// Nodi OPC UA — TUTTI verificati su HMITags.xlsx esportato da WinCC
const RDB = 'ns=3;s="DbRiscaldamento"'; // DB unico riscaldamento
const PZO = 'ns=3;s="POZZO"';           // Connessione PLC pozzo
const CPU = 'ns=3;s="ContEnergia"';     // Energia CPU (PLC tag senza prefisso DB)

export const OPC_NODES = {
  // Modalità stagionale globale — PLC tag: DbRiscaldamento.Setup.EstateInverno
  estateInverno:        `${RDB}.Setup.EstateInverno`,
  pelletEnable:         `${RDB}.Setup.PelletEnable`,
  gasEnable:            `${RDB}.Setup.GasEnable`,
  tempCollettore:       `${RDB}.TemperaturaCollettore`,
  pelletNonAvviato:     `${RDB}.PelletNonAvviato`,

  // Caldaia Pellet — PLC tag: DbRiscaldamento.CaldaiaPellet.DatiHMI
  caldaiaPellet_On:     `${RDB}.CaldaiaPellet.DatiHMI.Stato.On`,
  caldaiaPellet_Man:    `${RDB}.CaldaiaPellet.DatiHMI.Manuale.ManAuto`,
  caldaiaPellet_ManOn:  `${RDB}.CaldaiaPellet.DatiHMI.Local.ManOn`,
  caldaiaPellet_Temp:   `${RDB}.CaldaiaPellet.DatiHMI.Status.ActTemp`,
  caldaiaPellet_Out:    `${RDB}.CaldaiaPellet.DatiHMI.Status.Out`,

  // Caldaia Gas — PLC tag: DbRiscaldamento.CaldaiaGas.DatiHMI
  caldaiaGas_On:        `${RDB}.CaldaiaGas.DatiHMI.Stato.On`,
  caldaiaGas_Man:       `${RDB}.CaldaiaGas.DatiHMI.Manuale.ManAuto`,
  caldaiaGas_ManOn:     `${RDB}.CaldaiaGas.DatiHMI.Local.ManOn`,

  // Pompa Alta Temp — PLC tag: DbRiscaldamento.PompaAlta.DatiHMI
  pompaAlta_On:         `${RDB}.PompaAlta.DatiHMI.Stato.On`,
  pompaAlta_Man:        `${RDB}.PompaAlta.DatiHMI.Manuale.ManAuto`,
  pompaAlta_ManOn:      `${RDB}.PompaAlta.DatiHMI.Local.ManOn`,

  // Pompa Bassa Temp — PLC tag: DbRiscaldamento.PompaBassa.DatiHMI
  pompaBassa_On:        `${RDB}.PompaBassa.DatiHMI.Stato.On`,
  pompaBassa_Man:       `${RDB}.PompaBassa.DatiHMI.Manuale.ManAuto`,
  pompaBassa_ManOn:     `${RDB}.PompaBassa.DatiHMI.Local.ManOn`,

  // Pompa Gas — PLC tag: DbRiscaldamento.PompaGas.DatiHMI
  pompaGas_On:          `${RDB}.PompaGas.DatiHMI.Stato.On`,
  pompaGas_Man:         `${RDB}.PompaGas.DatiHMI.Manuale.ManAuto`,
  pompaGas_ManOn:       `${RDB}.PompaGas.DatiHMI.Local.ManOn`,

  // Pompa Pozzo — PLC tag reale su connessione POZZO (Int per STS!)
  pompaPozzo_STS:       `${PZO}.GestionePompa.STS_Pompa`,    // Int: 0=ferma, >0=in marcia
  pompaPozzo_Pompa:     `${PZO}.PompaPozzo`,                  // Bool: stato uscita
  pompaPozzo_Req:       `${PZO}.ReqStartPompa`,               // Bool
  pompaPozzo_Scatto:    `${PZO}.ScattoTermicoPompa`,          // Bool
  pompaPozzo_Disable:   `${PZO}.GestionePompa.DisableDaHMI`,  // Bool
  pompaPozzo_EnbOra:    `${PZO}.GestionePompa.Enb.orario`,    // Bool
  pompaPozzo_EnbAssorb: `${PZO}.GestionePompa.Enb.assorbimento`, // Bool
  pompaPozzo_Reset:     `${PZO}.GestionePompa.ResetEV`,       // Bool (impulso)
  pompaPozzo_Bypass:    `${PZO}.GestionePompa.Bypass.Orario`, // Bool

  // Energia Casa — PLC tag: ContEnergia.Actual_Kw (senza DB prefix)
  energiaCasa_Kw:       'ns=3;s="ContEnergia".Actual_Kw',
  energiaCasa_KwhDay:   'ns=3;s="ContEnergia".Kwh_Giorno',
  energiaCasa_KwhHour:  'ns=3;s="ContEnergia".Kwh_Ora',
  energiaMedia:         'ns=3;s="Media_100_Value".out',

  // Energia Pozzo
  energiaPozzo_Kw:      `${PZO}.ContEnergia.Actual_Kw`,
  energiaPozzo_KwhDay:  `${PZO}.ContEnergia.Kwh_Giorno`,
  energiaPozzo_KwhHour: `${PZO}.ContEnergia.Kwh_Ora`,
};

export const ALARMS = [
  { id: 'POMPA_GUASTO',           nome: 'Guasto Pompa Pozzo',           alta: true  },
  { id: 'TEMP_LOCALE_ALTA',       nome: 'Temp Alta Locale Tecnico',     alta: false },
  { id: 'PORTONE_APERTO',         nome: 'Portone Garage Aperto',        alta: false },
  { id: 'PERDITA_ACQUA',          nome: 'Perdita Acqua',                alta: true  },
  { id: 'RISCALDAMENTO_GUASTO',   nome: 'Guasto Riscaldamento',         alta: true  },
  { id: 'RETE_ASSENTE',           nome: 'Assenza Rete Elettrica',       alta: true  },
  { id: 'COMM_PLC_POZZO_KO',      nome: 'Comm PLC Pozzo Persa',         alta: false },
  { id: 'TEMP_EST_CRITICA',       nome: 'Temp Esterna Critica',         alta: false },
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
];

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
// db: nome del DB istanza in TIA Portal (da verificare online)
// deviceId: collega alla temperatura già disponibile via MQTT/OPC UA in DbCasa
export const ZONE_RISCALDAMENTO = [
  { id: 'camera',      nome: 'Camera',      icona: '🛏️', db: 'DbRiscaldamento_Camera',      deviceId: 'luce_camera'       },
  { id: 'cameretta',   nome: 'Cameretta',   icona: '🛏️', db: 'DbRiscaldamento_Cameretta',   deviceId: 'luce_cameretta'    },
  { id: 'salone',      nome: 'Salone',      icona: '🛋️', db: 'DbRiscaldamento_Salone',      deviceId: 'luce_sala'         },
  { id: 'cucina',      nome: 'Cucina',      icona: '🍳',  db: 'DbRiscaldamento_Cucina',      deviceId: 'luce_cucina'       },
  { id: 'studio',      nome: 'Studio',      icona: '💼',  db: 'DbRiscaldamento_Studio',      deviceId: 'luce_studio'       },
  { id: 'corridoio',   nome: 'Corridoio',   icona: '🚪',  db: 'DbRiscaldamento_Corridoio',   deviceId: 'luce_corridoio'    },
  { id: 'ingresso',    nome: 'Ingresso',    icona: '🏠',  db: 'DbRiscaldamento_Ingresso',    deviceId: 'luce_ingresso'     },
  { id: 'bagno_bianco',nome: 'Bagno Bianco',icona: '🚿',  db: 'DbRiscaldamento_BagnoBianco', deviceId: 'luce_bagno_bianco' },
  { id: 'bagno_blu',   nome: 'Bagno Blu',   icona: '🛁',  db: 'DbRiscaldamento_BagnoBlu',    deviceId: 'luce_bagno_blu'    },
  { id: 'cantina',     nome: 'Cantina',     icona: '🔒',  db: 'DbRiscaldamento_Cantina',     deviceId: 'luce_cantina'      },
];

// Genera i nodi OPC UA per una zona riscaldamento dato il nome DB
export function getRiscaldamentoNodes(db) {
  const b = `ns=3;s="${db}".DatiHMI`;
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

// Nodi OPC UA per impianti e energia (da verificare su TIA Portal online)
export const OPC_NODES = {
  // Modalità stagionale globale (false = Inverno, true = Estate)
  estateInverno:       'ns=3;s="DbRiscaldamento".Setup.EstateInverno',

  // Caldaia Pellet
  caldaiaPellet_On:    'ns=3;s="DbRiscaldamento_CaldaiaPellet".DatiHMI.Stato.On',
  caldaiaPellet_Man:   'ns=3;s="DbRiscaldamento_CaldaiaPellet".DatiHMI.Manuale.ManAuto',
  caldaiaPellet_ManOn: 'ns=3;s="DbRiscaldamento_CaldaiaPellet".DatiHMI.Local.ManOn',
  caldaiaPellet_Temp:  'ns=3;s="DbRiscaldamento_CaldaiaPellet".DatiHMI.Status.ActTemp',
  caldaiaPellet_Out:   'ns=3;s="DbRiscaldamento_CaldaiaPellet".DatiHMI.Status.Out',

  // Caldaia Gas
  caldaiaGas_On:       'ns=3;s="DbRiscaldamento_CaldaiaGas".DatiHMI.Stato.On',
  caldaiaGas_Man:      'ns=3;s="DbRiscaldamento_CaldaiaGas".DatiHMI.Manuale.ManAuto',
  caldaiaGas_ManOn:    'ns=3;s="DbRiscaldamento_CaldaiaGas".DatiHMI.Local.ManOn',

  // Pompa Circolazione (Alta)
  pompaAlta_On:        'ns=3;s="DbRiscaldamento_PompaAlta".DatiHMI.Stato.On',
  pompaAlta_Man:       'ns=3;s="DbRiscaldamento_PompaAlta".DatiHMI.Manuale.ManAuto',
  pompaAlta_ManOn:     'ns=3;s="DbRiscaldamento_PompaAlta".DatiHMI.Local.ManOn',

  // Pompa Pozzo (DB separato "POZZO" — stessa CPU o PLC satellite)
  pompaPozzo_STS:      'ns=3;s="POZZO".GestionePompa.STS_Pompa',
  pompaPozzo_Req:      'ns=3;s="POZZO".ReqStartPompa',
  pompaPozzo_Scatto:   'ns=3;s="POZZO".ScattoTermicoPompa',
  pompaPozzo_Disable:  'ns=3;s="POZZO".GestionePompa.DisableDaHMI',
  pompaPozzo_EnbOra:   'ns=3;s="POZZO".GestionePompa.Enb.orario',
  pompaPozzo_Reset:    'ns=3;s="POZZO".GestionePompa.ResetEV',
  pompaPozzo_Bypass:   'ns=3;s="POZZO".GestionePompa.Bypass.Orario',

  // Energia Casa
  energiaCasa_Kw:      'ns=3;s="CPU".ContEnergia.Actual_Kw',
  energiaCasa_KwhDay:  'ns=3;s="CPU".ContEnergia.Kwh_Giorno',
  energiaCasa_KwhHour: 'ns=3;s="CPU".ContEnergia.Kwh_Ora',
  energiaMedia:        'ns=3;s="CPU".Media_100_Value.out',

  // Energia Pozzo
  energiaPozzo_Kw:     'ns=3;s="POZZO".ContEnergia.Actual_Kw',
  energiaPozzo_KwhDay: 'ns=3;s="POZZO".ContEnergia.Kwh_Giorno',
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

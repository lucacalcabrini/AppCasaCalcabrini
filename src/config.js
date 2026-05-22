export const PLC_IP        = '192.168.178.250';
export const PLC_POZZO_IP  = '192.168.178.252';
export const PING_TIMEOUT_MS = 500;

// ── S7 GET/PUT ────────────────────────────────────────────────────────────────
// PREREQUISITO TIA Portal: ogni DB letto → "Accesso ottimizzato al blocco" = OFF
// poi Compila + Scarica.
export const S7 = {
  host: PLC_IP,
  rack: 0,
  slot: 1,
  db: 6,   // DbCasa (DB6) — lettura luci + allarmi
};

// DB numbers (CPU principale 192.168.178.250)
export const S7_DB = {
  casa:          6,   // DbCasa — Utenze[0..15] + Allarmi[0..31]
  riscaldamento: 1,   // DbRiscaldamento — zone, caldaie, pompe
  energia:       11,  // ContEnergia — buffer kWh (struttura in attesa)
};

export const GITHUB = {
  owner: 'lucacalcabrini',
  repo: 'AppCasaCalcabrini',
};

export const AWS_IOT = {
  region: 'eu-west-1',
  endpoint: 'd0213360tkzu6jyvy3ua-ats.iot.eu-west-1.amazonaws.com',
  authorizerName: 'CasaAuthorizer',
  authorizerToken: import.meta.env.VITE_AWS_IOT_TOKEN || '',
  topicStato: 'casa/stato',
  topicCmd: 'casa/cmd',
};

// ── Dispositivi (16 slot, null = posizione vuota) ─────────────────────────────
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

// ── Zone Riscaldamento (DB1 = DbRiscaldamento) ───────────────────────────────
// id: chiave usata in s7clima.js ZONE_BASE (deve corrispondere!)
// deviceId: collega alla temperatura disponibile in devices[] (da DbCasa)
export const ZONE_RISCALDAMENTO = [
  { id: 'camera',       nome: 'Camera',       icona: '🛏️', deviceId: 'luce_camera'       },
  { id: 'cameretta',    nome: 'Cameretta',    icona: '🛏️', deviceId: 'luce_cameretta'    },
  { id: 'salone',       nome: 'Salone',       icona: '🛋️', deviceId: 'luce_sala'         },
  { id: 'cucina',       nome: 'Cucina',       icona: '🍳',  deviceId: 'luce_cucina'       },
  { id: 'studio',       nome: 'Studio',       icona: '💼',  deviceId: 'luce_studio'       },
  { id: 'corridoio',    nome: 'Corridoio',    icona: '🚪',  deviceId: 'luce_corridoio'    },
  { id: 'ingresso',     nome: 'Ingresso',     icona: '🏠',  deviceId: 'luce_ingresso'     },
  { id: 'bagno_bianco', nome: 'Bagno Bianco', icona: '🚿',  deviceId: 'luce_bagno_bianco' },
  { id: 'bagno_blu',    nome: 'Bagno Blu',    icona: '🛁',  deviceId: 'luce_bagno_blu'    },
  { id: 'cantina',      nome: 'Cantina',      icona: '🔒',  deviceId: 'luce_cantina'      },
];

// ── Allarmi (32 slot, null = posizione vuota) ─────────────────────────────────
export const ALARMS = [
  { id: 'POMPA_GUASTO',         nome: 'Guasto Pompa Pozzo',       alta: true  },
  { id: 'TEMP_LOCALE_ALTA',     nome: 'Temp Alta Locale Tecnico', alta: false },
  { id: 'PORTONE_APERTO',       nome: 'Portone Garage Aperto',    alta: false },
  { id: 'PERDITA_ACQUA',        nome: 'Perdita Acqua',            alta: true  },
  { id: 'RISCALDAMENTO_GUASTO', nome: 'Guasto Riscaldamento',     alta: true  },
  { id: 'RETE_ASSENTE',         nome: 'Assenza Rete Elettrica',   alta: true  },
  { id: 'COMM_PLC_POZZO_KO',    nome: 'Comm PLC Pozzo Persa',     alta: false },
  { id: 'TEMP_EST_CRITICA',     nome: 'Temp Esterna Critica',     alta: false },
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
];

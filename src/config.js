// ============================================================
// config.js — Configurazione Casa Calcabrini
// ============================================================

// IP fisso del PLC sulla rete locale
export const PLC_IP = '192.168.178.250';
export const PLC_OPCUA_PORT = 4840;
export const PING_TIMEOUT_MS = 500;

// AWS IoT Core
export const AWS_IOT = {
  endpoint: 'wss://a3fmnf8o7o8knx-ats.iot.eu-west-1.amazonaws.com/mqtt',
  region: 'eu-west-1',
  topicStato: 'casa/stato',
  topicCmd: 'casa/cmd',
};

// Mappa dispositivi — posizione = indice DbCasa.Utenze[i]
// null = libero (non mostrare)
export const DEVICES = [
  /* 0  */ { id: 'luce_camera',       nome: 'Luce Camera',       icona: '💡', hasTemp: true  },
  /* 1  */ { id: 'luce_cucina',       nome: 'Luce Cucina',       icona: '💡', hasTemp: true  },
  /* 2  */ { id: 'luce_sala',         nome: 'Luce Sala',         icona: '💡', hasTemp: true  },
  /* 3  */ { id: 'luce_studio',       nome: 'Luce Studio',       icona: '💡', hasTemp: true  },
  /* 4  */ { id: 'luce_bagno_bianco', nome: 'Bagno Bianco',      icona: '💡', hasTemp: true  },
  /* 5  */ { id: 'luce_cameretta',    nome: 'Luce Cameretta',    icona: '💡', hasTemp: true  },
  /* 6  */ { id: 'luce_scale',        nome: 'Luce Scale',        icona: '💡', hasTemp: false },
  /* 7  */ { id: 'luce_esterna',      nome: 'Luce Esterna',      icona: '🌙', hasTemp: false },
  /* 8  */ { id: 'luce_bagno_blu',    nome: 'Bagno Blu',         icona: '💡', hasTemp: true  },
  /* 9  */ { id: 'luce_ingresso',     nome: 'Luce Ingresso',     icona: '💡', hasTemp: true  },
  /* 10 */ { id: 'luce_cantina',      nome: 'Luce Cantina',      icona: '💡', hasTemp: true  },
  /* 11 */ { id: 'caldaia_pellet',    nome: 'Caldaia Pellet',    icona: '🔥', hasTemp: false },
  /* 12 */ { id: 'luce_corridoio',    nome: 'Luce Corridoio',    icona: '💡', hasTemp: true  },
  /* 13 */ { id: 'luce_crepuscolare', nome: 'Crepuscolare',      icona: '🌅', hasTemp: false },
  /* 14 */ null,
  /* 15 */ null,
];

// Mappa allarmi — posizione = indice DbCasa.Allarmi[i]
// null = vuoto (non mostrare)
export const ALARMS = [
  /* 0  */ { id: 'POMPA_GUASTO',           nome: 'Guasto Pompa Pozzo',           alta: true  },
  /* 1  */ { id: 'TEMP_LOCALE_ALTA',       nome: 'Temp Alta Locale Tecnico',     alta: false },
  /* 2  */ { id: 'PORTONE_APERTO',         nome: 'Portone Garage Aperto',        alta: false },
  /* 3  */ { id: 'PERDITA_ACQUA',          nome: 'Perdita Acqua',                alta: true  },
  /* 4  */ { id: 'RISCALDAMENTO_GUASTO',   nome: 'Guasto Riscaldamento',         alta: true  },
  /* 5  */ { id: 'RETE_ASSENTE',           nome: 'Assenza Rete Elettrica',       alta: true  },
  /* 6  */ { id: 'COMM_PLC_POZZO_KO',      nome: 'Comm PLC Pozzo Persa',         alta: false },
  /* 7  */ { id: 'TEMP_EST_CRITICA',       nome: 'Temp Esterna Critica',         alta: false },
  /* 8  */ null, /* 9  */ null, /* 10 */ null, /* 11 */ null,
  /* 12 */ null, /* 13 */ null, /* 14 */ null, /* 15 */ null,
  /* 16 */ null, /* 17 */ null, /* 18 */ null, /* 19 */ null,
  /* 20 */ null, /* 21 */ null, /* 22 */ null, /* 23 */ null,
  /* 24 */ null, /* 25 */ null, /* 26 */ null, /* 27 */ null,
  /* 28 */ null, /* 29 */ null, /* 30 */ null, /* 31 */ null,
];

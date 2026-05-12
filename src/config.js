export const PLC_IP = '192.168.178.250';
export const PLC_OPCUA_PORT = 4840;
export const PING_TIMEOUT_MS = 500;

export const AWS_IOT = {
  identityPoolId: 'eu-west-1:391d6b9e-6b9e-4b29-b455-daf56deb392d',
  region: 'eu-west-1',
  endpoint: 'a3fmnf8o7o8knx-ats.iot.eu-west-1.amazonaws.com',
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

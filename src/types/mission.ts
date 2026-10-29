export type MissionStatus =
  | 'Em Planejamento'
  | 'Agd Execução'
  | 'Em Andamento'
  | 'Finalizada'
  | 'Cancelada';

export type MissionAction = 'PA' | 'CI' | 'SI' | 'ADS' | 'DAAE' | 'OPESP';

export type MissionIndenizacao = 'NIL' | 'DIÁRIA' | 'GRAT REP';

export interface Mission {
  id: string;
  missao: string;
  operacao: string;
  atividade?: string;
  local: string;
  lat: number;
  lng: number;
  dataInicio: string; // YYYY-MM-DD
  dataTermino: string; // YYYY-MM-DD
  status: MissionStatus;
  unidadeExecutora: string;
  acao: MissionAction;
  fracaoTropa: string;
  qtdMilitares: number;
  indenizacao: MissionIndenizacao;
}

export const MISSION_STATUSES: MissionStatus[] = [
  'Em Planejamento',
  'Agd Execução',
  'Em Andamento',
  'Finalizada',
  'Cancelada',
];

export const MISSION_ACTIONS: MissionAction[] = [
  'PA',
  'CI',
  'SI',
  'ADS',
  'DAAE',
  'OPESP',
];

export const ACTION_DESCRIPTIONS: Record<MissionAction, string> = {
  PA: 'Polícia da Aeronáutica',
  CI: 'Contra Incêndio',
  SI: 'Segurança das Instalações',
  ADS: 'Autodefesa de Superfície',
  DAAE: 'Defesa Antiaérea',
  OPESP: 'Operações Especiais',
};

export const MISSION_INDENIZACOES: MissionIndenizacao[] = [
  'NIL',
  'DIÁRIA',
  'GRAT REP',
];

export interface StatusConfig {
  label: MissionStatus;
  shortLabel: string;
  hex: string;
  textClass: string;
  borderClass: string;
  bgSubtleClass: string;
  priority: number; // Para determinar a cor predominante em agrupamentos de local
}

export const STATUS_CONFIG: Record<MissionStatus, StatusConfig> = {
  'Em Planejamento': {
    label: 'Em Planejamento',
    shortLabel: 'Planejamento',
    hex: '#EAB308', // Amarelo
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-500/40',
    bgSubtleClass: 'bg-yellow-500/10',
    priority: 2,
  },
  'Agd Execução': {
    label: 'Agd Execução',
    shortLabel: 'Agd Execução',
    hex: '#94A3B8', // Cinza
    textClass: 'text-slate-300',
    borderClass: 'border-slate-400/40',
    bgSubtleClass: 'bg-slate-400/10',
    priority: 3,
  },
  'Em Andamento': {
    label: 'Em Andamento',
    shortLabel: 'Em Andamento',
    hex: '#10B981', // Verde
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/40',
    bgSubtleClass: 'bg-emerald-500/10',
    priority: 1, // Maior prioridade tática no pino agrupado
  },
  Finalizada: {
    label: 'Finalizada',
    shortLabel: 'Finalizada',
    hex: '#38BDF8', // Azul
    textClass: 'text-sky-400',
    borderClass: 'border-sky-500/40',
    bgSubtleClass: 'bg-sky-500/10',
    priority: 4,
  },
  Cancelada: {
    label: 'Cancelada',
    shortLabel: 'Cancelada',
    hex: '#EF4444', // Vermelho
    textClass: 'text-red-400',
    borderClass: 'border-red-500/40',
    bgSubtleClass: 'bg-red-500/10',
    priority: 5,
  },
};

export interface LocationGroup {
  key: string;
  local: string;
  lat: number;
  lng: number;
  missions: Mission[];
  totalMilitares: number;
  dominantStatus: MissionStatus;
  statusBreakdown: Record<MissionStatus, number>;
}

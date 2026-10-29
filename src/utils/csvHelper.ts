import {
  Mission,
  MissionAction,
  MissionIndenizacao,
  MissionStatus,
  MISSION_ACTIONS,
  MISSION_INDENIZACOES,
} from '../types/mission';
import { findOfflineLocationCoordinates } from '../data/locationsCatalog';

export const CSV_HEADERS = [
  'Missão',
  'Operação',
  'Atividade',
  'Local',
  'Lat',
  'Lng',
  'Data início',
  'Data término',
  'Status',
  'Undidade Executora',
  'Ação',
  'Fração de Tropa',
  'Qtd Militares',
  'Indenização',
];

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function normalizeStatus(raw: string): MissionStatus {
  const clean = (raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (clean.includes('planej')) return 'Em Planejamento';
  if (clean.includes('agt') || clean.includes('agd') || clean.includes('aguard') || clean.includes('pendent')) {
    return 'Agd Execução';
  }
  if (clean.includes('andamento') || clean.includes('execucao') || clean.includes('ativa') || clean.includes('ativo')) {
    return 'Em Andamento';
  }
  if (clean.includes('finaliz') || clean.includes('conclu') || clean.includes('encerrad')) {
    return 'Finalizada';
  }
  if (clean.includes('cancel') || clean.includes('suspens') || clean.includes('abort')) {
    return 'Cancelada';
  }
  return 'Em Planejamento';
}

export function normalizeAction(raw: string): MissionAction {
  const clean = (raw || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  for (const act of MISSION_ACTIONS) {
    if (clean === act || clean.startsWith(`${act} `) || clean.startsWith(`${act}-`)) {
      return act;
    }
  }
  if (clean.includes('POLICIA') || clean.includes('PATRULH') || clean.includes('AERONAUTICA')) return 'PA';
  if (clean.includes('INCENDIO') || clean.includes('CONTRA INCENDIO') || clean.includes('BOMBEIRO') || clean.includes('CONTROLE')) return 'CI';
  if (clean.includes('INSTALAC') || clean.includes('SEGURANCA')) return 'SI';
  if (clean.includes('AUTODEFESA') || clean.includes('SUPERFICIE')) return 'ADS';
  if (clean.includes('ANTIAERE') || clean.includes('DEFESA AEREA')) return 'DAAE';
  if (clean.includes('ESPECIA') || clean.includes('SAR') || clean.includes('COMANDO')) return 'OPESP';

  return 'PA';
}

export function normalizeIndenizacao(raw: string): MissionIndenizacao {
  const clean = (raw || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (clean.includes('DIARIA')) return 'DIÁRIA';
  if (clean.includes('GRAT') || clean.includes('REP')) return 'GRAT REP';
  if (clean.includes('NIL') || clean === '' || clean === '0' || clean === 'NAO' || clean === '-') return 'NIL';

  for (const item of MISSION_INDENIZACOES) {
    if (clean === item) return item;
  }
  return 'NIL';
}

export function normalizeDate(raw: string): string {
  const clean = (raw || '').trim();
  if (!clean) {
    return new Date().toISOString().slice(0, 10);
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    return clean.slice(0, 10);
  }
  // DD/MM/YYYY ou DD-MM-YYYY
  const brMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3].length === 2 ? `20${brMatch[3]}` : brMatch[3];
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(clean);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function parseCoordinate(raw: string, fallback: number, isLat = true): number {
  if (!raw) return fallback;
  const cleaned = raw.trim().replace(/\s+/g, '').replace(',', '.');
  let num = parseFloat(cleaned);
  if (!Number.isFinite(num)) return fallback;

  // Corrige deslocamento de casa decimal comum ao exportar 4 casas decimais no Excel (ex: -236.939 -> -23.6939)
  const limit = isLat ? 36 : 76;
  while (Math.abs(num) > limit) {
    num = num / 10;
  }

  // Se houver coordenada de catálogo para o local e a leitura estiver 10x maior (ex: -31.46 vs -3.146 em Manaus/PA)
  if (
    Math.abs(num - fallback) > 8 &&
    Math.abs(num / 10 - fallback) < 1.5
  ) {
    num = num / 10;
  }

  return Number(num.toFixed(4));
}

function parseLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export interface CsvParseResult {
  missions: Mission[];
  warnings: string[];
}

export function parseMissionsCsv(csvText: string): CsvParseResult {
  const warnings: string[] = [];
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) {
    return { missions: [], warnings: ['O arquivo CSV está vazio.'] };
  }

  const lines = cleanText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      missions: [],
      warnings: ['O arquivo CSV deve conter o cabeçalho e pelo menos uma linha de missão.'],
    };
  }

  // Detecta delimitador (; ou ,)
  const firstLine = lines[0];
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const rawHeaders = parseLine(firstLine, delimiter);
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[normalizeHeader(h)] = idx;
  });

  const getIndex = (candidates: string[], fallbackIdx: number): number => {
    for (const c of candidates) {
      const norm = normalizeHeader(c);
      if (headerMap[norm] !== undefined) return headerMap[norm];
    }
    return fallbackIdx;
  };

  const hasAtividadeCol =
    headerMap[normalizeHeader('Atividade')] !== undefined ||
    headerMap[normalizeHeader('Atividade a ser executada')] !== undefined;
  const colShift = hasAtividadeCol ? 1 : 0;

  const idxMissao = getIndex(['Missão', 'Missao', 'Codigo'], 0);
  const idxOperacao = getIndex(['Operação', 'Operacao'], 1);
  const idxAtividade = getIndex(['Atividade', 'Atividade a ser executada'], -1);
  const idxLocal = getIndex(['Local', 'Localidade', 'Cidade', 'Base'], 2 + colShift);
  const idxLat = getIndex(['Lat', 'Latitude'], 3 + colShift);
  const idxLng = getIndex(['Lng', 'Long', 'Longitude', 'Lon'], 4 + colShift);
  const idxDataInicio = getIndex(['Data início', 'Data inicio', 'Inicio', 'DataInicio'], 5 + colShift);
  const idxDataTermino = getIndex(['Data término', 'Data termino', 'Termino', 'Fim', 'DataTermino'], 6 + colShift);
  const idxStatus = getIndex(['Status', 'Situacao', 'Situação'], 7 + colShift);
  const idxUnidade = getIndex(['Undidade Executora', 'Unidade Executora', 'OM', 'Unidade'], 8 + colShift);
  const idxAcao = getIndex(['Ação', 'Acao', 'Tarefa'], 9 + colShift);
  const idxFracao = getIndex(['Fração de Tropa', 'Fracao de Tropa', 'Fracao', 'Tropa'], 10 + colShift);
  const idxQtd = getIndex(['Qtd Militares', 'QtdMilitares', 'Efetivo', 'Militares', 'Qtd'], 11 + colShift);
  const idxIndenizacao = getIndex(['Indenização', 'Indenizacao', 'Tipo Indenizacao'], 12 + colShift);

  const missions: Mission[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i], delimiter);
    if (cols.every((c) => !c)) continue;

    const missao = cols[idxMissao] || `MIS-IMP-${String(i).padStart(3, '0')}`;
    const operacao = cols[idxOperacao] || 'Operação Não Especificada';
    const atividade = idxAtividade >= 0 ? (cols[idxAtividade] || '').trim() || undefined : undefined;
    const local = cols[idxLocal] || 'Brasília - DF (BABR / COMAE)';

    // Caso a planilha não traga Lat/Lng preenchidas, tenta resolver pelo nome do Local
    const catalogMatch = findOfflineLocationCoordinates(local);
    const defaultLat = catalogMatch ? catalogMatch.lat : -15.8697;
    const defaultLng = catalogMatch ? catalogMatch.lng : -47.9172;

    const lat = parseCoordinate(cols[idxLat], defaultLat, true);
    const lng = parseCoordinate(cols[idxLng], defaultLng, false);
    const dataInicio = normalizeDate(cols[idxDataInicio]);
    const dataTermino = normalizeDate(cols[idxDataTermino] || dataInicio);
    const status = normalizeStatus(cols[idxStatus]);
    const unidadeExecutora = cols[idxUnidade] || 'COMAE';
    const acao = normalizeAction(cols[idxAcao]);
    const fracaoTropa = cols[idxFracao] || 'Destacamento Operacional';
    const rawQtd = parseInt((cols[idxQtd] || '0').replace(/\D/g, ''), 10);
    const qtdMilitares = Number.isFinite(rawQtd) && rawQtd > 0 ? rawQtd : 10;
    const indenizacao = normalizeIndenizacao(cols[idxIndenizacao]);

    missions.push({
      id: `csv-${Date.now()}-${i}`,
      missao,
      operacao,
      atividade,
      local,
      lat,
      lng,
      dataInicio,
      dataTermino,
      status,
      unidadeExecutora,
      acao,
      fracaoTropa,
      qtdMilitares,
      indenizacao,
    });
  }

  return { missions, warnings };
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatCsvTimestamp(date = new Date()): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}_${hh}${min}`;
}

export function buildMissionsCsvData(missions: Mission[]): {
  csvContent: string;
  fileName: string;
} {
  const rows = [
    CSV_HEADERS.join(','),
    ...missions.map((m) =>
      [
        escapeCsvCell(m.missao),
        escapeCsvCell(m.operacao),
        escapeCsvCell(m.atividade || ''),
        escapeCsvCell(m.local),
        m.lat,
        m.lng,
        escapeCsvCell(m.dataInicio),
        escapeCsvCell(m.dataTermino),
        escapeCsvCell(m.status),
        escapeCsvCell(m.unidadeExecutora),
        escapeCsvCell(m.acao),
        escapeCsvCell(m.fracaoTropa),
        m.qtdMilitares,
        escapeCsvCell(m.indenizacao),
      ].join(',')
    ),
  ];

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const timestamp = formatCsvTimestamp(new Date());
  const fileName = `op_ter_${timestamp}.csv`;
  return { csvContent, fileName };
}

export function exportMissionsToCsv(missions: Mission[]): string {
  const { csvContent, fileName } = buildMissionsCsvData(missions);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return fileName;
}

export function downloadTemplateCsv(): void {
  const sampleRows: Mission[] = [
    {
      id: 'sample-1',
      missao: 'MIS-COMAE-201',
      operacao: 'Operação Ágata Amazônia',
      local: 'Boa Vista - RR (BABV)',
      lat: 2.8414,
      lng: -60.6922,
      dataInicio: '2026-10-21',
      dataTermino: '2026-11-10',
      status: 'Em Andamento',
      unidadeExecutora: 'GSD-BV / 1º GDAAE',
      acao: 'DAAE',
      fracaoTropa: 'Bateria de Artilharia Antiaérea',
      qtdMilitares: 45,
      indenizacao: 'DIÁRIA',
    },
    {
      id: 'sample-2',
      missao: 'MIS-COMAE-202',
      operacao: 'Operação Ágata Fronteira Sul',
      local: 'Foz do Iguaçu - PR',
      lat: -25.5469,
      lng: -54.5882,
      dataInicio: '2026-10-25',
      dataTermino: '2026-11-15',
      status: 'Em Planejamento',
      unidadeExecutora: 'PARA-SAR',
      acao: 'OPESP',
      fracaoTropa: 'Destacamento de Operações Especiais',
      qtdMilitares: 16,
      indenizacao: 'GRAT REP',
    },
  ];
  exportMissionsToCsv(sampleRows);
}

export function formatDateBr(isoDate: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

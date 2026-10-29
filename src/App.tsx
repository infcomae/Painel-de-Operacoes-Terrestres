import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ACTION_DESCRIPTIONS,
  LocationGroup,
  Mission,
  MissionAction,
  MissionIndenizacao,
  MissionStatus,
  MISSION_ACTIONS,
  MISSION_INDENIZACOES,
  MISSION_STATUSES,
  STATUS_CONFIG,
} from './types/mission';
import { INITIAL_MISSIONS } from './data/initialMissions';
import { TacticalMap } from './components/TacticalMap';
import { MissionModal } from './components/MissionModal';
import { CsvImportModal } from './components/CsvImportModal';
import { CsvExportModal } from './components/CsvExportModal';
import { SlideExportModal } from './components/SlideExportModal';
import { TimelineSchedule } from './components/TimelineSchedule';
import { formatDateBr } from './utils/csvHelper';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Database,
  Download,
  Edit3,
  Filter,
  FolderOpen,
  MapPin,
  Plus,
  Presentation,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  Upload,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';

const STORAGE_KEY = 'comae_tactical_missions_v1';
const STORAGE_META_KEY = 'comae_tactical_missions_last_sync_v1';

const getLocalIsoDate = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  // Carrega do cache local (Offline-First) ou usa as missões iniciais do Brasil
  const [missions, setMissions] = useState<Mission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Atualiza automaticamente a base de demonstração legada para os novos dados de exemplo
          const isLegacyDemo =
            parsed[0]?.id === 'mis-001' &&
            parsed[0]?.missao === 'MIS-COMAE-101';
          if (!isLegacyDemo) {
            return parsed.map((m: Mission) => ({
              ...m,
              status:
                (m.status as string) === 'Agt Execução'
                  ? 'Agd Execução'
                  : m.status,
            }));
          }
        }
      }
    } catch {
      // Fallback para dados iniciais
    }
    return INITIAL_MISSIONS;
  });

  const [lastCacheSave, setLastCacheSave] = useState<string>(() => {
    return (
      localStorage.getItem(STORAGE_META_KEY) ||
      new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    );
  });

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Estados de Filtro (KPIs + Barra de Filtros) — Período padrão: Dia D e D+1
  const [statusFilter, setStatusFilter] = useState<MissionStatus | 'TODOS'>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateStartFilter, setDateStartFilter] = useState<string>(() => getLocalIsoDate(0));
  const [dateEndFilter, setDateEndFilter] = useState<string>(() => getLocalIsoDate(1));
  const [actionFilter, setActionFilter] = useState<MissionAction | 'TODAS'>('TODAS');
  const [operacaoFilter, setOperacaoFilter] = useState<string>('TODAS');
  const [indenizacaoFilter, setIndenizacaoFilter] = useState<MissionIndenizacao | 'TODAS'>('TODAS');

  // Estado de Seleção e Modais
  const [selectedLocationKey, setSelectedLocationKey] = useState<string | null>(null);
  const [collapsedLocations, setCollapsedLocations] = useState<Record<string, boolean>>({});
  const [isMissionModalOpen, setIsMissionModalOpen] = useState<boolean>(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [isCsvExportModalOpen, setIsCsvExportModalOpen] = useState<boolean>(false);
  const [isSlideModalOpen, setIsSlideModalOpen] = useState<boolean>(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const locationCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Persistência automática em Cache Local (LocalStorage) a cada mudança
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(missions));
      const nowStr = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      localStorage.setItem(STORAGE_META_KEY, nowStr);
      setLastCacheSave(nowStr);
    } catch {
      // Silencioso caso quota excedida
    }
  }, [missions]);

  // Monitoramento em tempo real de quedas/retornos de conexão
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Conexão restabelecida. Dados locais preservados.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Queda de conexão detectada. Operando em Modo Offline via Cache Local.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Lista única de Operações para o filtro
  const availableOperations = useMemo(() => {
    const ops = new Set<string>();
    missions.forEach((m) => {
      if (m.operacao) ops.add(m.operacao);
    });
    return Array.from(ops).sort((a, b) => a.localeCompare(b));
  }, [missions]);

  // Missões filtradas pelos controles de Busca, Data, Ação, Operação e Indenização (base para os KPIs de status)
  const missionsMatchingBaseFilters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return missions.filter((m) => {
      if (q) {
        const hay = `${m.missao} ${m.operacao} ${m.atividade || ''} ${m.local} ${m.unidadeExecutora} ${m.fracaoTropa} ${m.acao} ${m.indenizacao}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (actionFilter !== 'TODAS' && m.acao !== actionFilter) {
        return false;
      }

      if (operacaoFilter !== 'TODAS' && m.operacao !== operacaoFilter) {
        return false;
      }

      if (indenizacaoFilter !== 'TODAS' && m.indenizacao !== indenizacaoFilter) {
        return false;
      }

      // Filtro por período de datas (interseção entre o período da missão e o intervalo filtrado)
      if (dateStartFilter && m.dataTermino < dateStartFilter) {
        return false;
      }
      if (dateEndFilter && m.dataInicio > dateEndFilter) {
        return false;
      }

      return true;
    });
  }, [
    missions,
    searchQuery,
    actionFilter,
    operacaoFilter,
    indenizacaoFilter,
    dateStartFilter,
    dateEndFilter,
  ]);

  // Contadores de KPI por Status
  const statusCounts = useMemo(() => {
    const counts: Record<MissionStatus, number> = {
      'Em Planejamento': 0,
      'Agd Execução': 0,
      'Em Andamento': 0,
      Finalizada: 0,
      Cancelada: 0,
    };
    missionsMatchingBaseFilters.forEach((m) => {
      counts[m.status] = (counts[m.status] || 0) + 1;
    });
    return counts;
  }, [missionsMatchingBaseFilters]);

  // Missões finais após aplicar também o filtro de Status do card de KPI
  const filteredMissions = useMemo(() => {
    if (statusFilter === 'TODOS') return missionsMatchingBaseFilters;
    return missionsMatchingBaseFilters.filter((m) => m.status === statusFilter);
  }, [missionsMatchingBaseFilters, statusFilter]);

  // Total de militares nas missões filtradas
  const totalFilteredMilitares = useMemo(() => {
    return filteredMissions.reduce((acc, m) => acc + (m.qtdMilitares || 0), 0);
  }, [filteredMissions]);

  // Agrupamento das missões filtradas por Local
  const locationGroups = useMemo<LocationGroup[]>(() => {
    const map = new Map<string, Mission[]>();

    filteredMissions.forEach((m) => {
      const key = m.local.trim();
      const list = map.get(key) || [];
      list.push(m);
      map.set(key, list);
    });

    const groups: LocationGroup[] = [];

    map.forEach((groupMissions, localName) => {
      // Ordena as missões da localidade por data decrescente (mais recente primeiro)
      const sortedMissions = [...groupMissions].sort(
        (a, b) =>
          b.dataInicio.localeCompare(a.dataInicio) ||
          b.dataTermino.localeCompare(a.dataTermino) ||
          a.missao.localeCompare(b.missao)
      );

      const first = sortedMissions[0];
      const totalMilitares = sortedMissions.reduce(
        (sum, item) => sum + (item.qtdMilitares || 0),
        0
      );

      const statusBreakdown: Record<MissionStatus, number> = {
        'Em Planejamento': 0,
        'Agd Execução': 0,
        'Em Andamento': 0,
        Finalizada: 0,
        Cancelada: 0,
      };

      let dominantStatus: MissionStatus = first.status;
      let bestPriority = STATUS_CONFIG[dominantStatus].priority;

      sortedMissions.forEach((gm) => {
        statusBreakdown[gm.status] = (statusBreakdown[gm.status] || 0) + 1;
        const prio = STATUS_CONFIG[gm.status].priority;
        if (prio < bestPriority) {
          bestPriority = prio;
          dominantStatus = gm.status;
        }
      });

      groups.push({
        key: localName,
        local: localName,
        lat: first.lat,
        lng: first.lng,
        missions: sortedMissions,
        totalMilitares,
        dominantStatus,
        statusBreakdown,
      });
    });

    // Ordena os cards de localidade em ordem decrescente de datas, considerando a missão mais recente da localidade
    return groups.sort((a, b) => {
      const aLatestInicio = a.missions[0]?.dataInicio || '';
      const bLatestInicio = b.missions[0]?.dataInicio || '';
      if (bLatestInicio !== aLatestInicio) {
        return bLatestInicio.localeCompare(aLatestInicio);
      }

      const aLatestTermino = a.missions[0]?.dataTermino || '';
      const bLatestTermino = b.missions[0]?.dataTermino || '';
      if (bLatestTermino !== aLatestTermino) {
        return bLatestTermino.localeCompare(aLatestTermino);
      }

      return a.local.localeCompare(b.local);
    });
  }, [filteredMissions]);

  // Quando o usuário clica em um pino no mapa, destaca e rola até o card daquele Local na coluna da direita
  const handleSelectLocationFromMap = (locationKey: string) => {
    setSelectedLocationKey(locationKey);
    setCollapsedLocations((prev) => ({ ...prev, [locationKey]: false }));
    const el = locationCardRefs.current[locationKey];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Verifica se todas as localidades visíveis estão recolhidas
  const allLocationsCollapsed = useMemo(() => {
    if (locationGroups.length === 0) return false;
    return locationGroups.every((g) => !!collapsedLocations[g.key]);
  }, [locationGroups, collapsedLocations]);

  // Alterna entre expandir todas e recolher todas as localidades
  const toggleAllLocations = () => {
    if (allLocationsCollapsed) {
      setCollapsedLocations({});
      showToast('Todas as localidades foram expandidas.');
    } else {
      const next: Record<string, boolean> = {};
      locationGroups.forEach((g) => {
        next[g.key] = true;
      });
      setCollapsedLocations(next);
      showToast('Todas as localidades foram recolhidas.');
    }
  };

  // Ações de Gestão de Missões
  const handleSaveMission = (
    missionData: Omit<Mission, 'id'>,
    existingId?: string
  ) => {
    if (existingId) {
      setMissions((prev) =>
        prev.map((m) => (m.id === existingId ? { ...missionData, id: existingId } : m))
      );
      showToast(`Missão ${missionData.missao} atualizada com sucesso.`);
    } else {
      const newMission: Mission = {
        ...missionData,
        id: `mis-${Date.now()}`,
      };
      setMissions((prev) => [newMission, ...prev]);
      setSelectedLocationKey(newMission.local);
      showToast(`Novo registro ${newMission.missao} adicionado e salvo em cache.`);
    }
  };

  const handleQuickStatusChange = (missionId: string, newStatus: MissionStatus) => {
    setMissions((prev) =>
      prev.map((m) => (m.id === missionId ? { ...m, status: newStatus } : m))
    );
    showToast(`Status atualizado para "${newStatus}".`);
  };

  const handleDeleteMission = (missionId: string, missionCode: string) => {
    setMissions((prev) => prev.filter((m) => m.id !== missionId));
    showToast(`Registro ${missionCode} removido.`);
  };

  const handleClearAllRecords = () => {
    setMissions([]);
    setSelectedLocationKey(null);
    setIsClearConfirmOpen(false);
    showToast('Todos os registros foram limpos do painel e do cache local.');
  };

  const diaDIso = getLocalIsoDate(0);
  const diaDPlus1Iso = getLocalIsoDate(1);
  const diaDPlus2Iso = getLocalIsoDate(2);
  const diaDPlus3Iso = getLocalIsoDate(3);

  const applyQuickPeriodFilter = (offsetDays: number, label: string) => {
    setDateStartFilter(getLocalIsoDate(0));
    setDateEndFilter(getLocalIsoDate(offsetDays));
    showToast(`Filtro de período aplicado: ${label}.`);
  };

  const handleRestoreDemoMissions = () => {
    setMissions(INITIAL_MISSIONS);
    setStatusFilter('TODOS');
    setSearchQuery('');
    setDateStartFilter(getLocalIsoDate(0));
    setDateEndFilter(getLocalIsoDate(1));
    setActionFilter('TODAS');
    setOperacaoFilter('TODAS');
    setIndenizacaoFilter('TODAS');
    showToast('Base de demonstração nacional recarregada (Período D e D+1).');
  };

  const handleImportCsv = (imported: Mission[], mode: 'replace' | 'merge') => {
    if (mode === 'replace') {
      setMissions(imported);
      showToast(`${imported.length} missões importadas substituindo a base anterior.`);
    } else {
      setMissions((prev) => [...imported, ...prev]);
      showToast(`${imported.length} missões mescladas à base atual.`);
    }
  };

  const hasActiveFilters =
    statusFilter !== 'TODOS' ||
    searchQuery.trim() !== '' ||
    dateStartFilter !== '' ||
    dateEndFilter !== '' ||
    actionFilter !== 'TODAS' ||
    operacaoFilter !== 'TODAS' ||
    indenizacaoFilter !== 'TODAS';

  const clearAllFilters = () => {
    setStatusFilter('TODOS');
    setSearchQuery('');
    setDateStartFilter('');
    setDateEndFilter('');
    setActionFilter('TODAS');
    setOperacaoFilter('TODAS');
    setIndenizacaoFilter('TODAS');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F0E] text-[#E2E8E5]">
      {/* =====================================================================
          TOPO: BARRA EXECUTIVA (3 Zonas: Marca, Controles Operacionais, + Novo Registro)
      ===================================================================== */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-[#101714] border-b border-[#24332C]">
        {/* Zona 1: Título da Marca em linha única */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            clearAllFilters();
          }}
          className="font-display text-xl font-bold tracking-wider text-[#F1F5F3] whitespace-nowrap shrink-0"
        >
          COMAE · PAINEL DE OPERAÇÕES TERRESTRES
        </a>

        {/* Zona 2: Controles de Dados & Limpeza (Links de Ação em linha única) */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#C2CEC8]">
          <button
            type="button"
            onClick={() => setIsCsvModalOpen(true)}
            className="hover:text-emerald-300 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCsvExportModalOpen(true)}
            disabled={missions.length === 0}
            className="hover:text-emerald-300 disabled:opacity-40 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSlideModalOpen(true)}
            className="hover:text-emerald-300 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            title="Gerar imagem Widescreen (16:9) para apresentação de slide"
          >
            <Presentation className="w-3.5 h-3.5 text-emerald-400" />
            <span>Gerar Slide</span>
          </button>

          <button
            type="button"
            onClick={() => setIsClearConfirmOpen(true)}
            disabled={missions.length === 0}
            className="hover:text-red-400 disabled:opacity-40 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Limpar Registros</span>
          </button>

          <span className="text-[#889992] flex items-center gap-1.5 whitespace-nowrap shrink-0">
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-yellow-400" />
            )}
            <span>
              {isOnline ? 'Online' : 'Modo Offline'} · Cache {lastCacheSave}
            </span>
          </span>
        </nav>

        {/* Zona 3: Ação Primária (+ Novo Registro) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditingMission(null);
              setIsMissionModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-semibold text-[#08120E] bg-emerald-400 hover:bg-emerald-300 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Registro</span>
          </button>
        </div>
      </header>

      {/* Barra compacta responsiva de ações para telas menores (mobile/tablet) */}
      <div className="flex md:hidden items-center justify-between gap-2 px-4 py-2 bg-[#131B18] border-b border-[#24332C] overflow-x-auto text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCsvModalOpen(true)}
            className="text-[#C2CEC8] hover:text-white flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Atualizar</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCsvExportModalOpen(true)}
            disabled={missions.length === 0}
            className="text-[#C2CEC8] hover:text-white disabled:opacity-40 flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setIsSlideModalOpen(true)}
            className="text-[#C2CEC8] hover:text-white flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Presentation className="w-3.5 h-3.5 text-emerald-400" />
            <span>Gerar Slide</span>
          </button>
          <button
            type="button"
            onClick={() => setIsClearConfirmOpen(true)}
            disabled={missions.length === 0}
            className="text-red-300 hover:text-red-200 disabled:opacity-40 flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        </div>
        <span className="font-mono text-[11px] text-[#889992] whitespace-nowrap shrink-0">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* =====================================================================
          CONTEÚDO PRINCIPAL DO DASHBOARD
      ===================================================================== */}
      <main className="flex-1 flex flex-col px-4 sm:px-6 py-4 gap-4 max-w-[1920px] w-full mx-auto">
        {/* 1. FAIXA DE KPIs NO TOPO (Total + 5 Status Filtráveis) */}
        <section aria-label="Indicadores de Status das Missões">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Card Total de Missões */}
            <button
              type="button"
              onClick={() => setStatusFilter('TODOS')}
              className={`text-left p-3.5 rounded-md border transition-colors cursor-pointer ${
                statusFilter === 'TODOS'
                  ? 'bg-[#182420] border-emerald-500/60'
                  : 'bg-[#121916] border-[#24332C] hover:bg-[#16201C]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#94A39E] whitespace-nowrap">
                  Total de Missões
                </span>
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="font-display text-3xl font-bold text-[#F1F5F3] tabular-nums">
                  {missionsMatchingBaseFilters.length}
                </span>
                <span className="font-mono text-[11px] text-[#889992] tabular-nums whitespace-nowrap">
                  {totalFilteredMilitares} mil.
                </span>
              </div>
              <div className="mt-1 text-[11px] text-[#7A8C85] truncate">
                {statusFilter === 'TODOS' ? 'Exibindo todos os status' : 'Clique para exibir todas'}
              </div>
            </button>

            {/* 5 Cards de Status Oficiais (Amarelo, Cinza, Verde, Azul, Vermelho) */}
            {MISSION_STATUSES.map((st) => {
              const cfg = STATUS_CONFIG[st];
              const count = statusCounts[st] || 0;
              const total = missionsMatchingBaseFilters.length || 1;
              const pct = Math.round((count / total) * 100);
              const isActive = statusFilter === st;

              return (
                <button
                  key={st}
                  type="button"
                  onClick={() =>
                    setStatusFilter((prev) => (prev === st ? 'TODOS' : st))
                  }
                  className={`text-left p-3.5 rounded-md border transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#192420]'
                      : 'bg-[#121916] border-[#24332C] hover:bg-[#16201C]'
                  }`}
                  style={
                    isActive
                      ? { borderColor: cfg.hex, boxShadow: `0 0 0 1px ${cfg.hex}40` }
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-xs font-semibold whitespace-nowrap truncate"
                      style={{ color: cfg.hex }}
                    >
                      {cfg.label}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cfg.hex }}
                    />
                  </div>

                  <div className="mt-1.5 flex items-baseline justify-between gap-2">
                    <span className="font-display text-3xl font-bold text-[#F1F5F3] tabular-nums">
                      {count}
                    </span>
                    <span className="font-mono text-xs text-[#889992] tabular-nums">
                      {missionsMatchingBaseFilters.length > 0 ? `${pct}%` : '0%'}
                    </span>
                  </div>

                  <div className="mt-1 text-[11px] text-[#7A8C85] truncate">
                    {isActive ? 'Filtro ativo · Clique p/ limpar' : 'Filtrar por este status'}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. BARRA DE FILTROS TÁTICOS (Busca, Intervalo de Datas, Ação, Operação, Indenização) */}
        <section
          aria-label="Filtros Operacionais"
          className="p-3 bg-[#121916] border border-[#24332C] rounded-md"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            {/* Busca Textual */}
            <div className="lg:col-span-3">
              <label className="block text-[11px] font-medium text-[#889992] mb-1">
                Buscar Missão, Local, Unidade ou Fração
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#64746E] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex: MIS-COMAE, Boa Vista, PARA-SAR..."
                  className="w-full pl-8 pr-7 py-1.5 bg-[#0B0F0E] border border-[#263530] rounded text-xs text-[#E2E8E5] placeholder-[#5D7068] focus:outline-none focus:border-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7A8C85] hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtro por Data: Período Padrão D+1 + Filtros Rápidos D, D+1, D+2, D+3 */}
            <div className="lg:col-span-3 flex flex-col">
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <label className="text-[11px] font-medium text-[#889992] flex items-center gap-1 truncate">
                  <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Período</span>
                </label>
                <div className="flex items-center gap-1 shrink-0">
                  {(
                    [
                      { label: 'D', offset: 0, endIso: diaDIso, desc: `Dia D (${formatDateBr(diaDIso)})` },
                      { label: 'D+1', offset: 1, endIso: diaDPlus1Iso, desc: `Padrão: Dia D a D+1 (${formatDateBr(diaDIso)} a ${formatDateBr(diaDPlus1Iso)})` },
                      { label: 'D+2', offset: 2, endIso: diaDPlus2Iso, desc: `Dia D a D+2 (${formatDateBr(diaDIso)} a ${formatDateBr(diaDPlus2Iso)})` },
                      { label: 'D+3', offset: 3, endIso: diaDPlus3Iso, desc: `Dia D a D+3 (${formatDateBr(diaDIso)} a ${formatDateBr(diaDPlus3Iso)})` },
                    ] as const
                  ).map((preset) => {
                    const isActive =
                      dateStartFilter === diaDIso && dateEndFilter === preset.endIso;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          applyQuickPeriodFilter(
                            preset.offset,
                            preset.offset === 0 ? 'Dia D' : `Dia D e ${preset.label}`
                          )
                        }
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                            : 'bg-[#0B0F0E] text-[#889992] border border-[#263530] hover:text-[#E2E8E5]'
                        }`}
                        title={`Aplicar filtro rápido: ${preset.desc}`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setDateStartFilter(getLocalIsoDate(0));
                      setDateEndFilter('');
                      showToast('Filtro de período aplicado: Próximas (a partir do Dia D).');
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                      dateStartFilter === diaDIso && !dateEndFilter
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                        : 'bg-[#0B0F0E] text-[#889992] border border-[#263530] hover:text-[#E2E8E5]'
                    }`}
                    title={`Filtrar missões do dia atual (${formatDateBr(diaDIso)}) em diante`}
                  >
                    Próximas
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="date"
                    value={dateStartFilter}
                    onChange={(e) => setDateStartFilter(e.target.value)}
                    title="Data inicial do período (Dia D por padrão)"
                    className="w-full px-2.5 py-1.5 bg-[#0B0F0E] border border-[#263530] rounded text-xs font-mono tabular-nums text-[#E2E8E5] [color-scheme:dark] focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={dateEndFilter}
                    onChange={(e) => setDateEndFilter(e.target.value)}
                    title="Data final do período (D+1 por padrão)"
                    className="w-full px-2.5 py-1.5 bg-[#0B0F0E] border border-[#263530] rounded text-xs font-mono tabular-nums text-[#E2E8E5] [color-scheme:dark] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Filtro por Ação (PA, CI, SI, ADS, DAAE, OPESP) */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-medium text-[#889992] mb-1">
                Ação Tática
              </label>
              <select
                value={actionFilter}
                onChange={(e) =>
                  setActionFilter(e.target.value as MissionAction | 'TODAS')
                }
                className="w-full px-2.5 py-1.5 bg-[#0B0F0E] border border-[#263530] rounded text-xs font-mono text-[#E2E8E5] focus:outline-none focus:border-emerald-500"
              >
                <option value="TODAS">Todas (PA, CI, SI, ADS, DAAE, OPESP)</option>
                {MISSION_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a} — {ACTION_DESCRIPTIONS[a]}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Operação */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-medium text-[#889992] mb-1">
                Operação
              </label>
              <select
                value={operacaoFilter}
                onChange={(e) => setOperacaoFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#0B0F0E] border border-[#263530] rounded text-xs text-[#E2E8E5] focus:outline-none focus:border-emerald-500"
              >
                <option value="TODAS">Todas as Operações</option>
                {availableOperations.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Indenização + Botão Limpar Filtros */}
            <div className="lg:col-span-2 flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-medium text-[#889992] mb-1">
                  Indenização
                </label>
                <select
                  value={indenizacaoFilter}
                  onChange={(e) =>
                    setIndenizacaoFilter(
                      e.target.value as MissionIndenizacao | 'TODAS'
                    )
                  }
                  className="w-full px-2.5 py-1.5 bg-[#0B0F0E] border border-[#263530] rounded text-xs font-mono text-[#E2E8E5] focus:outline-none focus:border-emerald-500"
                >
                  <option value="TODAS">Todas (NIL / DIÁRIA / GRAT REP)</option>
                  {MISSION_INDENIZACOES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-2.5 py-1.5 bg-[#1C2823] hover:bg-[#24342E] text-emerald-300 border border-emerald-500/30 rounded text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  title="Limpar todos os filtros ativos"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </section>

        {/* =====================================================================
            3. ÁREA CENTRAL DIVIDIDA:
               CENTRO-ESQUERDA (Mapa Leaflet) + CENTRO-DIREITA (Cards por Local)
        ===================================================================== */}
        <section className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-[560px]">
          {/* CENTRO-ESQUERDA: MAPA INTERATIVO LEAFLET */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col h-[520px] lg:h-[calc(100vh-295px)] lg:min-h-[540px]">
            <TacticalMap
              locationGroups={locationGroups}
              selectedLocationKey={selectedLocationKey}
              onSelectLocation={handleSelectLocationFromMap}
              isOnline={isOnline}
            />
          </div>

          {/* CENTRO-DIREITA: CARDS INTERATIVOS AGRUPADOS POR LOCAL */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col h-[560px] lg:h-[calc(100vh-295px)] lg:min-h-[540px] bg-[#121916] border border-[#24332C] rounded-md overflow-hidden">
            {/* Cabeçalho da Coluna Centro-Direita */}
            <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-[#151E1A] border-b border-[#24332C]">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <h2 className="font-display text-base font-semibold tracking-wide text-[#F1F5F3] truncate">
                  Missões Alocadas por Localidade
                </h2>
                <span className="text-xs text-[#7A8C85]">·</span>
                <span className="font-mono text-xs text-[#94A39E] tabular-nums whitespace-nowrap">
                  {filteredMissions.length}{' '}
                  {filteredMissions.length === 1 ? 'missão' : 'missões'} em{' '}
                  {locationGroups.length}{' '}
                  {locationGroups.length === 1 ? 'local' : 'locais'}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {locationGroups.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAllLocations}
                    className="px-2.5 py-1 text-xs font-medium text-[#C2CEC8] bg-[#101714] border border-[#263530] rounded hover:bg-[#1C2722] hover:text-white transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    title={
                      allLocationsCollapsed
                        ? 'Expandir todas as localidades'
                        : 'Recolher todas as localidades'
                    }
                  >
                    {allLocationsCollapsed ? (
                      <>
                        <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Expandir Todas</span>
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Recolher Todas</span>
                      </>
                    )}
                  </button>
                )}

                {selectedLocationKey && (
                  <button
                    type="button"
                    onClick={() => setSelectedLocationKey(null)}
                    className="px-2 py-1 text-[11px] font-medium text-[#C2CEC8] bg-[#1B2622] border border-[#2A3B34] rounded hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Desmarcar Local
                  </button>
                )}
              </div>
            </div>

            {/* Lista Rolável de Grupos de Locais */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
              {locationGroups.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <FolderOpen className="w-10 h-10 text-[#465951] mb-3" />
                  <h3 className="font-display text-lg font-semibold text-[#E2E8E5]">
                    {missions.length === 0
                      ? 'Nenhum Registro de Missão no Painel'
                      : 'Nenhuma Missão Encontrada com os Filtros Atuais'}
                  </h3>
                  <p className="text-xs text-[#889992] max-w-md mt-1">
                    {missions.length === 0
                      ? 'A base de dados foi limpa. Você pode cadastrar um novo registro manualmente, importar uma planilha .CSV ou recarregar as missões de exemplo.'
                      : 'Ajuste o filtro de status, período de datas ou termo de busca para visualizar as missões alocadas.'}
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
                    {missions.length === 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMission(null);
                            setIsMissionModalOpen(true);
                          }}
                          className="px-3.5 py-2 text-xs font-semibold text-[#08120E] bg-emerald-400 hover:bg-emerald-300 rounded flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Novo Registro</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCsvModalOpen(true)}
                          className="px-3.5 py-2 text-xs font-medium text-[#E2E8E5] bg-[#18221E] border border-[#2A3C34] hover:bg-[#1E2B26] rounded flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Importar Planilha .CSV</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRestoreDemoMissions}
                          className="px-3.5 py-2 text-xs font-medium text-[#C2CEC8] bg-[#141D19] border border-[#24332C] hover:text-white rounded flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Carregar Missões de Exemplo</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="px-3.5 py-2 text-xs font-medium text-emerald-300 bg-[#182420] border border-emerald-500/40 rounded hover:bg-[#1E2E28] flex items-center gap-1.5 cursor-pointer"
                      >
                        <Filter className="w-3.5 h-3.5" />
                        <span>Limpar Todos os Filtros</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                locationGroups.map((group) => {
                  const isSelected = selectedLocationKey === group.key;
                  const isCollapsed = !!collapsedLocations[group.key];
                  const domCfg = STATUS_CONFIG[group.dominantStatus];

                  return (
                    <div
                      key={group.key}
                      ref={(el) => {
                        locationCardRefs.current[group.key] = el;
                      }}
                      className={`border rounded-md transition-colors ${
                        isSelected
                          ? 'bg-[#15201C] border-emerald-500/60'
                          : 'bg-[#0E1412] border-[#223029]'
                      }`}
                    >
                      {/* Cabeçalho do Grupo de Local */}
                      <div className="px-4 py-3 bg-[#141D19] border-b border-[#223029] flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: domCfg.hex }}
                            />
                            <h3 className="font-display text-lg font-bold tracking-wide text-[#F1F5F3] truncate">
                              {group.local}
                            </h3>
                          </div>

                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#889992]">
                            <span className="font-mono text-[#C2CEC8] tabular-nums">
                              {group.missions.length}{' '}
                              {group.missions.length === 1 ? 'missão' : 'missões'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-[#C2CEC8] tabular-nums flex items-center gap-1">
                              <Users className="w-3 h-3 text-[#7A8C85]" />
                              {group.totalMilitares} militares
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedLocationKey(group.key)}
                            className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-[#182420] border border-emerald-500/30 rounded hover:bg-[#1F302A] transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
                            title="Centralizar e destacar este local no mapa à esquerda"
                          >
                            <Crosshair className="w-3.5 h-3.5" />
                            <span>No Mapa</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedLocations((prev) => ({
                                ...prev,
                                [group.key]: !prev[group.key],
                              }))
                            }
                            className="p-1.5 text-[#889992] hover:text-white bg-[#101714] border border-[#24332C] rounded cursor-pointer"
                            title={isCollapsed ? 'Expandir missões' : 'Recolher missões'}
                          >
                            {isCollapsed ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronUp className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Missões Alocadas neste Local */}
                      {!isCollapsed && (
                        <div className="divide-y divide-[#1D2823]">
                          {group.missions.map((mission) => {
                            const stCfg = STATUS_CONFIG[mission.status];
                            return (
                              <div
                                key={mission.id}
                                className="p-3.5 hover:bg-[#131C18] transition-colors"
                              >
                                {/* Linha 1: Código da Missão, Operação e Seletor Direto de Status */}
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono text-sm font-bold text-[#F1F5F3]">
                                        {mission.missao}
                                      </span>
                                      <span className="text-[#5D7068]" aria-hidden="true">
                                        ·
                                      </span>
                                      <span className="text-sm font-medium text-[#D5E0DB]">
                                        {mission.operacao}
                                      </span>
                                      {mission.atividade && mission.atividade.trim() !== '' && (
                                        <>
                                          <span className="text-[#5D7068]" aria-hidden="true">
                                            ·
                                          </span>
                                          <span className="text-sm text-[#C2CEC8]">
                                            {mission.atividade.trim()}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Controle Interativo de Status + Ações de Edição/Exclusão */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <select
                                      aria-label={`Alterar status da missão ${mission.missao}`}
                                      value={mission.status}
                                      onChange={(e) =>
                                        handleQuickStatusChange(
                                          mission.id,
                                          e.target.value as MissionStatus
                                        )
                                      }
                                      className="px-2 py-1 text-xs font-semibold rounded bg-[#0B0F0E] border cursor-pointer focus:outline-none"
                                      style={{
                                        color: stCfg.hex,
                                        borderColor: `${stCfg.hex}55`,
                                      }}
                                    >
                                      {MISSION_STATUSES.map((s) => (
                                        <option
                                          key={s}
                                          value={s}
                                          className="bg-[#121916] text-[#E2E8E5]"
                                        >
                                          {s}
                                        </option>
                                      ))}
                                    </select>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingMission(mission);
                                        setIsMissionModalOpen(true);
                                      }}
                                      className="p-1 text-[#889992] hover:text-white hover:bg-[#1B2622] rounded transition-colors cursor-pointer"
                                      title="Editar missão"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteMission(mission.id, mission.missao)
                                      }
                                      className="p-1 text-[#889992] hover:text-red-400 hover:bg-[#1B2622] rounded transition-colors cursor-pointer"
                                      title="Excluir missão"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Linha 2: Metadados Táticos Estruturados (Zero-Pill Discipline com separadores ·) */}
                                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#94A39E]">
                                  <span>
                                    Ação:{' '}
                                    <strong
                                      className="font-mono text-[#F1F5F3]"
                                      title={ACTION_DESCRIPTIONS[mission.acao]}
                                    >
                                      {mission.acao}
                                    </strong>
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>
                                    Unidade:{' '}
                                    <strong className="text-[#D5E0DB] font-medium">
                                      {mission.unidadeExecutora}
                                    </strong>
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>
                                    Fração:{' '}
                                    <span className="text-[#C2CEC8]">
                                      {mission.fracaoTropa}
                                    </span>
                                  </span>
                                </div>

                                {/* Linha 3: Período, Efetivo e Indenização (Tabular Numerals) */}
                                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#889992] font-mono tabular-nums">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-[#64746E]" />
                                    <span>
                                      {formatDateBr(mission.dataInicio)} a{' '}
                                      {formatDateBr(mission.dataTermino)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span>
                                      Efetivo:{' '}
                                      <strong className="text-[#E2E8E5]">
                                        {mission.qtdMilitares}
                                      </strong>{' '}
                                      mil.
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span>
                                      Indenização:{' '}
                                      <strong className="text-[#E2E8E5]">
                                        {mission.indenizacao}
                                      </strong>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* =====================================================================
            4. PARTE INFERIOR: GRÁFICO DE CRONOGRAMA EM LINHA DO TEMPO (CONFORME PERÍODO SELECIONADO)
        ===================================================================== */}
        <TimelineSchedule
          missions={filteredMissions}
          dateStartFilter={dateStartFilter}
          dateEndFilter={dateEndFilter}
          onSelectLocation={handleSelectLocationFromMap}
          onEditMission={(m) => {
            setEditingMission(m);
            setIsMissionModalOpen(true);
          }}
        />
      </main>

      {/* =====================================================================
          MODAIS INTERATIVOS (Novo Registro / Edição, Importar CSV, Limpar Registros)
      ===================================================================== */}
      <MissionModal
        isOpen={isMissionModalOpen}
        initialMission={editingMission}
        onClose={() => {
          setIsMissionModalOpen(false);
          setEditingMission(null);
        }}
        onSave={handleSaveMission}
      />

      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImport={handleImportCsv}
        onNotify={showToast}
      />

      <CsvExportModal
        isOpen={isCsvExportModalOpen}
        onClose={() => setIsCsvExportModalOpen(false)}
        missions={missions}
        filteredCount={filteredMissions.length}
        onNotify={showToast}
      />

      <SlideExportModal
        isOpen={isSlideModalOpen}
        onClose={() => setIsSlideModalOpen(false)}
        missions={filteredMissions}
        locationGroups={locationGroups}
        dateStartFilter={dateStartFilter}
        dateEndFilter={dateEndFilter}
        periodLabel={
          dateStartFilter && dateEndFilter
            ? `PERÍODO: ${formatDateBr(dateStartFilter)} A ${formatDateBr(dateEndFilter)}`
            : dateStartFilter
            ? `PERÍODO: A PARTIR DE ${formatDateBr(dateStartFilter)}`
            : dateEndFilter
            ? `PERÍODO: ATÉ ${formatDateBr(dateEndFilter)}`
            : 'PERÍODO: TODAS AS DATAS'
        }
      />

      {/* Modal de Confirmação para Limpar Todos os Registros */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md bg-[#121916] border border-[#2A3C34] rounded-md shadow-2xl p-6">
            <h3 className="font-display text-xl font-bold text-[#F1F5F3]">
              Confirmar Limpeza Total de Registros
            </h3>
            <p className="text-xs text-[#94A39E] mt-2 leading-relaxed">
              Esta ação removerá todas as{' '}
              <strong className="font-mono text-[#E2E8E5]">{missions.length}</strong>{' '}
              missões atualmente armazenadas no painel e no cache offline. Você poderá
              importar um novo arquivo .CSV ou restaurar os dados de exemplo depois.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#263530]">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#C2CEC8] bg-[#17211D] border border-[#263530] rounded hover:bg-[#1E2B26] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearAllRecords}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded cursor-pointer"
              >
                Limpar Todos os Registros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificação Toast Discreta */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2.5 bg-[#15221D] border border-emerald-500/50 text-xs text-[#E2E8E5] rounded shadow-xl flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

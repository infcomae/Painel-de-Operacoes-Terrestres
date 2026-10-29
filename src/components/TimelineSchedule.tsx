import React, { useMemo, useRef, useState } from 'react';
import { Mission, MissionStatus, STATUS_CONFIG, MISSION_STATUSES } from '../types/mission';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Shield } from 'lucide-react';
import { formatDateBr } from '../utils/csvHelper';

interface TimelineScheduleProps {
  missions: Mission[];
  dateStartFilter?: string;
  dateEndFilter?: string;
  onSelectLocation?: (local: string) => void;
  onEditMission?: (mission: Mission) => void;
}

interface MergedLocationCard {
  id: string;
  local: string;
  missions: Mission[];
  missaoLabel: string;
  unidadeLabel: string;
  dataInicio: string;
  dataTermino: string;
  dominantStatus: MissionStatus;
}

interface OperationLane {
  operationName: string;
  lanes: MergedLocationCard[][];
  totalMissions: number;
  totalEfetivo: number;
}

const TIMELINE_STATUS_ORDER: Record<MissionStatus, number> = {
  Cancelada: 1,
  Finalizada: 2,
  'Em Andamento': 3,
  'Agd Execução': 4,
  'Em Planejamento': 5,
};

const toLocalIsoDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const TimelineSchedule: React.FC<TimelineScheduleProps> = ({
  missions,
  dateStartFilter,
  dateEndFilter,
  onSelectLocation,
  onEditMission,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState<'normal' | 'wide'>('normal');

  // Janela dinâmica conforme o período selecionado nos filtros
  const {
    minDate,
    maxDate,
    windowStartIso,
    windowEndIso,
    totalDays,
    timeMarkers,
    windowMissions,
  } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayIso = toLocalIsoDate(todayStart);

    let startIso = (dateStartFilter || '').trim();
    let endIso = (dateEndFilter || '').trim();

    // Missões candidatas considerando os limites já informados
    const candidateMissions = missions.filter((m) => {
      if (startIso && m.dataTermino < startIso) return false;
      if (endIso && m.dataInicio > endIso) return false;
      return true;
    });

    if (!startIso) {
      if (candidateMissions.length > 0) {
        startIso = candidateMissions.reduce(
          (min, m) => (m.dataInicio < min ? m.dataInicio : min),
          candidateMissions[0].dataInicio
        );
      } else if (missions.length > 0) {
        startIso = missions.reduce(
          (min, m) => (m.dataInicio < min ? m.dataInicio : min),
          missions[0].dataInicio
        );
      } else {
        startIso = todayIso;
      }
    }

    if (!endIso) {
      if (candidateMissions.length > 0) {
        endIso = candidateMissions.reduce(
          (max, m) => (m.dataTermino > max ? m.dataTermino : max),
          candidateMissions[0].dataTermino
        );
      } else if (missions.length > 0) {
        endIso = missions.reduce(
          (max, m) => (m.dataTermino > max ? m.dataTermino : max),
          missions[0].dataTermino
        );
      } else {
        endIso = startIso;
      }
    }

    if (endIso < startIso) {
      endIso = startIso;
    }

    const start = new Date(`${startIso}T00:00:00`);
    const end = new Date(`${endIso}T23:59:59.999`);
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);

    const daysCount = Math.max(
      1,
      Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

    const markers: {
      date: Date;
      leftPct: number;
      widthPct: number;
      label: string;
      dLabel: string;
      isToday: boolean;
    }[] = [];

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDay);
      d.setDate(startDay.getDate() + i);
      const leftPct = (i / daysCount) * 100;
      const widthPct = 100 / daysCount;
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthStr = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

      const offsetFromToday = Math.round(
        (d.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isToday = offsetFromToday === 0;
      const dLabel =
        offsetFromToday === 0
          ? 'Dia D'
          : offsetFromToday > 0
          ? `D+${offsetFromToday}`
          : `D${offsetFromToday}`;

      markers.push({
        date: d,
        leftPct,
        widthPct,
        label: `${dayNum} ${monthStr}`,
        dLabel,
        isToday,
      });
    }

    const activeInWindow = missions.filter(
      (m) => m.dataTermino >= startIso && m.dataInicio <= endIso
    );

    return {
      minDate: start,
      maxDate: end,
      windowStartIso: startIso,
      windowEndIso: endIso,
      totalDays: daysCount,
      timeMarkers: markers,
      windowMissions: activeInWindow,
    };
  }, [missions, dateStartFilter, dateEndFilter]);

  // Agrupa missões da janela por Operação e junta os cards com o mesmo Local
  const operationLanes = useMemo<OperationLane[]>(() => {
    const groups: Record<string, Mission[]> = {};
    const minTs = minDate.getTime();
    const maxTs = maxDate.getTime();

    windowMissions.forEach((m) => {
      const op = m.operacao.trim() || 'Operação Não Especificada';
      if (!groups[op]) groups[op] = [];
      groups[op].push(m);
    });

    return Object.entries(groups)
      .map(([operationName, opMissions]) => {
        // Agrupa missões dentro da mesma operação que possuem o mesmo Local
        const byLocal: Record<string, Mission[]> = {};
        opMissions.forEach((m) => {
          const localKey = m.local.trim();
          if (!byLocal[localKey]) byLocal[localKey] = [];
          byLocal[localKey].push(m);
        });

        const mergedCards: MergedLocationCard[] = Object.entries(byLocal).map(
          ([localName, locMissions]) => {
            const sortedLocMissions = [...locMissions].sort(
              (a, b) =>
                TIMELINE_STATUS_ORDER[a.status] - TIMELINE_STATUS_ORDER[b.status] ||
                a.dataInicio.localeCompare(b.dataInicio) ||
                a.missao.localeCompare(b.missao)
            );

            let minInicio = sortedLocMissions[0].dataInicio;
            let maxTermino = sortedLocMissions[0].dataTermino;
            let dominantStatus: MissionStatus = sortedLocMissions[0].status;
            let bestPriority = TIMELINE_STATUS_ORDER[dominantStatus];

            sortedLocMissions.forEach((m) => {
              if (m.dataInicio < minInicio) minInicio = m.dataInicio;
              if (m.dataTermino > maxTermino) maxTermino = m.dataTermino;
              const prio = TIMELINE_STATUS_ORDER[m.status];
              if (prio < bestPriority) {
                bestPriority = prio;
                dominantStatus = m.status;
              }
            });

            const uniqueMissoes = Array.from(
              new Set(sortedLocMissions.map((m) => m.missao.trim()))
            );
            const uniqueUnidades = Array.from(
              new Set(sortedLocMissions.map((m) => m.unidadeExecutora.trim()))
            );

            return {
              id: `${operationName}__${localName}`,
              local: localName,
              missions: sortedLocMissions,
              missaoLabel: uniqueMissoes.join(' / '),
              unidadeLabel: uniqueUnidades.join(' · '),
              dataInicio: minInicio,
              dataTermino: maxTermino,
              dominantStatus,
            };
          }
        );

        // Ordena os cards dentro da operação pela sequência de status:
        // Cancelada -> Finalizada -> Em Andamento -> Agd Execução -> Em Planejamento
        // (e data de início mais antiga primeiro dentro de cada status)
        const sortedCards = [...mergedCards].sort((a, b) => {
          const statusDiff =
            TIMELINE_STATUS_ORDER[a.dominantStatus] -
            TIMELINE_STATUS_ORDER[b.dominantStatus];
          if (statusDiff !== 0) return statusDiff;

          const aStart = Math.max(minTs, new Date(`${a.dataInicio}T00:00:00`).getTime());
          const bStart = Math.max(minTs, new Date(`${b.dataInicio}T00:00:00`).getTime());
          return aStart - bStart || a.local.localeCompare(b.local);
        });

        // Empacotamento em pistas preservando a sequência de status
        const lanes: MergedLocationCard[][] = [];

        sortedCards.forEach((card) => {
          const cStart = Math.max(
            minTs,
            new Date(`${card.dataInicio}T00:00:00`).getTime()
          );

          let placed = false;
          for (let l = 0; l < lanes.length; l++) {
            const lastInLane = lanes[l][lanes[l].length - 1];
            const lastEnd = Math.min(
              maxTs,
              new Date(`${lastInLane.dataTermino}T23:59:59`).getTime()
            );

            if (
              lastInLane.dominantStatus === card.dominantStatus &&
              cStart > lastEnd
            ) {
              lanes[l].push(card);
              placed = true;
              break;
            }
          }

          if (!placed) {
            lanes.push([card]);
          }
        });

        const totalEfetivo = opMissions.reduce(
          (acc, m) => acc + (m.qtdMilitares || 0),
          0
        );

        return {
          operationName,
          lanes,
          totalMissions: opMissions.length,
          totalEfetivo,
        };
      })
      .sort(
        (a, b) =>
          b.totalMissions - a.totalMissions ||
          a.operationName.localeCompare(b.operationName)
      );
  }, [windowMissions, minDate, maxDate]);

  // Calcula posição percentual e largura da barra recortada (clipped) rigorosamente dentro da janela de 7 dias
  const getCardPosition = (card: MergedLocationCard) => {
    const rawStartTs = new Date(`${card.dataInicio}T00:00:00`).getTime();
    const rawEndTs = new Date(`${card.dataTermino}T23:59:59`).getTime();
    const minTs = minDate.getTime();
    const maxTs = maxDate.getTime();

    const clampedStartTs = Math.max(minTs, Math.min(maxTs, rawStartTs));
    const clampedEndTs = Math.max(clampedStartTs, Math.min(maxTs, rawEndTs));

    const range = Math.max(1, maxTs - minTs);
    const leftPct = Math.max(0, Math.min(100, ((clampedStartTs - minTs) / range) * 100));
    const rawWidthPct = ((clampedEndTs - clampedStartTs) / range) * 100;
    const widthPct = Math.max(0.5, Math.min(100 - leftPct, rawWidthPct));

    const clippedLeft = card.dataInicio < windowStartIso;
    const clippedRight = card.dataTermino > windowEndIso;

    return { leftPct, widthPct, clippedLeft, clippedRight };
  };

  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  if (windowMissions.length === 0) {
    return (
      <section
        aria-label="Cronograma de Missões Operacionais"
        className="bg-[#121916] border border-[#24332C] rounded-md p-6 text-center"
      >
        <div className="flex items-center justify-center gap-2 mb-2 text-[#94A39E]">
          <Clock className="w-5 h-5 text-emerald-400" />
          <h2 className="font-display text-lg font-bold text-[#F1F5F3]">
            Cronograma Operacional de Missões ({totalDays} {totalDays === 1 ? 'Dia' : 'Dias'})
          </h2>
        </div>
        <p className="text-xs text-[#7A8C85]">
          Nenhuma missão prevista para o período selecionado ({formatDateBr(windowStartIso)} a {formatDateBr(windowEndIso)}).
        </p>
      </section>
    );
  }

  const timelineMinWidth =
    zoomLevel === 'wide'
      ? `${Math.max(1200, totalDays * 140)}px`
      : `${Math.max(760, totalDays * 90)}px`;

  return (
    <section
      aria-label="Cronograma de Missões Operacionais"
      className="bg-[#121916] border border-[#24332C] rounded-md overflow-hidden flex flex-col shadow-lg"
    >
      {/* Cabeçalho do Cronograma */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-[#151E1A] border-b border-[#24332C]">
        <div className="flex items-center gap-3 min-w-0">
          <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <h2 className="font-display text-base font-semibold tracking-wide text-[#F1F5F3]">
              Cronograma Operacional de Missões
            </h2>
            <p className="text-[11px] text-[#889992] flex items-center gap-1.5 font-mono">
              <span>{operationLanes.length} Operações</span>
              <span>·</span>
              <span>{windowMissions.length} Missões na Janela</span>
              <span>·</span>
              <span className="text-[#C2CEC8]">
                {formatDateBr(windowStartIso)} a {formatDateBr(windowEndIso)} ({totalDays}{' '}
                {totalDays === 1 ? 'dia' : 'dias'})
              </span>
            </p>
          </div>
        </div>

        {/* Controles do Cronograma (Navegação & Escala) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-[#0D1311] border border-[#263530] rounded p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel('normal')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                zoomLevel === 'normal'
                  ? 'bg-[#1D2B25] text-emerald-300 font-semibold'
                  : 'text-[#889992] hover:text-[#E2E8E5]'
              }`}
            >
              Padrão
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel('wide')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                zoomLevel === 'wide'
                  ? 'bg-[#1D2B25] text-emerald-300 font-semibold'
                  : 'text-[#889992] hover:text-[#E2E8E5]'
              }`}
            >
              Expandido
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={scrollLeft}
              className="p-1 bg-[#101714] border border-[#263530] rounded text-[#94A39E] hover:text-white transition-colors cursor-pointer"
              title="Rolar cronograma para a esquerda"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={scrollRight}
              className="p-1 bg-[#101714] border border-[#263530] rounded text-[#94A39E] hover:text-white transition-colors cursor-pointer"
              title="Rolar cronograma para a direita"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Área Principal com Grid de Gantt Rolável */}
      <div
        ref={containerRef}
        className="overflow-x-auto overflow-y-visible max-h-[500px]"
      >
        <div style={{ minWidth: timelineMinWidth }} className="flex flex-col">
          {/* Régua de Tempo (Eixo Superior com os 7 Dias a contar da Data Atual) */}
          <div className="sticky top-0 z-20 flex bg-[#16201C] border-b border-[#24332C]">
            {/* Coluna fixa do nome da Operação */}
            <div className="w-64 sm:w-72 shrink-0 px-4 py-2 border-r border-[#24332C] bg-[#16201C] text-xs font-semibold text-[#C2CEC8] uppercase tracking-wider font-display">
              Operação / Missões
            </div>

            {/* Linha do tempo com os 7 dias (Dia D até D+6) */}
            <div className="flex-1 relative h-9 bg-[#111815]">
              {timeMarkers.map((marker, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 flex items-center justify-between border-l border-[#24332C] px-2 select-none"
                  style={{
                    left: `${marker.leftPct}%`,
                    width: `${marker.widthPct}%`,
                  }}
                >
                  <span
                    className={`font-mono text-[10px] tabular-nums whitespace-nowrap ${
                      marker.isToday ? 'text-emerald-400 font-bold' : 'text-[#C2CEC8]'
                    }`}
                  >
                    {marker.label}
                  </span>
                  <span
                    className={`font-mono text-[9px] tabular-nums whitespace-nowrap ${
                      marker.isToday ? 'text-emerald-400/90 font-semibold' : 'text-[#64746E]'
                    }`}
                  >
                    {marker.dLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Linhas Agrupadas por Operação */}
          <div className="divide-y divide-[#1D2B25]">
            {operationLanes.map((opGroup) => {
              // Altura proporcional à quantidade de pistas simultâneas (cards em linha única)
              const laneHeight = 40; // px por pista
              const totalOpHeight = Math.max(76, opGroup.lanes.length * laneHeight + 16);

              return (
                <div
                  key={opGroup.operationName}
                  className="flex hover:bg-[#131C18]/60 transition-colors group"
                  style={{ minHeight: `${totalOpHeight}px` }}
                >
                  {/* Coluna Esquerda: Nome, Missões e Efetivo da Operação */}
                  <div className="w-64 sm:w-72 shrink-0 p-3.5 border-r border-[#24332C] bg-[#121916] flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Shield className="w-3.5 h-3.5 shrink-0" />
                      <h3 className="font-display text-sm font-bold text-[#F1F5F3] leading-tight line-clamp-2">
                        {opGroup.operationName}
                      </h3>
                    </div>
                    <div className="mt-1 text-[11px] font-mono text-[#889992] flex items-center gap-1.5">
                      <span>{opGroup.totalMissions} {opGroup.totalMissions === 1 ? 'missão' : 'missões'}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] font-mono text-emerald-400/90 flex items-center gap-1.5">
                      <span>Efetivo: {opGroup.totalEfetivo}</span>
                    </div>
                  </div>

                  {/* Coluna Direita: Pistas com os Cards de Missão Unificados por Local */}
                  <div className="flex-1 relative py-2 overflow-hidden bg-[#0D1311] flex flex-col justify-center">
                    {/* Linhas de Grade Verticais de Fundo (7 Dias) */}
                    <div className="absolute inset-0 pointer-events-none">
                      {timeMarkers.map((marker, idx) => (
                        <div
                          key={idx}
                          className="absolute top-0 bottom-0 border-l border-[#1A2520]"
                          style={{ left: `${marker.leftPct}%` }}
                        />
                      ))}
                    </div>

                    {/* Renderização das Pistas (Lanes) */}
                    <div className="relative z-10 flex flex-col gap-1.5">
                      {opGroup.lanes.map((laneCards, laneIdx) => (
                        <div key={laneIdx} className="relative h-8 overflow-hidden">
                          {laneCards.map((card) => {
                            const { leftPct, widthPct, clippedLeft, clippedRight } =
                              getCardPosition(card);
                            const stCfg = STATUS_CONFIG[card.dominantStatus];

                            return (
                              <div
                                key={card.id}
                                style={{
                                  left: `${leftPct}%`,
                                  width: `${widthPct}%`,
                                  borderColor: stCfg.hex,
                                  backgroundColor: '#101714',
                                  borderLeftStyle: clippedLeft ? 'dashed' : 'solid',
                                  borderRightStyle: clippedRight ? 'dashed' : 'solid',
                                }}
                                onClick={() => {
                                  if (onSelectLocation) onSelectLocation(card.local);
                                  if (onEditMission && card.missions.length === 1) {
                                    onEditMission(card.missions[0]);
                                  }
                                }}
                                className={`absolute top-0 bottom-0 border px-2 py-1 flex items-center shadow-md hover:z-30 transition-colors cursor-pointer overflow-hidden group/card ${
                                  clippedLeft ? 'rounded-l-none' : 'rounded-l'
                                } ${clippedRight ? 'rounded-r-none' : 'rounded-r'}`}
                                title={`${card.missaoLabel} · ${card.unidadeLabel} · ${card.local} (${formatDateBr(card.dataInicio)} a ${formatDateBr(card.dataTermino)})`}
                              >
                                {/* Barra lateral de cor de status no card */}
                                <div
                                  className="absolute left-0 top-0 bottom-0 w-1.5"
                                  style={{ backgroundColor: stCfg.hex }}
                                />

                                {/* Conteúdo do card unificado por localidade em linha única:
                                    Missão(ões) · Unidade(s) Executora(s) · Local */}
                                <div className="pl-2 min-w-0 w-full flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                                    <span
                                      className="font-mono text-xs font-bold shrink-0 leading-none"
                                      style={{ color: stCfg.hex }}
                                    >
                                      {card.missaoLabel}
                                    </span>
                                    <span className="text-[#4E6159] text-[10px] shrink-0">·</span>
                                    <span className="text-[11px] font-medium text-[#D1DBD6] shrink-0 leading-none">
                                      {card.unidadeLabel}
                                    </span>
                                    <span className="text-[#4E6159] text-[10px] shrink-0">·</span>
                                    <span className="inline-flex items-center gap-1 text-[11px] text-[#94A39E] truncate leading-none">
                                      <MapPin className="w-2.5 h-2.5 text-[#64746E] shrink-0" />
                                      <span className="truncate">{card.local}</span>
                                    </span>
                                  </div>
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: stCfg.hex }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rodapé com Legenda de Cores de Status do Cronograma */}
      <div className="px-4 py-2.5 bg-[#141C19] border-t border-[#24332C] flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-[#889992] font-medium flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span>Legenda de Cores de Status no Cronograma:</span>
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {MISSION_STATUSES.map((status) => {
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={status} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: cfg.hex }}
                />
                <span className="text-[#C2CEC8] text-[11px] whitespace-nowrap">
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

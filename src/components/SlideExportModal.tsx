import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LocationGroup,
  Mission,
  MissionStatus,
  STATUS_CONFIG,
} from '../types/mission';
import { BRAZIL_GEOJSON } from '../data/brazilBoundary';
import { formatDateBr } from '../utils/csvHelper';
import {
  Check,
  Copy,
  Download,
  Image as ImageIcon,
  Loader2,
  Moon,
  RefreshCw,
  Sun,
  X,
} from 'lucide-react';

interface SlideExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  missions: Mission[];
  locationGroups: LocationGroup[];
  dateStartFilter: string;
  dateEndFilter: string;
  periodLabel: string;
}

// Estilos por status para os temas Escuro e Claro no Slide
const SLIDE_STATUS_STYLE: Record<
  MissionStatus,
  {
    displayLabel: string;
    hex: string;
    darkCardBg: string;
    darkCardBorder: string;
    darkText: string;
    lightCardBg: string;
    lightCardBorder: string;
    lightText: string;
    lightAccentHex: string;
  }
> = {
  Cancelada: {
    displayLabel: 'Cancelada',
    hex: '#EF4444',
    darkCardBg: 'rgba(239, 68, 68, 0.20)',
    darkCardBorder: '#EF4444',
    darkText: '#FCA5A5',
    lightCardBg: 'rgba(239, 68, 68, 0.14)',
    lightCardBorder: '#DC2626',
    lightText: '#991B1B',
    lightAccentHex: '#DC2626',
  },
  Finalizada: {
    displayLabel: 'Finalizada',
    hex: '#38BDF8',
    darkCardBg: 'rgba(56, 189, 248, 0.18)',
    darkCardBorder: '#38BDF8',
    darkText: '#7DD3FC',
    lightCardBg: 'rgba(14, 165, 233, 0.14)',
    lightCardBorder: '#0284C7',
    lightText: '#075985',
    lightAccentHex: '#0284C7',
  },
  'Em Andamento': {
    displayLabel: 'Em andamento',
    hex: '#10B981',
    darkCardBg: 'rgba(16, 185, 129, 0.20)',
    darkCardBorder: '#10B981',
    darkText: '#6EE7B7',
    lightCardBg: 'rgba(16, 185, 129, 0.16)',
    lightCardBorder: '#059669',
    lightText: '#065F46',
    lightAccentHex: '#059669',
  },
  'Agd Execução': {
    displayLabel: 'Agd Execução',
    hex: '#94A3B8',
    darkCardBg: 'rgba(148, 163, 184, 0.20)',
    darkCardBorder: '#94A3B8',
    darkText: '#E2E8F0',
    lightCardBg: 'rgba(100, 116, 139, 0.15)',
    lightCardBorder: '#475569',
    lightText: '#1E293B',
    lightAccentHex: '#475569',
  },
  'Em Planejamento': {
    displayLabel: 'Em Planejamento',
    hex: '#EAB308',
    darkCardBg: 'rgba(234, 179, 8, 0.20)',
    darkCardBorder: '#EAB308',
    darkText: '#FDE047',
    lightCardBg: 'rgba(234, 179, 8, 0.18)',
    lightCardBorder: '#CA8A04',
    lightText: '#854D0E',
    lightAccentHex: '#CA8A04',
  },
};

function lngToWorldX(lng: number, zoom: number): number {
  const worldSize = 256 * Math.pow(2, zoom);
  return ((lng + 180) / 360) * worldSize;
}

function latToWorldY(lat: number, zoom: number): number {
  const worldSize = 256 * Math.pow(2, zoom);
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y = 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI);
  return Math.max(0, Math.min(worldSize, y * worldSize));
}

function loadTileImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 4500);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function truncateCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (!text) return '-';
  if (maxWidth <= 8) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}…`;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  centerY: number,
  maxWidth: number,
  lineHeight: number
) {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, centerY);
    return;
  }

  const words = text.replace(/\//g, '/ ').split(/\s+/);
  let line1 = '';
  let line2 = '';

  for (let i = 0; i < words.length; i++) {
    const test = line1 ? `${line1} ${words[i]}`.replace('/ ', '/') : words[i];
    if (ctx.measureText(test).width <= maxWidth || !line1) {
      line1 = test;
    } else {
      line2 = words.slice(i).join(' ').replace('/ ', '/');
      break;
    }
  }

  if (!line2) {
    ctx.fillText(truncateCanvasText(ctx, line1, maxWidth), x, centerY);
    return;
  }

  ctx.fillText(truncateCanvasText(ctx, line1, maxWidth), x, centerY - lineHeight / 2);
  ctx.fillText(truncateCanvasText(ctx, line2, maxWidth), x, centerY + lineHeight / 2);
}

interface SlideCluster {
  lat: number;
  lng: number;
  totalMissions: number;
  dominantStatus: MissionStatus;
  labels: string[];
}

function clusterSlidePins(
  groups: LocationGroup[],
  latLngToMapXY: (lat: number, lng: number) => { x: number; y: number }
): SlideCluster[] {
  let clusters: SlideCluster[] = groups.map((g) => ({
    lat: g.lat,
    lng: g.lng,
    totalMissions: g.missions.length,
    dominantStatus: g.dominantStatus,
    labels: [g.local],
  }));

  const MIN_DIST_PX = 34;
  let merged = true;

  while (merged && clusters.length > 1) {
    merged = false;
    let bestI = -1;
    let bestJ = -1;
    let bestDist = MIN_DIST_PX;

    const pts = clusters.map((c) => latLngToMapXY(c.lat, c.lng));

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist < bestDist) {
          bestDist = dist;
          bestI = i;
          bestJ = j;
        }
      }
    }

    if (bestI !== -1 && bestJ !== -1) {
      const a = clusters[bestI];
      const b = clusters[bestJ];
      const countA = a.labels.length;
      const countB = b.labels.length;
      const avgLat = (a.lat * countA + b.lat * countB) / (countA + countB);
      const avgLng = (a.lng * countA + b.lng * countB) / (countA + countB);

      const prioA = STATUS_CONFIG[a.dominantStatus].priority;
      const prioB = STATUS_CONFIG[b.dominantStatus].priority;
      const dominantStatus = prioA <= prioB ? a.dominantStatus : b.dominantStatus;

      const combined: SlideCluster = {
        lat: avgLat,
        lng: avgLng,
        totalMissions: a.totalMissions + b.totalMissions,
        dominantStatus,
        labels: [...a.labels, ...b.labels],
      };

      clusters = clusters.filter((_, idx) => idx !== bestI && idx !== bestJ);
      clusters.push(combined);
      merged = true;
    }
  }

  return clusters;
}

interface SlideTimelineCard {
  id: string;
  local: string;
  missaoLabel: string;
  unidadeLabel: string;
  dataInicio: string;
  dataTermino: string;
  dominantStatus: MissionStatus;
}

interface SlideOperationLane {
  operationName: string;
  lanes: SlideTimelineCard[][];
  totalMissions: number;
  totalEfetivo: number;
}

const SLIDE_TIMELINE_STATUS_ORDER: Record<MissionStatus, number> = {
  Cancelada: 1,
  Finalizada: 2,
  'Em Andamento': 3,
  'Agd Execução': 4,
  'Em Planejamento': 5,
};

const toLocalIso = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const SlideExportModal: React.FC<SlideExportModalProps> = ({
  isOpen,
  onClose,
  missions,
  locationGroups,
  dateStartFilter,
  dateEndFilter,
  periodLabel,
}) => {
  const [slideTheme, setSlideTheme] = useState<'dark' | 'light'>('dark');
  const [slideTitle, setSlideTitle] = useState<string>('OPERAÇÕES TERRESTRES');
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Calcula a janela da linha do tempo conforme o período selecionado nos filtros
  const {
    minDate,
    maxDate,
    windowStartIso,
    windowEndIso,
    timeMarkers,
    operationLanes,
  } = useMemo(() => {
    const now = new Date();
    const todayIso = toLocalIso(now);

    let startIso = dateStartFilter;
    let endIso = dateEndFilter;

    if (!startIso && missions.length > 0) {
      startIso = missions.reduce(
        (min, m) => (m.dataInicio < min ? m.dataInicio : min),
        missions[0].dataInicio
      );
    }
    if (!endIso && missions.length > 0) {
      endIso = missions.reduce(
        (max, m) => (m.dataTermino > max ? m.dataTermino : max),
        missions[0].dataTermino
      );
    }

    if (!startIso) startIso = todayIso;
    if (!endIso || endIso < startIso) endIso = startIso;

    const start = new Date(`${startIso}T00:00:00`);
    const end = new Date(`${endIso}T23:59:59.999`);

    const totalDays = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );

    const stepDays = totalDays > 28 ? 4 : totalDays > 14 ? 2 : 1;
    const markers: {
      leftPct: number;
      widthPct: number;
      label: string;
      isToday: boolean;
    }[] = [];

    for (let i = 0; i < totalDays; i += stepDays) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dIso = toLocalIso(d);
      const leftPct = (i / totalDays) * 100;
      const widthPct = (Math.min(stepDays, totalDays - i) / totalDays) * 100;
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthStr = d
        .toLocaleDateString('pt-BR', { month: 'short' })
        .replace('.', '');

      markers.push({
        leftPct,
        widthPct,
        label: `${dayNum} ${monthStr}`,
        isToday: dIso === todayIso,
      });
    }

    // Agrupa por Operação e unifica cards com o mesmo Local (idêntico ao cronograma principal)
    const minTs = start.getTime();
    const maxTs = end.getTime();
    const byOp: Record<string, Mission[]> = {};

    missions.forEach((m) => {
      const op = m.operacao.trim() || 'Operação Não Especificada';
      if (!byOp[op]) byOp[op] = [];
      byOp[op].push(m);
    });

    const lanesByOp: SlideOperationLane[] = Object.entries(byOp)
      .map(([operationName, opMissions]) => {
        const byLocal: Record<string, Mission[]> = {};
        opMissions.forEach((m) => {
          const loc = m.local.trim();
          if (!byLocal[loc]) byLocal[loc] = [];
          byLocal[loc].push(m);
        });

        const mergedCards: SlideTimelineCard[] = Object.entries(byLocal).map(
          ([localName, locMissions]) => {
            const sortedLoc = [...locMissions].sort(
              (a, b) =>
                SLIDE_TIMELINE_STATUS_ORDER[a.status] -
                  SLIDE_TIMELINE_STATUS_ORDER[b.status] ||
                a.dataInicio.localeCompare(b.dataInicio) ||
                a.missao.localeCompare(b.missao)
            );

            let minInicio = sortedLoc[0].dataInicio;
            let maxTermino = sortedLoc[0].dataTermino;
            let dominantStatus: MissionStatus = sortedLoc[0].status;
            let bestPriority = SLIDE_TIMELINE_STATUS_ORDER[dominantStatus];

            sortedLoc.forEach((m) => {
              if (m.dataInicio < minInicio) minInicio = m.dataInicio;
              if (m.dataTermino > maxTermino) maxTermino = m.dataTermino;
              const prio = SLIDE_TIMELINE_STATUS_ORDER[m.status];
              if (prio < bestPriority) {
                bestPriority = prio;
                dominantStatus = m.status;
              }
            });

            const uniqueMissoes = Array.from(
              new Set(sortedLoc.map((m) => m.missao.trim()))
            );
            const uniqueUnidades = Array.from(
              new Set(sortedLoc.map((m) => m.unidadeExecutora.trim()))
            );

            return {
              id: `${operationName}__${localName}`,
              local: localName,
              missaoLabel: uniqueMissoes.join(' / '),
              unidadeLabel: uniqueUnidades.join(' · '),
              dataInicio: minInicio,
              dataTermino: maxTermino,
              dominantStatus,
            };
          }
        );

        // Ordena os cards dentro da operação pela sequência de status:
        // Cancelada -> Finalizada -> Em Andamento -> Agt Execução -> Em Planejamento
        // (e data de início mais antiga primeiro dentro de cada status)
        const sortedCards = [...mergedCards].sort((a, b) => {
          const statusDiff =
            SLIDE_TIMELINE_STATUS_ORDER[a.dominantStatus] -
            SLIDE_TIMELINE_STATUS_ORDER[b.dominantStatus];
          if (statusDiff !== 0) return statusDiff;

          const aStart = Math.max(minTs, new Date(`${a.dataInicio}T00:00:00`).getTime());
          const bStart = Math.max(minTs, new Date(`${b.dataInicio}T00:00:00`).getTime());
          return aStart - bStart || a.local.localeCompare(b.local);
        });

        const lanes: SlideTimelineCard[][] = [];
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

    return {
      minDate: start,
      maxDate: end,
      windowStartIso: startIso,
      windowEndIso: endIso,
      timeMarkers: markers,
      operationLanes: lanesByOp,
    };
  }, [missions, dateStartFilter, dateEndFilter]);

  const generateSlideCanvas = async () => {
    setIsGenerating(true);
    setCopyFeedback('');

    const WIDTH = 1920;
    const HEIGHT = 1080;

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsGenerating(false);
      return;
    }

    const isDark = slideTheme === 'dark';

    // 1. Fundo Widescreen 16:9
    ctx.fillStyle = isDark ? '#0B0F0E' : '#F1F5F9';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // 2. Barra de Cabeçalho do Slide
    const headerH = 82;
    ctx.fillStyle = isDark ? '#111916' : '#FFFFFF';
    ctx.fillRect(0, 0, WIDTH, headerH);

    ctx.strokeStyle = isDark ? '#24332C' : '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, headerH);
    ctx.lineTo(WIDTH, headerH);
    ctx.stroke();

    // Faixa de destaque tática esquerda no cabeçalho
    ctx.fillStyle = '#10B981';
    ctx.fillRect(0, 0, 8, headerH);

    // Título Principal: 'OPERAÇÕES TERRESTRES' (centralizado verticalmente no cabeçalho, sem subtítulo)
    ctx.fillStyle = isDark ? '#F8FAFC' : '#0F172A';
    ctx.font = 'bold 36px "Barlow Condensed", "Public Sans", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(slideTitle.toUpperCase(), 32, headerH / 2 + 1);

    // Legenda de Status no canto superior direito do cabeçalho (fonte e indicadores ampliados)
    const legendOrder: MissionStatus[] = [
      'Cancelada',
      'Finalizada',
      'Em Andamento',
      'Agd Execução',
      'Em Planejamento',
    ];
    let legendX = WIDTH - 32;
    ctx.font = '700 17px "Public Sans", sans-serif';
    for (let i = legendOrder.length - 1; i >= 0; i--) {
      const st = legendOrder[i];
      const stStyle = SLIDE_STATUS_STYLE[st];
      const label = stStyle.displayLabel;
      const textW = ctx.measureText(label).width;
      legendX -= textW;

      ctx.fillStyle = isDark ? '#E2E8E5' : '#0F172A';
      ctx.fillText(label, legendX, 42);

      legendX -= 22;
      ctx.beginPath();
      ctx.arc(legendX + 8, 42, 8, 0, Math.PI * 2);
      ctx.fillStyle = stStyle.hex;
      ctx.fill();

      legendX -= 26;
    }

    // =========================================================================
    // 3. LADO ESQUERDO: MAPA (PADRÃO OSM)
    // =========================================================================
    const pad = 24;
    const contentY = headerH + pad;
    const contentH = HEIGHT - contentY - pad;
    const mapX = pad;
    const mapY = contentY;
    const mapW = 730;
    const mapH = contentH;

    ctx.save();
    drawRoundedRect(ctx, mapX, mapY, mapW, mapH, 8);
    ctx.fillStyle = '#AAD3DF';
    ctx.fill();
    ctx.clip();

    const mapZoom = 5;
    const centerLat = -14.2;
    const centerLng = -52.5;
    const centerWorldX = lngToWorldX(centerLng, mapZoom);
    const centerWorldY = latToWorldY(centerLat, mapZoom);

    const brLeftX = lngToWorldX(-74.5, mapZoom);
    const brRightX = lngToWorldX(-33.5, mapZoom);
    const brTopY = latToWorldY(6.0, mapZoom);
    const brBottomY = latToWorldY(-34.2, mapZoom);

    const scaleX = mapW / (brRightX - brLeftX);
    const scaleY = mapH / (brBottomY - brTopY);
    const mapScale = Math.min(scaleX, scaleY);

    const worldToCanvas = (wx: number, wy: number) => ({
      x: mapX + mapW / 2 + (wx - centerWorldX) * mapScale,
      y: mapY + mapH / 2 + (wy - centerWorldY) * mapScale,
    });

    const latLngToMapXY = (lat: number, lng: number) =>
      worldToCanvas(lngToWorldX(lng, mapZoom), latToWorldY(lat, mapZoom));

    const minTileX = Math.max(0, Math.floor((centerWorldX - mapW / (2 * mapScale)) / 256));
    const maxTileX = Math.min(
      Math.pow(2, mapZoom) - 1,
      Math.floor((centerWorldX + mapW / (2 * mapScale)) / 256)
    );
    const minTileY = Math.max(0, Math.floor((centerWorldY - mapH / (2 * mapScale)) / 256));
    const maxTileY = Math.min(
      Math.pow(2, mapZoom) - 1,
      Math.floor((centerWorldY + mapH / (2 * mapScale)) / 256)
    );

    const tilePromises: Promise<{
      img: HTMLImageElement | null;
      tx: number;
      ty: number;
    }>[] = [];

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const url = `https://tile.openstreetmap.org/${mapZoom}/${tx}/${ty}.png`;
        tilePromises.push(loadTileImage(url).then((img) => ({ img, tx, ty })));
      }
    }

    const loadedTiles = await Promise.all(tilePromises);
    let tilesDrawn = 0;

    loadedTiles.forEach(({ img, tx, ty }) => {
      if (!img) return;
      tilesDrawn++;
      const topLeft = worldToCanvas(tx * 256, ty * 256);
      const drawSize = 256 * mapScale;
      ctx.drawImage(img, topLeft.x, topLeft.y, drawSize + 0.5, drawSize + 0.5);
    });

    // Contorno oficial do Brasil sobre o mapa OSM
    const features = BRAZIL_GEOJSON.features || [];
    features.forEach((feature) => {
      const geom = feature.geometry;
      const drawRing = (ring: number[][]) => {
        if (ring.length === 0) return;
        ctx.beginPath();
        ring.forEach(([lng, lat], idx) => {
          const pt = latLngToMapXY(lat, lng);
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.closePath();
        if (tilesDrawn === 0) {
          ctx.fillStyle = isDark ? '#15221D' : '#E2E8F0';
          ctx.fill();
        }
        ctx.strokeStyle = '#0F766E';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      };

      if (geom.type === 'Polygon') {
        geom.coordinates.forEach((ring) => drawRing(ring));
      } else if (geom.type === 'MultiPolygon') {
        geom.coordinates.forEach((poly) => poly.forEach((ring) => drawRing(ring)));
      }
    });

    // Pinos das Localidades
    const slideClusters = clusterSlidePins(locationGroups, latLngToMapXY);

    slideClusters.forEach((cluster) => {
      const pt = latLngToMapXY(cluster.lat, cluster.lng);
      const stStyle = SLIDE_STATUS_STYLE[cluster.dominantStatus];
      const radius = cluster.labels.length > 1 ? 16 : 14;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius + 3, 0, Math.PI * 2);
      ctx.fillStyle = '#0B0F0E';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius - 1, 0, Math.PI * 2);
      ctx.fillStyle = stStyle.hex;
      ctx.fill();

      const numColor =
        stStyle.hex === '#EAB308' ||
        stStyle.hex === '#38BDF8' ||
        stStyle.hex === '#94A3B8'
          ? '#070B09'
          : '#FFFFFF';
      ctx.fillStyle = numColor;
      ctx.font = '800 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(cluster.totalMissions), pt.x, pt.y + 0.5);
    });

    ctx.textAlign = 'left';
    ctx.restore();

    drawRoundedRect(ctx, mapX, mapY, mapW, mapH, 8);
    ctx.strokeStyle = isDark ? '#263530' : '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // =========================================================================
    // 4. LADO DIREITO: CRONOGRAMA SIMPLIFICADO (FILTRADO PELO PERÍODO SELECIONADO)
    // =========================================================================
    const tlX = mapX + mapW + pad;
    const tlY = contentY;
    const tlW = WIDTH - tlX - pad;
    const tlH = contentH;

    ctx.save();
    drawRoundedRect(ctx, tlX, tlY, tlW, tlH, 8);
    ctx.fillStyle = isDark ? '#111815' : '#FFFFFF';
    ctx.fill();
    ctx.clip();

    // Cabeçalho superior do Cronograma Simplificado (Coluna Operação + Régua de Tempo)
    const opColW = 240;
    const rulerH = 62;
    const trackX = tlX + opColW;
    const trackW = tlW - opColW;

    ctx.fillStyle = isDark ? '#16201C' : '#E2E8F0';
    ctx.fillRect(tlX, tlY, tlW, rulerH);

    // Título da coluna esquerda da régua (sem subtítulo, centralizado verticalmente)
    ctx.fillStyle = isDark ? '#D5E0DB' : '#0F172A';
    ctx.font = 'bold 21px "Barlow Condensed", "Public Sans", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('OPERAÇÃO / MISSÕES', tlX + 16, tlY + rulerH / 2 + 1);

    // Marcadores de Datas na Régua de Tempo
    timeMarkers.forEach((marker) => {
      const mx = trackX + (marker.leftPct / 100) * trackW;
      const mw = (marker.widthPct / 100) * trackW;

      ctx.strokeStyle = isDark ? '#24332C' : '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mx, tlY);
      ctx.lineTo(mx, tlY + rulerH);
      ctx.stroke();

      ctx.fillStyle = marker.isToday
        ? isDark
          ? '#10B981'
          : '#059669'
        : isDark
        ? '#E2E8E5'
        : '#0F172A';
      ctx.font = `${marker.isToday ? '700' : '600'} 16px "JetBrains Mono", monospace`;
      ctx.fillText(
        truncateCanvasText(ctx, marker.label, mw - 10),
        mx + 8,
        tlY + rulerH / 2
      );
    });

    // Linha divisória horizontal abaixo da régua
    ctx.strokeStyle = isDark ? '#24332C' : '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tlX, tlY + rulerH);
    ctx.lineTo(tlX + tlW, tlY + rulerH);
    ctx.stroke();

    // Linha divisória vertical entre coluna de Operação e Pistas de Tempo
    ctx.beginPath();
    ctx.moveTo(trackX, tlY);
    ctx.lineTo(trackX, tlY + tlH);
    ctx.stroke();

    // Corpo do Cronograma Simplificado
    const bodyY = tlY + rulerH;
    const bodyH = tlH - rulerH;

    const totalLanesCount = operationLanes.reduce(
      (sum, op) => sum + Math.max(1, op.lanes.length),
      0
    );

    if (operationLanes.length === 0 || missions.length === 0) {
      ctx.fillStyle = isDark ? '#889992' : '#64748B';
      ctx.font = '600 18px "Public Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Nenhuma missão encontrada para o período e filtros selecionados.',
        tlX + tlW / 2,
        bodyY + bodyH / 2
      );
      ctx.textAlign = 'left';
    } else {
      // Grade vertical de fundo nas pistas
      timeMarkers.forEach((marker) => {
        const mx = trackX + (marker.leftPct / 100) * trackW;
        ctx.strokeStyle = isDark ? '#19241F' : '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mx, bodyY);
        ctx.lineTo(mx, bodyY + bodyH);
        ctx.stroke();
      });

      const opCount = operationLanes.length;
      const opPaddingV = opCount > 6 ? 8 : 12;
      const laneGap = 7;
      const totalOpPadding = opCount * (opPaddingV * 2);
      const totalLaneGaps = operationLanes.reduce(
        (sum, op) => sum + Math.max(0, op.lanes.length - 1) * laneGap,
        0
      );

      const computedLaneH = Math.min(
        52,
        Math.max(
          34,
          Math.floor(
            (bodyH - totalOpPadding - totalLaneGaps) / Math.max(1, totalLanesCount)
          )
        )
      );

      const minTs = minDate.getTime();
      const maxTs = maxDate.getTime();
      const rangeTs = Math.max(1, maxTs - minTs);

      let currentOpY = bodyY;

      operationLanes.forEach((opGroup) => {
        const lanesCount = Math.max(1, opGroup.lanes.length);
        const lanesContentH =
          lanesCount * computedLaneH + Math.max(0, lanesCount - 1) * laneGap;
        const opRowH = Math.max(78, lanesContentH + opPaddingV * 2);

        if (currentOpY + 24 > tlY + tlH) return;

        // Fundo da célula esquerda da Operação
        ctx.fillStyle = isDark ? '#121916' : '#F8FAFC';
        ctx.fillRect(tlX, currentOpY, opColW - 1, opRowH);

        // Nome da Operação, 'X missões' e abaixo 'Efetivo: Y'
        ctx.fillStyle = isDark ? '#F8FAFC' : '#0F172A';
        ctx.font = 'bold 21px "Barlow Condensed", "Public Sans", sans-serif';
        drawWrappedText(
          ctx,
          opGroup.operationName,
          tlX + 16,
          currentOpY + opRowH / 2 - 20,
          opColW - 26,
          20
        );

        ctx.fillStyle = isDark ? '#94A39E' : '#475569';
        ctx.font = '600 14px "JetBrains Mono", monospace';
        const missionsCountLabel = `${opGroup.totalMissions} ${
          opGroup.totalMissions === 1 ? 'missão' : 'missões'
        }`;
        ctx.fillText(
          truncateCanvasText(ctx, missionsCountLabel, opColW - 24),
          tlX + 16,
          currentOpY + opRowH / 2 + 2
        );

        ctx.fillStyle = isDark ? '#6EE7B7' : '#059669';
        ctx.font = '600 14px "JetBrains Mono", monospace';
        const efetivoLabel = `Efetivo: ${opGroup.totalEfetivo}`;
        ctx.fillText(
          truncateCanvasText(ctx, efetivoLabel, opColW - 24),
          tlX + 16,
          currentOpY + opRowH / 2 + 22
        );

        const lanesStartY = currentOpY + (opRowH - lanesContentH) / 2;

        // Renderiza os cards unificados por localidade nas pistas da operação (em linha única)
        opGroup.lanes.forEach((laneCards, laneIdx) => {
          const laneY = lanesStartY + laneIdx * (computedLaneH + laneGap);

          laneCards.forEach((card) => {
            const rawStartTs = new Date(`${card.dataInicio}T00:00:00`).getTime();
            const rawEndTs = new Date(`${card.dataTermino}T23:59:59.999`).getTime();

            const clampedStartTs = Math.max(minTs, Math.min(maxTs, rawStartTs));
            const clampedEndTs = Math.max(clampedStartTs, Math.min(maxTs, rawEndTs));

            const leftPct = Math.max(
              0,
              Math.min(100, ((clampedStartTs - minTs) / rangeTs) * 100)
            );
            const rawWidthPct = ((clampedEndTs - clampedStartTs) / rangeTs) * 100;
            const widthPct = Math.max(2, Math.min(100 - leftPct, rawWidthPct));

            const cardX = trackX + (leftPct / 100) * (trackW - 12) + 6;
            const cardW = Math.max(28, (widthPct / 100) * (trackW - 12));
            const stStyle = SLIDE_STATUS_STYLE[card.dominantStatus];

            // Fundo e borda do card na linha do tempo
            ctx.save();
            drawRoundedRect(ctx, cardX, laneY, cardW, computedLaneH, 5);
            ctx.fillStyle = isDark ? '#101714' : '#FFFFFF';
            ctx.fill();
            ctx.fillStyle = isDark ? stStyle.darkCardBg : stStyle.lightCardBg;
            ctx.fill();
            ctx.strokeStyle = isDark ? stStyle.darkCardBorder : stStyle.lightCardBorder;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.clip();

            // Barra lateral sólida de status no card
            ctx.fillStyle = isDark ? stStyle.hex : stStyle.lightAccentHex;
            ctx.fillRect(cardX, laneY, 6, computedLaneH);

            const textStartX = cardX + 12;
            const availTextW = cardW - 18;
            const centerY = laneY + computedLaneH / 2 + 0.5;
            const cardFontSize = computedLaneH >= 40 ? 15.5 : 14;

            if (availTextW > 14) {
              ctx.font = `700 ${cardFontSize}px "JetBrains Mono", monospace`;
              const missaoW = ctx.measureText(card.missaoLabel).width;

              if (missaoW >= availTextW - 18) {
                ctx.fillStyle = isDark ? stStyle.hex : stStyle.lightAccentHex;
                ctx.fillText(
                  truncateCanvasText(
                    ctx,
                    `${card.missaoLabel} · ${card.unidadeLabel} · ${card.local}`,
                    availTextW
                  ),
                  textStartX,
                  centerY
                );
              } else {
                // Parte 1: Missão em destaque colorido
                ctx.fillStyle = isDark ? stStyle.hex : stStyle.lightAccentHex;
                ctx.fillText(card.missaoLabel, textStartX, centerY);

                // Parte 2: Unidade Executora e Local na mesma linha com fonte ampliada
                const restText = `  ·  ${card.unidadeLabel}  ·  ${card.local}`;
                ctx.font = `600 ${cardFontSize}px "Public Sans", sans-serif`;
                ctx.fillStyle = isDark ? '#F1F5F3' : '#0F172A';
                ctx.fillText(
                  truncateCanvasText(ctx, restText, availTextW - missaoW),
                  textStartX + missaoW,
                  centerY
                );
              }
            }

            ctx.restore();
          });
        });

        currentOpY += opRowH;

        // Linha divisória horizontal entre Operações
        ctx.strokeStyle = isDark ? '#1D2B25' : '#CBD5E1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tlX, currentOpY);
        ctx.lineTo(tlX + tlW, currentOpY);
        ctx.stroke();
      });
    }

    ctx.restore();

    // Moldura externa do Cronograma
    drawRoundedRect(ctx, tlX, tlY, tlW, tlH, 8);
    ctx.strokeStyle = isDark ? '#263530' : '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.stroke();

    setPreviewDataUrl(canvas.toDataURL('image/png'));
    setIsGenerating(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    generateSlideCanvas();
  }, [
    isOpen,
    slideTheme,
    slideTitle,
    operationLanes,
    timeMarkers,
    locationGroups,
  ]);

  if (!isOpen) return null;

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) throw new Error('Falha ao gerar blob PNG');

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);
      setCopyFeedback('Imagem copiada para a área de transferência!');
      setTimeout(() => setCopyFeedback(''), 3500);
    } catch {
      setCopyFeedback(
        'Não foi possível copiar automaticamente neste navegador. Utilize "Baixar Imagem".'
      );
    }
  };

  const handleDownloadImage = () => {
    if (!previewDataUrl) return;
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const link = document.createElement('a');
    link.href = previewDataUrl;
    link.download = `slide_op_ter_${yyyy}${mm}${dd}_${hh}${min}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
      <div className="w-full max-w-6xl bg-[#121916] border border-[#2A3C34] rounded-md shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* Cabeçalho e Controles Rápidos do Modal */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-[#16201C] border-b border-[#263530]">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h2 className="font-display text-xl font-bold tracking-wide text-[#F1F5F3]">
                Gerador de Slide Widescreen (16:9 · 1920×1080)
              </h2>
              <p className="text-xs text-[#94A39E]">
                Mapa padrão OSM à esquerda e cronograma simplificado filtrado conforme o período selecionado à direita.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Alternador de Tema Claro / Escuro */}
            <div className="flex items-center bg-[#0D1311] border border-[#263530] rounded p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setSlideTheme('dark')}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
                  slideTheme === 'dark'
                    ? 'bg-[#1D2B25] text-emerald-300 font-semibold'
                    : 'text-[#889992] hover:text-[#E2E8E5]'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Tema Escuro</span>
              </button>
              <button
                type="button"
                onClick={() => setSlideTheme('light')}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
                  slideTheme === 'light'
                    ? 'bg-[#1D2B25] text-emerald-300 font-semibold'
                    : 'text-[#889992] hover:text-[#E2E8E5]'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Tema Claro</span>
              </button>
            </div>

            {/* Botão Copiar Imagem */}
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isGenerating || !previewDataUrl}
              className="px-3.5 py-1.5 bg-[#192822] hover:bg-[#21352D] text-emerald-300 border border-emerald-500/40 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
            >
              {copyFeedback.includes('copiada') ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>Copiar Imagem</span>
            </button>

            {/* Botão Baixar Imagem */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isGenerating || !previewDataUrl}
              className="px-4 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-[#07110D] rounded text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Imagem (.PNG)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#94A39E] hover:text-white rounded hover:bg-[#1E2B26] transition-colors cursor-pointer"
              title="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Ajuste Rápido do Título e Feedback */}
        <div className="px-6 py-2.5 bg-[#101714] border-b border-[#24332C] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <label className="text-[#889992] font-medium">Título do Slide:</label>
            <input
              type="text"
              value={slideTitle}
              onChange={(e) => setSlideTitle(e.target.value)}
              className="px-2.5 py-1 bg-[#0B0F0E] border border-[#263530] rounded text-xs font-mono text-[#F1F5F3] focus:outline-none focus:border-emerald-500 w-64"
            />
            <button
              type="button"
              onClick={generateSlideCanvas}
              className="px-2 py-1 bg-[#16211C] hover:bg-[#1E2D26] text-[#C2CEC8] border border-[#263530] rounded flex items-center gap-1 cursor-pointer"
              title="Atualizar prévia da imagem"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Atualizar</span>
            </button>
          </div>

          {copyFeedback ? (
            <span className="text-emerald-400 font-medium">{copyFeedback}</span>
          ) : (
            <span className="text-[#7A8C85] font-mono">
              Cronograma Simplificado sincronizado com o período filtrado ({formatDateBr(windowStartIso)} a {formatDateBr(windowEndIso)})
            </span>
          )}
        </div>

        {/* Área de Pré-visualização da Imagem Widescreen 16:9 */}
        <div className="p-6 bg-[#090D0B] flex-1 overflow-y-auto flex items-center justify-center">
          <div className="relative w-full aspect-video max-h-[68vh] bg-[#0D1311] border border-[#263530] rounded shadow-2xl overflow-hidden flex items-center justify-center">
            {isGenerating && (
              <div className="absolute inset-0 z-10 bg-black/60 flex flex-col items-center justify-center gap-2 text-xs text-emerald-300">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Renderizando imagem widescreen (1920×1080)...</span>
              </div>
            )}
            {previewDataUrl ? (
              <img
                src={previewDataUrl}
                alt="Prévia do Slide Widescreen Operações Terrestres"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-xs text-[#7A8C85]">Gerando prévia...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

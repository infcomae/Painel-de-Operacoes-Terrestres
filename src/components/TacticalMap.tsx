import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  LocationGroup,
  MISSION_STATUSES,
  MissionStatus,
  STATUS_CONFIG,
} from '../types/mission';
import { Compass, Crosshair, Grid, Maximize2 } from 'lucide-react';
import { formatDateBr } from '../utils/csvHelper';

interface TacticalMapProps {
  locationGroups: LocationGroup[];
  selectedLocationKey: string | null;
  onSelectLocation: (key: string) => void;
  isOnline: boolean;
}

import { BRAZIL_GEOJSON } from '../data/brazilBoundary';

const CLUSTER_DISTANCE_PX = 38;
const MAX_CLUSTER_ZOOM = 12;

interface MapCluster {
  id: string;
  groups: LocationGroup[];
  lat: number;
  lng: number;
  totalMissions: number;
  totalMilitares: number;
  dominantStatus: MissionStatus;
  includesSelected: boolean;
}

function buildLocationClusters(
  map: L.Map,
  locationGroups: LocationGroup[],
  zoom: number,
  selectedLocationKey: string | null
): MapCluster[] {
  let clusters: MapCluster[] = locationGroups.map((g) => ({
    id: g.key,
    groups: [g],
    lat: g.lat,
    lng: g.lng,
    totalMissions: g.missions.length,
    totalMilitares: g.totalMilitares,
    dominantStatus: g.dominantStatus,
    includesSelected: g.key === selectedLocationKey,
  }));

  if (zoom >= MAX_CLUSTER_ZOOM || clusters.length <= 1) {
    return clusters;
  }

  // Agrupa iterativamente os pares mais próximos no espaço de tela (pixels no zoom atual) em seu ponto médio
  let merged = true;
  while (merged && clusters.length > 1) {
    merged = false;
    let bestI = -1;
    let bestJ = -1;
    let bestDist = CLUSTER_DISTANCE_PX;

    const projected = clusters.map((c) => map.project([c.lat, c.lng], zoom));

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const dist = projected[i].distanceTo(projected[j]);
        if (dist < bestDist) {
          bestDist = dist;
          bestI = i;
          bestJ = j;
        }
      }
    }

    if (bestI !== -1 && bestJ !== -1) {
      const cA = clusters[bestI];
      const cB = clusters[bestJ];
      const combinedGroups = [...cA.groups, ...cB.groups];

      // Ponto médio geográfico exato das localidades agrupadas
      const avgLat =
        combinedGroups.reduce((sum, item) => sum + item.lat, 0) /
        combinedGroups.length;
      const avgLng =
        combinedGroups.reduce((sum, item) => sum + item.lng, 0) /
        combinedGroups.length;

      const totalMissions = combinedGroups.reduce(
        (sum, item) => sum + item.missions.length,
        0
      );
      const totalMilitares = combinedGroups.reduce(
        (sum, item) => sum + item.totalMilitares,
        0
      );

      let dominantStatus: MissionStatus = combinedGroups[0].dominantStatus;
      let bestPriority = STATUS_CONFIG[dominantStatus].priority;
      combinedGroups.forEach((g) => {
        const prio = STATUS_CONFIG[g.dominantStatus].priority;
        if (prio < bestPriority) {
          bestPriority = prio;
          dominantStatus = g.dominantStatus;
        }
      });

      const mergedCluster: MapCluster = {
        id: combinedGroups.map((g) => g.key).join('||'),
        groups: combinedGroups,
        lat: avgLat,
        lng: avgLng,
        totalMissions,
        totalMilitares,
        dominantStatus,
        includesSelected: combinedGroups.some((g) => g.key === selectedLocationKey),
      };

      clusters = clusters.filter((_, idx) => idx !== bestI && idx !== bestJ);
      clusters.push(mergedCluster);
      merged = true;
    }
  }

  return clusters;
}

function createTacticalMarkerIcon(
  hexColor: string,
  count: number,
  isSelected: boolean,
  isSatellite: boolean = false,
  clusteredLocationCount: number = 1
): L.DivIcon {
  const isCluster = clusteredLocationCount > 1;
  const baseSize = isCluster ? 36 : 32;
  const size = isSelected ? baseSize + 6 : baseSize;

  const ringStyle = isSatellite
    ? isSelected
      ? `box-shadow: 0 0 0 2.5px #FFFFFF, 0 0 16px rgba(0,0,0,0.95), 0 0 0 6px ${hexColor}; transform: scale(1.1);`
      : isCluster
      ? `box-shadow: 0 0 0 2px #FFFFFF, 0 3px 12px rgba(0,0,0,0.95), 0 0 0 5px ${hexColor}88;`
      : `box-shadow: 0 0 0 2px #FFFFFF, 0 3px 12px rgba(0,0,0,0.95), 0 0 0 4px ${hexColor};`
    : isSelected
    ? `box-shadow: 0 0 0 4px ${hexColor}55, 0 6px 16px rgba(0,0,0,0.85); transform: scale(1.08);`
    : isCluster
    ? `box-shadow: 0 0 0 4px ${hexColor}33, 0 4px 12px rgba(0,0,0,0.85);`
    : `box-shadow: 0 3px 10px rgba(0,0,0,0.75);`;

  const numberColor =
    hexColor === '#94A3B8' || hexColor === '#EAB308' || hexColor === '#38BDF8'
      ? '#070B09'
      : '#FFFFFF';

  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background-color: ${isSatellite ? '#0B0F0E' : '#0D1412'};
      border: ${
        isSatellite
          ? '2px solid #FFFFFF'
          : isCluster
          ? `2.5px dashed ${hexColor}`
          : `2.5px solid ${hexColor}`
      };
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: transform 150ms ease;
      ${ringStyle}
    ">
      <div style="
        width: ${size - 10}px;
        height: ${size - 10}px;
        border-radius: 50%;
        background-color: ${hexColor};
        color: ${numberColor};
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        ${isSatellite ? 'box-shadow: 0 1px 3px rgba(0,0,0,0.6);' : ''}
      ">
        ${count}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'tactical-custom-pin',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  locationGroups,
  selectedLocationKey,
  onSelectLocation,
  isOnline,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const gridLayerRef = useRef<L.LayerGroup | null>(null);
  const markerMapRef = useRef<Record<string, L.Marker>>({});
  const baseTilesLayerRef = useRef<L.LayerGroup | null>(null);
  const [mapLayer, setMapLayer] = useState<'dark' | 'satellite' | 'osm'>('dark');
  const [showTacticalGrid, setShowTacticalGrid] = useState<boolean>(true);
  const [currentZoom, setCurrentZoom] = useState<number>(4);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number }>({
    lat: -15.8697,
    lng: -47.9172,
  });

  // Inicializa o mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-14.235, -53.5],
      zoom: 4,
      minZoom: 3,
      maxZoom: 16,
      zoomControl: true,
    });

    const tilesGroup = L.layerGroup().addTo(map);
    baseTilesLayerRef.current = tilesGroup;

    const gridGroup = L.layerGroup().addTo(map);
    gridLayerRef.current = gridGroup;

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({
        lat: Number(e.latlng.lat.toFixed(4)),
        lng: Number(e.latlng.lng.toFixed(4)),
      });
    });

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Atualiza as camadas de mapa base (Esri Dark Gray, Satélite ou OSM - sem API key)
  useEffect(() => {
    const tilesGroup = baseTilesLayerRef.current;
    if (!tilesGroup) return;

    tilesGroup.clearLayers();

    if (mapLayer === 'dark') {
      // Esri World Dark Gray Base (sem necessidade de API key)
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
          maxZoom: 16,
        }
      ).addTo(tilesGroup);

      // Camada de rótulos táticos e fronteiras
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '',
          maxZoom: 16,
          opacity: 0.85,
        }
      ).addTo(tilesGroup);
    } else if (mapLayer === 'satellite') {
      // Esri World Imagery (Satélite)
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
          maxZoom: 17,
        }
      ).addTo(tilesGroup);

      // Rótulos e fronteiras nítidos em alta visibilidade sobre o satélite (amarelo/branco com sombra)
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri',
          maxZoom: 17,
          opacity: 0.95,
        }
      ).addTo(tilesGroup);
    } else {
      // OpenStreetMap com filtro CSS escuro militar
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        className: 'dark-osm-tiles',
        maxZoom: 18,
      }).addTo(tilesGroup);
    }
  }, [mapLayer]);

  // Desenha a grade tática e o contorno oficial de alta precisão do Brasil
  useEffect(() => {
    const gridGroup = gridLayerRef.current;
    if (!gridGroup) return;
    gridGroup.clearLayers();

    if (!showTacticalGrid) return;

    const isSat = mapLayer === 'satellite';

    // Contorno oficial de alta precisão do território brasileiro (WGS84 perfeitamente alinhado)
    L.geoJSON(BRAZIL_GEOJSON, {
      style: {
        color: isSat ? '#38BDF8' : '#10B981',
        weight: isSat ? 2 : 1.5,
        opacity: isSat ? 0.95 : 0.75,
        fillColor: isSat ? 'transparent' : '#10B981',
        fillOpacity: isSat ? 0 : 0.04,
        dashArray: '5 4',
      },
      interactive: false,
    }).addTo(gridGroup);

    // Linhas de grade de latitude e longitude com cores adaptadas à camada ativa
    const gridColor = isSat ? '#7DD3FC' : '#2A3C34';
    const gridOpacity = isSat ? 0.55 : 0.5;

    for (let lat = -35; lat <= 10; lat += 10) {
      L.polyline(
        [
          [lat, -78],
          [lat, -32],
        ],
        {
          color: gridColor,
          weight: 1,
          opacity: gridOpacity,
          dashArray: '4 4',
          interactive: false,
        }
      ).addTo(gridGroup);
    }

    for (let lng = -75; lng <= -35; lng += 10) {
      L.polyline(
        [
          [-35, lng],
          [10, lng],
        ],
        {
          color: gridColor,
          weight: 1,
          opacity: gridOpacity,
          dashArray: '4 4',
          interactive: false,
        }
      ).addTo(gridGroup);
    }
  }, [showTacticalGrid, mapLayer]);

  // Atualiza marcadores quando os grupos de localização, zoom, seleção ou camada de mapa mudam
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();
    markerMapRef.current = {};
    const isSat = mapLayer === 'satellite';

    const clusters = buildLocationClusters(
      map,
      locationGroups,
      currentZoom,
      selectedLocationKey
    );

    clusters.forEach((cluster) => {
      const statusCfg = STATUS_CONFIG[cluster.dominantStatus];
      const isCluster = cluster.groups.length > 1;
      const icon = createTacticalMarkerIcon(
        statusCfg.hex,
        cluster.totalMissions,
        cluster.includesSelected,
        isSat,
        cluster.groups.length
      );

      const marker = L.marker([cluster.lat, cluster.lng], { icon });

      if (!isCluster) {
        const group = cluster.groups[0];
        const missionsListHtml = group.missions
          .slice(0, 4)
          .map((m) => {
            const mStatus = STATUS_CONFIG[m.status];
            return `
              <div style="padding: 6px 0; border-top: 1px solid #1E2B26; font-size: 11px;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                  <strong style="color: #E2E8E5; font-family: 'JetBrains Mono', monospace;">${m.missao}</strong>
                  <span style="color: ${mStatus.hex}; font-weight: 600;">${m.status}</span>
                </div>
                <div style="color: #94A39E; margin-top: 2px;">
                  ${m.operacao}${m.atividade ? ` · ${m.atividade}` : ''} · Ação: <strong style="color: #D1DBD6;">${m.acao}</strong>
                </div>
                <div style="color: #7A8C85; font-family: 'JetBrains Mono', monospace; font-size: 10px; margin-top: 2px;">
                  ${formatDateBr(m.dataInicio)} a ${formatDateBr(m.dataTermino)} · ${m.qtdMilitares} mil. · ${m.indenizacao}
                </div>
              </div>
            `;
          })
          .join('');

        const extraCount =
          group.missions.length > 4
            ? `<div style="padding-top: 4px; font-size: 10px; color: #94A39E;">+ ${
                group.missions.length - 4
              } missão(ões) neste local</div>`
            : '';

        const popupHtml = `
          <div style="min-width: 240px;">
            <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 16px; font-weight: 700; color: #F1F5F3; letter-spacing: 0.02em;">
              ${group.local}
            </div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #889992; margin-bottom: 6px;">
              LAT ${group.lat.toFixed(4)} · LNG ${group.lng.toFixed(4)}
            </div>
            <div style="display: flex; gap: 12px; font-size: 11px; color: #C2CEC8; margin-bottom: 6px;">
              <span>Missões: <strong style="font-family: 'JetBrains Mono', monospace;">${group.missions.length}</strong></span>
              <span>·</span>
              <span>Efetivo: <strong style="font-family: 'JetBrains Mono', monospace;">${group.totalMilitares}</strong> mil.</span>
            </div>
            ${missionsListHtml}
            ${extraCount}
          </div>
        `;

        marker.bindPopup(popupHtml);

        marker.on('click', () => {
          onSelectLocation(group.key);
        });

        markerMapRef.current[group.key] = marker;
      } else {
        // Pino agrupado em ponto médio: ao clicar, aproxima o zoom na área para separar os pins nas posições reais
        const locationsSummary = cluster.groups
          .map(
            (g) =>
              `<div style="padding: 3px 0; border-top: 1px solid #1E2B26; display: flex; justify-content: space-between; gap: 10px; font-size: 11px;">
                <span style="color: #E2E8E5; font-weight: 600;">${g.local}</span>
                <span style="color: #94A39E; font-family: 'JetBrains Mono', monospace;">${g.missions.length} mis.</span>
              </div>`
          )
          .join('');

        const tooltipHtml = `
          <div style="min-width: 210px; padding: 2px;">
            <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 700; color: #10B981; margin-bottom: 2px;">
              Agrupamento Regional (${cluster.groups.length} localidades)
            </div>
            <div style="font-size: 10px; color: #94A39E; margin-bottom: 4px;">
              Total: ${cluster.totalMissions} missões · ${cluster.totalMilitares} mil. (Clique ou dê zoom para separar)
            </div>
            ${locationsSummary}
          </div>
        `;

        marker.bindTooltip(tooltipHtml, {
          direction: 'top',
          offset: [0, -18],
          opacity: 0.97,
        });

        marker.on('click', () => {
          const bounds = L.latLngBounds(
            cluster.groups.map((g) => [g.lat, g.lng] as [number, number])
          );
          // Calcula o menor nível de zoom onde essas localidades se separam visualmente
          let targetZoom = Math.min(currentZoom + 2, MAX_CLUSTER_ZOOM);
          for (let z = currentZoom + 1; z <= MAX_CLUSTER_ZOOM; z++) {
            const subClusters = buildLocationClusters(
              map,
              cluster.groups,
              z,
              selectedLocationKey
            );
            if (subClusters.length > 1) {
              targetZoom = z;
              break;
            }
          }
          map.flyToBounds(bounds, {
            padding: [70, 70],
            maxZoom: Math.max(targetZoom, 6),
            duration: 0.65,
          });
        });

        cluster.groups.forEach((g) => {
          markerMapRef.current[g.key] = marker;
        });
      }

      marker.addTo(markersGroup);
    });
  }, [locationGroups, selectedLocationKey, onSelectLocation, mapLayer, currentZoom]);

  // Centraliza o mapa suavemente quando um local é selecionado externamente (ex: botão "No Mapa")
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedLocationKey) return;

    const targetGroup = locationGroups.find((g) => g.key === selectedLocationKey);
    if (!targetGroup) return;

    // Garante que o zoom seja suficiente para desagrupar o pino selecionado dos vizinhos próximos
    let requiredZoom = Math.max(map.getZoom(), 6);
    for (let z = requiredZoom; z <= MAX_CLUSTER_ZOOM; z++) {
      const testClusters = buildLocationClusters(
        map,
        locationGroups,
        z,
        selectedLocationKey
      );
      const foundCluster = testClusters.find((c) =>
        c.groups.some((g) => g.key === selectedLocationKey)
      );
      if (foundCluster && foundCluster.groups.length === 1) {
        requiredZoom = z;
        break;
      }
    }

    map.flyTo([targetGroup.lat, targetGroup.lng], requiredZoom, {
      duration: 0.75,
    });

    const marker = markerMapRef.current[selectedLocationKey];
    if (marker && marker.getPopup()) {
      marker.openPopup();
    }
  }, [selectedLocationKey, locationGroups]);

  const handleResetBrazilView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([-14.235, -53.5], 4, { duration: 0.6 });
  };

  const handleFitBounds = () => {
    const map = mapInstanceRef.current;
    if (!map || locationGroups.length === 0) return;
    const bounds = L.latLngBounds(locationGroups.map((g) => [g.lat, g.lng]));
    map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 8, duration: 0.6 });
  };

  return (
    <div className="flex flex-col h-full bg-[#121916] border border-[#24332C] rounded-md overflow-hidden">
      {/* Cabeçalho do Mapa Tático */}
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-[#151E1A] border-b border-[#24332C]">
        <div className="flex items-center gap-3 min-w-0">
          <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
          <h2 className="font-display text-base font-semibold tracking-wide text-[#F1F5F3] truncate">
            Mapa
          </h2>
          <span className="hidden sm:inline text-xs text-[#7A8C85]">·</span>
          <span className="hidden sm:inline font-mono text-xs text-[#94A39E] tabular-nums whitespace-nowrap">
            {locationGroups.length} {locationGroups.length === 1 ? 'Localidade Ativa' : 'Localidades Ativas'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Seletor de Camada de Mapa */}
          <div className="hidden sm:flex items-center bg-[#0D1311] border border-[#263530] rounded p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMapLayer('dark')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                mapLayer === 'dark'
                  ? 'bg-[#1D2B25] text-emerald-300 font-semibold'
                  : 'text-[#889992] hover:text-[#E2E8E5]'
              }`}
              title="Mapa Base Escuro Militar (Esri - sem API key)"
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setMapLayer('satellite')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                mapLayer === 'satellite'
                  ? 'bg-[#1D2B25] text-emerald-300 font-semibold'
                  : 'text-[#889992] hover:text-[#E2E8E5]'
              }`}
              title="Imagem de Satélite Tática (Esri - sem API key)"
            >
              Satélite
            </button>
            <button
              type="button"
              onClick={() => setMapLayer('osm')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                mapLayer === 'osm'
                  ? 'bg-[#1D2B25] text-emerald-300 font-semibold'
                  : 'text-[#889992] hover:text-[#E2E8E5]'
              }`}
              title="OpenStreetMap Tático (sem API key)"
            >
              OSM
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowTacticalGrid((prev) => !prev)}
            className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              showTacticalGrid
                ? 'bg-[#1D2B25] text-emerald-300 border-emerald-500/40'
                : 'bg-[#121916] text-[#94A39E] border-[#263530] hover:text-[#E2E8E5]'
            }`}
            title="Alternar grade tática e contorno territorial offline"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grade</span>
          </button>
          <button
            type="button"
            onClick={handleFitBounds}
            disabled={locationGroups.length === 0}
            className="px-2.5 py-1 text-xs font-medium bg-[#121916] text-[#C2CEC8] border border-[#263530] rounded hover:bg-[#1C2722] hover:text-white disabled:opacity-40 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            title="Enquadrar todas as missões filtradas"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Enquadrar</span>
          </button>
          <button
            type="button"
            onClick={handleResetBrazilView}
            className="px-2.5 py-1 text-xs font-medium bg-[#121916] text-[#C2CEC8] border border-[#263530] rounded hover:bg-[#1C2722] hover:text-white transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            title="Centralizar visão geral no Brasil"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Brasil</span>
          </button>
        </div>
      </div>

      {/* Container do Mapa Leaflet */}
      <div className="relative flex-1 min-h-[420px]">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Telemetria de Coordenadas do Cursor */}
        <div className="absolute top-3 right-3 z-20 pointer-events-none bg-[#0D1311]/90 border border-[#263530] rounded px-2.5 py-1 text-[11px] font-mono text-[#94A39E] tabular-nums">
          LAT {cursorCoords.lat.toFixed(4)} · LNG {cursorCoords.lng.toFixed(4)}
          {!isOnline && (
            <span className="ml-2 text-yellow-400">· MODO VETORIAL OFFLINE</span>
          )}
        </div>
      </div>

      {/* Legenda de Cores por Status no Rodapé do Mapa */}
      <div className="px-4 py-2 bg-[#141C19] border-t border-[#24332C] flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-[#889992] font-medium">Legenda de Status nos Pinos:</span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {MISSION_STATUSES.map((status) => {
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={status} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: cfg.hex }}
                />
                <span className="text-[#C2CEC8] whitespace-nowrap">{cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

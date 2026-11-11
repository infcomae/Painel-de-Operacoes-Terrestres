import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  ACTION_DESCRIPTIONS,
  Mission,
  MissionAction,
  MissionIndenizacao,
  MissionStatus,
  MISSION_ACTIONS,
  MISSION_INDENIZACOES,
  MISSION_STATUSES,
} from '../types/mission';
import {
  searchOnlineLocations,
  resolveOnlineCoordinates,
  GeocodingSuggestion,
} from '../services/geocodingService';
import { Compass, Globe, Loader2, MapPin, Search, X } from 'lucide-react';

interface MissionModalProps {
  isOpen: boolean;
  initialMission: Mission | null;
  isClone?: boolean;
  onClose: () => void;
  onSave: (missionData: Omit<Mission, 'id'>, existingId?: string) => void;
}

export const MissionModal: React.FC<MissionModalProps> = ({
  isOpen,
  initialMission,
  isClone = false,
  onClose,
  onSave,
}) => {
  const [missao, setMissao] = useState('');
  const [operacao, setOperacao] = useState('');
  const [atividade, setAtividade] = useState('');
  const [local, setLocal] = useState('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataTermino, setDataTermino] = useState('');
  const [status, setStatus] = useState<MissionStatus | ''>('');
  const [unidadeExecutora, setUnidadeExecutora] = useState('');
  const [acao, setAcao] = useState<MissionAction | ''>('');
  const [fracaoTropa, setFracaoTropa] = useState('');
  const [qtdMilitares, setQtdMilitares] = useState<string>('');
  const [indenizacao, setIndenizacao] = useState<MissionIndenizacao | ''>('');

  const [geoFeedback, setGeoFeedback] = useState<string>('');
  const [isSearchingGeo, setIsSearchingGeo] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(true);
  const [formError, setFormError] = useState<string>('');

  // Sugestões de localidades online em tempo real
  const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const suggestionBoxRef = useRef<HTMLDivElement | null>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const pickerMapRef = useRef<HTMLDivElement | null>(null);
  const leafletPickerRef = useRef<L.Map | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError('');
    setGeoFeedback('');
    setSuggestions([]);
    setShowSuggestions(false);
    setIsLoadingSuggestions(false);
    setHighlightedIndex(-1);

    if (initialMission) {
      setMissao(initialMission.missao);
      setOperacao(initialMission.operacao);
      setAtividade(initialMission.atividade || '');
      setLocal(initialMission.local);
      setLat(String(initialMission.lat));
      setLng(String(initialMission.lng));
      setDataInicio(isClone ? '' : initialMission.dataInicio);
      setDataTermino(isClone ? '' : initialMission.dataTermino);
      setStatus(initialMission.status);
      setUnidadeExecutora(initialMission.unidadeExecutora);
      setAcao(initialMission.acao);
      setFracaoTropa(initialMission.fracaoTropa);
      setQtdMilitares(String(initialMission.qtdMilitares));
      setIndenizacao(initialMission.indenizacao);
    } else {
      // Todos os campos em branco por padrão para novo registro
      setMissao('');
      setOperacao('');
      setAtividade('');
      setLocal('');
      setLat('');
      setLng('');
      setDataInicio('');
      setDataTermino('');
      setStatus('');
      setUnidadeExecutora('');
      setAcao('');
      setFracaoTropa('');
      setQtdMilitares('');
      setIndenizacao('');
    }
  }, [isOpen, initialMission]);

  // Inicializa o mini-mapa seletor de coordenadas dentro do modal
  useEffect(() => {
    if (!isOpen || !showMapPicker || !pickerMapRef.current) return;

    if (leafletPickerRef.current) {
      leafletPickerRef.current.remove();
      leafletPickerRef.current = null;
      pickerMarkerRef.current = null;
    }

    const hasInitialCoords = lat !== '' && lng !== '';
    const parsedLat = parseFloat(lat.replace(',', '.')) || -14.235;
    const parsedLng = parseFloat(lng.replace(',', '.')) || -51.9253;

    const map = L.map(pickerMapRef.current, {
      center: [parsedLat, parsedLng],
      zoom: hasInitialCoords ? 6 : 4,
      minZoom: 3,
      maxZoom: 15,
    });

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 16,
      }
    ).addTo(map);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '',
        maxZoom: 16,
        opacity: 0.85,
      }
    ).addTo(map);

    const pinIcon = L.divIcon({
      className: 'picker-pin',
      html: `<div style="width: 22px; height: 22px; border-radius: 50%; background: #10B981; border: 3px solid #0B0F0E; box-shadow: 0 0 0 3px rgba(16,185,129,0.45);"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    if (hasInitialCoords && Number.isFinite(parseFloat(lat.replace(',', '.'))) && Number.isFinite(parseFloat(lng.replace(',', '.')))) {
      const marker = L.marker([parsedLat, parsedLng], { icon: pinIcon }).addTo(map);
      pickerMarkerRef.current = marker;
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      const clickedLat = e.latlng.lat.toFixed(4);
      const clickedLng = e.latlng.lng.toFixed(4);
      setLat(clickedLat);
      setLng(clickedLng);
      if (!pickerMarkerRef.current) {
        pickerMarkerRef.current = L.marker(e.latlng, { icon: pinIcon }).addTo(map);
      } else {
        pickerMarkerRef.current.setLatLng(e.latlng);
      }
      setGeoFeedback(`Coordenadas definidas por clique no mapa (${clickedLat}, ${clickedLng})`);
    });

    leafletPickerRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      leafletPickerRef.current = null;
      pickerMarkerRef.current = null;
    };
  }, [isOpen, showMapPicker]);

  // Atualiza a posição do pino no mini-mapa quando Lat/Lng mudam
  useEffect(() => {
    const map = leafletPickerRef.current;
    if (!map) return;

    if (!lat || !lng) {
      if (pickerMarkerRef.current) {
        pickerMarkerRef.current.remove();
        pickerMarkerRef.current = null;
      }
      return;
    }

    const numLat = parseFloat(lat.replace(',', '.'));
    const numLng = parseFloat(lng.replace(',', '.'));
    if (Number.isFinite(numLat) && Number.isFinite(numLng)) {
      if (!pickerMarkerRef.current) {
        const pinIcon = L.divIcon({
          className: 'picker-pin',
          html: `<div style="width: 22px; height: 22px; border-radius: 50%; background: #10B981; border: 3px solid #0B0F0E; box-shadow: 0 0 0 3px rgba(16,185,129,0.45);"></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        pickerMarkerRef.current = L.marker([numLat, numLng], { icon: pinIcon }).addTo(map);
      } else {
        pickerMarkerRef.current.setLatLng([numLat, numLng]);
      }
      map.panTo([numLat, numLng]);
    }
  }, [lat, lng]);

  // Fecha o dropdown de sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionBoxRef.current &&
        !suggestionBoxRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Limpa o timer de busca ao desmontar
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  // Digitação no campo Local com busca de sugestões online em tempo real
  const handleLocalInputChange = (value: string) => {
    setLocal(value);
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoadingSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    searchTimerRef.current = setTimeout(async () => {
      const results = await searchOnlineLocations(query, 6);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setHighlightedIndex(-1);
      setIsLoadingSuggestions(false);
    }, 350);
  };

  // Seleção de uma sugestão online
  const handleSelectSuggestion = (suggestion: GeocodingSuggestion) => {
    const formattedLocal =
      suggestion.cityOrState && !suggestion.name.includes(suggestion.cityOrState)
        ? `${suggestion.name} - ${suggestion.cityOrState}`
        : suggestion.name;

    setLocal(formattedLocal);
    setLat(String(suggestion.lat));
    setLng(String(suggestion.lng));
    setShowSuggestions(false);
    setSuggestions([]);
    setGeoFeedback(
      `Coordenadas obtidas online via OpenStreetMap (${suggestion.name}): ${suggestion.lat}, ${suggestion.lng}`
    );
  };

  // Navegação por teclado nas sugestões (setas cima/baixo, Enter e Esc)
  const handleLocalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Consulta online ativa de coordenadas pelo botão 'Obter Lat/Lng'
  const handleLookupCoordinates = async () => {
    if (!local.trim()) {
      setGeoFeedback('Preencha o campo Local antes de buscar as coordenadas.');
      return;
    }
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    setIsSearchingGeo(true);
    setGeoFeedback('Consultando coordenadas online (OpenStreetMap)...');
    const resolved = await resolveOnlineCoordinates(local);
    setIsSearchingGeo(false);

    if (resolved) {
      setLat(String(resolved.lat));
      setLng(String(resolved.lng));
      setGeoFeedback(
        `Coordenadas localizadas online (OpenStreetMap · ${resolved.name}): ${resolved.lat}, ${resolved.lng}`
      );
    } else {
      setGeoFeedback(
        'Localidade não encontrada na consulta online. Ajuste o termo ou clique diretamente no mapa ao lado para marcar o ponto.'
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedLat = parseFloat(lat.replace(',', '.'));
    const parsedLng = parseFloat(lng.replace(',', '.'));
    const parsedQtd = parseInt(qtdMilitares, 10);

    if (!missao.trim() || !operacao.trim() || !local.trim() || !unidadeExecutora.trim()) {
      setFormError('Preencha todos os campos obrigatórios de identificação da missão.');
      return;
    }

    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      setFormError('Informe coordenadas válidas de Latitude e Longitude (ou clique no mapa ao lado).');
      return;
    }

    if (!dataInicio || !dataTermino) {
      setFormError('Preencha as datas de início e término.');
      return;
    }

    if (!status) {
      setFormError('Selecione o Status da missão.');
      return;
    }

    if (!acao) {
      setFormError('Selecione o tipo de Ação.');
      return;
    }

    if (!indenizacao) {
      setFormError('Selecione o tipo de Indenização (NIL, DIÁRIA ou GRAT REP).');
      return;
    }

    if (!Number.isFinite(parsedQtd) || parsedQtd <= 0) {
      setFormError('Informe uma quantidade válida de militares (mínimo 1).');
      return;
    }

    onSave(
      {
        missao: missao.trim(),
        operacao: operacao.trim(),
        atividade: atividade.trim() || undefined,
        local: local.trim(),
        lat: Number(parsedLat.toFixed(4)),
        lng: Number(parsedLng.toFixed(4)),
        dataInicio,
        dataTermino: dataTermino >= dataInicio ? dataTermino : dataInicio,
        status,
        unidadeExecutora: unidadeExecutora.trim(),
        acao,
        fracaoTropa: fracaoTropa.trim() || 'Destacamento Operacional',
        qtdMilitares: parsedQtd,
        indenizacao,
      },
      isClone ? undefined : initialMission?.id
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#121916] border border-[#2A3C34] rounded-md shadow-2xl overflow-hidden my-auto">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#16201C] border-b border-[#263530]">
          <div>
            <h2 className="font-display text-xl font-bold tracking-wide text-[#F1F5F3]">
              {initialMission && !isClone
                ? `Editar Registro · ${initialMission.missao}`
                : isClone
                ? `Novo Registro (Clonado de ${initialMission?.missao})`
                : 'Novo Registro de Missão Operacional'}
            </h2>
            <p className="text-xs text-[#94A39E] mt-0.5">
              {isClone
                ? 'Dados pré-carregados da missão clonada. Preencha o período (data início e término) para confirmar o novo registro.'
                : 'Preencha os dados estruturados da missão. As coordenadas e sugestões são obtidas online em tempo real (OpenStreetMap) ou clicando no mapa.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#94A39E] hover:text-white rounded hover:bg-[#1E2B26] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {formError && (
            <div className="mb-4 px-3.5 py-2.5 bg-red-500/10 border border-red-500/40 rounded text-xs text-red-300">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna Esquerda do Formulário: Dados Operacionais */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#C2CEC8] mb-1">
                    Missão *
                  </label>
                  <input
                    type="text"
                    required
                    value={missao}
                    onChange={(e) => setMissao(e.target.value)}
                    placeholder="Ex: PSE, PCI"
                    className="w-full px-3 py-2 bg-[#0D1311] border border-[#263530] rounded text-sm font-mono text-[#F1F5F3] focus:outline-none focus:border-emerald-500 placeholder:text-[#4A5D54]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#C2CEC8] mb-1">
                    Operação *
                  </label>
                  <input
                    type="text"
                    required
                    value={operacao}
                    onChange={(e) => setOperacao(e.target.value)}
                    placeholder="Ex: PRESIDENCIAL, GVA"
                    className="w-full px-3 py-2 bg-[#0D1311] border border-[#263530] rounded text-sm text-[#F1F5F3] focus:outline-none focus:border-emerald-500 placeholder:text-[#4A5D54]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#C2CEC8] mb-1">
                  Atividade a ser Executada
                </label>
                <input
                  type="text"
                  value={atividade}
                  onChange={(e) => setAtividade(e.target.value)}
                  placeholder="Ex: Segurança de PCL, Contra Incêndio de Aeronaves"
                  className="w-full px-3 py-2 bg-[#0D1311] border border-[#263530] rounded text-sm text-[#F1F5F3] focus:outline-none focus:border-emerald-500 placeholder:text-[#4A5D54]"
                />
              </div>

              {/* Campo Local com Sugestões Online em Tempo Real */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-[#C2CEC8]">
                    Local (Cidade / Base / Guarnição) *
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <Globe className="w-3 h-3 text-emerald-400" />
                    Consulta Online (OpenStreetMap)
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      required
                      value={local}
                      onChange={(e) => handleLocalInputChange(e.target.value)}
                      onKeyDown={handleLocalKeyDown}
                      onFocus={() => {
                        if (suggestions.length > 0 && local.trim().length >= 2) {
                          setShowSuggestions(true);
                        }
                      }}
                      placeholder="Ex: Manaus, SBSP, Anápolis, Boa Vista"
                      autoComplete="off"
                      className="w-full pl-3 pr-8 py-2 bg-[#0D1311] border border-[#263530] rounded text-sm text-[#F1F5F3] focus:outline-none focus:border-emerald-500 placeholder:text-[#4A5D54]"
                    />
                    {isLoadingSuggestions && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleLookupCoordinates}
                    disabled={isSearchingGeo || !local.trim()}
                    className="px-3 py-2 bg-[#1A2621] hover:bg-[#22322B] text-emerald-300 border border-emerald-500/30 rounded text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Consultar coordenadas online a partir do Local digitado"
                  >
                    {isSearchingGeo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Buscando...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Obter Lat/Lng</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Dropdown Flutuante de Sugestões Online */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionBoxRef}
                    className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#101714] border border-[#2A3C34] rounded-md shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
                  >
                    <div className="px-3 py-1.5 bg-[#14201B] border-b border-[#24332C] flex items-center justify-between text-[10px] text-[#889992] font-mono uppercase tracking-wider">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <Globe className="w-3 h-3" />
                        Sugestões Online
                      </span>
                      <span>{suggestions.length} encontrados</span>
                    </div>

                    <div className="divide-y divide-[#1D2924]">
                      {suggestions.map((item, idx) => {
                        const isHighlighted = idx === highlightedIndex;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectSuggestion(item)}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            className={`w-full text-left px-3 py-2.5 flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                              isHighlighted
                                ? 'bg-emerald-500/20 text-[#F1F5F3]'
                                : 'hover:bg-[#16231D] text-[#C2CEC8]'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <MapPin
                                className={`w-4 h-4 shrink-0 mt-0.5 ${
                                  isHighlighted ? 'text-emerald-400' : 'text-[#6A7F75]'
                                }`}
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-[#F1F5F3] truncate">
                                  {item.name}
                                </div>
                                <div className="text-[11px] text-[#889992] truncate">
                                  {item.cityOrState}
                                  {item.category ? ` · ${item.category}` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#0A100E] border border-[#23352D] text-emerald-300 tabular-nums">
                                {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="px-3 py-1.5 bg-[#0D1412] border-t border-[#1E2B25] text-[10px] text-[#6A7F75] flex items-center justify-between font-mono">
                      <span>Clique ou use ↑ ↓ + Enter para preencher</span>
                      <span>Esc para fechar</span>
                    </div>
                  </div>
                )}

                {geoFeedback && (
                  <p className="mt-1 text-[11px] text-emerald-400 font-mono">
                    {geoFeedback}
                  </p>
                )}
              </div>

              {/* Coordenadas e Datas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#C2CEC8] mb-1">
                    Lat *
                  </label>
                  <input
                    type="text"
                    required
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="Ex: -15.7801"
                    className="w-full px-2.5 py-2 bg-[#0D1311] border border-[#263530] rounded text-xs font-mono tabular-nums text-[#F1F5F3] focus:outline-none focus:border-emerald-500 placeholder:text-[#4A5D54]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#C2CEC8] mb-1">
                    Lng *
                  </label>
                  <input
                    type="text"
                    required
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="Ex: -47.9292"
                    className="w-full px-2.5 py-2 bg-[#0D1311] border border-[#263530] rounded text-xs font-mono tabular-nums text-[#F1F5F3] focus:outline-none focus:border-emerald-500 placeholder:text-[#4A5D54]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#C2CEC8] mb-1">
                    Data início *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#0D1311] border border-[#263530] rounded text-xs font-mono tabular-nums text-[#F1F5F3] focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#C2CEC8] mb-1">
                    Data término *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataTermino}
                    onChange={(e) => setDataTermino(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#0D1311] border border-[#263530] rounded text-xs font-mono tabular-nums text-[#F1F5F3] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Status, Ação e Indenização */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#C2CEC8] mb-1">
                    Status *
                  </label>
                  <select
                    value={status}
                    required
                    onChange={(e) => setStatus(e.target.value as MissionStatus)}
                    className="w-full px-3 py-2 bg-[#0D1311] border border-[#263530] rounded text-sm text-[#F1F5F3] focus:outline-none focus:border-emerald-500"
                  >
                    <option value="" disabled>Selecione o status...</option>
                    {MISSION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#C2CEC8] mb-1">
                    Ação *
                  </label>
                  <select
                    value={acao}
                    required
                    onChange={(e) => setAcao(e.target.value as MissionAction)}
                    className="w-full px-3 py-2 bg-[#0D1311] border border-[#263530] rounded text-sm font-mono text-[#F1F5F3] focus:outline-none focus:border-emerald-500"
                  >
                    <option value="" disabled>Selecione a ação...</option>
                    {MISSION_ACTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a} — {ACTION_DESCRIPTIONS[a]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#C2CEC8] mb-1">
                    Indenização *
                  </label>
                  <select
                    value={indenizacao}
                    required
                    onChange={(e) => setIndenizacao(e.target.value as MissionIndenizacao)}
                    className="w-full px-3 py-2 bg-[#0D1311] border border-[#263530] rounded text-sm font-mono text-[#F1F5F3] focus:outline-none focus:border-emerald-500"
                  >
                    <option value="" disabled>Selecione a indenização...</option>
                    {MISSION_INDENIZACOES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Unidade Executora, Fração de Tropa e Qtd Militares */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-5">
                  <label className="block text-xs font-medium text-[#C2CEC8] mb-1">
                    Unidade Executora *
                  </label>
                  <input
                    type="text"
                    required
                    value={unidadeExecutora}
                    onChange={(e) => setUnidadeExecutora(e.target.value)}
                    placeholder="Ex: GSD-BV / 1º GDAAE"
                    className="w-full px-3 py-2 bg-[#0D1311] border border-[#263530] rounded text-sm text-[#F1F5F3] focus:outline-none focus:border-emerald-500 placeholder:text-[#4A5D54]"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-[#C2CEC8] mb-1">
                    Fração de Tropa *
                  </label>
                  <input
                    type="text"
                    required
                    value={fracaoTropa}
                    onChange={(e) => setFracaoTropa(e.target.value)}
                    placeholder="Ex: EQP, GC, PEL"
                    className="w-full px-3 py-2 bg-[#0D1311] border border-[#263530] rounded text-sm text-[#F1F5F3] focus:outline-none focus:border-emerald-500 placeholder:text-[#4A5D54]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-[#C2CEC8] mb-1">
                    Qtd Militares *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={qtdMilitares}
                    onChange={(e) => setQtdMilitares(e.target.value)}
                    placeholder="Ex: 25"
                    className="w-full px-3 py-2 bg-[#0D1311] border border-[#263530] rounded text-sm font-mono tabular-nums text-[#F1F5F3] focus:outline-none focus:border-emerald-500 placeholder:text-[#4A5D54]"
                  />
                </div>
              </div>
            </div>

            {/* Coluna Direita do Formulário: Mapa Interativo para Seleção de Coordenadas */}
            <div className="lg:col-span-5 flex flex-col bg-[#0D1311] border border-[#263530] rounded overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-[#151E1A] border-b border-[#263530]">
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#E2E8E5]">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Seletor de Coordenadas no Mapa</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMapPicker((prev) => !prev)}
                  className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                >
                  {showMapPicker ? 'Ocultar mapa' : 'Abrir mapa'}
                </button>
              </div>

              {showMapPicker ? (
                <div className="flex-1 flex flex-col min-h-[260px]">
                  <div ref={pickerMapRef} className="flex-1 w-full min-h-[230px]" />
                  <div className="px-3 py-2 bg-[#121916] border-t border-[#263530] text-[11px] text-[#94A39E] flex items-center justify-between">
                    <span>Clique em qualquer ponto para capturar Lat/Lng</span>
                    <span className="font-mono text-[#E2E8E5] tabular-nums">
                      {lat && lng ? `${lat}, ${lng}` : 'Sem coordenadas'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-[#889992]">
                  <Compass className="w-8 h-8 text-[#465951] mb-2" />
                  <p>O seletor visual de mapa está recolhido.</p>
                </div>
              )}
            </div>
          </div>

          {/* Rodapé do Modal */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#263530]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#C2CEC8] bg-[#17211D] border border-[#263530] rounded hover:bg-[#1E2B26] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-[#08120E] bg-emerald-400 hover:bg-emerald-300 rounded transition-colors cursor-pointer"
            >
              {initialMission && !isClone ? 'Salvar Alterações' : 'Confirmar Novo Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

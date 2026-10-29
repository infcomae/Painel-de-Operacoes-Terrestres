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
  findOfflineLocationCoordinates,
  resolveLocationCoordinates,
} from '../data/locationsCatalog';
import { Compass, MapPin, Search, X } from 'lucide-react';

interface MissionModalProps {
  isOpen: boolean;
  initialMission: Mission | null;
  onClose: () => void;
  onSave: (missionData: Omit<Mission, 'id'>, existingId?: string) => void;
}

export const MissionModal: React.FC<MissionModalProps> = ({
  isOpen,
  initialMission,
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

  const pickerMapRef = useRef<HTMLDivElement | null>(null);
  const leafletPickerRef = useRef<L.Map | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError('');
    setGeoFeedback('');

    if (initialMission) {
      setMissao(initialMission.missao);
      setOperacao(initialMission.operacao);
      setAtividade(initialMission.atividade || '');
      setLocal(initialMission.local);
      setLat(String(initialMission.lat));
      setLng(String(initialMission.lng));
      setDataInicio(initialMission.dataInicio);
      setDataTermino(initialMission.dataTermino);
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

  if (!isOpen) return null;

  // Ao alterar o campo Local, tenta preencher automaticamente pelo catálogo offline
  const handleLocalChange = (newLocal: string) => {
    setLocal(newLocal);
    const match = findOfflineLocationCoordinates(newLocal);
    if (match) {
      setLat(String(match.lat));
      setLng(String(match.lng));
      setGeoFeedback(`Coordenadas preenchidas automaticamente (${match.matchedName})`);
    }
  };

  // Busca ativa de coordenadas (offline catalog + online Nominatim)
  const handleLookupCoordinates = async () => {
    if (!local.trim()) {
      setGeoFeedback('Preencha o campo Local antes de buscar as coordenadas.');
      return;
    }
    setIsSearchingGeo(true);
    setGeoFeedback('Buscando coordenadas para a localidade informada...');
    const resolved = await resolveLocationCoordinates(local);
    setIsSearchingGeo(false);

    if (resolved) {
      setLat(String(resolved.lat));
      setLng(String(resolved.lng));
      setGeoFeedback(
        `Coordenadas localizadas (${resolved.source === 'offline' ? 'Base Tática Offline' : 'Geocodificação Online'}): ${resolved.lat}, ${resolved.lng}`
      );
    } else {
      setGeoFeedback(
        'Local não encontrado automaticamente. Clique diretamente no mapa ao lado para marcar o ponto.'
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
      initialMission?.id
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#121916] border border-[#2A3C34] rounded-md shadow-2xl overflow-hidden my-auto">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#16201C] border-b border-[#263530]">
          <div>
            <h2 className="font-display text-xl font-bold tracking-wide text-[#F1F5F3]">
              {initialMission ? `Editar Registro · ${initialMission.missao}` : 'Novo Registro de Missão Operacional'}
            </h2>
            <p className="text-xs text-[#94A39E] mt-0.5">
              Preencha os dados estruturados da missão. As coordenadas são obtidas automaticamente pelo local ou clicando no mapa.
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

              {/* Campo Local com Botão de Geocodificação (sem lista suspensa) */}
              <div>
                <label className="block text-xs font-medium text-[#C2CEC8] mb-1">
                  Local (Cidade / Base / Guarnição) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={local}
                    onChange={(e) => handleLocalChange(e.target.value)}
                    placeholder="Ex: SBMN, SÃO PAULO - SP"
                    className="flex-1 px-3 py-2 bg-[#0D1311] border border-[#263530] rounded text-sm text-[#F1F5F3] focus:outline-none focus:border-emerald-500 placeholder:text-[#4A5D54]"
                  />
                  <button
                    type="button"
                    onClick={handleLookupCoordinates}
                    disabled={isSearchingGeo}
                    className="px-3 py-2 bg-[#1A2621] hover:bg-[#22322B] text-emerald-300 border border-emerald-500/30 rounded text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                    title="Obter Latitude e Longitude automaticamente a partir do Local"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{isSearchingGeo ? 'Buscando...' : 'Obter Lat/Lng'}</span>
                  </button>
                </div>
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
              {initialMission ? 'Salvar Alterações' : 'Confirmar Novo Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

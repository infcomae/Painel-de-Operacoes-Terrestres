import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  X,
  RefreshCw,
  Filter,
  Edit3,
  PlusCircle,
  UploadCloud,
  Presentation,
  Copy,
  Check,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSync?: () => void;
  onOpenNewMission?: () => void;
  onOpenExport?: () => void;
  onOpenSlide?: () => void;
}

const NETWORK_FOLDER_PATH =
  'X:\\2. EMC\\4. CCOA\\6. DIVOC\\4. SOC\\2. CÉLULAS\\6. CÉLULA DE OPERAÇÕES TERRESTRES\\01. Operações Terrestres';

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  onOpenSync,
  onOpenNewMission,
  onOpenExport,
  onOpenSlide,
}) => {
  const [copiedPath, setCopiedPath] = useState(false);

  // Fecha o modal ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopyNetworkPath = async () => {
    try {
      await navigator.clipboard.writeText(NETWORK_FOLDER_PATH);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2500);
    } catch {
      // Fallback simples se a API clipboard estiver restrita
      const textarea = document.createElement('textarea');
      textarea.value = NETWORK_FOLDER_PATH;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#101714] border border-[#263530] rounded-lg shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-[#14201B] border-b border-[#24332C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="help-modal-title"
                  className="font-display text-xl font-bold tracking-wide text-[#F1F5F3]"
                >
                  Instruções de Uso · Guia Operacional
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                  Procedimento Padrão
                </span>
              </div>
              <p className="text-xs text-[#889992] mt-0.5">
                CÉLULA DE OPERAÇÕES TERRESTRES · CCOA / DIVOC / SOC · COMAE
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#889992] hover:text-[#F1F5F3] hover:bg-[#1C2C25] rounded transition-colors cursor-pointer"
            title="Fechar instruções (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com os 6 passos estruturados */}
        <div className="p-6 space-y-4 overflow-y-auto text-[#E2E8E5] text-sm custom-scrollbar">
          {/* Banner de Boas-Vindas e Resumo Operacional */}
          <div className="bg-[#15231D]/80 border border-[#24372F] rounded-lg p-3.5 flex items-start gap-3 text-xs text-[#B8C8C0]">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-[#F1F5F3]">
                Fluxo de Trabalho Oficial do Painel de Operações Terrestres
              </p>
              <p className="leading-relaxed">
                Siga as etapas abaixo para manter os registros operacionais atualizados, filtrar
                cenários em tempo real, efetuar novos lançamentos, sincronizar com o Google Drive / rede
                e gerar os slides oficiais para o Briefing Diário de Situação (BDS).
              </p>
            </div>
          </div>

          {/* Grid dos 6 Passos */}
          <div className="grid grid-cols-1 gap-3.5">
            {/* PASSO 1 */}
            <div className="bg-[#121B17] border border-[#22332B] rounded-lg p-4 transition-colors hover:border-[#2E473C]">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold font-mono text-sm flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-[#F1F5F3] flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-emerald-400" />
                      Atualização Inicial dos Dados
                    </h3>
                    {onOpenSync && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenSync();
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium cursor-pointer"
                      >
                        Abrir Atualizar <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#A2B3AC] mt-1.5 leading-relaxed">
                    Ao abrir o painel, clique em <strong className="text-emerald-300 font-semibold">"Atualizar"</strong> no topo da tela e, na janela que se abrir, clique em{' '}
                    <strong className="text-[#F1F5F3]">"Atualizar dados do Drive"</strong>.
                    <span className="text-emerald-400/90 ml-1">
                      (É necessário realizar a autenticação com a conta Google na primeira vez).
                    </span>
                  </p>

                  {/* Detalhe da pasta na rede */}
                  <div className="mt-3 bg-[#0A100E] border border-[#1E2B25] rounded-md p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-semibold text-[#889992] flex items-center gap-1.5">
                        <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                        Opção alternativa: Carregar arquivo .CSV do computador ou rede
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyNetworkPath}
                        className={`text-[11px] px-2 py-0.5 rounded border flex items-center gap-1 font-mono transition-colors cursor-pointer ${
                          copiedPath
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-[#15201B] text-[#A2B3AC] border-[#2A3C34] hover:text-[#F1F5F3]'
                        }`}
                        title="Copiar caminho da pasta na rede"
                      >
                        {copiedPath ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copiar Caminho
                          </>
                        )}
                      </button>
                    </div>
                    <code className="block font-mono text-[11px] text-amber-300/90 break-all bg-[#0e1613] p-1.5 rounded border border-[#1d2b24] select-all">
                      {NETWORK_FOLDER_PATH}
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* PASSO 2 */}
            <div className="bg-[#121B17] border border-[#22332B] rounded-lg p-4 transition-colors hover:border-[#2E473C]">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold font-mono text-sm flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#F1F5F3] flex items-center gap-2">
                    <Filter className="w-4 h-4 text-sky-400" />
                    Filtragem Tática de Missões
                  </h3>
                  <p className="text-xs text-[#A2B3AC] mt-1.5 leading-relaxed">
                    Utilize a barra de controles para refinar as missões exibidas:
                  </p>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#95A7A0]">
                    <div className="bg-[#0D1412] p-2 rounded border border-[#1A2621]">
                      <strong className="text-[#E2E8E5]">Período Rápido:</strong> Botões de atalho{' '}
                      <span className="text-emerald-300 font-mono font-semibold">D</span>,{' '}
                      <span className="text-emerald-300 font-mono font-semibold">D+1</span>,{' '}
                      <span className="text-emerald-300 font-mono font-semibold">D+2</span> e{' '}
                      <span className="text-emerald-300 font-mono font-semibold">D+3</span>, ou datas personalizadas.
                    </div>
                    <div className="bg-[#0D1412] p-2 rounded border border-[#1A2621]">
                      <strong className="text-[#E2E8E5]">Filtros Específicos:</strong> Busca por texto livre, Tipo de Ação, Operação, Indenização e Cards de Status.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PASSO 3 */}
            <div className="bg-[#121B17] border border-[#22332B] rounded-lg p-4 transition-colors hover:border-[#2E473C]">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold font-mono text-sm flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#F1F5F3] flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-amber-400" />
                    Edição de Registros Existentes
                  </h3>
                  <p className="text-xs text-[#A2B3AC] mt-1.5 leading-relaxed">
                    Edite as missões diretamente na seção{' '}
                    <strong className="text-[#F1F5F3]">"Missões Alocadas por Localidade"</strong> (coluna lateral direita) ou clicando no marcador correspondente no mapa tático.
                  </p>
                  <p className="text-xs text-[#889992] mt-1 leading-relaxed">
                    Ao clicar no ícone de lápis de qualquer missão, você poderá ajustar datas, fração de tropa, efetivo de militares, localidade, coordenadas e status operacional.
                  </p>
                </div>
              </div>
            </div>

            {/* PASSO 4 */}
            <div className="bg-[#121B17] border border-[#22332B] rounded-lg p-4 transition-colors hover:border-[#2E473C]">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold font-mono text-sm flex items-center justify-center shrink-0">
                  4
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-[#F1F5F3] flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-emerald-400" />
                      Criar Nova Missão
                    </h3>
                    {onOpenNewMission && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenNewMission();
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium cursor-pointer"
                      >
                        + Novo Registro <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#A2B3AC] mt-1.5 leading-relaxed">
                    Para incluir uma nova missão em branco, clique no botão{' '}
                    <strong className="text-emerald-300 font-semibold">+ Novo Registro</strong> no canto superior direito do painel.
                  </p>
                  <p className="text-xs text-[#889992] mt-1 leading-relaxed">
                    Preencha os campos da missão no modal aberto (código da missão, operação, tipo de ação, datas, unidade executora, efetivo e coordenadas) e clique em{' '}
                    <strong className="text-[#F1F5F3]">"Confirmar Novo Registro"</strong>.
                  </p>

                  {/* Complemento: Funcionalidade de Clonar Missão */}
                  <div className="mt-3 bg-[#0A100E] border border-[#1E2B25] rounded-md p-2.5">
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] font-semibold text-emerald-300">
                      <Copy className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Opção Rápida: Clonar Missão Existente</span>
                    </div>
                    <p className="text-[11px] text-[#A2B3AC] leading-relaxed">
                      Para criar um novo lançamento reaproveitando os dados de uma missão já existente, clique no botão de clonar (<strong className="text-emerald-300">ícone de cópia</strong> localizado entre os botões de editar e excluir no card da missão). A janela de novo registro será aberta com todas as informações pré-preenchidas, mantendo apenas o período (<strong className="text-[#F1F5F3]">data de início e término em branco</strong>) para preenchimento das novas datas da operação.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* PASSO 5 */}
            <div className="bg-[#121B17] border border-[#22332B] rounded-lg p-4 transition-colors hover:border-[#2E473C]">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold font-mono text-sm flex items-center justify-center shrink-0">
                  5
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-[#F1F5F3] flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-sky-400" />
                      Salvar Alterações e Exportar CSV (Obrigatório)
                    </h3>
                    {onOpenExport && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenExport();
                        }}
                        className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium cursor-pointer"
                      >
                        Abrir Exportar CSV <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#A2B3AC] mt-1.5 leading-relaxed">
                    <strong className="text-amber-300 font-semibold">Atenção:</strong> Sempre que incluir e/ou alterar qualquer registro, clique em{' '}
                    <strong className="text-sky-300 font-semibold">"Exportar CSV"</strong> no topo do painel e selecione{' '}
                    <strong className="text-[#F1F5F3]">"Enviar para Google Drive"</strong>.
                  </p>
                  <div className="mt-2.5 p-2 bg-[#0D1412] border border-[#1A2621] rounded text-xs text-[#95A7A0]">
                    Obs.: Existe também a opção de fazer o <strong className="text-[#E2E8E5]">download para o computador</strong> e guardar o arquivo na pasta de rede da Célula.
                  </div>
                </div>
              </div>
            </div>

            {/* PASSO 6 */}
            <div className="bg-[#121B17] border border-[#22332B] rounded-lg p-4 transition-colors hover:border-[#2E473C]">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold font-mono text-sm flex items-center justify-center shrink-0">
                  6
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-[#F1F5F3] flex items-center gap-2">
                      <Presentation className="w-4 h-4 text-emerald-400" />
                      Geração de Slide para o BDS
                    </h3>
                    {onOpenSlide && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenSlide();
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium cursor-pointer"
                      >
                        Abrir Gerador de Slide <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#A2B3AC] mt-1.5 leading-relaxed">
                    Para gerar a imagem oficial para o(s) slide(s) do <strong className="text-emerald-300 font-semibold">BDS</strong> (Briefing Diário de Situação), clique em{' '}
                    <strong className="text-[#F1F5F3]">"Gerar Slide"</strong> no topo do painel.
                  </p>
                  <p className="text-xs text-[#889992] mt-1 leading-relaxed">
                    A imagem em alta resolução Widescreen (16:9 · 1920×1080) é gerada automaticamente contendo o mapa tático com relevo/fronteiras e a linha do tempo organizada pelas operações, exatamente conforme os filtros e período selecionados no momento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé com botão de fechar e atalhos */}
        <div className="flex items-center justify-between gap-4 px-6 py-3.5 bg-[#14201B] border-t border-[#24332C]">
          <span className="text-xs text-[#889992] flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            Em caso de dúvidas operacionais, consulte a chefia da Célula de Operações Terrestres.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#08120E] bg-emerald-400 hover:bg-emerald-300 rounded transition-colors cursor-pointer"
          >
            Entendido, Fechar Guia
          </button>
        </div>
      </div>
    </div>
  );
};

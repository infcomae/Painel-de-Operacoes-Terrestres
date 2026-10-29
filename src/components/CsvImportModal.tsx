import React, { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { Mission } from '../types/mission';
import {
  CSV_HEADERS,
  downloadTemplateCsv,
  parseMissionsCsv,
} from '../utils/csvHelper';
import {
  auth,
  clearCachedAccessToken,
  getAccessToken,
  GOOGLE_DRIVE_FOLDER_ID,
  GOOGLE_DRIVE_FOLDER_URL,
  hasCachedAccessToken,
  signIn,
} from './CsvExportModal';
import {
  AlertCircle,
  CheckCircle2,
  CloudDownload,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
  LogOut,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (missions: Mission[], mode: 'replace' | 'merge') => void;
  onNotify?: (message: string) => void;
}

interface DriveFileMetadata {
  id: string;
  name: string;
  modifiedTime?: string;
  createdTime?: string;
  webViewLink?: string;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  onNotify,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedOption, setSelectedOption] = useState<'local' | 'drive'>('drive');

  // Estados para Opção 1: Importar CSV do Computador
  const [parsedMissions, setParsedMissions] = useState<Mission[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');

  // Estados para Opção 2: Atualizar Dados do Google Drive
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.currentUser);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState<boolean>(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [lastSyncedFile, setLastSyncedFile] = useState<{
    name: string;
    modifiedTime?: string;
    count: number;
    webViewLink?: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setDriveError(null);
      setLastSyncedFile(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileContent = (content: string, name: string) => {
    setFileName(name);
    const result = parseMissionsCsv(content);
    setParsedMissions(result.missions);
    setWarnings(result.warnings);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = String(evt.target?.result || '');
      handleFileContent(text, file.name);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleConfirmImport = () => {
    if (parsedMissions.length === 0) return;
    onImport(parsedMissions, importMode);
    setParsedMissions([]);
    setFileName('');
    setWarnings([]);
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setDriveError(null);
    try {
      await signIn();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Não foi possível autenticar com o Google.';
      setDriveError(`Falha na autenticação com o Google: ${msg}`);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    clearCachedAccessToken();
    await signOut(auth);
    setDriveError(null);
    setLastSyncedFile(null);
  };

  const handleUpdateFromGoogleDrive = async () => {
    setIsSyncingDrive(true);
    setDriveError(null);
    setLastSyncedFile(null);

    try {
      let token = await getAccessToken();
      if (!token) {
        throw new Error('Permissão de acesso ao Google Drive não concedida.');
      }

      const fetchLatestCsvFromFolder = async (accessToken: string) => {
        const q = `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false and (mimeType = 'text/csv' or name contains '.csv' or name contains '.CSV')`;
        const listUrl =
          `https://www.googleapis.com/drive/v3/files` +
          `?q=${encodeURIComponent(q)}` +
          `&orderBy=${encodeURIComponent('modifiedTime desc,createdTime desc')}` +
          `&pageSize=10` +
          `&fields=${encodeURIComponent('files(id,name,modifiedTime,createdTime,webViewLink)')}` +
          `&supportsAllDrives=true` +
          `&includeItemsFromAllDrives=true`;

        return fetch(listUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      };

      let listResponse = await fetchLatestCsvFromFolder(token);

      if (listResponse.status === 401) {
        clearCachedAccessToken();
        token = await signIn();
        if (!token) {
          throw new Error('Sessão expirada. Faça login novamente com sua conta Google.');
        }
        listResponse = await fetchLatestCsvFromFolder(token);
      }

      if (!listResponse.ok) {
        const errBody = await listResponse.json().catch(() => null);
        const apiMessage =
          errBody?.error?.message ||
          `Erro HTTP ${listResponse.status} ao consultar a pasta do Google Drive.`;
        throw new Error(apiMessage);
      }

      const listData: { files?: DriveFileMetadata[] } = await listResponse.json();
      const csvFiles = (listData.files || []).filter((f) =>
        f.name.toLowerCase().endsWith('.csv')
      );
      const targetFile = csvFiles[0] || listData.files?.[0];

      if (!targetFile) {
        throw new Error(
          'Nenhum arquivo .CSV foi encontrado na pasta do Google Drive configurada.'
        );
      }

      // Baixa o conteúdo do arquivo CSV mais recente
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        targetFile.id
      )}?alt=media&supportsAllDrives=true`;

      const fileResponse = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!fileResponse.ok) {
        const errBody = await fileResponse.json().catch(() => null);
        const apiMessage =
          errBody?.error?.message ||
          `Erro HTTP ${fileResponse.status} ao baixar o arquivo "${targetFile.name}".`;
        throw new Error(apiMessage);
      }

      const csvText = await fileResponse.text();
      const parsed = parseMissionsCsv(csvText);

      if (parsed.missions.length === 0) {
        const warningDetail =
          parsed.warnings.length > 0 ? ` (${parsed.warnings[0]})` : '';
        throw new Error(
          `O arquivo mais recente "${targetFile.name}" foi lido, mas não contém registros válidos de missão${warningDetail}.`
        );
      }

      // Substitui os registros atuais pelos registros do CSV mais recente do Google Drive
      onImport(parsed.missions, 'replace');

      setLastSyncedFile({
        name: targetFile.name,
        modifiedTime: targetFile.modifiedTime,
        count: parsed.missions.length,
        webViewLink: targetFile.webViewLink,
      });

      if (onNotify) {
        onNotify(
          `Dados atualizados via Google Drive: ${parsed.missions.length} missões carregadas de "${targetFile.name}".`
        );
      }

      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro inesperado ao buscar o arquivo CSV mais recente no Google Drive.';
      setDriveError(msg);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#121916] border border-[#2A3C34] rounded-md shadow-2xl overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#16201C] border-b border-[#263530]">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-display text-xl font-bold tracking-wide text-[#F1F5F3]">
                Atualizar Base Operacional de Missões
              </h2>
              <p className="text-xs text-[#94A39E]">
                Escolha entre atualizar com a planilha mais recente do Google Drive ou importar um arquivo .CSV do computador.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#94A39E] hover:text-white rounded hover:bg-[#1E2B26] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Seletor das 2 Opções: Atualizar Dados (Google Drive) vs Importar CSV (Computador) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Card Opção: Atualizar Dados (Google Drive) */}
            <button
              type="button"
              onClick={() => setSelectedOption('drive')}
              className={`text-left p-4 rounded-md border transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
                selectedOption === 'drive'
                  ? 'bg-[#17251F] border-emerald-500/70 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]'
                  : 'bg-[#0E1412] border-[#24332C] hover:bg-[#141D19]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#F1F5F3]">
                      Atualizar Dados
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono">
                      Sincronização Google Drive
                    </div>
                  </div>
                </div>
                <span
                  className={`w-3 h-3 rounded-full border ${
                    selectedOption === 'drive'
                      ? 'bg-emerald-400 border-emerald-300'
                      : 'border-[#465951]'
                  }`}
                />
              </div>
              <p className="text-xs text-[#889992] leading-relaxed">
                Busca automaticamente o arquivo <code className="text-[#C2CEC8] font-mono">.CSV</code> mais recente na pasta oficial do Google Drive e substitui os registros atuais.
              </p>
            </button>

            {/* Card Opção: Importar CSV (Computador) */}
            <button
              type="button"
              onClick={() => setSelectedOption('local')}
              className={`text-left p-4 rounded-md border transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
                selectedOption === 'local'
                  ? 'bg-[#17251F] border-emerald-500/70 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]'
                  : 'bg-[#0E1412] border-[#24332C] hover:bg-[#141D19]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#F1F5F3]">
                      Importar CSV
                    </div>
                    <div className="text-[11px] text-sky-400 font-mono">
                      Upload do Computador
                    </div>
                  </div>
                </div>
                <span
                  className={`w-3 h-3 rounded-full border ${
                    selectedOption === 'local'
                      ? 'bg-emerald-400 border-emerald-300'
                      : 'border-[#465951]'
                  }`}
                />
              </div>
              <p className="text-xs text-[#889992] leading-relaxed">
                Seleciona manualmente um arquivo <code className="text-[#C2CEC8] font-mono">.CSV</code> salvo no seu computador para substituir ou mesclar à base.
              </p>
            </button>
          </div>

          {/* =================================================================
              CONTEÚDO DA OPÇÃO: ATUALIZAR DADOS (GOOGLE DRIVE)
          ================================================================= */}
          {selectedOption === 'drive' && (
            <div className="p-5 bg-[#0D1311] border border-[#24332C] rounded-md space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#F1F5F3]">
                    <CloudDownload className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Buscar CSV Mais Recente no Google Drive</span>
                  </div>
                  <p className="text-xs text-[#889992] leading-relaxed max-w-xl">
                    O sistema localizará o arquivo <strong className="text-[#C2CEC8] font-mono">.CSV</strong> com data de modificação mais recente dentro da pasta compartilhada e substituirá os registros atuais do painel.
                  </p>
                </div>

                <a
                  href={GOOGLE_DRIVE_FOLDER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-medium text-emerald-300 bg-[#15221D] border border-emerald-500/30 rounded hover:bg-[#1B2C26] flex items-center gap-1.5 font-mono shrink-0"
                  title="Abrir pasta no Google Drive"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Abrir Pasta no Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Status da Conta Google Conectada */}
              {currentUser && (
                <div className="px-3.5 py-2.5 bg-[#121916] border border-[#24332C] rounded flex items-center justify-between gap-2 text-xs">
                  <span className="text-[#C2CEC8] truncate">
                    Conta Google conectada:{' '}
                    <strong className="text-[#F1F5F3]">{currentUser.email}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleGoogleSignOut}
                    className="text-[#889992] hover:text-red-400 flex items-center gap-1 shrink-0 cursor-pointer"
                    title="Desconectar conta Google"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Trocar conta</span>
                  </button>
                </div>
              )}

              {/* Ações de Autenticação e Atualização */}
              <div className="pt-1 space-y-3">
                {!currentUser && !hasCachedAccessToken() ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isSigningIn || isSyncingDrive}
                      className="gsi-material-button"
                    >
                      <div className="gsi-material-button-state"></div>
                      <div className="gsi-material-button-content-wrapper">
                        <div className="gsi-material-button-icon">
                          <svg
                            version="1.1"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 48 48"
                            xmlnsXlink="http://www.w3.org/1999/xlink"
                            style={{ display: 'block' }}
                          >
                            <path
                              fill="#EA4335"
                              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                            ></path>
                            <path
                              fill="#4285F4"
                              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                            ></path>
                            <path
                              fill="#FBBC05"
                              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                            ></path>
                            <path
                              fill="#34A853"
                              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                            ></path>
                            <path fill="none" d="M0 0h48v48H0z"></path>
                          </svg>
                        </div>
                        <span className="gsi-material-button-contents">
                          {isSigningIn ? 'Conectando...' : 'Sign in with Google'}
                        </span>
                        <span style={{ display: 'none' }}>Sign in with Google</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleUpdateFromGoogleDrive}
                      disabled={isSyncingDrive}
                      className="flex-1 px-4 py-2.5 text-xs font-semibold text-[#08120E] bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSyncingDrive ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Buscando arquivo mais recente no Drive...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 stroke-[2.2]" />
                          <span>Autenticar e Atualizar Dados Agora</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleUpdateFromGoogleDrive}
                    disabled={isSyncingDrive}
                    className="w-full px-4 py-3 text-xs font-semibold text-[#08120E] bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSyncingDrive ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Buscando arquivo CSV mais recente no Google Drive...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 stroke-[2.2]" />
                        <span>Atualizar Dados com o CSV Mais Recente do Drive</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {lastSyncedFile && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded flex items-center justify-between gap-3 text-xs text-emerald-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      Base substituída com <strong>{lastSyncedFile.count}</strong> missões do arquivo{' '}
                      <strong className="font-mono">{lastSyncedFile.name}</strong>.
                    </span>
                  </div>
                </div>
              )}

              {driveError && (
                <div className="p-3 bg-red-950/30 border border-red-500/40 rounded flex items-start gap-2.5 text-xs text-red-200">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-red-300">
                      Não foi possível atualizar os dados pelo Google Drive
                    </div>
                    <div className="text-[11px] text-red-200/90 mt-0.5">{driveError}</div>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-[#1D2924] flex items-center justify-between text-[11px] text-[#7A8C85] font-mono">
                <span className="truncate">
                  Pasta ID: {GOOGLE_DRIVE_FOLDER_ID}
                </span>
                <span>Modo: Substituição total dos registros atuais</span>
              </div>
            </div>
          )}

          {/* =================================================================
              CONTEÚDO DA OPÇÃO: IMPORTAR CSV (COMPUTADOR)
          ================================================================= */}
          {selectedOption === 'local' && (
            <div className="space-y-4">
              {/* Estrutura esperada das 13 colunas */}
              <div className="p-3.5 bg-[#0D1311] border border-[#24332C] rounded">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-[#C2CEC8] flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Estrutura Oficial das 13 Colunas Reconhecidas:</span>
                  </span>
                  <button
                    type="button"
                    onClick={downloadTemplateCsv}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar Modelo .CSV</span>
                  </button>
                </div>
                <p className="font-mono text-[11px] text-[#889992] leading-relaxed">
                  {CSV_HEADERS.join(', ')}
                </p>
              </div>

              {/* Área de Seleção de Arquivo */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#2A3C34] hover:border-emerald-500/60 bg-[#0F1513] rounded-md p-6 text-center cursor-pointer transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-[#E2E8E5]">
                  {fileName
                    ? `Arquivo carregado: ${fileName}`
                    : 'Clique para selecionar um arquivo .CSV do seu computador'}
                </p>
                <p className="text-xs text-[#7A8C85] mt-1">
                  Compatível com separador vírgula (,) ou ponto-e-vírgula (;) exportado do Excel.
                </p>
              </div>

              {/* Modo de Importação */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#C2CEC8]">
                <span className="font-medium">Modo de carga:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="accent-emerald-400"
                  />
                  <span>Substituir registros atuais pela planilha</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="accent-emerald-400"
                  />
                  <span>Mesclar (adicionar aos registros atuais)</span>
                </label>
              </div>

              {warnings.length > 0 && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/40 rounded text-xs text-yellow-300 space-y-1">
                  {warnings.map((w, i) => (
                    <div key={i}>{w}</div>
                  ))}
                </div>
              )}

              {/* Pré-visualização das missões identificadas */}
              {parsedMissions.length > 0 && (
                <div className="border border-[#24332C] rounded overflow-hidden">
                  <div className="px-3.5 py-2 bg-[#16201C] border-b border-[#24332C] flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-300">
                      {parsedMissions.length} missão(ões) pronta(s) para importação
                    </span>
                    <span className="font-mono text-[#889992]">Pré-visualização</span>
                  </div>
                  <div className="max-h-44 overflow-y-auto divide-y divide-[#1D2924] bg-[#0D1311] text-xs">
                    {parsedMissions.slice(0, 8).map((m) => (
                      <div
                        key={m.id}
                        className="px-3.5 py-2 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-semibold text-[#F1F5F3]">
                            {m.missao}
                          </span>
                          <span className="mx-1.5 text-[#5D7068]">·</span>
                          <span className="text-[#C2CEC8]">{m.operacao}</span>
                          <span className="mx-1.5 text-[#5D7068]">·</span>
                          <span className="text-[#94A39E]">{m.local}</span>
                        </div>
                        <div className="font-mono text-[11px] text-[#889992] shrink-0 tabular-nums">
                          {m.acao} · {m.status} · {m.indenizacao}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rodapé do Modal */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#263530]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#C2CEC8] bg-[#17211D] border border-[#263530] rounded hover:bg-[#1E2B26] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            {selectedOption === 'local' && (
              <button
                type="button"
                disabled={parsedMissions.length === 0}
                onClick={handleConfirmImport}
                className="px-5 py-2 text-xs font-semibold text-[#08120E] bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 rounded transition-colors cursor-pointer"
              >
                Importar {parsedMissions.length > 0 ? `(${parsedMissions.length})` : ''} Registros
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

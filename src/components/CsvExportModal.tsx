import React, { useEffect, useState } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Mission } from '../types/mission';
import { buildMissionsCsvData, exportMissionsToCsv } from '../utils/csvHelper';
import {
  CheckCircle2,
  CloudUpload,
  Database,
  Download,
  ExternalLink,
  FolderOpen,
  Loader2,
  LogOut,
  AlertCircle,
  X,
} from 'lucide-react';

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const SCOPES = ['https://www.googleapis.com/auth/drive'];

export const GOOGLE_DRIVE_FOLDER_ID = '1iD5CMPCdZixV2iCXUTS9w_vkUuIxXZhR';
export const GOOGLE_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_FOLDER_ID}`;

// In-memory cache only — never persisted in localStorage or sessionStorage
let cachedAccessToken: string | null = null;

export function hasCachedAccessToken(): boolean {
  return cachedAccessToken !== null;
}

export function clearCachedAccessToken(): void {
  cachedAccessToken = null;
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
  }
});

export async function signIn(): Promise<string | null> {
  const provider = new GoogleAuthProvider();
  SCOPES.forEach((scope) => provider.addScope(scope));

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  cachedAccessToken = credential?.accessToken ?? null;
  return cachedAccessToken;
}

export async function getAccessToken(): Promise<string | null> {
  if (cachedAccessToken) return cachedAccessToken;
  return signIn();
}

interface CsvExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  missions: Mission[];
  filteredCount: number;
  onNotify: (message: string) => void;
}

export const CsvExportModal: React.FC<CsvExportModalProps> = ({
  isOpen,
  onClose,
  missions,
  filteredCount,
  onNotify,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.currentUser);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    id: string;
    name: string;
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
      setUploadError(null);
      setUploadedFile(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalMilitares = missions.reduce((sum, m) => sum + (m.qtdMilitares || 0), 0);

  const handleLocalDownload = () => {
    const fileName = exportMissionsToCsv(missions);
    onNotify(
      `Histórico completo exportado (${missions.length} missões) no arquivo ${fileName}.`
    );
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setUploadError(null);
    try {
      await signIn();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Não foi possível autenticar com o Google.';
      setUploadError(`Falha na autenticação com o Google: ${msg}`);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    cachedAccessToken = null;
    await signOut(auth);
    setUploadedFile(null);
    setUploadError(null);
  };

  const handleExportToGoogleDrive = async () => {
    setIsUploading(true);
    setUploadError(null);
    setUploadedFile(null);

    try {
      let token = await getAccessToken();
      if (!token) {
        throw new Error('Permissão de acesso ao Google Drive não concedida.');
      }

      const { csvContent, fileName } = buildMissionsCsvData(missions);

      const uploadFileRequest = async (accessToken: string) => {
        const boundary = '-------comae_csv_export_boundary_' + Date.now();
        const metadata = {
          name: fileName,
          mimeType: 'text/csv',
          parents: [GOOGLE_DRIVE_FOLDER_ID],
        };

        const multipartBody =
          `--${boundary}\r\n` +
          `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
          `${JSON.stringify(metadata)}\r\n` +
          `--${boundary}\r\n` +
          `Content-Type: text/csv; charset=UTF-8\r\n\r\n` +
          `${csvContent}\r\n` +
          `--${boundary}--`;

        return fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body: multipartBody,
          }
        );
      };

      let response = await uploadFileRequest(token);

      // Se o token em memória expirou, solicita novo token via popup e tenta novamente
      if (response.status === 401) {
        cachedAccessToken = null;
        token = await signIn();
        if (!token) {
          throw new Error('Sessão expirada. Faça login novamente com sua conta Google.');
        }
        response = await uploadFileRequest(token);
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        const apiMessage =
          errBody?.error?.message || `Erro HTTP ${response.status} ao enviar para o Google Drive.`;
        throw new Error(apiMessage);
      }

      const data = await response.json();
      setUploadedFile({
        id: data.id,
        name: data.name || fileName,
        webViewLink: data.webViewLink,
      });
      onNotify(
        `Histórico completo (${missions.length} missões) exportado para o Google Drive: ${
          data.name || fileName
        }`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro inesperado ao exportar arquivo para o Google Drive.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-xl bg-[#121916] border border-[#263530] rounded-md shadow-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#16201C] border-b border-[#263530]">
          <div className="flex items-center gap-2.5">
            <Download className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <h2 className="font-display text-lg font-bold tracking-wide text-[#F1F5F3]">
                Exportar Histórico Completo (.CSV)
              </h2>
              <p className="text-xs text-[#889992]">
                Escolha entre baixar o arquivo localmente ou exportar direto para a pasta do Google Drive
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#889992] hover:text-white p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-5 space-y-4">
          {/* Resumo do Histórico Completo */}
          <div className="p-3.5 bg-[#0E1412] border border-[#223029] rounded flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#F1F5F3]">
                  Todo o histórico de missões será exportado
                </div>
                <div className="text-[11px] text-[#889992] mt-0.5">
                  Inclui todos os registros cadastrados na base, independentemente dos filtros ativos na tela
                  {filteredCount !== missions.length && (
                    <span className="text-emerald-300 font-mono">
                      {' '}
                      ({filteredCount} filtradas de {missions.length} no histórico total)
                    </span>
                  )}
                  .
                </div>
              </div>
            </div>
            <div className="text-right font-mono shrink-0">
              <div className="text-sm font-bold text-emerald-400 tabular-nums">
                {missions.length} {missions.length === 1 ? 'missão' : 'missões'}
              </div>
              <div className="text-[11px] text-[#889992] tabular-nums">
                {totalMilitares} mil.
              </div>
            </div>
          </div>

          {/* Opções de Exportação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Opção 1: Download Local */}
            <div className="p-4 bg-[#0B0F0E] border border-[#24332C] rounded flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#F1F5F3]">
                  <Download className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Download no Computador</span>
                </div>
                <p className="text-[11px] text-[#889992] mt-1.5 leading-relaxed">
                  Gera e baixa imediatamente o arquivo <code className="text-[#C2CEC8] font-mono">op_ter_AAAAMMDD_HHMM.csv</code> com todas as {missions.length} missões do histórico.
                </p>
              </div>

              <button
                type="button"
                onClick={handleLocalDownload}
                disabled={missions.length === 0}
                className="w-full px-3.5 py-2.5 text-xs font-semibold text-[#071318] bg-sky-400 hover:bg-sky-300 disabled:opacity-40 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.2]" />
                <span>Baixar Arquivo .CSV</span>
              </button>
            </div>

            {/* Opção 2: Exportar para o Google Drive */}
            <div className="p-4 bg-[#0B0F0E] border border-[#24332C] rounded flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#F1F5F3]">
                    <CloudUpload className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Exportar para Google Drive</span>
                  </div>
                  <a
                    href={GOOGLE_DRIVE_FOLDER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono"
                    title="Abrir pasta de destino no Google Drive"
                  >
                    <FolderOpen className="w-3 h-3" />
                    <span>Abrir Pasta</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[11px] text-[#889992] mt-1.5 leading-relaxed">
                  Salva o arquivo <code className="text-[#C2CEC8] font-mono">.CSV</code> diretamente na pasta compartilhada do Google Drive.
                </p>

                {currentUser && (
                  <div className="mt-2.5 px-2.5 py-1.5 bg-[#121916] border border-[#24332C] rounded flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-[#C2CEC8] truncate" title={currentUser.email || ''}>
                      Conta: <strong className="text-[#F1F5F3]">{currentUser.email}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleGoogleSignOut}
                      className="text-[#889992] hover:text-red-400 flex items-center gap-1 shrink-0 cursor-pointer"
                      title="Desconectar conta Google"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Trocar</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {!currentUser && !cachedAccessToken ? (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isSigningIn}
                      className="gsi-material-button w-full"
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
                      onClick={handleExportToGoogleDrive}
                      disabled={isUploading || missions.length === 0}
                      className="w-full px-3.5 py-2 text-xs font-semibold text-[#08120E] bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enviando para o Drive...</span>
                        </>
                      ) : (
                        <>
                          <CloudUpload className="w-4 h-4 stroke-[2.2]" />
                          <span>Autenticar e Exportar para o Drive</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleExportToGoogleDrive}
                    disabled={isUploading || missions.length === 0}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold text-[#08120E] bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Exportando para o Google Drive...</span>
                      </>
                    ) : (
                      <>
                        <CloudUpload className="w-4 h-4 stroke-[2.2]" />
                        <span>Enviar .CSV para o Google Drive</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Feedback de Sucesso no Upload para o Google Drive */}
          {uploadedFile && (
            <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/40 rounded flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-xs text-emerald-200 truncate">
                  Arquivo <strong className="font-mono">{uploadedFile.name}</strong> salvo com sucesso na pasta do Google Drive!
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {uploadedFile.webViewLink && (
                  <a
                    href={uploadedFile.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 rounded hover:bg-emerald-500/30 flex items-center gap-1"
                  >
                    <span>Ver Arquivo</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <a
                  href={GOOGLE_DRIVE_FOLDER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-[11px] font-medium text-[#E2E8E5] bg-[#17231E] border border-[#2A3C34] rounded hover:bg-[#1E2E27] flex items-center gap-1"
                >
                  <span>Abrir Pasta</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Feedback de Erro */}
          {uploadError && (
            <div className="p-3 bg-red-950/30 border border-red-500/40 rounded flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-red-300">
                  Não foi possível concluir a exportação para o Google Drive
                </div>
                <div className="text-[11px] text-red-200/90 mt-0.5">{uploadError}</div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#151E1A] border-t border-[#263530]">
          <a
            href={GOOGLE_DRIVE_FOLDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#889992] hover:text-emerald-300 flex items-center gap-1.5 font-mono truncate"
          >
            <FolderOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">
              Destino Drive: drive.google.com/drive/folders/{GOOGLE_DRIVE_FOLDER_ID}
            </span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-[#C2CEC8] bg-[#17211D] border border-[#263530] rounded hover:bg-[#1E2B26] cursor-pointer shrink-0"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Serviço de Inteligência Artificial — aiService.ts
 *
 * Responsável por:
 * 1. Abrir o seletor de arquivos do dispositivo (expo-document-picker).
 * 2. Ler e converter o arquivo selecionado para Base64.
 * 3. Enviar o payload para a Vercel Edge Function (/api/generate-survey).
 * 4. Retornar o resultado estruturado ou lançar um erro tratado.
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import type { AISurveyResult, GenerateSurveyPayload, GenerateSurveyResponse, GenerateSurveyErrorResponse } from '../types/ai.types';

// ---------- Constantes ----------

/** Tipos MIME aceitos pelo seletor de arquivos. */
const ACCEPTED_MIME_TYPES = ['application/pdf', 'text/plain', 'text/markdown'];

/** Tamanho máximo do arquivo em bytes (5 MB). */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Resolve a URL base da API.
 *
 * - Em desenvolvimento (Expo Go / web local), aponta para localhost:3000
 *   para funcionar com `vercel dev`.
 * - Em produção (build Expo web na Vercel), a rota relativa /api/... resolve
 *   automaticamente para o mesmo domínio.
 *
 * Se você rodar com `vercel dev` em outra porta, ajuste EXPO_PUBLIC_API_URL no .env.
 */
const getApiBaseUrl = (): string => {
  // Variável de ambiente opcional para sobrescrever (útil em testes e dev local)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  // Na web em produção (mesmo domínio), URL relativa funciona.
  if (Platform.OS === 'web') return '';

  // No app nativo rodando localmente (Expo Go), o servidor vercel dev
  // costuma estar em localhost:3000. Ajuste se necessário.
  return 'http://localhost:3000';
};

// ---------- Funções auxiliares ----------

/**
 * Lê um arquivo pelo URI e o converte para uma string Base64.
 * Usa expo-file-system para compatibilidade nativa (Android/iOS).
 */
async function readFileAsBase64(uri: string): Promise<string> {
  // Na web, o DocumentPicker retorna um blob URI — precisamos fazer fetch + base64
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

  // Nativo: usa o FileSystem do Expo para leitura eficiente
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64;
}

// ---------- Função principal exportada ----------

/**
 * Abre o seletor de arquivos, valida o arquivo escolhido,
 * envia para o Gemini via Vercel Edge Function e retorna
 * a pesquisa gerada pronta para uso.
 *
 * @throws {Error} com mensagem amigável em português se algo der errado.
 * @returns {AISurveyResult} ou `null` se o usuário cancelou.
 */
export async function pickFileAndGenerateSurvey(): Promise<AISurveyResult | null> {
  // 1. Abre o seletor de arquivos
  const result = await DocumentPicker.getDocumentAsync({
    type: ACCEPTED_MIME_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });

  // Usuário cancelou
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const file = result.assets[0];

  // 2. Valida o tamanho do arquivo
  if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(
      `O arquivo é muito grande (${sizeMB} MB). O limite é 5 MB. Por favor, escolha um arquivo menor.`
    );
  }

  // Valida o tipo MIME
  const mimeType = file.mimeType ?? 'application/octet-stream';
  if (!ACCEPTED_MIME_TYPES.includes(mimeType)) {
    throw new Error(
      `Formato não suportado: ${file.name}. Selecione um PDF ou arquivo de texto (.txt).`
    );
  }

  // 3. Converte o arquivo para Base64
  let fileBase64: string;
  try {
    fileBase64 = await readFileAsBase64(file.uri);
  } catch (readError) {
    throw new Error('Não foi possível ler o arquivo. Tente novamente.');
  }

  // 4. Monta o payload e envia para a Vercel Edge Function
  const payload: GenerateSurveyPayload = {
    fileBase64,
    mimeType,
    fileName: file.name,
  };

  const apiUrl = `${getApiBaseUrl()}/api/generate-survey`;

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (networkError) {
    throw new Error(
      'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.'
    );
  }

  const json: GenerateSurveyResponse | GenerateSurveyErrorResponse = await response.json();

  // 5. Trata erros retornados pelo servidor
  if (!response.ok || !json.success) {
    const errorMsg = (json as GenerateSurveyErrorResponse).error ?? 'Erro desconhecido.';
    throw new Error(errorMsg);
  }

  // 6. Retorna a pesquisa gerada
  return (json as GenerateSurveyResponse).data;
}

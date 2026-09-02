/**
 * Tipos compartilhados para a integração de IA
 * usados tanto no app quanto na Vercel Serverless Function.
 */

import { QuestionType } from './database.types';

/** Uma pergunta gerada pela IA, pronta para usar na tela de criação. */
export interface AISurveyQuestion {
  type: QuestionType;
  title: string;
  required: boolean;
  /** Opções para perguntas de múltipla/única escolha. Vazio para outros tipos. */
  options: string[];
}

/** Resposta completa da IA com metadados e perguntas da pesquisa. */
export interface AISurveyResult {
  title: string;
  description: string;
  questions: AISurveyQuestion[];
}

/** Payload enviado pelo app para a Vercel Edge Function. */
export interface GenerateSurveyPayload {
  /** Conteúdo do arquivo em Base64. */
  fileBase64: string;
  /** MIME type do arquivo (ex: 'application/pdf', 'text/plain'). */
  mimeType: string;
  /** Nome original do arquivo para contexto adicional. */
  fileName: string;
}

/** Resposta da Vercel Edge Function em caso de sucesso. */
export interface GenerateSurveyResponse {
  success: true;
  data: AISurveyResult;
}

/** Resposta da Vercel Edge Function em caso de erro. */
export interface GenerateSurveyErrorResponse {
  success: false;
  error: string;
}

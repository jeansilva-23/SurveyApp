/**
 * Vercel Edge Function — POST /api/generate-survey
 *
 * Recebe um arquivo (Base64 + mimeType) do aplicativo,
 * faz UMA única requisição ao Google Gemini com o documento
 * e um prompt estruturado, e devolve um JSON com a pesquisa gerada.
 *
 * Rodando no Edge Runtime da Vercel para evitar o timeout de 10s
 * do plano Hobby (Free) em serverless functions convencionais.
 */

export const config = { runtime: 'edge' };

// ---------- Constantes ----------

/** Limite de tamanho do arquivo em bytes (5 MB). */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Tipos de arquivo aceitos pela API. */
const ALLOWED_MIME_TYPES = ['application/pdf', 'text/plain', 'text/markdown'];

/**
 * Ordem de preferência dos modelos.
 * Se o primeiro retornar 503 (overloaded), tentamos o próximo automaticamente.
 */
const GEMINI_MODELS = [
  'gemini-3.5-flash',      // Mais estável — tentativa primária
  'gemini-flash-latest',   // Alias do Google que aponta para o Flash mais recente disponível
  'gemini-3.1-flash-lite', // Modelo leve — rápido e raramente sobrecarregado
];

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// ---------- Prompt ----------

const SYSTEM_PROMPT = `Você é um especialista em criação de pesquisas de opinião.
Sua tarefa é ler o documento fornecido e criar uma pesquisa de opinião com o objetivo
de coletar a opinião dos respondentes sobre os pontos mais importantes do conteúdo.

REGRAS:
1. Gere entre 4 e 8 perguntas variadas e relevantes ao tema.
2. Use diferentes tipos de pergunta conforme o contexto:
   - "unica_escolha": quando há exatamente uma resposta correta ou preferida.
   - "multipla_escolha": quando o respondente pode escolher mais de uma opção.
   - "escala": para medir grau de concordância ou satisfação (escala de 1 a 5).
   - "nps": para medir recomendação geral (escala de 0 a 10).
   - "texto_curto": para respostas diretas em poucas palavras.
   - "texto_longo": para respostas abertas e elaboradas.
3. Para perguntas do tipo "unica_escolha" e "multipla_escolha", inclua entre 3 e 5 opções relevantes.
4. Para "escala", "nps", "texto_curto" e "texto_longo", o array "options" deve ser vazio ([]).
5. Todas as perguntas devem ser obrigatórias ("required": true).
6. O título da pesquisa deve ser claro, objetivo e refletir o tema central do documento.
7. A descrição deve ter no máximo 2 frases explicando o objetivo da pesquisa.

RESPOSTA:
Retorne EXCLUSIVAMENTE um objeto JSON válido, sem nenhum texto antes ou depois, sem markdown, sem bloco de código. Apenas o JSON puro, no seguinte formato:
{
  "title": "...",
  "description": "...",
  "questions": [
    {
      "type": "unica_escolha",
      "title": "...",
      "required": true,
      "options": ["...", "...", "..."]
    }
  ]
}`;

// ---------- Helpers ----------

/**
 * Tenta extrair um JSON válido de uma string que pode conter
 * blocos de markdown, texto antes/depois, etc.
 */
function extractJSON(raw: string): string {
  // 1) Remove blocos de markdown: ```json ... ``` ou ``` ... ```
  let cleaned = raw.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim();

  // 2) Encontra o primeiro '{' e o último '}' para isolar o objeto JSON
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  return cleaned;
}

/**
 * Chama um modelo específico do Gemini e retorna o Response do fetch.
 * Não lança exceção — retorna o Response bruto para o chamador decidir.
 */
async function callGemini(model: string, payload: unknown, apiKey: string): Promise<Response> {
  return fetch(`${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ---------- Handler ----------

export default async function handler(req: Request): Promise<Response> {
  // CORS — permite requisições do app Expo e da web
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return Response.json(
      { success: false, error: 'Método não permitido. Use POST.' },
      { status: 405, headers: corsHeaders }
    );
  }

  // Lê a chave da API do ambiente (configurada nas variáveis de ambiente da Vercel)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[generate-survey] GEMINI_API_KEY não configurada.');
    return Response.json(
      { success: false, error: 'Configuração do servidor incompleta.' },
      { status: 500, headers: corsHeaders }
    );
  }

  // Parse do body
  let body: { fileBase64?: string; mimeType?: string; fileName?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { success: false, error: 'Body inválido. Envie um JSON válido.' },
      { status: 400, headers: corsHeaders }
    );
  }

  const { fileBase64, mimeType, fileName } = body;

  // Validações básicas
  if (!fileBase64 || !mimeType) {
    return Response.json(
      { success: false, error: 'Campos obrigatórios: fileBase64 e mimeType.' },
      { status: 400, headers: corsHeaders }
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return Response.json(
      {
        success: false,
        error: `Tipo de arquivo não suportado: ${mimeType}. Use PDF ou TXT.`,
      },
      { status: 400, headers: corsHeaders }
    );
  }

  // Validação de tamanho (Base64 expande ~33%, então multiplicamos por 0.75)
  const estimatedBytes = (fileBase64.length * 3) / 4;
  if (estimatedBytes > MAX_FILE_SIZE_BYTES) {
    return Response.json(
      {
        success: false,
        error: `Arquivo muito grande. O limite é 5 MB. Tamanho estimado: ${(estimatedBytes / 1024 / 1024).toFixed(1)} MB.`,
      },
      { status: 413, headers: corsHeaders }
    );
  }

  // Monta o payload para o Gemini
  const geminiPayload = {
    contents: [
      {
        parts: [
          {
            text: `${SYSTEM_PROMPT}\n\nArquivo: ${fileName ?? 'documento'}`,
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: fileBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      // Nota: responseMimeType é omitido intencionalmente pois alguns modelos
      // ignoram a instrução e retornam texto puro de qualquer forma.
      // Usamos o extractor de JSON robusto no rawText abaixo.
    },
  };

  // ---------- Chama o Gemini com fallback automático entre modelos ----------
  let geminiResponse: Response | null = null;
  let usedModel = '';
  let lastError = '';

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`[generate-survey] Tentando modelo: ${model}`);
      const res = await callGemini(model, geminiPayload, apiKey);

      if (res.ok) {
        geminiResponse = res;
        usedModel = model;
        break;
      }

      const errText = await res.text();
      console.warn(`[generate-survey] Modelo ${model} retornou ${res.status}:`, errText);
      lastError = `${res.status} — ${errText}`;

      // Se for 503 (overloaded) ou 429 (rate limit), tenta o próximo modelo
      // Para outros erros (400, 401, 404...) interrompe o loop — são erros de config
      if (res.status !== 503 && res.status !== 429) {
        break;
      }
    } catch (networkError) {
      console.warn(`[generate-survey] Erro de rede com modelo ${model}:`, networkError);
      lastError = String(networkError);
      // Tenta o próximo modelo
    }
  }

  if (!geminiResponse) {
    console.error('[generate-survey] Todos os modelos falharam. Último erro:', lastError);
    return Response.json(
      {
        success: false,
        error:
          'O serviço de IA está temporariamente sobrecarregado. Aguarde alguns instantes e tente novamente.',
      },
      { status: 502, headers: corsHeaders }
    );
  }

  console.log(`[generate-survey] Sucesso com modelo: ${usedModel}`);

  // Extrai o conteúdo gerado
  const geminiData = await geminiResponse.json();
  const rawText: string | undefined =
    geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    console.error('[generate-survey] Resposta do Gemini vazia ou inesperada:', JSON.stringify(geminiData));
    return Response.json(
      { success: false, error: 'A IA não retornou nenhum conteúdo. Tente com outro arquivo.' },
      { status: 502, headers: corsHeaders }
    );
  }

  // Parse do JSON gerado pelo Gemini (com extractor robusto)
  let surveyData: { title: string; description: string; questions: unknown[] };
  try {
    const cleaned = extractJSON(rawText);
    console.log('[generate-survey] JSON extraído (primeiros 200 chars):', cleaned.slice(0, 200));
    surveyData = JSON.parse(cleaned);
  } catch (parseError) {
    console.error('[generate-survey] Falha ao fazer parse do JSON da IA. Raw:', rawText);
    return Response.json(
      { success: false, error: 'A IA retornou um formato inválido. Tente novamente.' },
      { status: 502, headers: corsHeaders }
    );
  }

  // Validação mínima da estrutura retornada
  if (
    typeof surveyData.title !== 'string' ||
    !Array.isArray(surveyData.questions) ||
    surveyData.questions.length === 0
  ) {
    return Response.json(
      { success: false, error: 'A estrutura retornada pela IA está incompleta.' },
      { status: 502, headers: corsHeaders }
    );
  }

  // Sucesso — devolve a pesquisa gerada
  return Response.json(
    { success: true, data: surveyData },
    { status: 200, headers: corsHeaders }
  );
}

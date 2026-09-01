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

/** URL da API Gemini (REST direto, compatível com Edge Runtime). */
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

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
      responseMimeType: 'application/json',
    },
  };

  // Chama o Gemini
  let geminiResponse: Response;
  try {
    geminiResponse = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
    });
  } catch (networkError) {
    console.error('[generate-survey] Erro de rede ao chamar Gemini:', networkError);
    return Response.json(
      { success: false, error: 'Não foi possível conectar ao serviço de IA.' },
      { status: 502, headers: corsHeaders }
    );
  }

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text();
    console.error('[generate-survey] Gemini retornou erro:', geminiResponse.status, errorText);
    return Response.json(
      { success: false, error: `Erro no serviço de IA (${geminiResponse.status}).` },
      { status: 502, headers: corsHeaders }
    );
  }

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

  // Parse do JSON gerado pelo Gemini
  let surveyData: { title: string; description: string; questions: unknown[] };
  try {
    // Remove eventuais blocos markdown (```json ... ```) que o modelo possa retornar
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    surveyData = JSON.parse(cleaned);
  } catch (parseError) {
    console.error('[generate-survey] Falha ao fazer parse do JSON da IA:', rawText);
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

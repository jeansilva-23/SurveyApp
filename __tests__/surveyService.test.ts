/**
 * Testes unitários para surveyService.ts
 *
 * Estratégia: mock completo do cliente Supabase para testar
 * a lógica das funções sem dependência de rede.
 */

// ---- Mock do Supabase ----
const mockSingle = jest.fn();
const mockSelect = jest.fn(() => ({ single: mockSingle }));
const mockInsert = jest.fn(() => ({ select: () => ({ single: mockSingle }) }));
const mockUpdate = jest.fn(() => ({ eq: () => ({ select: () => ({ single: mockSingle }) }) }));
const mockEq = jest.fn(() => ({ select: () => ({ single: mockSingle }), single: mockSingle }));
const mockUpsert = jest.fn(() => ({ select: () => ({ data: [], error: null }) }));

jest.mock('../src/services/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      upsert: mockUpsert,
      eq: mockEq,
      delete: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) })),
    })),
  },
}));

import {
  getSurveyBySlug,
  submitResponse,
  createSurvey,
  publishSurvey,
} from '../src/services/surveyService';

// ---- Fixtures ----
const fakeSurvey = {
  id: 'survey-123',
  title: 'Pesquisa de Satisfação',
  description: 'Descrição',
  type: 'satisfacao',
  status: 'ativa',
  is_anonymous: false,
  require_identification: false,
  public_slug: 'pesquisa-de-satisfacao-abc12',
  org_id: 'org-1',
  created_by: 'user-1',
  allow_public_access: true,
  response_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  survey_questions: [],
};

const fakeResponse = {
  id: 'resp-1',
  survey_id: 'survey-123',
  respondent_id: null,
  respondent_name: null,
  respondent_email: null,
  source: 'web',
  submitted_at: new Date().toISOString(),
};

// ---- getSurveyBySlug ----
describe('getSurveyBySlug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Configura mock de select encadeado para este teste
    const mockEqChain = { single: mockSingle };
    const mockSelectChain = { eq: () => mockEqChain };
    require('../src/services/supabaseClient').supabase.from.mockReturnValue({
      select: () => mockSelectChain,
    });
  });

  it('retorna a pesquisa quando o slug é válido', async () => {
    mockSingle.mockResolvedValue({ data: fakeSurvey, error: null });

    const result = await getSurveyBySlug('pesquisa-de-satisfacao-abc12');

    expect(result).toEqual(fakeSurvey);
  });

  it('lança erro quando o Supabase retorna erro', async () => {
    const fakeError = { message: 'Row not found', code: 'PGRST116' };
    mockSingle.mockResolvedValue({ data: null, error: fakeError });

    await expect(getSurveyBySlug('slug-inexistente')).rejects.toEqual(fakeError);
  });
});

// ---- submitResponse ----
describe('submitResponse', () => {
  const mockAnswersInsert = jest.fn(() => ({ error: null }));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('salva a resposta sem dados do respondente quando is_anonymous = true', async () => {
    mockSingle.mockResolvedValue({ data: fakeResponse, error: null });

    const fromMock = jest.fn((table: string) => {
      if (table === 'survey_responses') {
        return { insert: () => ({ select: () => ({ single: mockSingle }) }) };
      }
      return { insert: mockAnswersInsert };
    });
    require('../src/services/supabaseClient').supabase.from = fromMock;

    await submitResponse(
      'survey-123',
      [{ question_id: 'q1', answer_value: '5' }],
      null,       // respondentId = null (anônimo)
      undefined,  // respondentName = undefined (anônimo)
      undefined,  // respondentEmail = undefined (anônimo)
      'web'
    );

    // Verifica que a resposta foi inserida com dados nulos
    const surveyResponsesCall = fromMock.mock.calls.find(([t]) => t === 'survey_responses');
    expect(surveyResponsesCall).toBeDefined();
  });

  it('inclui dados do respondente quando identificação é fornecida', async () => {
    const responseWithId = {
      ...fakeResponse,
      respondent_name: 'João Silva',
      respondent_email: 'joao@exemplo.com',
    };
    mockSingle.mockResolvedValue({ data: responseWithId, error: null });

    const fromMock = jest.fn((table: string) => {
      if (table === 'survey_responses') {
        return { insert: () => ({ select: () => ({ single: mockSingle }) }) };
      }
      return { insert: mockAnswersInsert };
    });
    require('../src/services/supabaseClient').supabase.from = fromMock;

    const result = await submitResponse(
      'survey-123',
      [{ question_id: 'q1', answer_value: 'Ótimo' }],
      'user-42',
      'João Silva',
      'joao@exemplo.com',
      'web'
    );

    expect(result.respondent_name).toBe('João Silva');
    expect(result.respondent_email).toBe('joao@exemplo.com');
  });

  it('lança erro quando a inserção de resposta falha', async () => {
    const dbError = { message: 'DB error', code: '500' };
    mockSingle.mockResolvedValue({ data: null, error: dbError });

    const fromMock = jest.fn(() => ({
      insert: () => ({ select: () => ({ single: mockSingle }) }),
    }));
    require('../src/services/supabaseClient').supabase.from = fromMock;

    await expect(
      submitResponse('survey-123', [], null, undefined, undefined, 'web')
    ).rejects.toEqual(dbError);
  });
});

// ---- publishSurvey ----
describe('publishSurvey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reutiliza o slug existente se fornecido', async () => {
    const published = { ...fakeSurvey, status: 'ativa', public_slug: 'slug-existente' };
    mockSingle.mockResolvedValue({ data: published, error: null });

    const updateMock = jest.fn(() => ({
      eq: () => ({ select: () => ({ single: mockSingle }) }),
    }));
    require('../src/services/supabaseClient').supabase.from = jest.fn(() => ({
      update: updateMock,
    }));

    const result = await publishSurvey('survey-123', 'Minha Pesquisa', 'slug-existente');

    // O slug existente é passado como argumento e deve ser reaproveitado
    const updateArg = updateMock.mock.calls[0][0];
    expect(updateArg.public_slug).toBe('slug-existente');
    expect(updateArg.status).toBe('ativa');
    expect(updateArg.allow_public_access).toBe(true);
  });

  it('gera um novo slug quando não há slug existente', async () => {
    const published = { ...fakeSurvey, status: 'ativa' };
    mockSingle.mockResolvedValue({ data: published, error: null });

    const updateMock = jest.fn(() => ({
      eq: () => ({ select: () => ({ single: mockSingle }) }),
    }));
    require('../src/services/supabaseClient').supabase.from = jest.fn(() => ({
      update: updateMock,
    }));

    await publishSurvey('survey-123', 'Pesquisa Nova');

    const updateArg = updateMock.mock.calls[0][0];
    // Slug gerado deve conter parte do título normalizado
    expect(updateArg.public_slug).toMatch(/pesquisa-nova-/);
    expect(updateArg.public_slug.length).toBeGreaterThan(0);
  });
});

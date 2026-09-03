import { supabase } from './supabaseClient';
import { TablesInsert, TablesUpdate, Survey, SurveyQuestion } from '../types/database.types';

// ---- Slug generator ----
const generateSlug = (title: string): string => {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${base}-${suffix}`;
};

// ---- Surveys ----

export const getSurveys = async (orgId?: string) => {
  let query = supabase
    .from('surveys')
    .select('*')
    .order('created_at', { ascending: false });

  if (orgId) query = query.eq('org_id', orgId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getSurveyById = async (id: string) => {
  const { data, error } = await supabase
    .from('surveys')
    .select('*, survey_questions(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const getSurveyBySlug = async (slug: string) => {
  const { data, error } = await supabase
    .from('surveys')
    .select('*, survey_questions(*)')
    .eq('public_slug', slug)
    .single();
  if (error) throw error;
  return data;
};

export const createSurvey = async (
  survey: Omit<TablesInsert<'surveys'>, 'id' | 'created_at' | 'updated_at'>
) => {
  const { data, error } = await supabase
    .from('surveys')
    .insert(survey)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateSurvey = async (id: string, updates: TablesUpdate<'surveys'>) => {
  const { data, error } = await supabase
    .from('surveys')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const publishSurvey = async (id: string, title: string, existingSlug?: string | null) => {
  const slug = existingSlug || generateSlug(title);
  const { data, error } = await supabase
    .from('surveys')
    .update({
      status: 'ativa',
      public_slug: slug,
      allow_public_access: true,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteSurvey = async (id: string) => {
  const { error } = await supabase.from('surveys').delete().eq('id', id);
  if (error) throw error;
};

export const duplicateSurvey = async (survey: Survey) => {
  const { id, created_at, updated_at, response_count, public_slug, ...rest } = survey;

  const { data: newSurvey, error } = await supabase
    .from('surveys')
    .insert({
      ...rest,
      title: `${survey.title} (cópia)`,
      status: 'rascunho',
      public_slug: null,
      allow_public_access: false,
      response_count: 0,
    })
    .select()
    .single();

  if (error) throw error;

  // Copy questions
  const { data: questions } = await supabase
    .from('survey_questions')
    .select('*')
    .eq('survey_id', id);

  if (questions && questions.length > 0) {
    const newQuestions = questions.map(({ id: qId, created_at: qCat, ...q }) => ({
      ...q,
      survey_id: newSurvey.id,
    }));
    await supabase.from('survey_questions').insert(newQuestions);
  }

  return newSurvey;
};

// ---- Questions ----

export const getQuestions = async (surveyId: string) => {
  const { data, error } = await supabase
    .from('survey_questions')
    .select('*')
    .eq('survey_id', surveyId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data;
};

export const upsertQuestions = async (questions: TablesInsert<'survey_questions'>[]) => {
  const { data, error } = await supabase
    .from('survey_questions')
    .upsert(questions)
    .select();
  if (error) throw error;
  return data;
};

export const deleteQuestion = async (id: string) => {
  const { error } = await supabase.from('survey_questions').delete().eq('id', id);
  if (error) throw error;
};

// ---- Responses ----

export const submitResponse = async (
  surveyId: string,
  answers: { question_id: string; answer_value: unknown }[],
  respondentId?: string | null,
  respondentName?: string,
  respondentEmail?: string,
  source: 'app' | 'web' = 'app'
) => {
  const { data: response, error: responseError } = await supabase
    .from('survey_responses')
    .insert({
      survey_id: surveyId,
      respondent_id: respondentId ?? null,
      respondent_name: respondentName ?? null,
      respondent_email: respondentEmail ?? null,
      source,
    })
    .select()
    .single();

  if (responseError) throw responseError;

  const answerRows = answers.map((a) => ({
    response_id: response.id,
    question_id: a.question_id,
    answer_value: a.answer_value as any,
  }));

  const { error: answersError } = await supabase.from('survey_answers').insert(answerRows);
  if (answersError) throw answersError;

  return response;
};

export const getResponses = async (surveyId: string) => {
  const { data, error } = await supabase
    .from('survey_responses')
    .select('*, survey_answers(*)')
    .eq('survey_id', surveyId)
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return data;
};

// ---- Dashboard stats ----

export const getDashboardStats = async () => {
  const [surveysRes, responsesRes] = await Promise.all([
    supabase.from('surveys').select('id, status, response_count, title, description, created_at, updated_at'),
    supabase.from('survey_responses').select('submitted_at, survey_id'),
  ]);

  if (surveysRes.error) throw surveysRes.error;
  if (responsesRes.error) throw responsesRes.error;

  const surveys = surveysRes.data ?? [];
  const responses = responsesRes.data ?? [];

  const active = surveys.filter((s) => s.status === 'ativa').length;
  const totalResponses = responses.length;
  // % de pesquisas ativas que já receberam pelo menos 1 resposta
  const activeSurveysWithResponses = surveys.filter(
    (s) => s.status === 'ativa' && (s.response_count ?? 0) > 0
  ).length;
  const completionRate = active > 0 ? Math.round((activeSurveysWithResponses / active) * 100) : 0;

  return {
    totalResponses,
    activeSurveys: active,
    activeSurveysWithResponses,
    totalSurveys: surveys.length,
    completionRate: Math.min(completionRate, 100),
    surveys,
    responses,
  };
};

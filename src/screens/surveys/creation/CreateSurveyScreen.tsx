import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '../../../theme';
import { spacing, borderRadius, shadow } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { createSurvey, updateSurvey, upsertQuestions, getSurveyById, publishSurvey } from '../../../services/surveyService';
import { pickFileAndGenerateSurvey } from '../../../services/aiService';
import { useAuthStore } from '../../../store/authStore';
import { QuestionType, SurveyQuestion } from '../../../types/database.types';
import type { AISurveyResult } from '../../../types/ai.types';

// ---- Form schemas ----
const surveyMetaSchema = z.object({
  title: z.string().min(3, 'Título deve ter ao menos 3 caracteres'),
  description: z.string().optional(),
  type: z.enum(['satisfacao', 'formulario', 'censo']),
  is_anonymous: z.boolean(),
  require_identification: z.boolean(),
});
type SurveyMeta = z.infer<typeof surveyMetaSchema>;

// ---- Question types config ----
const QUESTION_TYPES: { value: QuestionType; label: string; emoji: string }[] = [
  { value: 'unica_escolha', label: 'Escolha única', emoji: '◉' },
  { value: 'multipla_escolha', label: 'Múltipla escolha', emoji: '☑' },
  { value: 'texto_curto', label: 'Texto curto', emoji: 'T' },
  { value: 'texto_longo', label: 'Texto longo', emoji: '¶' },
  { value: 'escala', label: 'Escala', emoji: '⭐' },
  { value: 'nps', label: 'NPS (0–10)', emoji: '↗' },
];

interface LocalQuestion {
  localId: string;
  dbId?: string;
  type: QuestionType;
  title: string;
  required: boolean;
  options: string[];
}

const newQuestion = (type: QuestionType = 'unica_escolha'): LocalQuestion => ({
  localId: Math.random().toString(36).slice(2),
  type,
  title: '',
  required: true,
  options: type === 'unica_escolha' || type === 'multipla_escolha' ? ['', ''] : [],
});

// ---- Sync TextInput (Fix for Android accents) ----
const SyncTextInput = ({ value, onChangeText, ...props }: any) => {
  const [internalVal, setInternalVal] = useState(value || '');
  React.useEffect(() => {
    if (value !== undefined && value !== internalVal) {
      setInternalVal(value);
    }
  }, [value]);
  return (
    <TextInput
      {...props}
      value={internalVal}
      onChangeText={(t) => {
        setInternalVal(t);
        onChangeText?.(t);
      }}
    />
  );
};

// ---- Question Editor ----
const QuestionEditor: React.FC<{
  question: LocalQuestion;
  index: number;
  onUpdate: (q: LocalQuestion) => void;
  onDelete: () => void;
  drag: () => void;
}> = ({ question, index, onUpdate, onDelete, drag }) => {
  const { c } = useTheme();
  const hasOptions = question.type === 'unica_escolha' || question.type === 'multipla_escolha';

  return (
    <View style={[styles.questionCard, { backgroundColor: c.card, borderColor: c.border }, shadow.sm]}>
      <View style={styles.questionHeader}>
        <Text style={[typography.overline, { color: c.textSecondary }]}>Pergunta {index + 1}</Text>
        <View style={styles.questionHeaderActions}>
          <TouchableOpacity onLongPress={drag} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <Text style={{ color: c.textSecondary, fontSize: 20 }}>⣿</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={{ marginLeft: spacing[3] }}>
            <Text style={{ color: c.error }}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Question type dropdown */}
      <Select
        style={{ marginBottom: spacing[3] }}
        options={QUESTION_TYPES}
        value={question.type}
        onChange={(val) => onUpdate({ ...question, type: val as QuestionType, options: val === 'unica_escolha' || val === 'multipla_escolha' ? ['', ''] : [] })}
      />

      {/* Question title */}
      <SyncTextInput
        style={[styles.questionTitle, typography.body, { color: c.textPrimary, borderColor: c.border }]}
        placeholder="Digite a pergunta..."
        placeholderTextColor={c.textSecondary}
        value={question.title}
        onChangeText={(t: string) => onUpdate({ ...question, title: t })}
        multiline
      />

      {/* Options (for choice questions) */}
      {hasOptions && (
        <View style={styles.optionsContainer}>
          {question.options.map((opt, i) => (
            <View key={i} style={styles.optionRow}>
              <Text style={[typography.labelSmall, { color: c.textSecondary, width: 24 }]}>
                {String.fromCharCode(65 + i)}
              </Text>
              <SyncTextInput
                style={[styles.optionInput, typography.body, { color: c.textPrimary, borderColor: c.border, flex: 1 }]}
                placeholder={`Opção ${i + 1}`}
                placeholderTextColor={c.textSecondary}
                value={opt}
                onChangeText={(t: string) => {
                  const newOptions = [...question.options];
                  newOptions[i] = t;
                  onUpdate({ ...question, options: newOptions });
                }}
              />
              {question.options.length > 2 && (
                <TouchableOpacity onPress={() => {
                  const newOptions = question.options.filter((_, idx) => idx !== i);
                  onUpdate({ ...question, options: newOptions });
                }}>
                  <Text style={{ color: c.error, marginLeft: spacing[2] }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity
            style={styles.addOptionBtn}
            onPress={() => onUpdate({ ...question, options: [...question.options, ''] })}
          >
            <Text style={[typography.bodySmall, { color: c.primaryMid }]}>+ Adicionar opção</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Scale preview */}
      {question.type === 'escala' && (
        <View style={styles.scalePreview}>
          {[1, 2, 3, 4, 5].map((n) => (
            <View key={n} style={[styles.scaleBtn, { backgroundColor: c.accentLight, borderColor: c.accent }]}>
              <Text style={[typography.labelLarge, { color: c.primaryDark }]}>{n}</Text>
            </View>
          ))}
        </View>
      )}

      {/* NPS preview */}
      {question.type === 'nps' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.npsRow}>
          {Array.from({ length: 11 }, (_, i) => (
            <View key={i} style={[styles.npsBtn, { backgroundColor: c.accentLight, borderColor: c.border }]}>
              <Text style={[typography.labelSmall, { color: c.primaryDark }]}>{i}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Required toggle */}
      <View style={styles.requiredRow}>
        <Text style={[typography.bodySmall, { color: c.textSecondary }]}>Obrigatória</Text>
        <Switch
          value={question.required}
          onValueChange={(v) => onUpdate({ ...question, required: v })}
          trackColor={{ false: c.border, true: c.accent }}
          thumbColor="#FFF"
        />
      </View>
    </View>
  );
};

// ---- Main Screen ----
export const CreateSurveyScreen: React.FC = () => {
  const { c } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { profile, session } = useAuthStore();
  const user = session?.user;
  const surveyId = route.params?.surveyId;
  const [questions, setQuestions] = useState<LocalQuestion[]>([newQuestion()]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors }, watch, reset, getValues, trigger, setValue } = useForm<SurveyMeta>({
    resolver: zodResolver(surveyMetaSchema),
    defaultValues: { type: 'satisfacao', is_anonymous: false, require_identification: false },
  });

  const { data: existingSurvey, isLoading } = useQuery({
    queryKey: ['survey', surveyId],
    queryFn: () => getSurveyById(surveyId!),
    enabled: !!surveyId,
  });

  React.useEffect(() => {
    if (existingSurvey) {
      reset({
        title: existingSurvey.title,
        description: existingSurvey.description ?? undefined,
        type: existingSurvey.type as any,
        is_anonymous: existingSurvey.is_anonymous ?? false,
        require_identification: existingSurvey.require_identification ?? false,
      });

      if (existingSurvey.survey_questions && existingSurvey.survey_questions.length > 0) {
        setQuestions(
          existingSurvey.survey_questions.map((q: any) => {
            let parsedOptions = [];
            if (Array.isArray(q.options)) {
              parsedOptions = q.options;
            } else if (typeof q.options === 'string') {
              try { parsedOptions = JSON.parse(q.options); } catch(e) {}
            }
            if (!parsedOptions || parsedOptions.length === 0) {
              parsedOptions = (q.type === 'unica_escolha' || q.type === 'multipla_escolha') ? ['', ''] : [];
            }
            return {
              localId: Math.random().toString(36).slice(2),
              dbId: q.id,
              type: q.type,
              title: q.title,
              required: q.required,
              options: parsedOptions,
            };
          })
        );
      }
    }
  }, [existingSurvey, reset]);

  const saveDraft = async (data: SurveyMeta, publish = false) => {
    console.log('[saveDraft] iniciando, surveyId=', surveyId, 'publish=', publish);
    // Usa profile do store ou fallback nos metadados do usuário autenticado
    const orgId = profile?.org_id ?? user?.user_metadata?.org_id;
    const userId = profile?.id ?? user?.id;

    if (!userId || !orgId) {
      Alert.alert('Erro', `Dados do usuário incompletos (org_id=${orgId}, userId=${userId}). Tente sair e entrar novamente.`);
      return;
    }
    try {
      publish ? setPublishing(true) : setSavingDraft(true);

      let id = surveyId;
      if (!id) {
        const survey = await createSurvey({
          org_id: orgId,
          created_by: userId,
          title: data.title,
          description: data.description ?? null,
          type: data.type,
          status: 'rascunho',
          is_anonymous: data.is_anonymous,
          require_identification: data.require_identification,
        });
        id = survey.id;
      } else {
        await updateSurvey(id, {
          title: data.title,
          description: data.description ?? null,
          type: data.type,
          is_anonymous: data.is_anonymous,
          require_identification: data.require_identification,
        });
      }

      // Save questions
      const questionRows = questions.map((q, i) => ({
        ...(q.dbId ? { id: q.dbId } : {}),
        survey_id: id!,
        order_index: i,
        type: q.type,
        title: q.title || `Pergunta ${i + 1}`,
        required: q.required,
        options: q.options as any,
      }));
      await upsertQuestions(questionRows);

      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['survey', id] });
      }

      if (publish) {
        await publishSurvey(id!, data.title, existingSurvey?.public_slug);
        setPublishedId(id!);
        Alert.alert(
          '🎉 Pesquisa publicada!',
          'Sua pesquisa está ao vivo! Compartilhe o link ou QR Code com seus respondentes.',
          [
            {
              text: '📊 Ver pesquisa',
              onPress: () =>
                navigation.navigate('SurveysTab', {
                  screen: 'SurveyDetail',
                  params: { id: id!, openShare: true },
                }),
            },
            { text: 'Continuar editando', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('✅ Salvo!', 'Sua pesquisa foi salva com sucesso.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err: any) {
      console.error('[saveDraft] ERRO COMPLETO:', JSON.stringify(err), err);
      // Supabase errors têm .message, mas às vezes vêm como objetos com .details ou .hint
      const errMsg =
        err?.message ||
        err?.details ||
        err?.hint ||
        (typeof err === 'string' ? err : 'Não foi possível salvar a pesquisa. Verifique sua conexão.');
      Alert.alert('Erro ao salvar', errMsg);
    } finally {
      setSavingDraft(false);
      setPublishing(false);
    }
  };

  const onValidationError = (errs: any) => {
    const firstMsg = Object.values(errs)?.[0] as any;
    Alert.alert('Campos inválidos', firstMsg?.message ?? 'Preencha todos os campos obrigatórios.');
  };

  const handleSave = async (publish: boolean) => {
    console.log('[handleSave] chamado, publish=', publish, 'profile=', !!profile);
    const isValid = await trigger();
    console.log('[handleSave] isValid=', isValid, 'errors=', JSON.stringify(errors));
    if (!isValid) {
      const errs = errors as any;
      const firstMsg = Object.values(errs)?.[0] as any;
      Alert.alert('Campos inválidos', firstMsg?.message ?? 'Preencha o título da pesquisa (mínimo 3 caracteres).');
      return;
    }
    const data = getValues();
    await saveDraft(data, publish);
  };

  /** Gera a pesquisa a partir de um arquivo usando IA via Vercel Edge Function. */
  const handleGenerateWithAI = async () => {
    try {
      setIsGenerating(true);
      const result: AISurveyResult | null = await pickFileAndGenerateSurvey();

      // Usuário cancelou o seletor de arquivos
      if (!result) return;

      // Preenche os metadados da pesquisa no formulário
      reset({
        title: result.title,
        description: result.description,
        type: 'satisfacao',
        is_anonymous: false,
        require_identification: false,
      });

      // Converte as perguntas da IA para o formato local da tela
      const aiQuestions: LocalQuestion[] = result.questions.map((q) => ({
        localId: Math.random().toString(36).slice(2),
        type: q.type,
        title: q.title,
        required: q.required,
        options:
          q.options && q.options.length > 0
            ? q.options
            : q.type === 'unica_escolha' || q.type === 'multipla_escolha'
            ? ['', '']
            : [],
      }));
      setQuestions(aiQuestions);

      Alert.alert(
        '✨ Pesquisa gerada!',
        `A IA criou ${aiQuestions.length} pergunta${aiQuestions.length > 1 ? 's' : ''} sobre o tema do documento. Revise, edite se necessário e publique!`
      );
    } catch (err: any) {
      Alert.alert('Erro ao gerar pesquisa', err.message || 'Não foi possível gerar a pesquisa. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const TYPE_LABELS: Record<string, string> = {
    satisfacao: 'Satisfação',
    formulario: 'Formulário',
    censo: 'Censo',
  };

  const currentType = watch('type');

  // Modo de identidade — calculado fora do JSX para evitar crash no Android
  const IDENTITY_MODES = [
    { value: 'anonimo',     emoji: '🔒', label: 'Anônimo',                   desc: 'Nenhum dado do respondente é salvo' },
    { value: 'opcional',    emoji: '👤', label: 'Identificação opcional',    desc: 'Solicita nome/e-mail, mas permite pular' },
    { value: 'obrigatorio', emoji: '📋', label: 'Identificação obrigatória', desc: 'Nome/e-mail exigidos antes de responder' },
  ] as const;
  const watchAnonymous = watch('is_anonymous');
  const watchRequireId  = watch('require_identification');
  const currentIdentityMode = watchAnonymous ? 'anonimo' : watchRequireId ? 'obrigatorio' : 'opcional';

  const handleIdentityMode = (mode: 'anonimo' | 'opcional' | 'obrigatorio') => {
    if (mode === 'anonimo') {
      setValue('is_anonymous', true);
      setValue('require_identification', false);
    } else if (mode === 'opcional') {
      setValue('is_anonymous', false);
      setValue('require_identification', false);
    } else {
      setValue('is_anonymous', false);
      setValue('require_identification', true);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: c.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ✨ Banner de Geração com IA */}
        <TouchableOpacity
          testID="btn-generate-ai"
          style={[
            styles.aiBanner,
            {
              backgroundColor: isGenerating ? c.accentLight : c.primaryDark,
              opacity: isGenerating ? 0.8 : 1,
            },
          ]}
          onPress={handleGenerateWithAI}
          disabled={isGenerating}
          activeOpacity={0.85}
        >
          {isGenerating ? (
            <>
              <ActivityIndicator color="#FFF" style={{ marginRight: spacing[3] }} />
              <View>
                <Text style={[typography.labelLarge, { color: c.primaryDark }]}>Processando documento...</Text>
                <Text style={[typography.caption, { color: c.textSecondary }]}>A IA está lendo e criando as perguntas</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.aiEmoji}>✨</Text>
              <View style={{ flex: 1 }}>
                <Text style={[typography.labelLarge, { color: '#FFF' }]}>Gerar pesquisa com Inteligência Artificial</Text>
                <Text style={[typography.caption, { color: 'rgba(255,255,255,0.75)' }]}>Anexe um PDF ou TXT e a IA cria a pesquisa automaticamente</Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }}>›</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Metadata section */}
        <Card>
          <Text style={[typography.overline, { color: c.textSecondary, marginBottom: spacing[4] }]}>
            INFORMAÇÕES BÁSICAS
          </Text>

          <Controller control={control} name="title" render={({ field: { onChange, value, onBlur } }) => (
            <Input label="Título da pesquisa" placeholder="Ex: Satisfação com o produto X" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.title?.message} />
          )} />

          <Controller control={control} name="description" render={({ field: { onChange, value, onBlur } }) => (
            <Input label="Descrição" placeholder="Descreva o objetivo desta pesquisa..." value={value ?? ''} onChangeText={onChange} onBlur={onBlur} multiline style={{ minHeight: 80 }} />
          )} />

          {/* Type selector */}
          <Controller control={control} name="type" render={({ field: { onChange, value } }) => (
            <Select
              label="Tipo de pesquisa"
              options={[
                { label: 'Satisfação', value: 'satisfacao' },
                { label: 'Formulário', value: 'formulario' },
                { label: 'Censo', value: 'censo' },
              ]}
              value={value}
              onChange={onChange}
            />
          )} />
        </Card>

        {/* Questions */}
        <Card style={{ marginTop: spacing[4] }}>
          <Text style={[typography.overline, { color: c.textSecondary, marginBottom: spacing[4] }]}>
            PERGUNTAS
          </Text>

          <DraggableFlatList
            data={questions}
            keyExtractor={(q) => q.localId}
            scrollEnabled={false}
            onDragEnd={({ data }) => setQuestions(data)}
            renderItem={({ item, getIndex, drag, isActive }: RenderItemParams<LocalQuestion>) => (
              <ScaleDecorator>
                <QuestionEditor
                  question={item}
                  index={getIndex() ?? 0}
                  drag={drag}
                  onUpdate={(updated) =>
                    setQuestions((qs) => qs.map((q) => q.localId === item.localId ? updated : q))
                  }
                  onDelete={() => setQuestions((qs) => qs.filter((q) => q.localId !== item.localId))}
                />
              </ScaleDecorator>
            )}
          />

          <TouchableOpacity
            style={[styles.addQuestionBtn, { borderColor: c.primaryMid }]}
            onPress={() => setQuestions((qs) => [...qs, newQuestion()])}
          >
            <Text style={[typography.labelLarge, { color: c.primaryMid }]}>+ Adicionar pergunta</Text>
          </TouchableOpacity>
        </Card>

        {/* Settings */}
        <Card style={{ marginTop: spacing[4] }}>
          <Text style={[typography.overline, { color: c.textSecondary, marginBottom: spacing[4] }]}>
            CONFIGURAÇÕES
          </Text>
          <Text style={[typography.label, { color: c.textSecondary, marginBottom: spacing[3] }]}>Modo de identidade</Text>
          <View style={{ gap: spacing[2] }}>
            {IDENTITY_MODES.map((mode) => {
              const selected = currentIdentityMode === mode.value;
              return (
                <TouchableOpacity
                  key={mode.value}
                  style={[styles.modeOption, {
                    backgroundColor: selected ? c.accentLight : c.inputBg,
                    borderColor: selected ? c.accent : c.border,
                  }]}
                  onPress={() => handleIdentityMode(mode.value)}
                >
                  <View style={[styles.modeRadio, { borderColor: selected ? c.accent : c.border }]}>
                    {selected && <View style={[styles.modeRadioDot, { backgroundColor: c.accent }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.labelLarge, { color: selected ? c.primaryDark : c.textPrimary }]}>
                      {mode.emoji} {mode.label}
                    </Text>
                    <Text style={[typography.caption, { color: c.textSecondary }]}>{mode.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
            <Text style={[typography.body, { color: c.textSecondary }]}>← Cancelar</Text>
          </TouchableOpacity>
          <Button
            label="Salvar rascunho"
            variant="outline"
            loading={savingDraft}
            onPress={() => handleSave(false)}
            style={{ flex: 1, marginRight: spacing[3] }}
          />
          <Button
            label={publishedId ? '✅ Publicada' : 'Publicar pesquisa ›'}
            loading={publishing}
            disabled={!!publishedId}
            onPress={() => handleSave(true)}
            style={{ flex: 1.2, opacity: publishedId ? 0.6 : 1 }}
          />
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    gap: spacing[3],
    ...shadow.sm,
  },
  aiEmoji: { fontSize: 28 },
  container: { flex: 1 },
  content: { padding: spacing[4], paddingBottom: spacing[12] },
  typeRow: { flexDirection: 'row' },
  typeBtn: { borderWidth: 1, borderRadius: borderRadius.md, paddingVertical: spacing[2], paddingHorizontal: spacing[2] },
  questionCard: { borderRadius: borderRadius.xl, borderWidth: 1, padding: spacing[4], marginBottom: spacing[3] },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questionHeaderActions: { flexDirection: 'row', alignItems: 'center' },
  typeTabs: { flexDirection: 'row', marginVertical: spacing[3] },
  typeTab: { borderWidth: 1, borderRadius: borderRadius.full, paddingVertical: spacing[1], paddingHorizontal: spacing[3], marginRight: spacing[2] },
  questionTitle: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing[3], minHeight: 52 },
  optionsContainer: { marginTop: spacing[3] },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[2] },
  optionInput: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing[2], paddingHorizontal: spacing[3] },
  addOptionBtn: { padding: spacing[2] },
  scalePreview: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] },
  scaleBtn: { width: 44, height: 44, borderRadius: borderRadius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  npsRow: { marginTop: spacing[3] },
  npsBtn: { width: 36, height: 36, borderRadius: borderRadius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: spacing[1] },
  requiredRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modeOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: borderRadius.lg, padding: spacing[3], gap: spacing[3] },
  modeRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  modeRadioDot: { width: 10, height: 10, borderRadius: 5 },
  addQuestionBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: borderRadius.xl, padding: spacing[4], alignItems: 'center', marginTop: spacing[2] },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[5] },
  cancelBtn: { paddingRight: spacing[3] },
});

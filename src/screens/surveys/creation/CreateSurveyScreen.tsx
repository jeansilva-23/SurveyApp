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
import { createSurvey, updateSurvey, upsertQuestions, getSurveyById, publishSurvey } from '../../../services/surveyService';
import { useAuthStore } from '../../../store/authStore';
import { QuestionType, SurveyQuestion } from '../../../types/database.types';

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

      {/* Question type tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeTabs}>
        {QUESTION_TYPES.map((qt) => (
          <TouchableOpacity
            key={qt.value}
            style={[
              styles.typeTab,
              {
                backgroundColor: question.type === qt.value ? c.primaryDark : c.inputBg,
                borderColor: question.type === qt.value ? c.primaryDark : c.border,
              },
            ]}
            onPress={() => onUpdate({ ...question, type: qt.value, options: qt.value === 'unica_escolha' || qt.value === 'multipla_escolha' ? ['', ''] : [] })}
          >
            <Text style={[typography.labelSmall, { color: question.type === qt.value ? '#FFF' : c.textSecondary }]}>
              {qt.emoji} {qt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
  const profile = useAuthStore((s) => s.profile);
  const surveyId = route.params?.surveyId;
  const [questions, setQuestions] = useState<LocalQuestion[]>([newQuestion()]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const { control, handleSubmit, formState: { errors }, watch, reset } = useForm<SurveyMeta>({
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
    if (!profile) return;
    try {
      publish ? setPublishing(true) : setSavingDraft(true);

      let id = surveyId;
      if (!id) {
        const survey = await createSurvey({
          org_id: profile.org_id,
          created_by: profile.id,
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

      if (publish) {
        await publishSurvey(id!, data.title, existingSurvey?.public_slug);
        Alert.alert('🎉 Pesquisa publicada!', 'Sua pesquisa está ativa e o link público foi gerado.');
        navigation.navigate('SurveysTab', { screen: 'SurveyDetail', params: { id } });
      } else {
        Alert.alert('Rascunho salvo', 'Sua pesquisa foi salva como rascunho.');
      }

      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['survey', id] });
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Não foi possível salvar a pesquisa.');
    } finally {
      setSavingDraft(false);
      setPublishing(false);
    }
  };

  const TYPE_LABELS: Record<string, string> = {
    satisfacao: 'Satisfação',
    formulario: 'Formulário',
    censo: 'Censo',
  };

  const currentType = watch('type');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: c.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
          <Text style={[typography.label, { color: c.textSecondary, marginBottom: spacing[2] }]}>Tipo de pesquisa</Text>
          <Controller control={control} name="type" render={({ field: { onChange, value } }) => (
            <View style={styles.typeRow}>
              {(['satisfacao', 'formulario', 'censo'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, {
                    backgroundColor: value === t ? c.primaryDark : c.inputBg,
                    borderColor: value === t ? c.primaryDark : c.border,
                    flex: 1,
                    marginRight: t !== 'censo' ? spacing[2] : 0,
                  }]}
                  onPress={() => onChange(t)}
                >
                  <Text style={[typography.labelSmall, { color: value === t ? '#FFF' : c.textSecondary, textAlign: 'center' }]}>
                    {TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.labelLarge, { color: c.textPrimary }]}>Anonimato</Text>
              <Text style={[typography.caption, { color: c.textSecondary }]}>Ocultar identidade dos respondentes</Text>
            </View>
            <Controller control={control} name="is_anonymous" render={({ field: { onChange, value } }) => (
              <Switch value={value} onValueChange={onChange} trackColor={{ false: c.border, true: c.accent }} thumbColor="#FFF" />
            )} />
          </View>
          <View style={[styles.settingRow, { marginTop: spacing[3] }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.labelLarge, { color: c.textPrimary }]}>Pedir identificação (link público)</Text>
              <Text style={[typography.caption, { color: c.textSecondary }]}>Solicitar nome/e-mail antes de responder</Text>
            </View>
            <Controller control={control} name="require_identification" render={({ field: { onChange, value } }) => (
              <Switch value={value} onValueChange={onChange} trackColor={{ false: c.border, true: c.accent }} thumbColor="#FFF" />
            )} />
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
            <Text style={[typography.body, { color: c.textSecondary }]}>← Cancelar</Text>
          </TouchableOpacity>
          <Button label="Salvar rascunho" variant="outline" loading={savingDraft} onPress={handleSubmit((d) => saveDraft(d, false))} style={{ flex: 1, marginRight: spacing[3] }} />
          <Button label="Publicar pesquisa ›" loading={publishing} onPress={handleSubmit((d) => saveDraft(d, true))} style={{ flex: 1.2 }} />
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
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
  addQuestionBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: borderRadius.xl, padding: spacing[4], alignItems: 'center', marginTop: spacing[2] },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[5] },
  cancelBtn: { paddingRight: spacing[3] },
});

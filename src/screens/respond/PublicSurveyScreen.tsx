import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadow } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { ParakeetMascot } from '../../components/common/Mascot';
import { getSurveyBySlug, submitResponse } from '../../services/surveyService';
import { SurveyQuestion } from '../../types/database.types';
import { useAuthStore } from '../../store/authStore';

// ---- Question renderers ----
const SingleChoice: React.FC<{
  question: SurveyQuestion;
  value: string;
  onChange: (v: string) => void;
}> = ({ question, value, onChange }) => {
  const { c } = useTheme();
  let options: string[] = [];
  if (Array.isArray(question.options)) {
    options = question.options as string[];
  } else if (typeof question.options === 'string') {
    try { options = JSON.parse(question.options); } catch (e) {}
  }

  return (
    <View style={{ gap: spacing[2] }}>
      {options.map((opt, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.optionBtn, {
            backgroundColor: value === opt ? c.accentLight : c.surface,
            borderColor: value === opt ? c.accent : c.border,
          }]}
          onPress={() => onChange(opt)}
        >
          <View style={[styles.radio, { borderColor: value === opt ? c.accent : c.border }]}>
            {value === opt && <View style={[styles.radioDot, { backgroundColor: c.accent }]} />}
          </View>
          <Text style={[typography.body, { color: c.textPrimary, flex: 1 }]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const MultipleChoice: React.FC<{
  question: SurveyQuestion;
  value: string[];
  onChange: (v: string[]) => void;
}> = ({ question, value, onChange }) => {
  const { c } = useTheme();
  let options: string[] = [];
  if (Array.isArray(question.options)) {
    options = question.options as string[];
  } else if (typeof question.options === 'string') {
    try { options = JSON.parse(question.options); } catch (e) {}
  }

  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  return (
    <View style={{ gap: spacing[2] }}>
      {options.map((opt, i) => {
        const selected = value.includes(opt);
        return (
          <TouchableOpacity
            key={i}
            style={[styles.optionBtn, {
              backgroundColor: selected ? c.accentLight : c.surface,
              borderColor: selected ? c.accent : c.border,
            }]}
            onPress={() => toggle(opt)}
          >
            <View style={[styles.checkbox, { borderColor: selected ? c.accent : c.border, backgroundColor: selected ? c.accent : 'transparent' }]}>
              {selected && <Text style={{ color: '#FFF', fontSize: 11 }}>✓</Text>}
            </View>
            <Text style={[typography.body, { color: c.textPrimary, flex: 1 }]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const ScaleQuestion: React.FC<{
  question: SurveyQuestion;
  value: number | null;
  onChange: (v: number) => void;
  max?: number;
}> = ({ question, value, onChange, max = 5 }) => {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' }}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <TouchableOpacity
          key={n}
          style={[styles.scaleBtn, {
            backgroundColor: value === n ? c.primaryDark : c.inputBg,
            borderColor: value === n ? c.primaryDark : c.border,
          }]}
          onPress={() => onChange(n)}
        >
          <Text style={[typography.labelLarge, { color: value === n ? '#FFF' : c.textPrimary }]}>{n}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const NPSQuestion: React.FC<{
  value: number | null;
  onChange: (v: number) => void;
}> = ({ value, onChange }) => {
  const { c } = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] }}>
        {Array.from({ length: 11 }, (_, i) => i).map((n) => {
          const selected = value === n;
          const color = n <= 6 ? c.error : n <= 8 ? c.warning : c.success;
          return (
            <TouchableOpacity
              key={n}
              style={[styles.npsBtn, { backgroundColor: selected ? color : c.inputBg, borderColor: selected ? color : c.border }]}
              onPress={() => onChange(n)}
            >
              <Text style={[typography.labelSmall, { color: selected ? '#FFF' : c.textPrimary }]}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[2] }}>
        <Text style={[typography.caption, { color: c.textSecondary }]}>Muito improvável</Text>
        <Text style={[typography.caption, { color: c.textSecondary }]}>Muito provável</Text>
      </View>
    </View>
  );
};

// ---- Main Screen ----
export const PublicSurveyScreen: React.FC = () => {
  const { c } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const profile = useAuthStore((s) => s.profile);
  const { slug } = route.params ?? {};

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<'identify' | 'respond'>('identify');

  const { data: survey, isLoading } = useQuery({
    queryKey: ['publicSurvey', slug],
    queryFn: () => getSurveyBySlug(slug),
    enabled: !!slug,
  });

  const questions = ((survey as any)?.survey_questions ?? []) as SurveyQuestion[];

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const answerList = Object.entries(answers).map(([question_id, answer_value]) => ({
        question_id,
        answer_value,
      }));

      await submitResponse(
        survey!.id,
        answerList,
        profile?.id ?? null,
        respondentName || undefined,
        respondentEmail || undefined,
        'web'
      );
      setSubmitted(true);
    } catch (err: any) {
      Alert.alert('Erro ao enviar', err.message ?? 'Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[typography.body, { color: c.textSecondary }]}>Carregando pesquisa...</Text>
      </View>
    );
  }

  if (!survey) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ParakeetMascot size={80} mood="sad" />
        <Text style={[typography.h3, { color: c.textPrimary, marginTop: spacing[4], textAlign: 'center' }]}>
          Pesquisa não encontrada
        </Text>
        <Text style={[typography.body, { color: c.textSecondary, textAlign: 'center', marginTop: spacing[2] }]}>
          O link pode estar desativado ou inválido.
        </Text>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ParakeetMascot size={120} mood="celebrating" />
        <Text style={[typography.h2, { color: c.textPrimary, marginTop: spacing[5], textAlign: 'center' }]}>
          Obrigado pela sua resposta! 🎉
        </Text>
        <Text style={[typography.body, { color: c.textSecondary, textAlign: 'center', marginTop: spacing[3] }]}>
          Sua contribuição foi registrada com sucesso.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Survey Header */}
      <View style={[styles.surveyHeader, { backgroundColor: c.primary }]}>
        <ParakeetMascot size={50} mood="happy" />
        <View style={{ flex: 1, marginLeft: spacing[3] }}>
          <Text style={[typography.h3, { color: '#EAF3EE' }]} numberOfLines={2}>{survey.title}</Text>
          {survey.description && (
            <Text style={[typography.caption, { color: '#C8E6D4', marginTop: 2 }]} numberOfLines={2}>{survey.description}</Text>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Identification step */}
        {survey.require_identification && step === 'identify' && !profile && (
          <Card>
            <Text style={[typography.h3, { color: c.textPrimary, marginBottom: spacing[2] }]}>Identificação (opcional)</Text>
            <Text style={[typography.body, { color: c.textSecondary, marginBottom: spacing[4] }]}>
              Informe seus dados ou pule para responder anonimamente.
            </Text>
            <Input label="Nome" placeholder="Seu nome" value={respondentName} onChangeText={setRespondentName} />
            <Input label="E-mail" placeholder="seu@email.com" value={respondentEmail} onChangeText={setRespondentEmail} keyboardType="email-address" autoCapitalize="none" />
            <View style={{ flexDirection: 'row', gap: spacing[3] }}>
              <Button label="Pular" variant="outline" onPress={() => setStep('respond')} style={{ flex: 1 }} />
              <Button label="Continuar" onPress={() => setStep('respond')} style={{ flex: 1 }} />
            </View>
          </Card>
        )}

        {/* Questions */}
        {(step === 'respond' || !survey.require_identification || profile) && questions.map((question, i) => (
          <Card key={question.id} style={{ marginBottom: spacing[3] }}>
            <View style={styles.questionHeader}>
              <Text style={[typography.overline, { color: c.textSecondary }]}>Pergunta {i + 1}</Text>
              {question.required && (
                <Text style={[typography.caption, { color: c.error }]}>Obrigatória</Text>
              )}
            </View>
            <Text style={[typography.h4, { color: c.textPrimary, marginBottom: spacing[4] }]}>{question.title}</Text>

            {question.type === 'unica_escolha' && (
              <SingleChoice question={question} value={answers[question.id] ?? ''} onChange={(v) => setAnswers((a) => ({ ...a, [question.id]: v }))} />
            )}
            {question.type === 'multipla_escolha' && (
              <MultipleChoice question={question} value={answers[question.id] ?? []} onChange={(v) => setAnswers((a) => ({ ...a, [question.id]: v }))} />
            )}
            {question.type === 'escala' && (
              <ScaleQuestion question={question} value={answers[question.id] ?? null} onChange={(v) => setAnswers((a) => ({ ...a, [question.id]: v }))} />
            )}
            {question.type === 'nps' && (
              <NPSQuestion value={answers[question.id] ?? null} onChange={(v) => setAnswers((a) => ({ ...a, [question.id]: v }))} />
            )}
            {(question.type === 'texto_curto' || question.type === 'texto_longo') && (
              <TextInput
                style={[styles.textAnswer, { borderColor: c.border, color: c.textPrimary, minHeight: question.type === 'texto_longo' ? 100 : 48 }]}
                placeholder="Sua resposta..."
                placeholderTextColor={c.textSecondary}
                value={answers[question.id] ?? ''}
                onChangeText={(t) => setAnswers((a) => ({ ...a, [question.id]: t }))}
                multiline={question.type === 'texto_longo'}
              />
            )}
          </Card>
        ))}

        {(step === 'respond' || !survey.require_identification || profile) && (
          <Button label={submitting ? 'Enviando...' : 'Enviar respostas'} fullWidth loading={submitting} onPress={handleSubmit} style={{ marginTop: spacing[2] }} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  surveyHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  content: { padding: spacing[4], paddingBottom: spacing[12] },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[2] },
  optionBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: borderRadius.lg, padding: spacing[3], gap: spacing[3] },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  scaleBtn: { width: 48, height: 48, borderRadius: borderRadius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  npsBtn: { width: 40, height: 40, borderRadius: borderRadius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[1] },
  textAnswer: { borderWidth: 1.5, borderRadius: borderRadius.md, padding: spacing[3] },
});

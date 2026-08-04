import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Paths, File } from 'expo-file-system';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadow } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { getSurveys, getResponses, getQuestions } from '../../services/surveyService';

// ---- Simple bar chart (SVG) ----
const BarChart: React.FC<{
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
}> = ({ data, maxValue }) => {
  const { c } = useTheme();
  const { default: Svg, Rect, Text: SText } = require('react-native-svg');
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.max(20, Math.min(40, 280 / data.length - 8));
  const chartWidth = data.length * (barWidth + 8);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={Math.max(chartWidth, 280)} height={140}>
        {data.map((item, i) => {
          const barH = (item.value / max) * 100;
          const x = i * (barWidth + 8);
          const fill = item.color ?? c.chartColors[i % c.chartColors.length];
          return (
            <React.Fragment key={i}>
              <Rect x={x} y={100 - barH} width={barWidth} height={barH} fill={fill} rx={4} />
              <SText x={x + barWidth / 2} y={115} textAnchor="middle" fontSize={9} fill={c.textSecondary} numberOfLines={1}>
                {item.label.length > 8 ? item.label.slice(0, 7) + '…' : item.label}
              </SText>
              <SText x={x + barWidth / 2} y={97 - barH} textAnchor="middle" fontSize={10} fill={c.textPrimary} fontWeight="600">
                {item.value}
              </SText>
            </React.Fragment>
          );
        })}
      </Svg>
    </ScrollView>
  );
};

// ---- Donut chart ----
const DonutChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  const { c } = useTheme();
  const { default: Svg, Path } = require('react-native-svg');
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cum = 0;
  const cx = 70, cy = 70, r = 55, ir = 32;
  const TAU = Math.PI * 2;
  const toXY = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos(angle - Math.PI / 2),
    y: cy + radius * Math.sin(angle - Math.PI / 2),
  });

  return (
    <Svg width={140} height={140}>
      {data.map((item, i) => {
        const pct = item.value / total;
        const startAngle = cum * TAU;
        const endAngle = (cum + pct) * TAU;
        cum += pct;
        if (item.value === 0) return null;
        const large = endAngle - startAngle > Math.PI ? 1 : 0;
        const s = toXY(startAngle, r);
        const e = toXY(endAngle, r);
        const si = toXY(startAngle, ir);
        const ei = toXY(endAngle, ir);
        const fill = c.chartColors[i % c.chartColors.length];
        const d = `M${s.x.toFixed(1)},${s.y.toFixed(1)} A${r},${r} 0 ${large},1 ${e.x.toFixed(1)},${e.y.toFixed(1)} L${ei.x.toFixed(1)},${ei.y.toFixed(1)} A${ir},${ir} 0 ${large},0 ${si.x.toFixed(1)},${si.y.toFixed(1)} Z`;
        return <Path key={i} d={d} fill={fill} />;
      })}
    </Svg>
  );
};

const PERIODS = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
  { label: 'Todos', days: 0 },
];

const CHART_TYPES = ['Horizontal', 'Pizza', 'Vertical'] as const;
type ChartType = typeof CHART_TYPES[number];

export const ReportsScreen: React.FC = () => {
  const { c } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(route.params?.surveyId ?? '');
  const [period, setPeriod] = useState(30);
  const [chartType, setChartType] = useState<ChartType>('Barras');
  const [exporting, setExporting] = useState(false);

  const { data: surveys = [] } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => getSurveys(),
  });

  const { data: responses = [] } = useQuery({
    queryKey: ['responses', selectedSurveyId],
    queryFn: () => getResponses(selectedSurveyId),
    enabled: !!selectedSurveyId,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions', selectedSurveyId],
    queryFn: () => getQuestions(selectedSurveyId),
    enabled: !!selectedSurveyId,
  });

  const selectedSurvey = surveys.find((s) => s.id === selectedSurveyId);

  const filteredResponses = useMemo(() => {
    if (!period) return responses;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - period);
    return responses.filter((r) => new Date(r.submitted_at ?? '') >= cutoff);
  }, [responses, period]);

  // Aggregate answers per question option
  const aggregated = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    filteredResponses.forEach((response: any) => {
      (response.survey_answers ?? []).forEach((answer: any) => {
        if (!map[answer.question_id]) map[answer.question_id] = {};
        const val = Array.isArray(answer.answer_value)
          ? answer.answer_value
          : [answer.answer_value];
        val.forEach((v: any) => {
          const key = String(v);
          map[answer.question_id][key] = (map[answer.question_id][key] ?? 0) + 1;
        });
      });
    });
    return map;
  }, [filteredResponses]);

  const handleExportPDF = async () => {
    if (!selectedSurvey) return;
    try {
      setExporting(true);
      const html = `
        <html><head><style>
          body { font-family: Arial; padding: 32px; color: #1A2622; }
          h1 { color: #0F3D2E; } h2 { color: #1B5E42; font-size: 14px; }
          .badge { display: inline-block; background: #34A85A; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          td, th { border: 1px solid #E8EDEA; padding: 8px; font-size: 12px; }
          th { background: #EAF3EE; }
        </style></head><body>
          <h1>${selectedSurvey.title}</h1>
          <p class="badge">${selectedSurvey.status}</p>
          <p>${selectedSurvey.description ?? ''}</p>
          <h2>Total de respostas: ${filteredResponses.length}</h2>
          <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} pelo SurveyApp</p>
        </body></html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!selectedSurvey || filteredResponses.length === 0) return;
    try {
      setExporting(true);
      const header = 'id,respondent_id,respondent_name,source,submitted_at\n';
      const rows = filteredResponses.map((r) =>
        `${r.id},${r.respondent_id ?? ''},${r.respondent_name ?? ''},${r.source},${r.submitted_at}`
      ).join('\n');
      const csv = header + rows;
      const path = `${Paths.cache}relatorio-${Date.now()}.csv`;
      const file = new File(path);
      await file.create();
      await Sharing.shareAsync(path, { mimeType: 'text/csv' });
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Survey Selector */}
      <Card>
        <Text style={[typography.overline, { color: c.textSecondary, marginBottom: spacing[3] }]}>PESQUISA</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {surveys.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.surveyChip, {
                backgroundColor: selectedSurveyId === s.id ? c.primaryDark : c.inputBg,
                borderColor: selectedSurveyId === s.id ? c.primaryDark : c.border,
              }]}
              onPress={() => setSelectedSurveyId(s.id)}
            >
              <Text style={[typography.bodySmall, { color: selectedSurveyId === s.id ? '#FFF' : c.textPrimary }]} numberOfLines={1}>
                {s.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Card>

      {selectedSurvey && (
        <>
          {/* Metric summary */}
          <View style={styles.metricsRow}>
            <Card style={{ flex: 1, marginRight: spacing[3] }}>
              <Text style={[typography.overline, { color: c.textSecondary }]}>TOTAL DE VOTOS</Text>
              <Text style={[typography.displayMedium, { color: c.textPrimary }]}>{filteredResponses.length}</Text>
            </Card>
            <Card style={{ flex: 1 }}>
              <Text style={[typography.overline, { color: c.textSecondary }]}>PARTICIPAÇÃO</Text>
              <Text style={[typography.displayMedium, { color: c.textPrimary }]}>
                {selectedSurvey.response_count ? `${Math.min(Math.round((filteredResponses.length / selectedSurvey.response_count) * 100), 100)}%` : '—'}
              </Text>
            </Card>
          </View>

          {/* Period + Chart type selectors */}
          <Card style={{ marginTop: spacing[3] }}>
            <Text style={[typography.overline, { color: c.textSecondary, marginBottom: spacing[3] }]}>PERÍODO</Text>
            <View style={styles.periodRow}>
              {PERIODS.map((p) => (
                <TouchableOpacity
                  key={p.days}
                  style={[styles.periodBtn, { backgroundColor: period === p.days ? c.primaryDark : c.inputBg, borderColor: period === p.days ? c.primaryDark : c.border }]}
                  onPress={() => setPeriod(p.days)}
                >
                  <Text style={[typography.labelSmall, { color: period === p.days ? '#FFF' : c.textSecondary }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[typography.overline, { color: c.textSecondary, marginBottom: spacing[3], marginTop: spacing[4] }]}>TIPO DE GRÁFICO</Text>
            {CHART_TYPES.map((ct) => (
              <TouchableOpacity
                key={ct}
                style={[styles.chartTypeBtn, { backgroundColor: chartType === ct ? c.accentLight : 'transparent', borderColor: chartType === ct ? c.accent : c.border }]}
                onPress={() => setChartType(ct)}
              >
                <Text style={[typography.body, { color: chartType === ct ? c.primaryDark : c.textPrimary }]}>
                  {ct === 'Vertical' ? '📊' : ct === 'Pizza' ? '🥧' : '📑'} {ct}
                </Text>
              </TouchableOpacity>
            ))}

            <Button label="⬇  Exportar relatório" loading={exporting} fullWidth onPress={handleExportPDF} style={{ marginTop: spacing[5] }} />
            <Button label="Exportar CSV" variant="outline" fullWidth onPress={handleExportCSV} style={{ marginTop: spacing[2] }} />
          </Card>

          {/* Chart */}
          <Card style={{ marginTop: spacing[3] }}>
            <Text style={[typography.h3, { color: c.textPrimary, marginBottom: spacing[4] }]}>
              Visualização — {chartType}
            </Text>

            {questions.length === 0 ? (
              <Text style={[typography.body, { color: c.textSecondary, textAlign: 'center', padding: spacing[6] }]}>
                Nenhuma pergunta encontrada.
              </Text>
            ) : (
              questions.map((question, i) => {
                const optionsMap = aggregated[question.id] ?? {};
                const barData = Object.entries(optionsMap).map(([label, value]) => ({ label, value: value as number }));
                const isText = question.type === 'texto_curto' || question.type === 'texto_longo';

                return (
                  <View key={question.id} style={{ marginBottom: spacing[6] }}>
                    <Text style={[typography.h4, { color: c.textPrimary, marginBottom: spacing[3] }]}>
                      {i + 1}. {question.title}
                    </Text>

                    {isText ? (
                      <View style={{ backgroundColor: c.inputBg, borderRadius: borderRadius.md, padding: spacing[3] }}>
                        {barData.length === 0 ? (
                          <Text style={[typography.bodySmall, { color: c.textSecondary }]}>Nenhuma resposta ainda.</Text>
                        ) : (
                          barData.map((item, j) => (
                            <View key={j} style={{ paddingVertical: spacing[2], borderBottomWidth: j < barData.length - 1 ? 1 : 0, borderBottomColor: c.divider }}>
                              <Text style={[typography.body, { color: c.textPrimary }]}>{item.label}</Text>
                              <Text style={[typography.caption, { color: c.textSecondary, marginTop: 4 }]}>{item.value} {item.value === 1 ? 'resposta' : 'respostas'}</Text>
                            </View>
                          ))
                        )}
                      </View>
                    ) : (
                      <>
                        {barData.length === 0 ? (
                          <Text style={[typography.bodySmall, { color: c.textSecondary }]}>Nenhuma resposta ainda.</Text>
                        ) : (
                          <>
                            {chartType === 'Vertical' && <BarChart data={barData} />}
                            
                            {chartType === 'Pizza' && (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <DonutChart data={barData} />
                                <View style={{ flex: 1, marginLeft: spacing[3] }}>
                                  {barData.map((item, idx) => {
                                    const total = barData.reduce((s, d) => s + d.value, 0);
                                    const pct = total > 0 ? (item.value / total) * 100 : 0;
                                    const displayPct = Number.isInteger(pct) ? pct.toString() : pct.toFixed(1);
                                    return (
                                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.chartColors[idx % c.chartColors.length], marginRight: 6 }} />
                                        <Text style={[typography.caption, { color: c.textSecondary, flex: 1 }]} numberOfLines={2}>{item.label}</Text>
                                        <Text style={[typography.captionBold, { color: c.textPrimary }]}>{displayPct}%</Text>
                                      </View>
                                    );
                                  })}
                                </View>
                              </View>
                            )}

                            {chartType === 'Horizontal' && (
                              <View style={{ marginTop: spacing[1] }}>
                                {barData.map((item, idx) => {
                                  const total = barData.reduce((s, d) => s + d.value, 0);
                                  const pct = total > 0 ? (item.value / total) * 100 : 0;
                                  const displayPct = Number.isInteger(pct) ? pct.toString() : pct.toFixed(1);
                                  return (
                                    <View key={idx} style={styles.detailRow}>
                                      <Text style={[typography.bodySmall, { color: c.primaryMid, width: 24 }]}>{idx + 1}</Text>
                                      <Text style={[typography.bodySmall, { color: c.textPrimary, flex: 1 }]} numberOfLines={2}>{item.label}</Text>
                                      <View style={[styles.barBg, { backgroundColor: c.accentLight }]}>
                                        <View style={[styles.barFill, { backgroundColor: c.chartColors[idx % c.chartColors.length], width: `${pct}%` as any }]} />
                                      </View>
                                      <Text style={[typography.captionBold, { color: c.primaryMid, width: 36, textAlign: 'right' }]}>{displayPct}%</Text>
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </View>
                );
              })
            )}
          </Card>
        </>
      )}

      {!selectedSurvey && (
        <View style={styles.emptyState}>
          <Text style={[typography.h3, { color: c.textSecondary, textAlign: 'center' }]}>
            Selecione uma pesquisa para ver os relatórios
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing[4], paddingBottom: spacing[12] },
  surveyChip: { borderWidth: 1, borderRadius: borderRadius.lg, paddingVertical: spacing[2], paddingHorizontal: spacing[4], marginRight: spacing[2], maxWidth: 180 },
  metricsRow: { flexDirection: 'row', marginTop: spacing[3] },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  periodBtn: { borderWidth: 1, borderRadius: borderRadius.md, paddingVertical: spacing[2], paddingHorizontal: spacing[4] },
  chartTypeBtn: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing[3], marginBottom: spacing[2] },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2] },
  barBg: { height: 6, borderRadius: 3, flex: 1, marginHorizontal: spacing[2], overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  emptyState: { padding: spacing[12], alignItems: 'center' },
});

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  TextInput,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadow } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { getSurveys, getResponses, getQuestions } from '../../services/surveyService';

// ---- Helpers de exportação multiplataforma ----

/** Baixa um arquivo no browser via Blob */
function webDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Abre o HTML em nova aba e aciona window.print() no browser */
function webPrintHtml(html: string) {
  const win = window.open('', '_blank');
  if (!win) {
    Alert.alert('Erro', 'Permita pop-ups para exportar o relatório.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

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
  const [chartType, setChartType] = useState<ChartType>('Horizontal');
  const [exporting, setExporting] = useState(false);
  const [surveyModalVisible, setSurveyModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: surveys = [] } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => getSurveys(),
  });

  const { data: responses = [], isLoading: loadingResponses, error: responsesError } = useQuery({
    queryKey: ['responses', selectedSurveyId],
    queryFn: () => getResponses(selectedSurveyId),
    enabled: !!selectedSurveyId,
  });

  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['questions', selectedSurveyId],
    queryFn: () => getQuestions(selectedSurveyId),
    enabled: !!selectedSurveyId,
  });

  const selectedSurvey = surveys.find((s) => s.id === selectedSurveyId);

  const filteredResponses = useMemo(() => {
    if (!period) return responses;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - period);
    return responses.filter((r) => {
      // submitted_at nulo → considerar como válido (inclui na listagem)
      if (!r.submitted_at) return true;
      const submittedAt = new Date(r.submitted_at);
      // Protege contra datas inválidas
      if (isNaN(submittedAt.getTime())) return true;
      return submittedAt >= cutoff;
    });
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

  const buildReportHtml = () => {
    const questionsHtml = questions.map((q, qi) => {
      const optionsMap = aggregated[q.id] ?? {};
      const entries = Object.entries(optionsMap);
      const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
      const isText = q.type === 'texto_curto' || q.type === 'texto_longo';

      const rowsHtml = entries.length === 0
        ? '<tr><td colspan="3" style="color:#999;font-style:italic">Sem respostas</td></tr>'
        : entries
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([label, count]) => {
              const pct = (((count as number) / total) * 100).toFixed(1);
              return `<tr><td>${label}</td><td style="text-align:center">${count}</td><td style="text-align:center">${pct}%</td></tr>`;
            })
            .join('');

      return `<div class="question"><h3>${qi + 1}. ${q.title}</h3><span class="badge-sm">${isText ? 'Texto livre' : q.type}</span><table><thead><tr><th>Resposta</th><th>Contagem</th><th>%</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
    }).join('');

    return `<html><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;padding:32px;color:#1A2622;}
      h1{color:#0F3D2E;margin-bottom:4px;}h2{color:#1B5E42;font-size:14px;margin:4px 0 16px;}
      h3{color:#1B5E42;font-size:13px;margin:0 0 4px;}
      .badge{display:inline-block;background:#34A85A;color:white;padding:2px 10px;border-radius:12px;font-size:12px;margin-bottom:8px;}
      .badge-sm{display:inline-block;background:#EAF3EE;color:#1B5E42;padding:1px 6px;border-radius:8px;font-size:10px;margin-bottom:6px;}
      .question{margin-top:24px;border-top:1px solid #E8EDEA;padding-top:16px;}
      .meta{color:#666;font-size:12px;margin:12px 0;}
      table{width:100%;border-collapse:collapse;margin-top:8px;}
      td,th{border:1px solid #E8EDEA;padding:8px;font-size:12px;}
      th{background:#EAF3EE;text-align:left;}
      .footer{margin-top:32px;border-top:1px solid #E8EDEA;padding-top:12px;font-size:11px;color:#999;}
    </style></head><body>
      <h1>${selectedSurvey!.title}</h1>
      <span class="badge">${selectedSurvey!.status}</span>
      <p class="meta">${selectedSurvey!.description ?? ''}</p>
      <h2>Total de respostas no período: ${filteredResponses.length}</h2>
      ${questionsHtml}
      <div class="footer">Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} pelo SurveyApp</div>
    </body></html>`;
  };

  const buildCsvContent = () => {
    const header = 'id,respondent_id,respondent_name,source,submitted_at';
    const questionHeaders = questions.map((q) => `"${q.title.replace(/"/g, '""')}"`).join(',');
    const fullHeader = questions.length > 0 ? `${header},${questionHeaders}` : header;

    const rows = filteredResponses.map((r: any) => {
      const base = `${r.id},${r.respondent_id ?? ''},"${(r.respondent_name ?? '').replace(/"/g, '""')}",${r.source ?? ''},${r.submitted_at ?? ''}`;
      if (questions.length === 0) return base;
      const answerMap: Record<string, string> = {};
      (r.survey_answers ?? []).forEach((a: any) => {
        const val = Array.isArray(a.answer_value) ? a.answer_value.join('; ') : String(a.answer_value ?? '');
        answerMap[a.question_id] = val;
      });
      const answerCols = questions.map((q) => `"${(answerMap[q.id] ?? '').replace(/"/g, '""')}"`).join(',');
      return `${base},${answerCols}`;
    }).join('\n');

    return `${fullHeader}\n${rows}`;
  };

  const handleExportPDF = async () => {
    if (!selectedSurvey) return;
    try {
      setExporting(true);
      const html = buildReportHtml();

      if (Platform.OS === 'web') {
        // Browser: abre nova aba com o HTML e aciona impressão
        webPrintHtml(html);
      } else {
        // Mobile: gera PDF via expo-print e compartilha
        const { default: Print } = await import('expo-print');
        const { default: Sharing } = await import('expo-sharing');
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Relatório — ${selectedSurvey.title}` });
      }
    } catch (err: any) {
      Alert.alert('Erro ao exportar relatório', err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!selectedSurvey || filteredResponses.length === 0) {
      Alert.alert('Aviso', 'Não há respostas para exportar no período selecionado.');
      return;
    }
    try {
      setExporting(true);
      const csv = buildCsvContent();
      const filename = `relatorio-${selectedSurvey.title.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.csv`;

      if (Platform.OS === 'web') {
        // Browser: download via Blob
        webDownload(csv, filename, 'text/csv;charset=utf-8;');
      } else {
        // Mobile: salva em arquivo e compartilha
        const FileSystem = await import('expo-file-system');
        const { default: Sharing } = await import('expo-sharing');
        const path = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: `Relatório CSV — ${selectedSurvey.title}` });
      }
    } catch (err: any) {
      Alert.alert('Erro ao exportar CSV', err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Survey Selector Dropdown */}
      <Card>
        <Text style={[typography.overline, { color: c.textSecondary, marginBottom: spacing[3] }]}>PESQUISA</Text>
        <TouchableOpacity
          style={[styles.dropdownBtn, { backgroundColor: c.inputBg, borderColor: c.border }]}
          onPress={() => { setSearchQuery(''); setSurveyModalVisible(true); }}
          activeOpacity={0.7}
        >
          <Text style={[typography.body, { color: selectedSurveyId ? c.textPrimary : c.textSecondary, flex: 1 }]} numberOfLines={1}>
            {selectedSurveyId ? surveys.find(s => s.id === selectedSurveyId)?.title ?? 'Selecionar pesquisa' : 'Selecionar pesquisa'}
          </Text>
          <Text style={{ color: c.textSecondary, fontSize: 16 }}>▾</Text>
        </TouchableOpacity>
      </Card>

      {/* Survey Picker Modal */}
      <Modal
        visible={surveyModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSurveyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: c.divider }]}>
              <Text style={[typography.h3, { color: c.textPrimary, flex: 1 }]}>Selecionar Pesquisa</Text>
              <TouchableOpacity onPress={() => setSurveyModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ fontSize: 22, color: c.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { backgroundColor: c.inputBg, borderColor: c.border }]}>
              <Text style={{ color: c.textSecondary, marginRight: spacing[2] }}>🔍</Text>
              <TextInput
                style={[typography.body, { flex: 1, color: c.textPrimary, padding: 0 }]}
                placeholder="Buscar pesquisa..."
                placeholderTextColor={c.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={{ color: c.textSecondary, fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={surveys.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedSurveyId;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, { borderBottomColor: c.divider, backgroundColor: isSelected ? c.accentLight : 'transparent' }]}
                    onPress={() => { setSelectedSurveyId(item.id); setSurveyModalVisible(false); }}
                    activeOpacity={0.6}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.body, { color: isSelected ? c.primaryDark : c.textPrimary, fontWeight: isSelected ? '600' : '400' }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {item.description ? (
                        <Text style={[typography.caption, { color: c.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected && <Text style={{ color: c.primaryDark, fontSize: 18, marginLeft: spacing[3] }}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={[typography.body, { color: c.textSecondary, textAlign: 'center', padding: spacing[8] }]}>
                  Nenhuma pesquisa encontrada.
                </Text>
              }
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 380 }}
            />
          </View>
        </View>
      </Modal>

      {selectedSurvey && (
        <>
          {/* Metric summary */}
          <View style={styles.metricsRow}>
            <Card style={{ flex: 1, marginRight: spacing[3] }}>
              <Text style={[typography.overline, { color: c.textSecondary }]}>TOTAL DE VOTOS</Text>
              {loadingResponses
                ? <Text style={[typography.displayMedium, { color: c.textSecondary }]}>…</Text>
                : <Text style={[typography.displayMedium, { color: c.textPrimary }]}>{filteredResponses.length}</Text>
              }
            </Card>
            <Card style={{ flex: 1 }}>
              <Text style={[typography.overline, { color: c.textSecondary }]}>ÚLTIMA RESPOSTA</Text>
              {loadingResponses
                ? <Text style={[typography.displayMedium, { color: c.textSecondary }]}>…</Text>
                : (() => {
                    const latest = filteredResponses
                      .map((r: any) => r.submitted_at ? new Date(r.submitted_at) : null)
                      .filter(Boolean)
                      .sort((a: any, b: any) => b - a)[0];
                    if (!latest) return (
                      <Text style={[typography.displayMedium, { color: c.textSecondary }]}>—</Text>
                    );
                    const diffMs = Date.now() - latest.getTime();
                    const diffMin = Math.floor(diffMs / 60000);
                    const diffH = Math.floor(diffMin / 60);
                    const diffD = Math.floor(diffH / 24);
                    let label: string;
                    if (diffMin < 1) label = 'agora';
                    else if (diffMin < 60) label = `${diffMin}min`;
                    else if (diffH < 24) label = `${diffH}h`;
                    else if (diffD === 1) label = 'ontem';
                    else if (diffD < 30) label = `${diffD}d`;
                    else label = latest.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                    return (
                      <Text style={[typography.displayMedium, { color: c.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                        {label}
                      </Text>
                    );
                  })()
              }
            </Card>
          </View>

          {/* Aviso: período pode estar filtrando respostas */}
          {!loadingResponses && responses.length > 0 && filteredResponses.length === 0 && (
            <Card style={{ marginTop: spacing[3], backgroundColor: '#FFF8E1' }}>
              <Text style={[typography.bodySmall, { color: '#856404' }]}>
                ⚠️ Existem {responses.length} resposta(s) mas o período selecionado está filtrando todas. Tente mudar para "Todos".
              </Text>
            </Card>
          )}

          {/* Erro ao carregar respostas */}
          {responsesError && (
            <Card style={{ marginTop: spacing[3], backgroundColor: '#FFF0F0' }}>
              <Text style={[typography.bodySmall, { color: '#c0392b' }]}>
                ❌ Erro ao carregar respostas: {(responsesError as any)?.message ?? 'Tente novamente.'}
              </Text>
            </Card>
          )}

          {/* Period + Chart type selectors */}
          <Card style={{ marginTop: spacing[3] }}>
            <Select
              label="PERÍODO"
              options={PERIODS.map(p => ({ label: p.label, value: String(p.days) }))}
              value={String(period)}
              onChange={(val) => setPeriod(Number(val))}
              style={{ marginBottom: spacing[4] }}
            />

            <Select
              label="TIPO DE GRÁFICO"
              options={CHART_TYPES.map(ct => ({
                label: ct,
                value: ct,
                emoji: ct === 'Vertical' ? '📊' : ct === 'Pizza' ? '🥧' : '📑'
              }))}
              value={chartType}
              onChange={(val) => setChartType(val as ChartType)}
            />

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
  // Dropdown
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    minHeight: 44,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing[6],
    ...shadow.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[5],
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginHorizontal: spacing[5],
    marginVertical: spacing[3],
    minHeight: 42,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[5],
    borderBottomWidth: 1,
  },
  // Others
  metricsRow: { flexDirection: 'row', marginTop: spacing[3] },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  periodBtn: { borderWidth: 1, borderRadius: borderRadius.md, paddingVertical: spacing[2], paddingHorizontal: spacing[4] },
  chartTypeBtn: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing[3], marginBottom: spacing[2] },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2] },
  barBg: { height: 6, borderRadius: 3, flex: 1, marginHorizontal: spacing[2], overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  emptyState: { padding: spacing[12], alignItems: 'center' },
});

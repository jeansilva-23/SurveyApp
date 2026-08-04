import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadow } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Card, MetricCard, StatusBadge } from '../../components/common/Card';
import { EmptyState } from '../../components/common/Mascot';
import { getDashboardStats } from '../../services/surveyService';
import { useAuthStore } from '../../store/authStore';
import { Survey } from '../../types/database.types';

// ---- Mini Line Chart (pure RN, no victory) ----
const MiniLineChart: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * 260,
    y: 80 - (v / max) * 70,
  }));

  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const fill = `${d} L${points[points.length - 1].x},80 L0,80 Z`;

  const { default: Svg, Path } = require('react-native-svg');

  return (
    <Svg width="100%" height={90} viewBox="0 0 260 90">
      <Path d={fill} fill={color} opacity={0.15} />
      <Path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

// ---- Donut chart for survey status ----
const StatusDonut: React.FC<{
  active: number;
  closed: number;
  draft: number;
}> = ({ active, closed, draft }) => {
  const { c } = useTheme();
  const total = active + closed + draft || 1;

  const segments = [
    { value: active, color: c.statusActive, label: 'Ativas' },
    { value: closed, color: c.statusClosed, label: 'Encerradas' },
    { value: draft, color: c.statusDraft, label: 'Rascunho' },
  ];

  let cum = 0;
  const cx = 60, cy = 60, r = 50, ir = 32;
  const TAU = Math.PI * 2;

  const toXY = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos(angle - Math.PI / 2),
    y: cy + radius * Math.sin(angle - Math.PI / 2),
  });

  const { default: Svg, Path: SPath, Text: SText } = require('react-native-svg');

  const paths = segments.map((seg) => {
    const startAngle = cum * TAU;
    const endAngle = (cum + seg.value / total) * TAU;
    cum += seg.value / total;

    if (seg.value === 0) return null;

    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    const s = toXY(startAngle, r);
    const e = toXY(endAngle, r);
    const si = toXY(startAngle, ir);
    const ei = toXY(endAngle, ir);

    return `M${s.x.toFixed(2)},${s.y.toFixed(2)} A${r},${r} 0 ${large},1 ${e.x.toFixed(2)},${e.y.toFixed(2)} L${ei.x.toFixed(2)},${ei.y.toFixed(2)} A${ir},${ir} 0 ${large},0 ${si.x.toFixed(2)},${si.y.toFixed(2)} Z`;
  });

  return (
    <View style={styles.donutRow}>
      <Svg width={120} height={120} viewBox="0 0 120 120">
        {paths.map((d, i) =>
          d ? <SPath key={i} d={d} fill={segments[i].color} /> : null
        )}
        <SText x={cx} y={cy - 6} textAnchor="middle" fontSize={11} fill={c.textSecondary}>Total</SText>
        <SText x={cx} y={cy + 10} textAnchor="middle" fontSize={18} fontWeight="700" fill={c.textPrimary}>{total}</SText>
      </Svg>
      <View style={{ marginLeft: spacing[4], gap: 8 }}>
        {segments.map((seg) => (
          <View key={seg.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: seg.color }} />
            <Text style={[typography.caption, { color: c.textSecondary }]}>{seg.label}</Text>
            <Text style={[typography.captionBold, { color: c.textPrimary }]}>{seg.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ---- Survey Row ----
const SurveyRow: React.FC<{ survey: Survey; onPress: () => void }> = ({ survey, onPress }) => {
  const { c } = useTheme();

  return (
    <TouchableOpacity style={[styles.surveyRow, { borderBottomColor: c.divider }]} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={[typography.labelLarge, { color: c.textPrimary }]} numberOfLines={1}>
          {survey.title}
        </Text>
        <Text style={[typography.bodySmall, { color: c.textSecondary, marginTop: 2 }]} numberOfLines={1}>
          {survey.description ?? 'Sem descrição'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <StatusBadge status={survey.status} />
        <Text style={[typography.captionBold, { color: c.textSecondary }]}>
          {survey.response_count ?? 0} resp.
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ---- Main HomeScreen ----
export const HomeScreen: React.FC = () => {
  const { c } = useTheme();
  const navigation = useNavigation<any>();
  const profile = useAuthStore((s) => s.profile);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
    staleTime: 30_000,
  });

  const recentSurveys = useMemo(
    () => (data?.surveys ?? []).slice(0, 5) as Survey[],
    [data]
  );

  // Build monthly response trend (last 7 months)
  const trendData = useMemo(() => {
    if (!data?.responses) return [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const month = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
      return data.responses.filter((r) => {
        const d = new Date(r.submitted_at ?? '');
        return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
      }).length;
    });
  }, [data]);

  const surveyStats = useMemo(() => {
    const surveys = data?.surveys ?? [];
    return {
      active: surveys.filter((s) => s.status === 'ativa').length,
      closed: surveys.filter((s) => s.status === 'encerrada').length,
      draft: surveys.filter((s) => s.status === 'rascunho').length,
    };
  }, [data]);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'usuário';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={c.primaryMid} />}
    >
      {/* Greeting */}
      <View style={[styles.greetingHeader, { backgroundColor: c.primary }]}>
        <View>
          <Text style={[typography.bodySmall, { color: '#C8E6D4' }]}>Bem-vindo de volta,</Text>
          <Text style={[typography.h1, { color: '#EAF3EE', marginTop: 2 }]}>
            {firstName} 👋
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: c.accent }]}
          onPress={() => navigation.navigate('CreateSurvey')}
        >
          <Text style={[typography.labelLarge, { color: '#FFF' }]}>+ Nova pesquisa</Text>
        </TouchableOpacity>
      </View>

      {/* Metric Cards */}
      <View style={styles.metricsGrid}>
        <MetricCard
          title="RESPOSTAS TOTAIS"
          value={data?.totalResponses ?? 0}
          trend="+12% esta semana"
          trendUp
          style={{ flex: 1, marginRight: spacing[2] }}
        />
        <MetricCard
          title="PESQUISAS ATIVAS"
          value={data?.activeSurveys ?? 0}
          subtitle={`de ${data?.totalSurveys ?? 0} criadas`}
          style={{ flex: 1 }}
        />
      </View>
      <View style={[styles.metricsGrid, { marginTop: 0 }]}>
        <MetricCard
          title="TAXA DE CONCLUSÃO"
          value={`${data?.completionRate ?? 0}%`}
          trend="+5% vs mês anterior"
          trendUp
          style={{ flex: 1, marginRight: spacing[2] }}
        />
        <MetricCard
          title="TEMPO MÉDIO"
          value="2m 14s"
          subtitle="-8s vs mês anterior"
          trendUp={false}
          trend="8s"
          style={{ flex: 1 }}
        />
      </View>

      {/* Charts Row */}
      <View style={styles.chartsRow}>
        {/* Line Chart */}
        <Card style={{ flex: 1.6, marginRight: spacing[3] }}>
          <Text style={[typography.h4, { color: c.textPrimary, marginBottom: spacing[3] }]}>
            Respostas ao longo do tempo
          </Text>
          <MiniLineChart data={trendData} color={c.chartPrimary} />
        </Card>

        {/* Donut */}
        <Card style={{ flex: 1 }}>
          <Text style={[typography.h4, { color: c.textPrimary, marginBottom: spacing[3] }]}>
            Status das pesquisas
          </Text>
          <StatusDonut {...surveyStats} />
        </Card>
      </View>

      {/* Recent Surveys */}
      <Card style={{ marginTop: spacing[4] }}>
        <View style={styles.sectionHeader}>
          <Text style={[typography.h3, { color: c.textPrimary }]}>Pesquisas recentes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SurveysTab')}>
            <Text style={[typography.bodySmall, { color: c.primaryMid }]}>Ver todas →</Text>
          </TouchableOpacity>
        </View>

        {recentSurveys.length === 0 ? (
          <EmptyState
            title="Nenhuma pesquisa ainda"
            description="Crie sua primeira pesquisa e comece a coletar insights."
            actionLabel="Criar pesquisa"
            onAction={() => navigation.navigate('CreateSurvey')}
            mood="happy"
          />
        ) : (
          recentSurveys.map((survey) => (
            <SurveyRow
              key={survey.id}
              survey={survey}
              onPress={() => navigation.navigate('SurveysTab', { screen: 'SurveyDetail', params: { id: survey.id } })}
            />
          ))
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: spacing[10] },
  greetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  createBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    marginTop: spacing[4],
    gap: 0,
  },
  chartsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    marginTop: spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  surveyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

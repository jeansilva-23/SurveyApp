import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { borderRadius, shadow, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SurveyStatus } from '../../types/database.types';

interface BadgeProps {
  status: SurveyStatus;
  style?: ViewStyle;
}

const STATUS_LABELS: Record<SurveyStatus, string> = {
  ativa: 'Ativa',
  rascunho: 'Rascunho',
  encerrada: 'Encerrada',
  arquivada: 'Arquivada',
};

export const StatusBadge: React.FC<BadgeProps> = ({ status, style }) => {
  const { c } = useTheme();

  const getColors = () => {
    switch (status) {
      case 'ativa':
        return { bg: c.statusActive, text: c.statusActiveText };
      case 'rascunho':
        return { bg: c.statusDraft, text: c.statusDraftText };
      case 'encerrada':
        return { bg: c.statusClosed, text: c.statusClosedText };
      case 'arquivada':
        return { bg: c.statusArchived, text: c.statusArchivedText };
    }
  };

  const { bg, text } = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      {status === 'ativa' && <View style={styles.dot} />}
      <Text style={[typography.captionBold, { color: text }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
};

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, elevated = true }) => {
  const { c } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.card, borderColor: c.border },
        elevated && shadow.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  style?: ViewStyle;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendUp,
  style,
}) => {
  const { c } = useTheme();

  return (
    <Card style={[styles.metricCard, style] as any}>
      <View style={styles.metricHeader}>
        <Text style={[typography.overline, { color: c.textSecondary }]}>{title}</Text>
        {icon && <View style={[styles.metricIcon, { backgroundColor: c.accentLight }]}>{icon}</View>}
      </View>
      <Text style={[typography.displayMedium, { color: c.textPrimary, marginTop: spacing[1] }]}>
        {value}
      </Text>
      {trend && (
        <View style={styles.trendRow}>
          <Text
            style={[
              typography.captionBold,
              { color: trendUp ? c.success : c.error },
            ]}
          >
            {trendUp ? '↑' : '↓'} {trend}
          </Text>
          {subtitle && (
            <Text style={[typography.caption, { color: c.textSecondary, marginLeft: spacing[1] }]}>
              {subtitle}
            </Text>
          )}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.full,
    gap: 4,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
  },
  metricCard: {
    flex: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
  },
});

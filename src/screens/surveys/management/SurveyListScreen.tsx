import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../../theme';
import { spacing, borderRadius, shadow } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { Card, StatusBadge } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { EmptyState } from '../../../components/common/Mascot';
import { getSurveys, deleteSurvey, duplicateSurvey, updateSurvey } from '../../../services/surveyService';
import { Survey, SurveyStatus } from '../../../types/database.types';

const FILTERS: { label: string; value: SurveyStatus | 'todas' }[] = [
  { label: 'Todas', value: 'todas' },
  { label: 'Ativas', value: 'ativa' },
  { label: 'Rascunho', value: 'rascunho' },
  { label: 'Encerradas', value: 'encerrada' },
];

const SurveyCard: React.FC<{
  survey: Survey;
  onPress: () => void;
  onOptions: () => void;
}> = ({ survey, onPress, onOptions }) => {
  const { c } = useTheme();
  const progress = Math.min((survey.response_count ?? 0) / 100, 1);

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <Card style={styles.surveyCard}>
        <View style={styles.cardHeader}>
          <StatusBadge status={survey.status} />
          <TouchableOpacity onPress={onOptions} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Text style={[typography.h3, { color: c.textSecondary }]}>⋯</Text>
          </TouchableOpacity>
        </View>

        <Text style={[typography.h3, { color: c.textPrimary, marginTop: spacing[2] }]} numberOfLines={2}>
          {survey.title}
        </Text>
        {survey.description && (
          <Text style={[typography.bodySmall, { color: c.textSecondary, marginTop: spacing[1] }]} numberOfLines={2}>
            {survey.description}
          </Text>
        )}

        {/* Progress bar */}
        <View style={[styles.progressBg, { backgroundColor: c.accentLight }]}>
          <View style={[styles.progressFill, { backgroundColor: c.accent, width: `${progress * 100}%` as any }]} />
        </View>
        <Text style={[typography.caption, { color: c.textSecondary, marginTop: spacing[1] }]}>
          {survey.response_count ?? 0} respostas
          {survey.end_date && ` · Encerra ${new Date(survey.end_date).toLocaleDateString('pt-BR')}`}
        </Text>
      </Card>
    </TouchableOpacity>
  );
};

export const SurveyListScreen: React.FC = () => {
  const { c } = useTheme();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SurveyStatus | 'todas'>('todas');
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  const { data: surveys = [], isLoading, refetch } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => getSurveys(),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSurvey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surveys'] }),
    onError: () => Alert.alert('Erro ao excluir', 'Não foi possível excluir a pesquisa. Tente novamente.'),
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateSurvey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      Alert.alert('✅ Duplicada!', 'Uma cópia da pesquisa foi criada com sucesso.');
    },
    onError: () => Alert.alert('Erro ao duplicar', 'Não foi possível duplicar a pesquisa.'),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => updateSurvey(id, { status: 'encerrada' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      Alert.alert('⏹ Encerrada', 'A pesquisa foi encerrada com sucesso.');
    },
    onError: () => Alert.alert('Erro ao encerrar', 'Não foi possível encerrar a pesquisa.'),
  });

  const filtered = surveys.filter((s) => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'todas' || s.status === filter;
    return matchSearch && matchFilter;
  });

  const handleDelete = (survey: Survey) => {
    Alert.alert('Excluir pesquisa', `Deseja excluir "${survey.title}" permanentemente? Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(survey.id) },
    ]);
  };

  const handleShare = (survey: Survey) => {
    if (!survey.public_slug) {
      Alert.alert('Pesquisa não publicada', 'Publique a pesquisa primeiro para gerar o link e o QR Code.');
      return;
    }
    navigation.navigate('SurveyDetail', { id: survey.id, openShare: true });
    setSelectedSurvey(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={{ color: c.textSecondary, marginRight: spacing[2] }}>🔍</Text>
        <TextInput
          style={[typography.body, { flex: 1, color: c.textPrimary }]}
          placeholder="Buscar pesquisas..."
          placeholderTextColor={c.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.chip,
              {
                backgroundColor: filter === f.value ? c.primaryDark : c.surface,
                borderColor: filter === f.value ? c.primaryDark : c.border,
              },
            ]}
            onPress={() => setFilter(f.value)}
          >
            <Text
              style={[
                typography.labelSmall,
                { color: filter === f.value ? '#FFF' : c.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={c.primaryMid} />}
        ListEmptyComponent={
          <EmptyState
            title="Nenhuma pesquisa encontrada"
            description="Crie uma nova pesquisa ou ajuste os filtros."
            actionLabel="+ Nova pesquisa"
            onAction={() => navigation.navigate('CreateSurvey')}
            mood="thinking"
          />
        }
        renderItem={({ item }) => (
          <SurveyCard
            survey={item}
            onPress={() => navigation.navigate('SurveyDetail', { id: item.id })}
            onOptions={() => setSelectedSurvey(item)}
          />
        )}
      />

      {/* Options Modal */}
      <Modal visible={!!selectedSurvey} transparent animationType="slide" onRequestClose={() => setSelectedSurvey(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedSurvey(null)}>
          <View style={[styles.modalSheet, { backgroundColor: c.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: c.border }]} />
            <Text style={[typography.h3, { color: c.textPrimary, marginBottom: spacing[4] }]}>
              {selectedSurvey?.title}
            </Text>
            {[
              {
                label: '✏️  Editar',
                testID: 'menu-edit',
                action: () => { navigation.navigate('CreateSurvey', { surveyId: selectedSurvey?.id }); setSelectedSurvey(null); },
              },
              {
                label: '📋  Duplicar',
                testID: 'menu-duplicate',
                action: () => { if (selectedSurvey) duplicateMutation.mutate(selectedSurvey); setSelectedSurvey(null); },
              },
              {
                label: '🔗  Compartilhar / QRCode',
                testID: 'menu-share',
                action: () => { if (selectedSurvey) handleShare(selectedSurvey); },
              },
              // "Encerrar" só faz sentido para pesquisas ativas
              ...(selectedSurvey?.status === 'ativa' ? [{
                label: '⏹  Encerrar',
                testID: 'menu-close',
                action: () => { if (selectedSurvey) closeMutation.mutate(selectedSurvey.id); setSelectedSurvey(null); },
                danger: false,
              }] : []),
              {
                label: '🗑  Excluir',
                testID: 'menu-delete',
                // Fecha o modal primeiro e mostra o Alert após 400ms (evita supressão do Alert pela animação do Modal)
                action: () => {
                  const survey = selectedSurvey!;
                  setSelectedSurvey(null);
                  setTimeout(() => handleDelete(survey), 400);
                },
                danger: true,
              },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.label}
                testID={opt.testID}
                style={[styles.modalOption, { borderBottomColor: c.divider }]}
                onPress={opt.action}
              >
                <Text style={[typography.body, { color: opt.danger ? c.error : c.textPrimary }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing[4],
    marginBottom: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    minHeight: 44,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    gap: 8,
    marginBottom: spacing[3],
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  list: { paddingHorizontal: spacing[4], paddingBottom: spacing[10] },
  surveyCard: { marginBottom: spacing[3] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressBg: { height: 5, borderRadius: 3, marginTop: spacing[3], overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing[6], paddingTop: spacing[3] },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing[4] },
  modalOption: { paddingVertical: spacing[4], borderBottomWidth: 1 },
});

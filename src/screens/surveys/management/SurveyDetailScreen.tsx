import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Share,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../../theme';
import { spacing, borderRadius, shadow } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { Card, StatusBadge } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { getSurveyById, updateSurvey } from '../../../services/surveyService';

const PUBLIC_BASE_URL = __DEV__ ? 'http://localhost:8081/survey' : (process.env.EXPO_PUBLIC_APP_URL || 'https://survey-app-vwhs-psi.vercel.app') + '/survey';

export const SurveyDetailScreen: React.FC = () => {
  const { c } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { id, openShare } = route.params ?? {};
  const [qrModalVisible, setQrModalVisible] = useState(openShare ?? false);

  const { data: survey, isLoading } = useQuery({
    queryKey: ['survey', id],
    queryFn: () => getSurveyById(id),
  });

  const updateMutation = useMutation({
    mutationFn: (updates: any) => updateSurvey(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['survey', id] }),
  });

  const publicUrl = survey?.public_slug
    ? `${PUBLIC_BASE_URL}/${survey.public_slug}`
    : null;

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    await Clipboard.setStringAsync(publicUrl);
    Alert.alert('Link copiado!', 'O link da pesquisa foi copiado para a área de transferência.');
  };

  const handleShare = async () => {
    if (!publicUrl) return;
    await Share.share({
      message: `Responda à pesquisa "${survey?.title}": ${publicUrl}`,
      url: publicUrl,
    });
  };

  if (isLoading || !survey) {
    return (
      <View style={[styles.container, { backgroundColor: c.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.body, { color: c.textSecondary }]}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header info */}
      <Card>
        <View style={styles.detailHeader}>
          <StatusBadge status={survey.status} />
          <Text style={[typography.captionBold, { color: c.textSecondary }]}>
            {survey.response_count ?? 0} respostas
          </Text>
        </View>
        <Text style={[typography.h2, { color: c.textPrimary, marginTop: spacing[2] }]}>{survey.title}</Text>
        {survey.description && (
          <Text style={[typography.body, { color: c.textSecondary, marginTop: spacing[2] }]}>{survey.description}</Text>
        )}
        <View style={styles.metaRow}>
          <Text style={[typography.caption, { color: c.textSecondary }]}>
            Tipo: <Text style={{ fontWeight: '600' }}>{survey.type}</Text>
          </Text>
          {survey.start_date && (
            <Text style={[typography.caption, { color: c.textSecondary }]}>
              Início: {new Date(survey.start_date).toLocaleDateString('pt-BR')}
            </Text>
          )}
          {survey.end_date && (
            <Text style={[typography.caption, { color: c.textSecondary }]}>
              Fim: {new Date(survey.end_date).toLocaleDateString('pt-BR')}
            </Text>
          )}
        </View>
      </Card>

      {/* Share / QRCode Card */}
      <Card style={{ marginTop: spacing[4] }}>
        <Text style={[typography.h3, { color: c.textPrimary, marginBottom: spacing[3] }]}>
          🔗 Compartilhar pesquisa
        </Text>
        <View style={styles.toggleRow}>
          <View>
            <Text style={[typography.labelLarge, { color: c.textPrimary }]}>Acesso via link público</Text>
            <Text style={[typography.caption, { color: c.textSecondary }]}>Permite responder sem login</Text>
          </View>
          <Switch
            value={survey.allow_public_access}
            onValueChange={(val) => updateMutation.mutate({ allow_public_access: val })}
            trackColor={{ false: c.border, true: c.accent }}
            thumbColor="#FFF"
          />
        </View>
        <View style={[styles.toggleRow, { marginTop: spacing[3] }]}>
          <View>
            <Text style={[typography.labelLarge, { color: c.textPrimary }]}>Pedir identificação</Text>
            <Text style={[typography.caption, { color: c.textSecondary }]}>Nome/e-mail opcionais</Text>
          </View>
          <Switch
            value={survey.require_identification}
            onValueChange={(val) => updateMutation.mutate({ require_identification: val })}
            trackColor={{ false: c.border, true: c.accent }}
            thumbColor="#FFF"
          />
        </View>

        {publicUrl ? (
          <View style={[styles.linkBox, { backgroundColor: c.inputBg, borderColor: c.border }]}>
            <Text style={[typography.bodySmall, { color: c.primaryMid, flex: 1 }]} numberOfLines={1}>
              {publicUrl}
            </Text>
            <TouchableOpacity onPress={handleCopyLink}>
              <Text style={[typography.labelSmall, { color: c.primaryDark }]}>Copiar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[typography.bodySmall, { color: c.textSecondary, marginTop: spacing[3] }]}>
            Publique a pesquisa para gerar o link público.
          </Text>
        )}

        <View style={styles.shareActions}>
          {publicUrl && (
            <Button label="Ver QR Code" variant="secondary" onPress={() => setQrModalVisible(true)} style={{ flex: 1, marginRight: spacing[2] }} />
          )}
          {publicUrl && (
            <Button label="Compartilhar" onPress={handleShare} style={{ flex: 1 }} />
          )}
        </View>
      </Card>

      {/* Actions */}
      <Card style={{ marginTop: spacing[4] }}>
        <Text style={[typography.h3, { color: c.textPrimary, marginBottom: spacing[4] }]}>Ações</Text>
        <Button label="✏️  Editar pesquisa" variant="outline" fullWidth onPress={() => navigation.navigate('CreateSurvey', { surveyId: id })} style={{ marginBottom: spacing[3] }} />
        <Button label="📊  Ver relatório" variant="secondary" fullWidth onPress={() => navigation.navigate('Reports', { surveyId: id })} style={{ marginBottom: spacing[3] }} />
        {survey.status === 'ativa' && (
          <Button label="⏹  Encerrar pesquisa" variant="outline" fullWidth onPress={() => updateMutation.mutate({ status: 'encerrada' })} />
        )}
      </Card>

      {/* QR Code Modal */}
      <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
        <View style={styles.qrOverlay}>
          <View style={[styles.qrModal, { backgroundColor: c.surface }]}>
            <Text style={[typography.h2, { color: c.textPrimary, textAlign: 'center', marginBottom: spacing[2] }]}>
              QR Code da Pesquisa
            </Text>
            <Text style={[typography.bodySmall, { color: c.textSecondary, textAlign: 'center', marginBottom: spacing[5] }]} numberOfLines={2}>
              {survey.title}
            </Text>
            {publicUrl && (
              <View style={[styles.qrContainer, { backgroundColor: '#FFF', borderColor: c.border }]}>
                <QRCode
                  value={publicUrl}
                  size={200}
                  color={c.primaryDark}
                  backgroundColor="#FFF"
                />
              </View>
            )}
            <Text style={[typography.caption, { color: c.textSecondary, textAlign: 'center', marginTop: spacing[4] }]} numberOfLines={2}>
              {publicUrl}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[5] }}>
              <Button label="Copiar link" variant="outline" onPress={handleCopyLink} style={{ flex: 1 }} />
              <Button label="Compartilhar" onPress={handleShare} style={{ flex: 1 }} />
            </View>
            <TouchableOpacity onPress={() => setQrModalVisible(false)} style={styles.closeQr}>
              <Text style={[typography.body, { color: c.textSecondary }]}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing[4], paddingBottom: spacing[10] },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4], marginTop: spacing[3] },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: borderRadius.md, padding: spacing[3], marginTop: spacing[4] },
  shareActions: { flexDirection: 'row', marginTop: spacing[4] },
  qrOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing[5] },
  qrModal: { width: '100%', borderRadius: 24, padding: spacing[6], alignItems: 'center' },
  qrContainer: { padding: spacing[4], borderRadius: borderRadius.xl, borderWidth: 1 },
  closeQr: { marginTop: spacing[4], padding: spacing[2] },
});

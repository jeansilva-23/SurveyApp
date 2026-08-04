import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadow } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { ParakeetMascot } from '../../components/common/Mascot';
import { signInWithEmail, signInWithGoogle } from '../../services/authService';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginScreen: React.FC = () => {
  const { c } = useTheme();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
      await signInWithEmail(data.email, data.password);
    } catch (err: any) {
      Alert.alert('Erro ao entrar', err.message ?? 'Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Falha ao autenticar com Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header / Brand */}
        <View style={[styles.header, { backgroundColor: c.primary }]}>
          <ParakeetMascot size={110} mood="happy" />
          <Text style={[typography.displayMedium, styles.brandTitle, { color: '#EAF3EE' }]}>
            SurveyApp
          </Text>
          <Text style={[typography.body, { color: '#C8E6D4', textAlign: 'center' }]}>
            Crie pesquisas. Colete insights.
          </Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: c.surface }, shadow.lg]}>
          <Text style={[typography.h2, { color: c.textPrimary, marginBottom: spacing[5] }]}>
            Entrar
          </Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="E-mail"
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Senha"
                placeholder="••••••••"
                secureTextEntry
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
              />
            )}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotBtn}
          >
            <Text style={[typography.bodySmall, { color: c.primaryMid }]}>Esqueci a senha</Text>
          </TouchableOpacity>

          <Button
            label="Entrar"
            fullWidth
            loading={loading}
            onPress={handleSubmit(onSubmit)}
            style={{ marginTop: spacing[2] }}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
            <Text style={[typography.caption, { color: c.textSecondary, marginHorizontal: spacing[3] }]}>
              ou
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
          </View>

          {/* Google Login */}
          <TouchableOpacity
            style={[styles.googleBtn, { borderColor: c.border, backgroundColor: c.surface }]}
            onPress={handleGoogle}
            activeOpacity={0.8}
          >
            <Text style={[typography.labelLarge, { color: '#4285F4', marginRight: spacing[2] }]}>
              G
            </Text>
            <Text style={[typography.labelLarge, { color: c.textPrimary }]}>
              {googleLoading ? 'Conectando...' : 'Continuar com Google'}
            </Text>
          </TouchableOpacity>

          {/* Register link */}
          <View style={styles.registerRow}>
            <Text style={[typography.body, { color: c.textSecondary }]}>Não tem conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={[typography.bodySmall, { color: c.primaryMid, fontWeight: '600' }]}>
                Criar conta
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 72,
    paddingBottom: 48,
    paddingHorizontal: spacing[6],
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  brandTitle: {
    color: '#EAF3EE',
    marginTop: spacing[3],
    marginBottom: spacing[1],
  },
  card: {
    margin: spacing[5],
    marginTop: -24,
    borderRadius: 24,
    padding: spacing[6],
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -spacing[2],
    marginBottom: spacing[4],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[4],
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    minHeight: 48,
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[5],
  },
});

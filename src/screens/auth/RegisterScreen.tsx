import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from '../../theme';
import { spacing, shadow } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { signUpWithEmail, createOrganization } from '../../services/authService';

const registerSchema = z
  .object({
    fullName: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
    orgName: z.string().min(2, 'Nome da empresa deve ter ao menos 2 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export const RegisterScreen: React.FC = () => {
  const { c } = useTheme();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setLoading(true);
      const slugBase = data.orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const slug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}`;

      // 1) Cria a organização primeiro (RLS agora permite INSERT sem autenticação)
      const org = await createOrganization(data.orgName, slug);

      // 2) Cria o usuário com o org_id — o trigger handle_new_user cria o profile
      await signUpWithEmail(data.email, data.password, data.fullName, org.id);

      Alert.alert('Conta criada!', 'Bem-vindo ao SurveyApp! Seu acesso já está ativo.');
      // Não é necessário navegar — o useAuth detecta a sessão e redireciona automaticamente
    } catch (err: any) {
      Alert.alert('Erro ao criar conta', err.message ?? 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { backgroundColor: c.primary }]}>
          <Text style={[typography.h1, { color: '#EAF3EE', marginBottom: spacing[1] }]}>
            Criar Conta
          </Text>
          <Text style={[typography.body, { color: '#C8E6D4', textAlign: 'center' }]}>
            Configure sua empresa e comece a criar pesquisas
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface }, shadow.lg]}>
          <Text style={[typography.overline, { color: c.textSecondary, marginBottom: spacing[4] }]}>
            Dados pessoais
          </Text>

          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input label="Nome completo" placeholder="Seu nome" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.fullName?.message} />
            )}
          />
          <Controller
            control={control}
            name="orgName"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input label="Nome da empresa" placeholder="Empresa S.A." value={value} onChangeText={onChange} onBlur={onBlur} error={errors.orgName?.message} />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input label="E-mail corporativo" placeholder="voce@empresa.com" keyboardType="email-address" autoCapitalize="none" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.email?.message} />
            )}
          />

          <Text style={[typography.overline, { color: c.textSecondary, marginBottom: spacing[4], marginTop: spacing[2] }]}>
            Senha
          </Text>

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input label="Senha" placeholder="Mínimo 8 caracteres" secureTextEntry value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password?.message} />
            )}
          />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input label="Confirmar senha" placeholder="Repita a senha" secureTextEntry value={value} onChangeText={onChange} onBlur={onBlur} error={errors.confirmPassword?.message} />
            )}
          />

          <Button label="Criar conta" fullWidth loading={loading} onPress={handleSubmit(onSubmit)} style={{ marginTop: spacing[2] }} />

          <View style={styles.loginRow}>
            <Text style={[typography.body, { color: c.textSecondary }]}>Já tem conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[typography.bodySmall, { color: c.primaryMid, fontWeight: '600' }]}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  header: {
    alignItems: 'center',
    paddingTop: 72,
    paddingBottom: 48,
    paddingHorizontal: spacing[6],
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  card: {
    margin: spacing[5],
    marginTop: -24,
    borderRadius: 24,
    padding: spacing[6],
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[5],
  },
});

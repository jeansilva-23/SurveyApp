import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from '../../theme';
import { spacing, shadow } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { ParakeetMascot } from '../../components/common/Mascot';
import { resetPassword } from '../../services/authService';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
});

type FormData = z.infer<typeof schema>;

export const ForgotPasswordScreen: React.FC = () => {
  const { c } = useTheme();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      await resetPassword(data.email);
      setSent(true);
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Não foi possível enviar o e-mail.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.card, { backgroundColor: c.surface }, shadow.lg]}>
        <ParakeetMascot size={80} mood="thinking" />

        {sent ? (
          <>
            <Text style={[typography.h2, { color: c.textPrimary, textAlign: 'center', marginTop: spacing[4] }]}>
              E-mail enviado!
            </Text>
            <Text style={[typography.body, { color: c.textSecondary, textAlign: 'center', marginTop: spacing[2] }]}>
              Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
            </Text>
            <Button label="Voltar ao login" fullWidth onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing[6] }} />
          </>
        ) : (
          <>
            <Text style={[typography.h2, { color: c.textPrimary, textAlign: 'center', marginTop: spacing[4] }]}>
              Esqueci a senha
            </Text>
            <Text style={[typography.body, { color: c.textSecondary, textAlign: 'center', marginTop: spacing[2], marginBottom: spacing[5] }]}>
              Informe seu e-mail e enviaremos as instruções para redefinição.
            </Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input label="E-mail" placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.email?.message} />
              )}
            />
            <Button label="Enviar instruções" fullWidth loading={loading} onPress={handleSubmit(onSubmit)} style={{ marginTop: spacing[2] }} />
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={[typography.body, { color: c.primaryMid }]}>← Voltar</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing[5],
  },
  card: {
    borderRadius: 24,
    padding: spacing[6],
    alignItems: 'center',
  },
  backBtn: {
    marginTop: spacing[4],
    padding: spacing[2],
  },
});

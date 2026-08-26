import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { borderRadius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  onPress,
  disabled,
  ...rest
}) => {
  const { c } = useTheme();

  const handlePress = (e: any) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.(e);
  };

  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.lg,
      opacity: disabled || loading ? 0.6 : 1,
    };

    const sizeStyles: Record<Size, ViewStyle> = {
      sm: { paddingVertical: spacing[2], paddingHorizontal: spacing[4], minHeight: 36 },
      md: { paddingVertical: spacing[3], paddingHorizontal: spacing[5], minHeight: 48 },
      lg: { paddingVertical: spacing[4], paddingHorizontal: spacing[6], minHeight: 56 },
    };

    const variantStyles: Record<Variant, ViewStyle> = {
      primary: { backgroundColor: c.primaryDark },
      secondary: { backgroundColor: c.accentLight },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: c.primaryDark,
      },
      ghost: { backgroundColor: 'transparent' },
      danger: { backgroundColor: c.error },
    };

    return {
      ...base,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidth && { width: '100%' }),
    };
  };

  const getTextStyle = (): TextStyle => {
    const sizeTextStyles: Record<Size, TextStyle> = {
      sm: { ...typography.labelSmall, fontSize: 13 },
      md: { ...typography.labelLarge },
      lg: { ...typography.h4 },
    };

    const variantTextStyles: Record<Variant, TextStyle> = {
      primary: { color: c.textOnPrimary },
      secondary: { color: c.primaryDark },
      outline: { color: c.primaryDark },
      ghost: { color: c.primary },
      danger: { color: '#FFF' },
    };

    return {
      ...sizeTextStyles[size],
      ...variantTextStyles[variant],
    };
  };

  return (
    <TouchableOpacity
      style={[getContainerStyle(), style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#FFF' : c.primaryDark}
        />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <Text style={[getTextStyle(), leftIcon ? { marginLeft: spacing[2] } : {}, rightIcon ? { marginRight: spacing[2] } : {}, textStyle]}>
            {label}
          </Text>
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </TouchableOpacity>
  );
};

import React, { forwardRef, useState } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme';
import { borderRadius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, containerStyle, style, ...rest }, ref) => {
    const { c } = useTheme();
    const [focused, setFocused] = useState(false);
    const [internalValue, setInternalValue] = useState(rest.value || rest.defaultValue || '');

    // Sync with external value changes
    React.useEffect(() => {
      if (rest.value !== undefined && rest.value !== internalValue) {
        setInternalValue(rest.value as string);
      }
    }, [rest.value]);

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text style={[typography.label, { color: c.textSecondary, marginBottom: spacing[1] }]}>
            {label}
          </Text>
        )}
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: c.inputBg,
              borderColor: error ? c.error : focused ? c.borderFocus : c.border,
              borderWidth: focused || error ? 1.5 : 1,
            },
          ]}
        >
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              typography.body,
              {
                color: c.textPrimary,
                flex: 1,
                paddingLeft: leftIcon ? 0 : spacing[3],
                paddingRight: rightIcon ? 0 : spacing[3],
              },
              style,
            ]}
            placeholderTextColor={c.textSecondary}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...rest}
            value={internalValue}
            onChangeText={(t) => {
              setInternalValue(t);
              rest.onChangeText?.(t);
            }}
          />
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
        {error && (
          <Text style={[typography.caption, { color: c.error, marginTop: spacing[1] }]}>
            {error}
          </Text>
        )}
        {hint && !error && (
          <Text style={[typography.caption, { color: c.textSecondary, marginTop: spacing[1] }]}>
            {hint}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    minHeight: 48,
    overflow: 'hidden',
  },
  input: {
    paddingVertical: spacing[3],
  },
  iconLeft: {
    paddingLeft: spacing[3],
    paddingRight: spacing[2],
  },
  iconRight: {
    paddingRight: spacing[3],
    paddingLeft: spacing[2],
  },
});

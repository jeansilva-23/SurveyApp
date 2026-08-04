import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Ellipse, Circle, Path, Rect, G } from 'react-native-svg';
import { useTheme } from '../../theme';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Button } from './Button';

// =====================================================
// Parakeet Mascot — Flat/cartoon style SVG
// Periquito-de-colar (ringneck) estilizado
// =====================================================

interface MascotProps {
  size?: number;
  mood?: 'happy' | 'thinking' | 'sad' | 'celebrating';
}

export const ParakeetMascot: React.FC<MascotProps> = ({ size = 120, mood = 'happy' }) => {
  const scale = size / 120;
  const { c } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {/* Body */}
      <Ellipse cx="60" cy="75" rx="28" ry="34" fill="#2D8653" />

      {/* Wing left */}
      <Ellipse cx="38" cy="78" rx="12" ry="22" fill="#1B5E42" transform="rotate(-10 38 78)" />

      {/* Wing right */}
      <Ellipse cx="82" cy="78" rx="12" ry="22" fill="#1B5E42" transform="rotate(10 82 78)" />

      {/* Neck ring */}
      <Ellipse cx="60" cy="50" rx="18" ry="8" fill="#0F3D2E" opacity={0.5} />

      {/* Head */}
      <Circle cx="60" cy="42" r="22" fill="#34A85A" />

      {/* Eye left */}
      <Circle cx="50" cy="39" r="7" fill="white" />
      <Circle cx="50" cy="39" r="4.5" fill="#1A1A1A" />
      <Circle cx="51.5" cy="37.5" r="1.5" fill="white" />

      {/* Eye right */}
      <Circle cx="70" cy="39" r="7" fill="white" />
      <Circle cx="70" cy="39" r="4.5" fill="#1A1A1A" />
      <Circle cx="71.5" cy="37.5" r="1.5" fill="white" />

      {/* Beak */}
      <Path d="M56 48 Q60 54 64 48 Q60 45 56 48Z" fill="#D4A017" />

      {/* Cheek patch */}
      <Circle cx="45" cy="44" r="4" fill="#FFD54F" opacity={0.6} />
      <Circle cx="75" cy="44" r="4" fill="#FFD54F" opacity={0.6} />

      {/* Head feather crest */}
      <Path d="M55 22 Q60 12 65 22" stroke="#34A85A" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Circle cx="60" cy="12" r="4" fill="#4CAF7D" />

      {/* Antennae dots */}
      <Circle cx="53" cy="20" r="2.5" fill="#4CAF7D" />
      <Circle cx="67" cy="20" r="2.5" fill="#4CAF7D" />

      {/* Tail */}
      <Path d="M48 105 Q60 115 72 105 Q65 98 60 100 Q55 98 48 105Z" fill="#1B5E42" />

      {/* Feet */}
      <Path d="M50 106 L45 112 M50 106 L50 113 M50 106 L55 112" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" />
      <Path d="M70 106 L65 112 M70 106 L70 113 M70 106 L75 112" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" />

      {/* Mood extras */}
      {mood === 'celebrating' && (
        <>
          <Circle cx="20" cy="20" r="4" fill="#FFD54F" opacity={0.8} />
          <Circle cx="100" cy="15" r="3" fill="#FF7043" opacity={0.8} />
          <Circle cx="15" cy="60" r="2.5" fill="#4CAF7D" opacity={0.8} />
          <Circle cx="105" cy="50" r="3.5" fill="#D4A017" opacity={0.8} />
        </>
      )}
    </Svg>
  );
};

// =====================================================
// Empty State Component
// =====================================================

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  mood?: MascotProps['mood'];
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  mood = 'thinking',
}) => {
  const { c } = useTheme();

  return (
    <View style={styles.container}>
      <ParakeetMascot size={100} mood={mood} />
      <Text style={[typography.h3, { color: c.textPrimary, textAlign: 'center', marginTop: spacing[4] }]}>
        {title}
      </Text>
      {description && (
        <Text
          style={[
            typography.body,
            { color: c.textSecondary, textAlign: 'center', marginTop: spacing[2], lineHeight: 22 },
          ]}
        >
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          style={{ marginTop: spacing[6] }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
  },
});

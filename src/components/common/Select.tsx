import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ViewStyle,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '../../theme';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadow } from '../../theme/spacing';

export interface SelectOption {
  label: string;
  value: string;
  emoji?: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  style,
}) => {
  const { c } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View style={style}>
      {label && (
        <Text style={[typography.label, { color: c.textSecondary, marginBottom: spacing[2] }]}>
          {label}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.trigger,
          { backgroundColor: c.inputBg, borderColor: c.border },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Text
          style={[
            typography.body,
            { color: selectedOption ? c.textPrimary : c.textSecondary },
          ]}
        >
          {selectedOption ? (
            <>
              {selectedOption.emoji && `${selectedOption.emoji} `}
              {selectedOption.label}
            </>
          ) : (
            placeholder
          )}
        </Text>
        <Text style={{ color: c.textSecondary }}>▼</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalContent,
                  { backgroundColor: c.card, borderColor: c.border },
                  shadow.lg,
                ]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[typography.labelLarge, { color: c.textPrimary }]}>
                    {label || 'Selecione uma opção'}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text style={{ color: c.textSecondary, fontSize: 20 }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={options}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => {
                    const isSelected = item.value === value;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.optionItem,
                          {
                            backgroundColor: isSelected ? c.accentLight : 'transparent',
                          },
                        ]}
                        onPress={() => {
                          onChange(item.value);
                          setModalVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            typography.body,
                            {
                              color: isSelected ? c.primaryDark : c.textPrimary,
                              fontWeight: isSelected ? '600' : '400',
                            },
                          ]}
                        >
                          {item.emoji && `${item.emoji} `}
                          {item.label}
                        </Text>
                        {isSelected && (
                          <Text style={{ color: c.primaryDark }}>✓</Text>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  ItemSeparatorComponent={() => (
                    <View style={{ height: 1, backgroundColor: c.border }} />
                  )}
                  style={styles.list}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    minHeight: 48,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: spacing[4],
  },
  modalContent: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  list: {
    paddingBottom: spacing[2],
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
  },
});

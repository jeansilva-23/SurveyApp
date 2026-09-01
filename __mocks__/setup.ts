/**
 * Mock global do módulo react-native-gesture-handler.
 * Necessário para testes com Jest — o módulo nativo não existe no ambiente Node.
 */
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    GestureHandlerRootView: View,
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: (Component: any) => Component,
    Directions: {},
  };
});

/**
 * Mock do expo-haptics — não disponível no ambiente Node.
 */
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

/**
 * Mock do expo-clipboard.
 */
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
  getStringAsync: jest.fn(),
}));

/**
 * Mock do AsyncStorage.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

/**
 * Mock do expo-document-picker — simula o seletor de arquivos nativo.
 * Os testes sobrescrevem o comportamento com mockResolvedValue conforme necessário.
 */
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));

/**
 * Mock do expo-file-system — usado na leitura dos arquivos em Base64.
 */
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('dGVzdGVCYXNlNjQ='), // "testeBase64" em base64
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
}));

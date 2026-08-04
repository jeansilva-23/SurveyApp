import 'react-native-gesture-handler';
import React, { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeContext, theme } from './src/theme';
import { useThemeStore } from './src/store/themeStore';
import { colors } from './src/theme/colors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  const mode = useThemeStore((s) => s.mode);

  const themeValue = useMemo(
    () => ({
      ...theme,
      mode,
      c: colors[mode],
    }),
    [mode]
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeContext.Provider value={themeValue}>
          <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
          <RootNavigator />
        </ThemeContext.Provider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

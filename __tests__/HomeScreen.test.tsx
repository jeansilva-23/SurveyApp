/**
 * Testes para HomeScreen
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';

// ---- Mocks ----
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Mock do React Query
const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

// Mock do surveyService
jest.mock('../src/services/surveyService', () => ({
  getDashboardStats: jest.fn(),
}));

// Mock do authService
const mockSignOut = jest.fn();
jest.mock('../src/services/authService', () => ({
  signOut: (...args: any[]) => mockSignOut(...args),
}));

// Mock do authStore
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (selector: any) => selector({ profile: { full_name: 'Test User' } }),
}));

// Mock do tema
jest.mock('../src/theme', () => ({
  useTheme: () => ({
    c: {
      background: '#fff', primary: '#2D8653',
      textPrimary: '#1A1A1A', textSecondary: '#666', accent: '#34A85A',
      statusActive: '#2D8653', statusClosed: '#666', statusDraft: '#F57C00',
    },
    mode: 'light',
  }),
}));

// Import do componente
import { HomeScreen } from '../src/screens/home/HomeScreen';

// ---- Setup ----
beforeEach(() => {
  jest.clearAllMocks();
  Alert.alert = jest.fn();
  // Provide mock data for useQuery
  mockUseQuery.mockReturnValue({
    data: {
      surveys: [],
      responses: [],
      totalResponses: 10,
      activeSurveys: 2,
      totalSurveys: 5,
      completionRate: 80,
    },
    isLoading: false,
    refetch: jest.fn(),
  });
  Platform.OS = 'ios'; // Default to non-web for testing Alert
});

describe('HomeScreen', () => {
  it('renderiza a saudação corretamente', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Test 👋')).toBeTruthy();
  });

  it('exibe alerta de confirmação de logout ao clicar na saudação no mobile', async () => {
    render(<HomeScreen />);
    
    const greetingText = screen.getByText('Test 👋');
    
    // Abre o menu
    await act(async () => {
      fireEvent.press(greetingText);
    });

    // Clica em sair
    await act(async () => {
      fireEvent.press(screen.getByText('Sair (Logout)'));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Sair',
      'Deseja realmente sair?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancelar' }),
        expect.objectContaining({ text: 'Sair' }),
      ])
    );
  });

  it('chama signOut quando confirma o alerta de logout no mobile', async () => {
    // Sobrescreve Alert.alert para chamar imediatamente o onPress do botão "Sair"
    Alert.alert = jest.fn((title, message, buttons: any) => {
      const sairButton = buttons.find((b: any) => b.text === 'Sair');
      if (sairButton && sairButton.onPress) {
        sairButton.onPress();
      }
    });

    render(<HomeScreen />);
    
    // Abre o menu
    await act(async () => {
      fireEvent.press(screen.getByText('Test 👋'));
    });

    // Clica em sair
    await act(async () => {
      fireEvent.press(screen.getByText('Sair (Logout)'));
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('usa window.confirm e chama signOut na web', async () => {
    Platform.OS = 'web';
    window.confirm = jest.fn().mockReturnValue(true);

    render(<HomeScreen />);
    
    // Abre o menu
    await act(async () => {
      fireEvent.press(screen.getByText('Test 👋'));
    });

    // Clica em sair
    await act(async () => {
      fireEvent.press(screen.getByText('Sair (Logout)'));
    });

    expect(window.confirm).toHaveBeenCalledWith('Deseja realmente sair?');
    expect(mockSignOut).toHaveBeenCalled();
  });
});

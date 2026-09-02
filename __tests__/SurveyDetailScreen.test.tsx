/**
 * Testes unitários para SurveyDetailScreen
 *
 * Cobertura:
 * - Estado de carregamento (Loading)
 * - Tratamento de Erro / Pesquisa não encontrada
 * - Renderização bem sucedida
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SurveyDetailScreen } from '../src/screens/surveys/management/SurveyDetailScreen';

// --- Mocks ---
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
  useRoute: jest.fn(),
}));

jest.mock('../src/services/surveyService', () => ({
  getSurveyById: jest.fn(),
  updateSurvey: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => ({ mutate: jest.fn() })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    c: {
      background: '#fff', primary: '#2D8653', primaryDark: '#1B5E42',
      textPrimary: '#1A1A1A', textSecondary: '#666', accent: '#34A85A',
      accentLight: '#E8F5E9', card: '#fff', border: '#E0E0E0',
      divider: '#E0E0E0', surface: '#fff', error: '#D32F2F',
      warning: '#F57C00', success: '#388E3C', primaryMid: '#2D8653',
    },
    mode: 'light',
  }),
}));

// Setup
beforeEach(() => {
  jest.clearAllMocks();
  (useRoute as jest.Mock).mockReturnValue({ params: { id: '123' } });
});

describe('SurveyDetailScreen', () => {
  it('exibe o estado de "Carregando..." quando isLoading é verdadeiro', () => {
    (useQuery as jest.Mock).mockReturnValue({ isLoading: true, isError: false, data: undefined });
    render(<SurveyDetailScreen />);
    expect(screen.getByText('Carregando...')).toBeTruthy();
  });

  it('exibe mensagem de erro quando isError é verdadeiro', () => {
    (useQuery as jest.Mock).mockReturnValue({ isLoading: false, isError: true, data: undefined });
    render(<SurveyDetailScreen />);
    
    expect(screen.getByText('Pesquisa não encontrada')).toBeTruthy();
    expect(screen.getByText(/Não foi possível carregar os detalhes desta pesquisa/i)).toBeTruthy();
  });

  it('exibe mensagem de erro quando a pesquisa não é retornada (data undefined)', () => {
    (useQuery as jest.Mock).mockReturnValue({ isLoading: false, isError: false, data: undefined });
    render(<SurveyDetailScreen />);
    
    expect(screen.getByText('Pesquisa não encontrada')).toBeTruthy();
  });

  it('botão Voltar funciona quando há erro', () => {
    (useQuery as jest.Mock).mockReturnValue({ isLoading: false, isError: true, data: undefined });
    render(<SurveyDetailScreen />);
    
    const backBtn = screen.getByText('Voltar');
    fireEvent.press(backBtn);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renderiza os detalhes da pesquisa quando carrega com sucesso', () => {
    (useQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: '123',
        title: 'Pesquisa de Clima',
        status: 'ativa',
        type: 'clima',
        response_count: 10,
        allow_public_access: true,
        require_identification: false,
      },
    });

    render(<SurveyDetailScreen />);
    
    expect(screen.getByText('Pesquisa de Clima')).toBeTruthy();
    expect(screen.getByText('10 respostas')).toBeTruthy();
    // Botão de editar deve estar presente se carregou sucesso
    expect(screen.getByText(/Editar pesquisa/i)).toBeTruthy();
  });
});

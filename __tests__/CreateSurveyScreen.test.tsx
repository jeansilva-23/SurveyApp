/**
 * Testes para CreateSurveyScreen
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Profile } from '../src/types/database.types';

// ---- Mocks ----
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: {} }),
}));

// Mock do React Query
const mockInvalidateQueries = jest.fn();
const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: jest.fn(),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

// Mock do surveyService
const mockCreateSurvey = jest.fn();
const mockUpdateSurvey = jest.fn();
const mockUpsertQuestions = jest.fn();
const mockPublishSurvey = jest.fn();

jest.mock('../src/services/surveyService', () => ({
  getSurveyById: jest.fn(),
  createSurvey: (...args: any[]) => mockCreateSurvey(...args),
  updateSurvey: (...args: any[]) => mockUpdateSurvey(...args),
  upsertQuestions: (...args: any[]) => mockUpsertQuestions(...args),
  publishSurvey: (...args: any[]) => mockPublishSurvey(...args),
}));

// Mock do authStore
let mockProfile: Profile | null = {
  id: 'user-1',
  full_name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  org_id: 'org-1',
};
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (selector?: any) => {
    if (selector) return selector({ profile: mockProfile, session: { user: { id: 'user-1' } } });
    return { profile: mockProfile, session: { user: { id: 'user-1' } } };
  },
}));

// Mock do tema
jest.mock('../src/theme', () => ({
  useTheme: () => ({
    c: {
      background: '#fff', primary: '#2D8653', primaryDark: '#1B5E42',
      textPrimary: '#1A1A1A', textSecondary: '#666', accent: '#34A85A',
      accentLight: '#E8F5E9', card: '#fff', border: '#E0E0E0',
      inputBg: '#F5F5F5', surface: '#fff', error: '#D32F2F',
      warning: '#F57C00', success: '#388E3C', primaryMid: '#123',
    },
    mode: 'light',
  }),
}));

// Mock do DraggableFlatList
jest.mock('react-native-draggable-flatlist', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ data, renderItem }: any) => (
      <View>
        {data.map((item: any, index: number) =>
          renderItem({ item, getIndex: () => index, drag: jest.fn(), isActive: false })
        )}
      </View>
    ),
    ScaleDecorator: ({ children }: any) => <View>{children}</View>,
  };
});

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
}));

// ---- Component import ----
import { CreateSurveyScreen } from '../src/screens/surveys/creation/CreateSurveyScreen';

// ---- Setup ----
beforeEach(() => {
  jest.clearAllMocks();
  Alert.alert = jest.fn();
  mockUseQuery.mockReturnValue({ data: undefined, isLoading: false });
});

describe('CreateSurveyScreen', () => {
  it('renderiza corretamente a estrutura base', async () => {
    render(<CreateSurveyScreen />);

    expect(screen.getByText('INFORMAÇÕES BÁSICAS')).toBeTruthy();
    expect(screen.getByText('PERGUNTAS')).toBeTruthy();
    expect(screen.getByText('CONFIGURAÇÕES')).toBeTruthy();
    expect(screen.getByText('Salvar rascunho')).toBeTruthy();
    expect(screen.getByText('Publicar pesquisa ›')).toBeTruthy();
  });

  it('valida campos obrigatórios ao tentar salvar (título ausente)', async () => {
    render(<CreateSurveyScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Salvar rascunho'));
    });

    // Como o zod schema exige título min 3 caracteres, deve dar erro
    expect(Alert.alert).toHaveBeenCalledWith(
      'Campos inválidos',
      expect.stringMatching(/título/i)
    );
    expect(mockCreateSurvey).not.toHaveBeenCalled();
  });

  it('salva rascunho com sucesso quando os dados são válidos', async () => {
    mockCreateSurvey.mockResolvedValue({ id: 'survey-999' });
    mockUpsertQuestions.mockResolvedValue(true);

    render(<CreateSurveyScreen />);

    const titleInput = screen.getByPlaceholderText('Ex: Satisfação com o produto X');
    fireEvent.changeText(titleInput, 'Minha Pesquisa Teste');

    await act(async () => {
      fireEvent.press(screen.getByText('Salvar rascunho'));
    });

    expect(mockCreateSurvey).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Minha Pesquisa Teste',
        status: 'rascunho',
        org_id: 'org-1',
        created_by: 'user-1',
      })
    );
    expect(mockUpsertQuestions).toHaveBeenCalled();
    expect(mockInvalidateQueries).toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      '✅ Salvo!',
      expect.any(String),
      expect.any(Array)
    );
  });

  it('permite adicionar e remover perguntas', async () => {
    render(<CreateSurveyScreen />);

    // Inicialmente tem 1 pergunta padrão
    expect(screen.getByText('Pergunta 1')).toBeTruthy();
    expect(screen.queryByText('Pergunta 2')).toBeNull();

    // Clica para adicionar pergunta
    await act(async () => {
      fireEvent.press(screen.getByText('+ Adicionar pergunta'));
    });

    expect(screen.getByText('Pergunta 1')).toBeTruthy();
    expect(screen.getByText('Pergunta 2')).toBeTruthy();

    // Clica no X da segunda pergunta (o botão de deletar renderiza um ✕)
    const deleteButtons = screen.getAllByText('✕');
    await act(async () => {
      fireEvent.press(deleteButtons[1]);
    });

    expect(screen.getByText('Pergunta 1')).toBeTruthy();
    expect(screen.queryByText('Pergunta 2')).toBeNull();
  });

  it('atualiza o tipo da pergunta ao clicar nas abas', async () => {
    render(<CreateSurveyScreen />);
    
    // Na pergunta 1, deve ter as opções de A e B se for única escolha (padrão)
    expect(screen.getByPlaceholderText('Opção 1')).toBeTruthy();

    // Abre o seletor de tipo
    await act(async () => {
      fireEvent.press(screen.getByText(/Escolha única/));
    });

    // Muda para texto curto
    await act(async () => {
      fireEvent.press(screen.getByText(/Texto curto/));
    });

    // O input de opções não deve mais estar visível
    expect(screen.queryByPlaceholderText('Opção 1')).toBeNull();
  });

  it('publica pesquisa com sucesso', async () => {
    mockCreateSurvey.mockResolvedValue({ id: 'survey-888' });
    mockPublishSurvey.mockResolvedValue(true);

    render(<CreateSurveyScreen />);

    const titleInput = screen.getByPlaceholderText('Ex: Satisfação com o produto X');
    fireEvent.changeText(titleInput, 'Pesquisa Pronta');

    await act(async () => {
      fireEvent.press(screen.getByText('Publicar pesquisa ›'));
    });

    expect(mockCreateSurvey).toHaveBeenCalled();
    expect(mockPublishSurvey).toHaveBeenCalledWith('survey-888', 'Pesquisa Pronta', undefined);
    expect(Alert.alert).toHaveBeenCalledWith(
      '🎉 Pesquisa publicada!',
      expect.any(String),
      expect.any(Array)
    );
  });

  it('altera o modo de identidade e atualiza o estado do formulário', async () => {
    // Ao submeter rascunho, ele usa os dados do form
    mockCreateSurvey.mockResolvedValue({ id: 'survey-777' });
    render(<CreateSurveyScreen />);

    const titleInput = screen.getByPlaceholderText('Ex: Satisfação com o produto X');
    fireEvent.changeText(titleInput, 'Pesquisa de Identidade');

    // Seleciona "Anônimo" (contém emoji 🔒 Anônimo)
    const anonBtn = screen.getByText('🔒 Anônimo');
    await act(async () => {
      fireEvent.press(anonBtn);
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Salvar rascunho'));
    });

    expect(mockCreateSurvey).toHaveBeenCalledWith(
      expect.objectContaining({
        is_anonymous: true,
        require_identification: false,
      })
    );
  });
});

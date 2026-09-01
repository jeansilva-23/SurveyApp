/**
 * Testes de integração UI para a funcionalidade de IA na CreateSurveyScreen.
 *
 * Estratégia: mockar o aiService por completo e verificar se a tela
 * reage corretamente a cada cenário (sucesso, loading, cancelamento, erro).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Profile } from '../src/types/database.types';

// ---- Mocks de navegação ----
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: {} }),
}));

// ---- Mock do React Query ----
const mockInvalidateQueries = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: undefined, isLoading: false }),
  useMutation: jest.fn(),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

// ---- Mock do surveyService ----
const mockCreateSurvey = jest.fn();
const mockUpsertQuestions = jest.fn();
jest.mock('../src/services/surveyService', () => ({
  getSurveyById: jest.fn(),
  createSurvey: (...args: any[]) => mockCreateSurvey(...args),
  updateSurvey: jest.fn(),
  upsertQuestions: (...args: any[]) => mockUpsertQuestions(...args),
  publishSurvey: jest.fn(),
}));

// ---- Mock do aiService ----
const mockPickFileAndGenerateSurvey = jest.fn();
jest.mock('../src/services/aiService', () => ({
  pickFileAndGenerateSurvey: (...args: any[]) => mockPickFileAndGenerateSurvey(...args),
}));

// ---- Mock do authStore ----
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (selector?: any) => {
    const state = {
      profile: {
        id: 'user-1',
        full_name: 'Test User',
        email: 'test@example.com',
        role: 'admin',
        org_id: 'org-1',
      } as Profile,
      session: { user: { id: 'user-1' } },
    };
    if (selector) return selector(state);
    return state;
  },
}));

// ---- Mock do tema ----
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

// ---- Mock do DraggableFlatList ----
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

// ---- Importação do componente ----
import { CreateSurveyScreen } from '../src/screens/surveys/creation/CreateSurveyScreen';

// ---- Fixtures ----
const fakeAISurveyResult = {
  title: 'Pesquisa sobre Home Office',
  description: 'Avalie a sua experiência com o trabalho remoto.',
  questions: [
    {
      type: 'unica_escolha',
      title: 'Você prefere trabalhar remotamente?',
      required: true,
      options: ['Sim', 'Não', 'Indiferente'],
    },
    {
      type: 'escala',
      title: 'Como avalia sua produtividade em casa?',
      required: true,
      options: [],
    },
    {
      type: 'texto_longo',
      title: 'O que você mudaria no modelo remoto?',
      required: true,
      options: [],
    },
  ],
};

// ---- Setup ----
beforeEach(() => {
  jest.clearAllMocks();
  Alert.alert = jest.fn();
});

// ---- Testes ----
describe('CreateSurveyScreen — Funcionalidade de IA', () => {
  it('renderiza o banner de geração com IA na tela', () => {
    render(<CreateSurveyScreen />);

    expect(screen.getByText('Gerar pesquisa com Inteligência Artificial')).toBeTruthy();
    expect(screen.getByText(/Anexe um PDF ou TXT/i)).toBeTruthy();
  });

  it('o botão de IA está acessível via testID', () => {
    render(<CreateSurveyScreen />);

    const aiButton = screen.getByTestId('btn-generate-ai');
    expect(aiButton).toBeTruthy();
  });

  it('preenche o formulário automaticamente após a geração com sucesso', async () => {
    mockPickFileAndGenerateSurvey.mockResolvedValueOnce(fakeAISurveyResult);

    render(<CreateSurveyScreen />);

    const aiButton = screen.getByTestId('btn-generate-ai');

    await act(async () => {
      fireEvent.press(aiButton);
    });

    // Espera o processo assíncrono completar
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        '✨ Pesquisa gerada!',
        expect.stringContaining('3 perguntas')
      );
    });

    // Verifica que o título foi preenchido no formulário
    await waitFor(() => {
      expect(screen.getByDisplayValue('Pesquisa sobre Home Office')).toBeTruthy();
    });

    // Verifica que as perguntas foram criadas
    expect(screen.getByText('Pergunta 1')).toBeTruthy();
    expect(screen.getByText('Pergunta 2')).toBeTruthy();
    expect(screen.getByText('Pergunta 3')).toBeTruthy();
  });

  it('não faz nada quando o usuário cancela o seletor de arquivos', async () => {
    // Retorna null simulando cancelamento
    mockPickFileAndGenerateSurvey.mockResolvedValueOnce(null);

    render(<CreateSurveyScreen />);

    const aiButton = screen.getByTestId('btn-generate-ai');

    await act(async () => {
      fireEvent.press(aiButton);
    });

    // Nenhum alerta deve ter sido disparado
    expect(Alert.alert).not.toHaveBeenCalled();

    // O formulário deve continuar com o estado padrão (pergunta inicial vazia)
    expect(screen.getByText('Pergunta 1')).toBeTruthy();
    expect(screen.queryByText('Pergunta 2')).toBeNull();
  });

  it('exibe alerta de erro amigável quando a geração falha', async () => {
    mockPickFileAndGenerateSurvey.mockRejectedValueOnce(
      new Error('O arquivo é muito grande (7.5 MB). O limite é 5 MB.')
    );

    render(<CreateSurveyScreen />);

    const aiButton = screen.getByTestId('btn-generate-ai');

    await act(async () => {
      fireEvent.press(aiButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Erro ao gerar pesquisa',
        'O arquivo é muito grande (7.5 MB). O limite é 5 MB.'
      );
    });
  });

  it('exibe alerta genérico de erro quando a mensagem não está disponível', async () => {
    mockPickFileAndGenerateSurvey.mockRejectedValueOnce(new Error());

    render(<CreateSurveyScreen />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-generate-ai'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Erro ao gerar pesquisa',
        'Não foi possível gerar a pesquisa. Tente novamente.'
      );
    });
  });

  it('substitui todas as perguntas existentes pelas geradas pela IA', async () => {
    mockPickFileAndGenerateSurvey.mockResolvedValueOnce(fakeAISurveyResult);

    render(<CreateSurveyScreen />);

    // Inicialmente há 1 pergunta padrão
    expect(screen.getByText('Pergunta 1')).toBeTruthy();
    expect(screen.queryByText('Pergunta 2')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-generate-ai'));
    });

    // Após a geração, deve haver 3 perguntas (substituindo a 1 padrão)
    await waitFor(() => {
      expect(screen.getByText('Pergunta 1')).toBeTruthy();
      expect(screen.getByText('Pergunta 2')).toBeTruthy();
      expect(screen.getByText('Pergunta 3')).toBeTruthy();
    });
  });

  it('as perguntas geradas pela IA podem ser salvas normalmente', async () => {
    mockPickFileAndGenerateSurvey.mockResolvedValueOnce(fakeAISurveyResult);
    mockCreateSurvey.mockResolvedValueOnce({ id: 'survey-ai-001' });
    mockUpsertQuestions.mockResolvedValueOnce(true);

    render(<CreateSurveyScreen />);

    // Gera a pesquisa com a IA
    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-generate-ai'));
    });
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('✨ Pesquisa gerada!', expect.any(String)));
    (Alert.alert as jest.Mock).mockClear();

    // Tenta salvar o rascunho
    await act(async () => {
      fireEvent.press(screen.getByText('Salvar rascunho'));
    });

    await waitFor(() => {
      expect(mockCreateSurvey).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Pesquisa sobre Home Office',
          status: 'rascunho',
        })
      );
      expect(Alert.alert).toHaveBeenCalledWith('✅ Salvo!', expect.any(String), expect.any(Array));
    });
  });
});

/**
 * Testes unitários para o fluxo de publicação de pesquisa na CreateSurveyScreen.
 *
 * Cobertura:
 * - Alert comemorativo ao publicar com sucesso
 * - Botão "Publicar" desabilitado após publicação (previne duplicatas)
 * - Navegação via stack (SurveysTab context): navega direto para SurveyDetail
 * - Navegação via tab (Criar context): navega para SurveysTab → SurveyDetail
 * - Exibição de erro quando publishSurvey falha
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Profile } from '../src/types/database.types';

// ---- Mocks de navegação ----
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetState = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    getState: mockGetState,
  }),
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
const mockPublishSurvey = jest.fn();

jest.mock('../src/services/surveyService', () => ({
  getSurveyById: jest.fn(),
  createSurvey: (...args: any[]) => mockCreateSurvey(...args),
  updateSurvey: jest.fn(),
  upsertQuestions: (...args: any[]) => mockUpsertQuestions(...args),
  publishSurvey: (...args: any[]) => mockPublishSurvey(...args),
}));

// ---- Mock do aiService ----
jest.mock('../src/services/aiService', () => ({
  pickFileAndGenerateSurvey: jest.fn(),
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
        {data.map((item: any, index: number) => (
          <View key={item.localId ?? index}>
            {renderItem({ item, getIndex: () => index, drag: jest.fn(), isActive: false })}
          </View>
        ))}
      </View>
    ),
    ScaleDecorator: ({ children }: any) => <View>{children}</View>,
  };
});

import { CreateSurveyScreen } from '../src/screens/surveys/creation/CreateSurveyScreen';

// ---- Helpers ----
/** Preenche o formulário com dados mínimos válidos e retorna o ID de pesquisa criado. */
async function renderAndFillForm(surveyId = 'survey-pub-001') {
  mockCreateSurvey.mockResolvedValue({ id: surveyId });
  mockUpsertQuestions.mockResolvedValue(true);
  mockPublishSurvey.mockResolvedValue({ id: surveyId, status: 'ativa' });

  render(<CreateSurveyScreen />);

  // Preenche o título (campo obrigatório)
  const titleInput = screen.getByPlaceholderText(/Satisfação com o produto/i);
  fireEvent.changeText(titleInput, 'Pesquisa de Satisfação');

  return surveyId;
}

// ---- Setup ----
beforeEach(() => {
  jest.clearAllMocks();
  Alert.alert = jest.fn();
  // Por padrão, simula o contexto de tab (aba "Criar")
  mockGetState.mockReturnValue({ type: 'tab' });
});

// ========================================================================
describe('CreateSurveyScreen — Fluxo de Publicação', () => {

  // ---- 1. Alert comemorativo ----
  describe('Alert de confirmação', () => {
    it('exibe alert comemorativo com mensagem de sucesso ao publicar', async () => {
      await renderAndFillForm();

      await act(async () => {
        fireEvent.press(screen.getByText('Publicar pesquisa ›'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          '🎉 Pesquisa publicada!',
          expect.stringContaining('ao vivo'),
          expect.any(Array)
        );
      });
    });

    it('o alert oferece os botões "📊 Ver pesquisa" e "Continuar editando"', async () => {
      await renderAndFillForm();

      await act(async () => {
        fireEvent.press(screen.getByText('Publicar pesquisa ›'));
      });

      await waitFor(() => expect(Alert.alert).toHaveBeenCalled());

      const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[0];
      const buttonLabels = buttons.map((b: any) => b.text);
      expect(buttonLabels).toContain('📊 Ver pesquisa');
      expect(buttonLabels).toContain('Continuar editando');
    });

    it('chama publishSurvey com o id correto', async () => {
      const id = await renderAndFillForm('pub-xyz-789');

      await act(async () => {
        fireEvent.press(screen.getByText('Publicar pesquisa ›'));
      });

      await waitFor(() => {
        expect(mockPublishSurvey).toHaveBeenCalledWith(
          id,
          expect.any(String),
          undefined  // existingSurvey?.public_slug — pesquisa nova não tem slug ainda
        );
      });
    });
  });

  // ---- 2. Prevenção de duplicatas ----
  describe('Prevenção de publicação duplicada', () => {
    it('botão muda para "✅ Publicada" após publicação bem-sucedida', async () => {
      await renderAndFillForm();

      await act(async () => {
        fireEvent.press(screen.getByText('Publicar pesquisa ›'));
      });

      await waitFor(() => {
        expect(screen.getByText('✅ Publicada')).toBeTruthy();
      });
    });

    it('botão "✅ Publicada" fica desabilitado (não chama publishSurvey novamente)', async () => {
      await renderAndFillForm();

      // Primeira publicação
      await act(async () => {
        fireEvent.press(screen.getByText('Publicar pesquisa ›'));
      });
      await waitFor(() => screen.getByText('✅ Publicada'));

      // Limpa o histórico de chamadas
      mockPublishSurvey.mockClear();

      // Tenta publicar novamente pressionando o botão desabilitado
      await act(async () => {
        fireEvent.press(screen.getByText('✅ Publicada'));
      });

      // publishSurvey NÃO deve ter sido chamado novamente
      expect(mockPublishSurvey).not.toHaveBeenCalled();
    });

    it('não exibe alert duplicado quando o botão é pressionado mais de uma vez rapidamente', async () => {
      await renderAndFillForm();

      await act(async () => {
        fireEvent.press(screen.getByText('Publicar pesquisa ›'));
      });

      await waitFor(() => screen.getByText('✅ Publicada'));
      const alertCallsAfterFirstPublish = (Alert.alert as jest.Mock).mock.calls.length;

      // Segundo press não deve gerar novo alert
      await act(async () => {
        fireEvent.press(screen.getByText('✅ Publicada'));
      });

      expect((Alert.alert as jest.Mock).mock.calls.length).toBe(alertCallsAfterFirstPublish);
    });
  });

  // ---- 3. Navegação: contexto de Stack (SurveysTab) ----
  describe('Navegação — contexto de Stack (dentro do SurveysTab)', () => {
    beforeEach(() => {
      // Simula estar dentro do stack do SurveysTab
      mockGetState.mockReturnValue({ type: 'stack' });
    });

    it('navega diretamente para SurveyDetail ao pressionar "Ver pesquisa"', async () => {
      const id = await renderAndFillForm('stack-survey-001');

      await act(async () => {
        fireEvent.press(screen.getByText('Publicar pesquisa ›'));
      });

      await waitFor(() => expect(Alert.alert).toHaveBeenCalled());

      // Extrai e chama o onPress do botão "📊 Ver pesquisa"
      const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[0];
      const verBtn = buttons.find((b: any) => b.text === '📊 Ver pesquisa');
      act(() => verBtn.onPress());

      expect(mockNavigate).toHaveBeenCalledWith('SurveyDetail', {
        id,
        openShare: true,
      });
    });

    it('NÃO navega para SurveysTab quando está no contexto de stack', async () => {
      await renderAndFillForm();

      await act(async () => {
        fireEvent.press(screen.getByText('Publicar pesquisa ›'));
      });

      await waitFor(() => expect(Alert.alert).toHaveBeenCalled());

      const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[0];
      const verBtn = buttons.find((b: any) => b.text === '📊 Ver pesquisa');
      act(() => verBtn.onPress());

      // Não deve usar SurveysTab como destino quando já está dentro do stack
      const navigateCalls = mockNavigate.mock.calls;
      const tabNavigateCalls = navigateCalls.filter(
        ([routeName]) => routeName === 'SurveysTab'
      );
      expect(tabNavigateCalls).toHaveLength(0);
    });
  });

  // ---- 4. Navegação: contexto de Tab (aba "Criar") ----
  describe('Navegação — contexto de Tab (aba "Criar" direta)', () => {
    beforeEach(() => {
      // Simula estar na aba "Criar" diretamente
      mockGetState.mockReturnValue({ type: 'tab' });
    });

    it('navega para SurveysTab → SurveyDetail ao pressionar "Ver pesquisa"', async () => {
      const id = await renderAndFillForm('tab-survey-002');

      await act(async () => {
        fireEvent.press(screen.getByText('Publicar pesquisa ›'));
      });

      await waitFor(() => expect(Alert.alert).toHaveBeenCalled());

      const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[0];
      const verBtn = buttons.find((b: any) => b.text === '📊 Ver pesquisa');
      act(() => verBtn.onPress());

      expect(mockNavigate).toHaveBeenCalledWith('SurveysTab', {
        screen: 'SurveyDetail',
        params: { id, openShare: true },
        initial: false,
      });
    });

    it('passa openShare: true para abrir o QR Code automaticamente', async () => {
      await renderAndFillForm('tab-qr-003');

      await act(async () => {
        fireEvent.press(screen.getByText('Publicar pesquisa ›'));
      });

      await waitFor(() => expect(Alert.alert).toHaveBeenCalled());

      const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[0];
      const verBtn = buttons.find((b: any) => b.text === '📊 Ver pesquisa');
      act(() => verBtn.onPress());

      const navigateCall = mockNavigate.mock.calls.find(
        ([route]) => route === 'SurveysTab'
      );
      expect(navigateCall?.[1]?.params?.openShare).toBe(true);
    });
  });

  // ---- 5. Tratamento de erros ----
  describe('Tratamento de erros no publishSurvey', () => {
    it('exibe alerta de erro quando publishSurvey lança exceção', async () => {
      mockCreateSurvey.mockResolvedValue({ id: 'err-survey-001' });
      mockUpsertQuestions.mockResolvedValue(true);
      mockPublishSurvey.mockRejectedValue(new Error('Permissão negada pelo banco de dados'));

      render(<CreateSurveyScreen />);
      fireEvent.changeText(
        screen.getByPlaceholderText(/Satisfação com o produto/i),
        'Pesquisa com Erro'
      );

      await act(async () => {
        fireEvent.press(screen.getByText('Publicar pesquisa ›'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Erro ao salvar',
          'Permissão negada pelo banco de dados'
        );
      });
    });

    it('mantém o botão "Publicar pesquisa ›" ativo após um erro (permite nova tentativa)', async () => {
      mockCreateSurvey.mockResolvedValue({ id: 'retry-001' });
      mockUpsertQuestions.mockResolvedValue(true);
      mockPublishSurvey.mockRejectedValue(new Error('Timeout'));

      render(<CreateSurveyScreen />);
      fireEvent.changeText(
        screen.getByPlaceholderText(/Satisfação com o produto/i),
        'Pesquisa Retry'
      );

      await act(async () => {
        fireEvent.press(screen.getByText('Publicar pesquisa ›'));
      });

      await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Erro ao salvar', expect.any(String)));

      // Botão deve voltar ao estado original (não "✅ Publicada") para permitir retry
      expect(screen.getByText('Publicar pesquisa ›')).toBeTruthy();
      expect(screen.queryByText('✅ Publicada')).toBeNull();
    });

    it('exibe mensagem genérica quando o erro não tem .message', async () => {
      mockCreateSurvey.mockResolvedValue({ id: 'no-msg-001' });
      mockUpsertQuestions.mockResolvedValue(true);
      // Erro do Supabase: objeto sem .message mas com .details
      mockPublishSurvey.mockRejectedValue({ details: 'Row not found', code: '404' });

      render(<CreateSurveyScreen />);
      fireEvent.changeText(
        screen.getByPlaceholderText(/Satisfação com o produto/i),
        'Pesquisa Supabase Error'
      );

      await act(async () => {
        fireEvent.press(screen.getByText('Publicar pesquisa ›'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Erro ao salvar',
          expect.stringMatching(/Row not found|possível salvar/i)
        );
      });
    });
  });
});

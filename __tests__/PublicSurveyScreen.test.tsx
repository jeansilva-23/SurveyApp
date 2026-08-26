/**
 * Testes de componente para PublicSurveyScreen
 *
 * Mockamos: @react-navigation/native, @tanstack/react-query,
 *           surveyService, authStore
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Profile } from '../src/types/database.types';

// ---- Mocks de navegação ----
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { slug: 'pesquisa-abc12' } }),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

// ---- Mock do React Query ----
const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

// ---- Mock do surveyService ----
const mockSubmitResponse = jest.fn();
jest.mock('../src/services/surveyService', () => ({
  getSurveyBySlug: jest.fn(),
  submitResponse: (...args: any[]) => mockSubmitResponse(...args),
}));

// ---- Mock do authStore ----
let mockProfile: Profile | null = null;
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (selector: any) =>
    selector({ profile: mockProfile, session: null, isLoading: false }),
}));

// ---- Mock do tema ----
jest.mock('../src/theme', () => ({
  useTheme: () => ({
    c: {
      background: '#fff', primary: '#2D8653', primaryDark: '#1B5E42',
      textPrimary: '#1A1A1A', textSecondary: '#666', accent: '#34A85A',
      accentLight: '#E8F5E9', card: '#fff', border: '#E0E0E0',
      inputBg: '#F5F5F5', surface: '#fff', error: '#D32F2F',
      warning: '#F57C00', success: '#388E3C',
    },
    mode: 'light',
  }),
}));

// ---- Mock de componentes nativos problemáticos ----
jest.mock('../src/components/common/Mascot', () => ({
  ParakeetMascot: () => null,
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const mock = (name: string) => (props: any) => React.createElement(name, props);
  return { Svg: mock('svg'), Circle: mock('circle'), Path: mock('path'), Ellipse: mock('ellipse'), Rect: mock('rect'), G: mock('g') };
});

// ---- Import do componente ----
import { PublicSurveyScreen } from '../src/screens/respond/PublicSurveyScreen';

// ---- Fixtures ----
const makeSurvey = (overrides: Partial<any> = {}) => ({
  id: 'survey-123',
  title: 'Pesquisa de Satisfação',
  description: 'Avalie nosso serviço',
  is_anonymous: false,
  require_identification: false,
  allow_public_access: true,
  public_slug: 'pesquisa-abc12',
  survey_questions: [
    {
      id: 'q1',
      title: 'Como avalia nosso atendimento?',
      type: 'escala',
      required: true,
      options: null,
      order: 1,
    },
    {
      id: 'q2',
      title: 'Deixe um comentário',
      type: 'texto_curto',
      required: false,
      options: null,
      order: 2,
    },
  ],
  ...overrides,
});

// ---- Setup ----
beforeEach(() => {
  jest.clearAllMocks();
  mockProfile = null;
  Alert.alert = jest.fn();
});

// ─────────────────────────────────────────────────
// TESTES
// ─────────────────────────────────────────────────

describe('PublicSurveyScreen — estado de carregamento', () => {
  it('exibe "Carregando pesquisa..." enquanto a query não resolveu', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });

    render(<PublicSurveyScreen />);

    expect(screen.getByText('Carregando pesquisa...')).toBeTruthy();
  });

  it('exibe "Pesquisa não encontrada" quando a pesquisa não existe', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false });

    render(<PublicSurveyScreen />);

    expect(screen.getByText('Pesquisa não encontrada')).toBeTruthy();
  });
});

describe('PublicSurveyScreen — pesquisa anônima (is_anonymous=true)', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: makeSurvey({ is_anonymous: true }),
      isLoading: false,
    });
  });

  it('exibe o título da pesquisa', () => {
    render(<PublicSurveyScreen />);
    expect(screen.getByText('Pesquisa de Satisfação')).toBeTruthy();
  });

  it('NÃO exibe o card de identificação', () => {
    render(<PublicSurveyScreen />);
    expect(screen.queryByText(/Identificação/)).toBeNull();
  });

  it('exibe todas as perguntas', () => {
    render(<PublicSurveyScreen />);
    expect(screen.getByText('Como avalia nosso atendimento?')).toBeTruthy();
    expect(screen.getByText('Deixe um comentário')).toBeTruthy();
  });

  it('exibe o botão de envio', () => {
    render(<PublicSurveyScreen />);
    expect(screen.getByText('Enviar respostas')).toBeTruthy();
  });

  it('ao enviar, chama submitResponse com respondentId=null e sem nome/email', async () => {
    mockSubmitResponse.mockResolvedValue({ id: 'resp-1' });
    render(<PublicSurveyScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Enviar respostas'));
    });

    expect(mockSubmitResponse).toHaveBeenCalledWith(
      'survey-123',
      expect.any(Array),
      null,       // respondentId — null para anônimo
      undefined,  // name — undefined
      undefined,  // email — undefined
      'web'
    );
  });
});

describe('PublicSurveyScreen — identificação obrigatória (require_identification=true)', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: makeSurvey({ require_identification: true, is_anonymous: false }),
      isLoading: false,
    });
  });

  it('exibe o card de identificação obrigatória', () => {
    render(<PublicSurveyScreen />);
    expect(screen.getByText('Identificação')).toBeTruthy();
    expect(screen.getByText('Informe seus dados para continuar.')).toBeTruthy();
  });

  it('exibe as perguntas junto com o formulário de identificação', () => {
    render(<PublicSurveyScreen />);
    expect(screen.getByText('Como avalia nosso atendimento?')).toBeTruthy();
  });

  it('bloqueia envio e exibe alerta se o nome estiver vazio', async () => {
    render(<PublicSurveyScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Enviar respostas'));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Campo obrigatório',
      'Por favor, informe seu nome antes de enviar.'
    );
    expect(mockSubmitResponse).not.toHaveBeenCalled();
  });

  it('permite envio quando o nome é preenchido', async () => {
    mockSubmitResponse.mockResolvedValue({ id: 'resp-1' });
    render(<PublicSurveyScreen />);

    const nameInput = screen.getByPlaceholderText('Seu nome');
    fireEvent.changeText(nameInput, 'Maria Souza');

    await act(async () => {
      fireEvent.press(screen.getByText('Enviar respostas'));
    });

    expect(mockSubmitResponse).toHaveBeenCalledWith(
      'survey-123',
      expect.any(Array),
      null,
      'Maria Souza',
      undefined,    // email em branco (não preenchido resulta em undefined no form hook ou na extração)
      'web'
    );
  });
});

describe('PublicSurveyScreen — identificação opcional (padrão)', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: makeSurvey({ is_anonymous: false, require_identification: false }),
      isLoading: false,
    });
  });

  it('exibe o card de identificação como opcional', () => {
    render(<PublicSurveyScreen />);
    expect(screen.getByText('Identificação (opcional)')).toBeTruthy();
    expect(screen.getByText('Informe seus dados ou deixe em branco para responder anonimamente.')).toBeTruthy();
  });

  it('permite enviar sem preencher nome (identificação opcional)', async () => {
    mockSubmitResponse.mockResolvedValue({ id: 'resp-1' });
    render(<PublicSurveyScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Enviar respostas'));
    });

    // Não deve exibir alerta de campo obrigatório
    expect(Alert.alert).not.toHaveBeenCalledWith('Campo obrigatório', expect.any(String));
    expect(mockSubmitResponse).toHaveBeenCalled();
  });
});

describe('PublicSurveyScreen — usuário logado (profile presente)', () => {
  beforeEach(() => {
    mockProfile = { id: 'user-1', full_name: 'Admin User', email: 'admin@app.com', role: 'admin' };
    mockUseQuery.mockReturnValue({
      data: makeSurvey({ is_anonymous: false, require_identification: true }),
      isLoading: false,
    });
  });

  it('NÃO exibe card de identificação quando há perfil logado', () => {
    render(<PublicSurveyScreen />);
    // Usuário logado → identificação já vem do perfil
    expect(screen.queryByPlaceholderText('Seu nome')).toBeNull();
  });
});

describe('PublicSurveyScreen — tela de confirmação', () => {
  it('exibe mensagem de sucesso após envio bem-sucedido', async () => {
    mockUseQuery.mockReturnValue({
      data: makeSurvey({ is_anonymous: true }),
      isLoading: false,
    });
    mockSubmitResponse.mockResolvedValue({ id: 'resp-1' });

    render(<PublicSurveyScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Enviar respostas'));
    });

    expect(await screen.findByText(/Obrigado pela sua resposta/)).toBeTruthy();
  });

  it('exibe alerta de erro se o envio falhar', async () => {
    mockUseQuery.mockReturnValue({
      data: makeSurvey({ is_anonymous: true }),
      isLoading: false,
    });
    mockSubmitResponse.mockRejectedValue(new Error('Erro de rede'));

    render(<PublicSurveyScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Enviar respostas'));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Erro ao enviar',
      'Erro de rede'
    );
  });
});

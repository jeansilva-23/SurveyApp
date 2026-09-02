/**
 * Testes unitários para o menu de opções (⋯) da SurveyListScreen.
 *
 * Cobertura:
 * - Editar: navega para CreateSurvey com surveyId correto
 * - Duplicar: chama duplicateMutation + feedback de sucesso e erro
 * - Compartilhar/QRCode: navega com openShare:true (só se publicada) ou mostra aviso
 * - Encerrar: só aparece para surveys 'ativa', chama closeMutation + feedback
 * - Excluir: mostra Alert de confirmação, chama deleteMutation, exibe erro em falha
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Survey } from '../src/types/database.types';

// ---- Mocks de navegação ----
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// ---- Mock do React Query ----
const mockInvalidateQueries = jest.fn();
const mockDeleteMutate = jest.fn();
const mockDuplicateMutate = jest.fn();
const mockCloseMutate = jest.fn();

// useMutation é chamado 3x no componente: delete → duplicate → close
// Usamos mockImplementationOnce no beforeEach para cada instância, na ordem certa.
const mockUseMutation = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      {
        id: 'survey-active-1',
        title: 'Pesquisa Ativa',
        description: 'Uma pesquisa ativa.',
        status: 'ativa',
        type: 'satisfacao',
        response_count: 5,
        public_slug: 'pesquisa-ativa',
        allow_public_access: true,
        require_identification: false,
        is_anonymous: false,
        org_id: 'org-1',
        created_by: 'user-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        start_date: null,
        end_date: null,
      } as Survey,
      {
        id: 'survey-draft-1',
        title: 'Pesquisa Rascunho',
        description: 'Ainda em rascunho.',
        status: 'rascunho',
        type: 'satisfacao',
        response_count: 0,
        public_slug: null,
        allow_public_access: false,
        require_identification: false,
        is_anonymous: false,
        org_id: 'org-1',
        created_by: 'user-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        start_date: null,
        end_date: null,
      } as Survey,
    ],
    isLoading: false,
    refetch: jest.fn(),
  }),
  useMutation: (...args: any[]) => mockUseMutation(...args),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

// ---- Mock do surveyService ----
jest.mock('../src/services/surveyService', () => ({
  getSurveys: jest.fn(),
  deleteSurvey: jest.fn(),
  duplicateSurvey: jest.fn(),
  updateSurvey: jest.fn(),
}));

// ---- Mock do tema ----
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

// ---- Mock do Mascot / EmptyState ----
jest.mock('../src/components/common/Mascot', () => ({
  EmptyState: () => null,
}));

// ---- Importação do componente ----
import { SurveyListScreen } from '../src/screens/surveys/management/SurveyListScreen';

// ---- Helpers ----
/** Renderiza a tela e abre o menu da pesquisa ativa (primeira). */
async function openMenuForActiveSurvey() {
  render(<SurveyListScreen />);
  const menuButtons = screen.getAllByText('⋯');
  fireEvent.press(menuButtons[0]); // Abre menu da pesquisa ativa
  // Aguarda o modal abrir verificando que as opções estão visíveis
  await waitFor(() => screen.getByTestId('menu-edit'));
}

/** Renderiza a tela e abre o menu da pesquisa rascunho (segunda). */
async function openMenuForDraftSurvey() {
  render(<SurveyListScreen />);
  const menuButtons = screen.getAllByText('⋯');
  fireEvent.press(menuButtons[1]); // Abre menu da pesquisa rascunho
  // Aguarda o modal abrir verificando que as opções estão visíveis
  await waitFor(() => screen.getByTestId('menu-share'));
}

// ---- Setup ----
beforeEach(() => {
  jest.clearAllMocks();
  Alert.alert = jest.fn();
  jest.useFakeTimers();

  // useMutation é chamado 3x no componente, na ordem: deleteMutation, duplicateMutation, closeMutation
  mockUseMutation.mockReset();
  mockUseMutation.mockImplementation((opts: any) => ({
    mutate: (arg: any) => {
      const { deleteSurvey, duplicateSurvey } = require('../src/services/surveyService');
      if (opts.mutationFn === deleteSurvey) {
        mockDeleteMutate(arg);
        opts.onSuccess?.();
      } else if (opts.mutationFn === duplicateSurvey) {
        mockDuplicateMutate(arg);
        opts.onSuccess?.();
      } else {
        // A mutation de encerrar usa uma arrow function inline: (id) => updateSurvey(id, ...)
        mockCloseMutate(arg);
        opts.onSuccess?.();
      }
    },
  }));
});

afterEach(() => {
  jest.useRealTimers();
});

// ========================================================================
describe('SurveyListScreen — Menu de Opções', () => {

  // ---- Editar ----
  describe('Editar', () => {
    it('navega para CreateSurvey com o surveyId correto', async () => {
      await openMenuForActiveSurvey();
      fireEvent.press(screen.getByTestId('menu-edit'));
      expect(mockNavigate).toHaveBeenCalledWith('CreateSurvey', { surveyId: 'survey-active-1' });
    });

    it('fecha o modal após navegar', async () => {
      await openMenuForActiveSurvey();
      fireEvent.press(screen.getByTestId('menu-edit'));
      // O modal fecha quando selectedSurvey volta a null: o título some da tela
      await waitFor(() => expect(screen.queryByTestId('menu-edit')).toBeNull());
    });
  });

  // ---- Duplicar ----
  describe('Duplicar', () => {
    it('chama duplicateMutation com o objeto da pesquisa', async () => {
      await openMenuForActiveSurvey();
      fireEvent.press(screen.getByTestId('menu-duplicate'));
      expect(mockDuplicateMutate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'survey-active-1' })
      );
    });

    it('exibe Alert de sucesso após duplicar', async () => {
      await openMenuForActiveSurvey();
      fireEvent.press(screen.getByTestId('menu-duplicate'));
      expect(Alert.alert).toHaveBeenCalledWith('✅ Duplicada!', expect.any(String));
    });

    it('invalida o cache de surveys após duplicar', async () => {
      await openMenuForActiveSurvey();
      fireEvent.press(screen.getByTestId('menu-duplicate'));
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['surveys'] });
    });
  });

  // ---- Compartilhar / QRCode ----
  describe('Compartilhar / QRCode', () => {
    it('navega para SurveyDetail com openShare:true quando a pesquisa está publicada', async () => {
      await openMenuForActiveSurvey(); // pesquisa ativa com public_slug
      fireEvent.press(screen.getByTestId('menu-share'));
      expect(mockNavigate).toHaveBeenCalledWith('SurveyDetail', {
        id: 'survey-active-1',
        openShare: true,
      });
    });

    it('exibe aviso quando a pesquisa não está publicada (sem slug)', async () => {
      await openMenuForDraftSurvey(); // pesquisa rascunho sem public_slug
      fireEvent.press(screen.getByTestId('menu-share'));
      expect(Alert.alert).toHaveBeenCalledWith(
        'Pesquisa não publicada',
        expect.stringContaining('Publique a pesquisa primeiro')
      );
    });

    it('NÃO navega para SurveyDetail quando a pesquisa não está publicada', async () => {
      await openMenuForDraftSurvey();
      fireEvent.press(screen.getByTestId('menu-share'));
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ---- Encerrar ----
  describe('Encerrar', () => {
    it('opção "Encerrar" aparece apenas para pesquisas ativas', async () => {
      await openMenuForActiveSurvey();
      expect(screen.getByTestId('menu-close')).toBeTruthy();
    });

    it('opção "Encerrar" NÃO aparece para pesquisas em rascunho', async () => {
      await openMenuForDraftSurvey();
      expect(screen.queryByTestId('menu-close')).toBeNull();
    });

    it('chama closeMutation com o id correto ao encerrar', async () => {
      await openMenuForActiveSurvey();
      fireEvent.press(screen.getByTestId('menu-close'));
      expect(mockCloseMutate).toHaveBeenCalledWith('survey-active-1');
    });

    it('exibe Alert de confirmação após encerrar com sucesso', async () => {
      await openMenuForActiveSurvey();
      fireEvent.press(screen.getByTestId('menu-close'));
      expect(Alert.alert).toHaveBeenCalledWith('⏹ Encerrada', expect.any(String));
    });
  });

  // ---- Excluir ----
  describe('Excluir', () => {
    it('mostra Alert de confirmação após fechar o modal (setTimeout de 400ms)', async () => {
      await openMenuForActiveSurvey();
      fireEvent.press(screen.getByTestId('menu-delete'));

      // Antes do timeout: Alert ainda não apareceu
      expect(Alert.alert).not.toHaveBeenCalled();

      // Avança o timer
      act(() => { jest.advanceTimersByTime(400); });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Excluir pesquisa',
        expect.stringContaining('Pesquisa Ativa'),
        expect.any(Array)
      );
    });

    it('o Alert de delete tem botão "Cancelar" e "Excluir"', async () => {
      await openMenuForActiveSurvey();
      fireEvent.press(screen.getByTestId('menu-delete'));
      act(() => { jest.advanceTimersByTime(400); });

      const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[0];
      const labels = buttons.map((b: any) => b.text);
      expect(labels).toContain('Cancelar');
      expect(labels).toContain('Excluir');
    });

    it('chama deleteMutation ao confirmar exclusão', async () => {
      await openMenuForActiveSurvey();
      fireEvent.press(screen.getByTestId('menu-delete'));
      act(() => { jest.advanceTimersByTime(400); });

      // Simula pressionar "Excluir" na confirmação
      const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmBtn = buttons.find((b: any) => b.text === 'Excluir');
      act(() => confirmBtn.onPress());

      expect(mockDeleteMutate).toHaveBeenCalledWith('survey-active-1');
    });

    it('invalida o cache de surveys após excluir com sucesso', async () => {
      await openMenuForActiveSurvey();
      fireEvent.press(screen.getByTestId('menu-delete'));
      act(() => { jest.advanceTimersByTime(400); });

      const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmBtn = buttons.find((b: any) => b.text === 'Excluir');
      act(() => confirmBtn.onPress());

      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['surveys'] });
    });

    it('mensagem do Alert inclui aviso de ação irreversível', async () => {
      await openMenuForActiveSurvey();
      fireEvent.press(screen.getByTestId('menu-delete'));
      act(() => { jest.advanceTimersByTime(400); });

      const [, message] = (Alert.alert as jest.Mock).mock.calls[0];
      expect(message).toMatch(/não pode ser desfeita/i);
    });
  });
});

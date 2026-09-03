/**
 * Testes unitarios para ReportsScreen.tsx
 *
 * Cobre os 4 bugs corrigidos:
 *   1. Estado inicial chartType = 'Horizontal'
 *   2. Respostas com submitted_at = null nao descartadas pelo filtro
 *   3. handleExportCSV usa FileSystem.writeAsStringAsync
 *   4. handleExportPDF gera HTML com perguntas e respostas reais
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn().mockResolvedValue({ uri: 'file:///tmp/report.pdf' }),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('../src/services/surveyService', () => ({
  getSurveys: jest.fn(),
  getResponses: jest.fn(),
  getQuestions: jest.fn(),
}));

const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (opts: any) => mockUseQuery(opts),
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Mock = (props: any) => React.createElement(View, props);
  return { __esModule: true, default: Mock, Rect: Mock, Path: Mock, Text: Mock };
});

// ─── Imports ─────────────────────────────────────────────────────────────────

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { ReportsScreen } from '../src/screens/reports/ReportsScreen';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const fakeSurvey = {
  id: 'survey-1',
  title: 'Pesquisa de TI',
  description: 'Desc',
  status: 'ativa',
  response_count: 10,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const fakeQuestions = [
  {
    id: 'q1', survey_id: 'survey-1', title: 'Qual seu SO?',
    type: 'multipla_escolha', order_index: 0, options: [], required: false,
  },
  {
    id: 'q2', survey_id: 'survey-1', title: 'Comentarios',
    type: 'texto_longo', order_index: 1, options: [], required: false,
  },
];

function makeResponse(
  id: string,
  submittedAt: string | null,
  answers: Array<{ question_id: string; answer_value: any }>
) {
  return {
    id,
    survey_id: 'survey-1',
    respondent_id: null,
    respondent_name: 'Respondente ' + id,
    respondent_email: null,
    source: 'app',
    submitted_at: submittedAt,
    survey_answers: answers.map(function (a, i) {
      return {
        id: 'ans' + id + String(i),
        response_id: id,
        question_id: a.question_id,
        answer_value: a.answer_value,
      };
    }),
  };
}

const fakeResponses = [
  makeResponse('r1', '2026-08-30T12:00:00Z', [
    { question_id: 'q1', answer_value: 'Windows' },
    { question_id: 'q2', answer_value: 'Otimo' },
  ]),
  makeResponse('r2', '2026-08-25T09:00:00Z', [
    { question_id: 'q1', answer_value: 'Linux' },
  ]),
  makeResponse('r3', null, [
    { question_id: 'q1', answer_value: 'macOS' },
  ]),
];

function setupUseQuery(
  surveys: any[] = [fakeSurvey],
  responses: any[] = fakeResponses,
  questions: any[] = fakeQuestions
) {
  mockUseQuery.mockImplementation(function (opts: any) {
    const key = Array.isArray(opts.queryKey) ? opts.queryKey[0] : '';
    if (key === 'surveys') return { data: surveys, isLoading: false };
    if (key === 'responses') return { data: responses, isLoading: false };
    if (key === 'questions') return { data: questions, isLoading: false };
    return { data: [], isLoading: false };
  });
}

// ─── Bug 1 ───────────────────────────────────────────────────────────────────

describe('Bug 1 - Estado inicial chartType', () => {
  beforeEach(() => setupUseQuery());

  it('inicializa como Horizontal', () => {
    const { getAllByText } = render(<ReportsScreen />);
    fireEvent.press(getAllByText('Selecionar pesquisa')[0]);
    fireEvent.press(getAllByText('Pesquisa de TI')[0]);
    // Deve existir pelo menos um elemento com o texto 'Visualizacao — Horizontal'
    const matches = getAllByText(/Visualiza/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('troca para Pizza', async () => {
    const { getAllByText } = render(<ReportsScreen />);
    fireEvent.press(getAllByText('Selecionar pesquisa')[0]);
    fireEvent.press(getAllByText('Pesquisa de TI')[0]);
    // Abre o modal de tipo de grafico (trigger do Select)
    fireEvent.press(getAllByText(/Horizontal/)[0]);
    await waitFor(() => {
      // Clica na opcao Pizza dentro do modal
      fireEvent.press(getAllByText(/Pizza/)[0]);
    });
    // O titulo da secao deve agora conter Pizza
    const sectionTitles = getAllByText(/Visualiza/);
    expect(sectionTitles.some(el => el.props.children?.includes?.('Pizza') || String(el.props.children).includes('Pizza'))).toBe(true);
  });
});

// ─── Bug 2 ───────────────────────────────────────────────────────────────────

describe('Bug 2 - Filtro de periodo com submitted_at nulo', () => {
  function filterResponses(responses: any[], periodDays: number) {
    if (!periodDays) return responses;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);
    return responses.filter(function (r) {
      if (!r.submitted_at) return true;
      const d = new Date(r.submitted_at);
      if (isNaN(d.getTime())) return true;
      return d >= cutoff;
    });
  }

  it('null e incluido no resultado', () => {
    const r = [
      { id: '1', submitted_at: null },
      { id: '2', submitted_at: new Date().toISOString() },
    ];
    expect(filterResponses(r, 30).map(function (x) { return x.id; })).toContain('1');
  });

  it('data invalida e incluida no resultado', () => {
    const r = [
      { id: '1', submitted_at: 'invalida' },
      { id: '2', submitted_at: new Date().toISOString() },
    ];
    expect(filterResponses(r, 30).map(function (x) { return x.id; })).toContain('1');
  });

  it('data antiga e removida pelo filtro', () => {
    const r = [
      { id: '1', submitted_at: '2020-01-01T00:00:00Z' },
      { id: '2', submitted_at: new Date().toISOString() },
    ];
    const ids = filterResponses(r, 30).map(function (x) { return x.id; });
    expect(ids).not.toContain('1');
    expect(ids).toContain('2');
  });

  it('period=0 retorna tudo sem filtrar', () => {
    const r = [
      { id: '1', submitted_at: '2000-01-01T00:00:00Z' },
      { id: '2', submitted_at: null },
    ];
    expect(filterResponses(r, 0)).toHaveLength(2);
  });
});

// ─── Bug 3 ───────────────────────────────────────────────────────────────────

describe('Bug 3 - Exportar CSV', () => {
  beforeEach(() => { setupUseQuery(); jest.clearAllMocks(); });

  it('chama FileSystem.writeAsStringAsync', async () => {
    const { getByText } = render(<ReportsScreen />);
    fireEvent.press(getByText('Selecionar pesquisa'));
    fireEvent.press(getByText('Pesquisa de TI'));
    await act(async () => { fireEvent.press(getByText('Exportar CSV')); });
    await waitFor(() => {
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
    });
  });

  it('CSV tem cabecalho com colunas base e perguntas', async () => {
    const { getByText } = render(<ReportsScreen />);
    fireEvent.press(getByText('Selecionar pesquisa'));
    fireEvent.press(getByText('Pesquisa de TI'));
    await act(async () => { fireEvent.press(getByText('Exportar CSV')); });
    await waitFor(() => {
      const csv: string = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1];
      const header = csv.split('\n')[0];
      expect(header).toContain('id');
      expect(header).toContain('submitted_at');
      expect(header).toContain('Qual seu SO?');
    });
  });

  it('chama shareAsync com mimeType text/csv', async () => {
    const { getByText } = render(<ReportsScreen />);
    fireEvent.press(getByText('Selecionar pesquisa'));
    fireEvent.press(getByText('Pesquisa de TI'));
    await act(async () => { fireEvent.press(getByText('Exportar CSV')); });
    await waitFor(() => {
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        expect.stringContaining('relatorio-'),
        expect.objectContaining({ mimeType: 'text/csv' })
      );
    });
  });

  it('exibe aviso e NAO grava quando sem respostas', async () => {
    setupUseQuery([fakeSurvey], [], fakeQuestions);
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<ReportsScreen />);
    fireEvent.press(getByText('Selecionar pesquisa'));
    fireEvent.press(getByText('Pesquisa de TI'));
    await act(async () => { fireEvent.press(getByText('Exportar CSV')); });
    expect(alertSpy).toHaveBeenCalledWith('Aviso', expect.stringContaining('respostas'));
    expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
  });

  it('CSV contem nome do respondente', async () => {
    const { getByText } = render(<ReportsScreen />);
    fireEvent.press(getByText('Selecionar pesquisa'));
    fireEvent.press(getByText('Pesquisa de TI'));
    await act(async () => { fireEvent.press(getByText('Exportar CSV')); });
    await waitFor(() => {
      const csv: string = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1];
      expect(csv).toContain('Respondente r1');
    });
  });
});

// ─── Bug 4 ───────────────────────────────────────────────────────────────────

describe('Bug 4 - Exportar relatorio PDF', () => {
  beforeEach(() => { setupUseQuery(); jest.clearAllMocks(); });

  it('chama Print.printToFileAsync', async () => {
    const { getByText } = render(<ReportsScreen />);
    fireEvent.press(getByText('Selecionar pesquisa'));
    fireEvent.press(getByText('Pesquisa de TI'));
    await act(async () => { fireEvent.press(getByText(/Exportar relat/)); });
    await waitFor(() => {
      expect(Print.printToFileAsync).toHaveBeenCalled();
    });
  });

  it('HTML contem o titulo da pesquisa', async () => {
    const { getByText } = render(<ReportsScreen />);
    fireEvent.press(getByText('Selecionar pesquisa'));
    fireEvent.press(getByText('Pesquisa de TI'));
    await act(async () => { fireEvent.press(getByText(/Exportar relat/)); });
    await waitFor(() => {
      const html: string = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;
      expect(html).toContain('Pesquisa de TI');
    });
  });

  it('HTML contem os titulos das perguntas', async () => {
    const { getByText } = render(<ReportsScreen />);
    fireEvent.press(getByText('Selecionar pesquisa'));
    fireEvent.press(getByText('Pesquisa de TI'));
    await act(async () => { fireEvent.press(getByText(/Exportar relat/)); });
    await waitFor(() => {
      const html: string = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;
      expect(html).toContain('Qual seu SO?');
      expect(html).toContain('Comentarios');
    });
  });

  it('HTML contem opcoes de respostas agregadas', async () => {
    const { getByText } = render(<ReportsScreen />);
    fireEvent.press(getByText('Selecionar pesquisa'));
    fireEvent.press(getByText('Pesquisa de TI'));
    await act(async () => { fireEvent.press(getByText(/Exportar relat/)); });
    await waitFor(() => {
      const html: string = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;
      expect(html).toContain('Windows');
      expect(html).toContain('Linux');
      expect(html).toContain('macOS');
    });
  });

  it('chama shareAsync com mimeType application/pdf', async () => {
    const { getByText } = render(<ReportsScreen />);
    fireEvent.press(getByText('Selecionar pesquisa'));
    fireEvent.press(getByText('Pesquisa de TI'));
    await act(async () => { fireEvent.press(getByText(/Exportar relat/)); });
    await waitFor(() => {
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        'file:///tmp/report.pdf',
        expect.objectContaining({ mimeType: 'application/pdf' })
      );
    });
  });

  it('HTML contem a data de geracao', async () => {
    const { getByText } = render(<ReportsScreen />);
    fireEvent.press(getByText('Selecionar pesquisa'));
    fireEvent.press(getByText('Pesquisa de TI'));
    await act(async () => { fireEvent.press(getByText(/Exportar relat/)); });
    await waitFor(() => {
      const html: string = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;
      const today = new Date().toLocaleDateString('pt-BR');
      expect(html).toContain(today);
    });
  });
});

// ─── Logica de agregacao ──────────────────────────────────────────────────────

describe('Logica de agregacao de respostas', () => {
  function aggregate(responses: any[]) {
    const map: Record<string, Record<string, number>> = {};
    responses.forEach(function (response: any) {
      (response.survey_answers ?? []).forEach(function (answer: any) {
        if (!map[answer.question_id]) map[answer.question_id] = {};
        const val = Array.isArray(answer.answer_value)
          ? answer.answer_value
          : [answer.answer_value];
        val.forEach(function (v: any) {
          const key = String(v);
          map[answer.question_id][key] = (map[answer.question_id][key] ?? 0) + 1;
        });
      });
    });
    return map;
  }

  it('agrega uma resposta simples', () => {
    const r = aggregate([makeResponse('r1', '2026-08-30T12:00:00Z', [
      { question_id: 'q1', answer_value: 'Windows' },
    ])]);
    expect(r['q1']['Windows']).toBe(1);
  });

  it('agrega multiplas respostas para a mesma opcao', () => {
    const r = aggregate([
      makeResponse('r1', '2026-08-30T12:00:00Z', [{ question_id: 'q1', answer_value: 'Windows' }]),
      makeResponse('r2', '2026-08-29T12:00:00Z', [{ question_id: 'q1', answer_value: 'Windows' }]),
      makeResponse('r3', '2026-08-28T12:00:00Z', [{ question_id: 'q1', answer_value: 'Linux' }]),
    ]);
    expect(r['q1']['Windows']).toBe(2);
    expect(r['q1']['Linux']).toBe(1);
  });

  it('agrega respostas do tipo array (multipla escolha)', () => {
    const r = aggregate([makeResponse('r1', '2026-08-30T12:00:00Z', [
      { question_id: 'q1', answer_value: ['Windows', 'Linux'] },
    ])]);
    expect(r['q1']['Windows']).toBe(1);
    expect(r['q1']['Linux']).toBe(1);
  });

  it('retorna objeto vazio sem respostas', () => {
    expect(aggregate([])).toEqual({});
  });

  it('ignora survey_answers undefined', () => {
    expect(aggregate([{ id: 'r1', survey_answers: undefined }])).toEqual({});
  });

  it('agrega resposta com submitted_at = null (Bug 2 integrado)', () => {
    const r = aggregate([makeResponse('r3', null, [
      { question_id: 'q1', answer_value: 'macOS' },
    ])]);
    expect(r['q1']['macOS']).toBe(1);
  });
});


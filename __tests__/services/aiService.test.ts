/**
 * Testes unitários para aiService.ts
 *
 * Estratégia: mockar o expo-document-picker, expo-file-system e
 * o fetch global para testar toda a lógica sem chamadas reais de rede.
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { pickFileAndGenerateSurvey } from '../../src/services/aiService';

// ---- Mock do fetch global ----
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ---- Fixtures ----
const fakeAISurveyResult = {
  title: 'Pesquisa sobre Trabalho Remoto',
  description: 'Pesquisa para coletar opiniões sobre o modelo de trabalho remoto.',
  questions: [
    {
      type: 'unica_escolha',
      title: 'Qual modelo de trabalho você prefere?',
      required: true,
      options: ['Totalmente remoto', 'Híbrido', 'Presencial'],
    },
    {
      type: 'escala',
      title: 'Como você avalia sua produtividade trabalhando remotamente?',
      required: true,
      options: [],
    },
    {
      type: 'texto_longo',
      title: 'Quais os maiores desafios do trabalho remoto para você?',
      required: true,
      options: [],
    },
  ],
};

const fakeFileAsset = {
  uri: 'file:///tmp/documento.pdf',
  name: 'documento.pdf',
  mimeType: 'application/pdf',
  size: 1024 * 100, // 100 KB
};

// ---- Helpers ----

const mockPickerSuccess = () => {
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
    canceled: false,
    assets: [fakeFileAsset],
  });
};

const mockFetchSuccess = () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ success: true, data: fakeAISurveyResult }),
  });
};

// ---- Setup ----
beforeEach(() => {
  jest.clearAllMocks();
});

// ---- Testes ----
describe('pickFileAndGenerateSurvey', () => {
  it('retorna null quando o usuário cancela o seletor de arquivos', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: true,
      assets: [],
    });

    const result = await pickFileAndGenerateSurvey();

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('retorna o resultado da IA corretamente em caso de sucesso', async () => {
    mockPickerSuccess();
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce('base64FakeContent');
    mockFetchSuccess();

    const result = await pickFileAndGenerateSurvey();

    expect(result).not.toBeNull();
    expect(result?.title).toBe('Pesquisa sobre Trabalho Remoto');
    expect(result?.questions).toHaveLength(3);
    expect(result?.questions[0].type).toBe('unica_escolha');
    expect(result?.questions[1].type).toBe('escala');
    expect(result?.questions[2].type).toBe('texto_longo');
  });

  it('envia o payload correto para a Edge Function', async () => {
    mockPickerSuccess();
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce('meuBase64Aqui');
    mockFetchSuccess();

    await pickFileAndGenerateSurvey();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];

    expect(url).toContain('/api/generate-survey');
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body);
    expect(body.fileBase64).toBe('meuBase64Aqui');
    expect(body.mimeType).toBe('application/pdf');
    expect(body.fileName).toBe('documento.pdf');
  });

  it('lança erro quando o arquivo excede o tamanho máximo (5 MB)', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ ...fakeFileAsset, size: 6 * 1024 * 1024 }], // 6 MB
    });

    await expect(pickFileAndGenerateSurvey()).rejects.toThrow(/muito grande/i);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('lança erro quando o tipo de arquivo não é suportado', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ ...fakeFileAsset, mimeType: 'application/vnd.ms-excel', name: 'planilha.xlsx' }],
    });

    await expect(pickFileAndGenerateSurvey()).rejects.toThrow(/formato não suportado/i);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('lança erro quando a Edge Function retorna um erro de servidor', async () => {
    mockPickerSuccess();
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce('base64Content');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: 'Arquivo muito grande para processamento.' }),
    });

    await expect(pickFileAndGenerateSurvey()).rejects.toThrow('Arquivo muito grande para processamento.');
  });

  it('lança erro de rede quando o fetch falha', async () => {
    mockPickerSuccess();
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce('base64Content');
    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(pickFileAndGenerateSurvey()).rejects.toThrow(/conectar ao servidor/i);
  });

  it('lança erro quando a leitura do arquivo falha', async () => {
    mockPickerSuccess();
    (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValueOnce(new Error('Permission denied'));

    await expect(pickFileAndGenerateSurvey()).rejects.toThrow(/ler o arquivo/i);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

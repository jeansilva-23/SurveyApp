/**
 * Testes unitários para a lógica de modo de identidade
 * (CreateSurveyScreen — handleIdentityMode + currentIdentityMode)
 *
 * Testamos a lógica pura derivada dos valores do formulário,
 * sem precisar montar o componente inteiro.
 */

// ---- Lógica extraída do componente (testável isoladamente) ----

type IdentityMode = 'anonimo' | 'opcional' | 'obrigatorio';

interface FormValues {
  is_anonymous: boolean;
  require_identification: boolean;
}

/** Deriva o modo de identidade a partir dos dois campos do formulário */
function getIdentityMode(values: FormValues): IdentityMode {
  if (values.is_anonymous) return 'anonimo';
  if (values.require_identification) return 'obrigatorio';
  return 'opcional';
}

/** Retorna os valores de formulário correspondentes ao modo selecionado */
function identityModeToFormValues(mode: IdentityMode): FormValues {
  switch (mode) {
    case 'anonimo':
      return { is_anonymous: true, require_identification: false };
    case 'obrigatorio':
      return { is_anonymous: false, require_identification: true };
    case 'opcional':
    default:
      return { is_anonymous: false, require_identification: false };
  }
}

// ---- Testes ----

describe('getIdentityMode', () => {
  it('retorna "anonimo" quando is_anonymous=true, independente de require_identification', () => {
    expect(getIdentityMode({ is_anonymous: true, require_identification: false })).toBe('anonimo');
    // is_anonymous tem precedência
    expect(getIdentityMode({ is_anonymous: true, require_identification: true })).toBe('anonimo');
  });

  it('retorna "obrigatorio" quando is_anonymous=false e require_identification=true', () => {
    expect(getIdentityMode({ is_anonymous: false, require_identification: true })).toBe('obrigatorio');
  });

  it('retorna "opcional" quando ambos são false (padrão)', () => {
    expect(getIdentityMode({ is_anonymous: false, require_identification: false })).toBe('opcional');
  });
});

describe('identityModeToFormValues', () => {
  it('modo "anonimo" define is_anonymous=true e require_identification=false', () => {
    const values = identityModeToFormValues('anonimo');
    expect(values.is_anonymous).toBe(true);
    expect(values.require_identification).toBe(false);
  });

  it('modo "opcional" define ambos como false', () => {
    const values = identityModeToFormValues('opcional');
    expect(values.is_anonymous).toBe(false);
    expect(values.require_identification).toBe(false);
  });

  it('modo "obrigatorio" define is_anonymous=false e require_identification=true', () => {
    const values = identityModeToFormValues('obrigatorio');
    expect(values.is_anonymous).toBe(false);
    expect(values.require_identification).toBe(true);
  });
});

describe('invariante: modos são mutuamente exclusivos', () => {
  const allModes: IdentityMode[] = ['anonimo', 'opcional', 'obrigatorio'];

  it('cada modo gera valores que, quando re-derivados, retornam o mesmo modo', () => {
    for (const mode of allModes) {
      const values = identityModeToFormValues(mode);
      const derived = getIdentityMode(values);
      expect(derived).toBe(mode);
    }
  });

  it('nunca gera is_anonymous=true E require_identification=true ao mesmo tempo', () => {
    for (const mode of allModes) {
      const values = identityModeToFormValues(mode);
      expect(values.is_anonymous && values.require_identification).toBe(false);
    }
  });
});

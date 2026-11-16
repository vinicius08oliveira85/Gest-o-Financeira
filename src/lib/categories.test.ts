import { describe, it, expect } from 'vitest';
import {
  addCategoryToList,
  MAX_CATEGORY_LENGTH,
  mergeCategoryOptions,
  normalizeCategoryName,
  removeCategoryFromList,
  renameCategoryInList,
} from './categories';

describe('normalizeCategoryName', () => {
  it('apara, colapsa espaços e limita o tamanho', () => {
    expect(normalizeCategoryName('  Mercado   do bairro  ')).toBe('Mercado do bairro');
    expect(normalizeCategoryName('x'.repeat(80))).toHaveLength(MAX_CATEGORY_LENGTH);
    expect(normalizeCategoryName('   ')).toBe('');
  });
});

describe('mergeCategoryOptions', () => {
  it('junta salvas e derivadas sem repetir (ignorando maiúsculas) e ordena', () => {
    const merged = mergeCategoryOptions(['Mercado', 'Transporte'], ['mercado', 'Saúde', '']);
    expect(merged).toEqual(['Mercado', 'Saúde', 'Transporte']);
  });

  it('mantém a grafia da lista salva quando as duas têm o mesmo nome', () => {
    expect(mergeCategoryOptions(['Alimentação'], ['alimentação'])).toEqual(['Alimentação']);
  });
});

describe('addCategoryToList', () => {
  it('adiciona e ordena', () => {
    const result = addCategoryToList(['Transporte'], ' Mercado ');
    expect(result.error).toBeNull();
    expect(result.list).toEqual(['Mercado', 'Transporte']);
  });

  it('recusa vazio e duplicata', () => {
    expect(addCategoryToList([], '  ').error).toBe('empty');
    expect(addCategoryToList(['Mercado'], 'mercado').error).toBe('duplicate');
  });

  it('não altera a lista original', () => {
    const original = ['Mercado'];
    const result = addCategoryToList(original, 'Saúde');
    expect(original).toEqual(['Mercado']);
    expect(result.list).not.toBe(original);
  });
});

describe('renameCategoryInList', () => {
  it('renomeia mantendo a posição alfabética', () => {
    const result = renameCategoryInList(['Mercado', 'Transporte'], 'mercado', 'Feira');
    expect(result.error).toBeNull();
    expect(result.list).toEqual(['Feira', 'Transporte']);
  });

  it('guarda o novo nome quando a categoria só existia nos lançamentos', () => {
    const result = renameCategoryInList(['Saúde'], 'Moradia', 'Casa');
    expect(result.error).toBeNull();
    expect(result.list).toEqual(['Casa', 'Saúde']);
  });

  it('recusa nome vazio, igual e duplicado', () => {
    expect(renameCategoryInList(['Mercado'], 'Mercado', '  ').error).toBe('empty');
    expect(renameCategoryInList(['Mercado'], 'Mercado', 'MERCADO').error).toBe('unchanged');
    expect(renameCategoryInList(['Mercado', 'Saúde'], 'Mercado', 'saúde').error).toBe('duplicate');
  });
});

describe('removeCategoryFromList', () => {
  it('remove ignorando maiúsculas', () => {
    expect(removeCategoryFromList(['Mercado', 'Saúde'], 'mercado')).toEqual(['Saúde']);
  });

  it('não falha quando a categoria não existe', () => {
    expect(removeCategoryFromList(['Mercado'], 'Nada')).toEqual(['Mercado']);
  });
});

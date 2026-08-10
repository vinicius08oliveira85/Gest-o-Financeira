import { describe, it, expect, vi } from 'vitest';
import { formatCurrency, formatDate, escapeCsvCell, exportEntriesToCSV } from './format';
import type { Entry } from '../types';

describe('formatCurrency', () => {
  it('formata zero como R$ 0,00', () => {
    expect(formatCurrency(0)).toMatch(/R\$\s*0,00/);
  });

  it('formata valor positivo com decimais', () => {
    expect(formatCurrency(1234.56)).toMatch(/R\$\s*1\.234,56/);
  });

  it('formata valor negativo', () => {
    expect(formatCurrency(-100)).toMatch(/-|R\$/);
  });

  it('formata inteiro sem decimais visíveis como ,00', () => {
    const result = formatCurrency(50);
    expect(result).toContain('50');
    expect(result).toMatch(/R\$/);
  });
});

describe('formatDate', () => {
  it('formata string YYYY-MM-DD para DD/MM/YYYY', () => {
    expect(formatDate('2025-03-16')).toBe('16/03/2025');
  });

  it('formata data com um dígito no mês/dia quando aplicável', () => {
    expect(formatDate('2025-01-05')).toBe('05/01/2025');
  });
});

describe('escapeCsvCell', () => {
  it('mantém números negativos como números (não prefixa aspas)', () => {
    expect(escapeCsvCell(-500)).toBe('-500');
    expect(escapeCsvCell('-123.45')).toBe('-123.45');
  });

  it('sanitiza valores que iniciam com - mas não são números (possível fórmula)', () => {
    expect(escapeCsvCell('-2+3')).toBe("'-2+3");
    expect(escapeCsvCell('-SOMA(A1)')).toBe("'-SOMA(A1)");
  });

  it('sanitiza =, +, @, tab e CR no início', () => {
    expect(escapeCsvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(escapeCsvCell('+CAT')).toBe("'+CAT");
    expect(escapeCsvCell('@user')).toBe("'@user");
    expect(escapeCsvCell('\tTAB')).toBe("'\tTAB");
    expect(escapeCsvCell('\rCR')).toBe("'\rCR");
  });
});

describe('exportEntriesToCSV', () => {
  it('não faz nada quando entries está vazio', () => {
    const blobSpy = vi.spyOn(global, 'Blob');
    exportEntriesToCSV([]);
    expect(blobSpy).not.toHaveBeenCalled();
    blobSpy.mockRestore();
  });

  it('gera CSV com headers e uma linha para uma entrada', () => {
    let capturedParts: BlobPart[] = [];
    const RealBlob = global.Blob;
    vi.spyOn(global, 'Blob').mockImplementation((parts?: BlobPart[], opts?: BlobPropertyBag) => {
      capturedParts = parts ? [...parts] : [];
      return new RealBlob(parts ?? [], opts);
    });
    const entry: Entry = {
      id: '1',
      name: 'Aluguel',
      amount: 1500,
      dueDate: '2025-03-10',
      isPaid: false,
      type: 'debt',
      createdAt: Date.now(),
    };

    exportEntriesToCSV([entry]);

    expect(capturedParts.length).toBeGreaterThan(0);
    const csvContent = String(capturedParts[0]);
    expect(csvContent).toContain('Tipo');
    expect(csvContent).toContain('Nome');
    expect(csvContent).toContain('Valor');
    expect(csvContent).toContain('Vencimento');
    expect(csvContent).toContain('Status');
    expect(csvContent).toContain('Data Pgto');
    expect(csvContent).toContain('Categoria');
    expect(csvContent).toContain('Tag');
    expect(csvContent).toContain('Parcelas');
    expect(csvContent).toContain('Saída');
    expect(csvContent).toContain('Aluguel');
    expect(csvContent).toContain('1500');
    expect(csvContent).toContain('2025-03-10');
    expect(csvContent).toContain('Pendente');

    vi.restoreAllMocks();
  });

  it('prefixa BOM UTF-8 para o Excel ler acentos', () => {
    let capturedParts: BlobPart[] = [];
    const RealBlob = global.Blob;
    vi.spyOn(global, 'Blob').mockImplementation((parts?: BlobPart[], opts?: BlobPropertyBag) => {
      capturedParts = parts ? [...parts] : [];
      return new RealBlob(parts ?? [], opts);
    });
    const entry: Entry = {
      id: '1',
      name: 'Saída',
      amount: 10,
      dueDate: '2025-03-10',
      isPaid: false,
      type: 'debt',
      createdAt: Date.now(),
    };

    exportEntriesToCSV([entry]);

    const csvContent = String(capturedParts[0]);
    expect(csvContent.startsWith('\uFEFF')).toBe(true);

    vi.restoreAllMocks();
  });

  it('sanitiza células que começam com caracteres de fórmula', () => {
    let capturedParts: BlobPart[] = [];
    const RealBlob = global.Blob;
    vi.spyOn(global, 'Blob').mockImplementation((parts?: BlobPart[], opts?: BlobPropertyBag) => {
      capturedParts = parts ? [...parts] : [];
      return new RealBlob(parts ?? [], opts);
    });
    const entry: Entry = {
      id: '1',
      name: '=SUM(A1:A10)',
      amount: 100,
      dueDate: '2025-03-10',
      isPaid: false,
      type: 'debt',
      createdAt: Date.now(),
      category: '+CAT',
      tag: '@user',
    };

    exportEntriesToCSV([entry]);

    const csvContent = String(capturedParts[0]);
    expect(csvContent).toContain(`'=SUM(A1:A10)`);
    expect(csvContent).toContain(`'+CAT`);
    expect(csvContent).toContain(`'@user`);

    vi.restoreAllMocks();
  });
});

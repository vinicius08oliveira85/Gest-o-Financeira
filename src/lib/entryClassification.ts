import type { Entry } from '../types';

/**
 * Classificação única de entrada/saída de um lançamento.
 *
 * O `type` cru não basta para lançamentos de meta: depositar na meta
 * (cash + goalId) tira dinheiro do caixa, então conta como SAÍDA; sacar
 * (debt + goalId) devolve dinheiro ao caixa e conta como ENTRADA.
 *
 * Antes essa inversão existia só nos totais e no calendário — a lista de
 * lançamentos mostrava depósito com "+" verde e saque com "−" vermelho, e os
 * filtros "Entradas"/"Saídas" classificavam pelo `type`. Resultado: o mesmo
 * lançamento aparecia como entrada na lista e como saída no Resumo.
 */
export function isEntryInflow(entry: Entry): boolean {
  return entry.goalId ? entry.type === 'debt' : entry.type === 'cash';
}

export function isEntryOutflow(entry: Entry): boolean {
  return !isEntryInflow(entry);
}

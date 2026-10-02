/**
 * Recuperação de dados locais contra respostas da nuvem.
 *
 * O espelho local (IndexedDB/localStorage) é a única cópia de registros que ainda
 * não chegaram ao servidor. Regra do projeto:
 *
 * - Caminho limpo (nuvem respondeu e nada local ficou de fora): a nuvem manda.
 *   É isso que propaga exclusões feitas em outros dispositivos para este dispositivo.
 * - Caminho de recuperação/migração (há ids locais que o servidor não devolveu, ou
 *   o push falhou): a união é mantida, e o que o servidor recusou continua no espelho
 *   para ser reenviado no próximo save — nada é descartado em silêncio.
 */

export interface Identifiable {
  id: string;
}

/** Ids do espelho local que a resposta do servidor não trouxe de volta. */
export function unconfirmedIds<T extends Identifiable>(local: T[], cloud: T[]): string[] {
  const cloudIds = new Set(cloud.map((item) => item.id));
  return local.filter((item) => !cloudIds.has(item.id)).map((item) => item.id);
}

/**
 * Une o espelho local com a resposta do servidor preservando os itens locais que o
 * servidor não confirmou. Sem duplicatas: a versão do servidor tem precedência
 * para ids presentes nos dois lados.
 *
 * Só use em migração/recuperação — nunca no caminho limpo de hydrate, ou uma meta
 * excluída em outro dispositivo voltaria para sempre.
 */
export function mergeUnconfirmed<T extends Identifiable>(cloud: T[], local: T[]): T[] {
  if (local.length === 0) return cloud;
  const cloudIds = new Set(cloud.map((item) => item.id));
  const kept = local.filter((item) => !cloudIds.has(item.id));
  return kept.length === 0 ? cloud : [...kept, ...cloud];
}

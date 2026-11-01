# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Toast de sucesso ao salvar lançamento e ao salvar meta ("Lançamento salvo" / "Meta salva").
- Estado vazio na lista de lançamentos com CTA "Adicionar primeiro lançamento".
- Skeleton de carregamento no card de metas quando `isLoadingGoals` é true.
- Testes unitários: useGoals, useAlerts, useFocusTrap e integração do App.
- Constante `ALERT_CONCENTRATION_RATIO` (0.35) em constants para regra de alerta de concentração.
- Lazy loading para ChangePasswordModal e ConfirmDeleteModal.
- Documentação da ordem recomendada das migrações Supabase no README.
- Testes E2E com Playwright (auth, criar lançamento, salvar meta).
- Prettier para formatação de código (scripts `format` e `format:check`).
- Husky + lint-staged para formatação automática em pre-commit.

### Changed

- EntryList: `onEdit` aceita parâmetro opcional para abrir formulário de novo lançamento.
- Labels acessíveis (id + htmlFor) em ModalForm, ChangePasswordModal e GoalModal.
- App.test.tsx: uso de `findByText` assíncrono para evitar warning de "suspended resource".

### Fixed

- **Valores com milhar salvos errados**: a máscara agrupa milhares com ponto
  ("1234" → "1.234") e o parser lia o ponto como decimal — digitar 1234 salvava
  R$ 1,234. Pontos em grupos de 3 dígitos agora são separadores de milhar.
- **Parcelas com soma diferente do total**: cada parcela era `total / count`
  (3x de R$ 100 virava 3× R$ 33,33). Agora o resto de centavos fica na primeira
  parcela e a soma fecha exatamente com o valor informado.
- **Lançamento parcelado** passa a usar o valor informado como TOTAL (igual ao
  gasto de cartão) e mostra a prévia de quanto cai em cada parcela.
- **Recorrências apagadas voltando após reload**: a migration para IndexedDB
  descartava listas de strings (recorrências suprimidas e alertas dispensados) e
  removia a chave original. A chave só é removida quando todos os itens migram.
- Fatura registrada de novo reescrevia a `createdAt` do lançamento já existente.
- Adicionar/editar gasto de cartão sem retorno visual e com promise rejeitada
  não tratada quando a gravação falhava (agora mostra toast de sucesso/erro).
- Abrir "Novo Registro" após editar um lançamento pago herdava a data de
  pagamento anterior.
- Nome dos CSVs usava a data UTC (podia sair com o dia anterior à noite).
- Faturas do cartão não se atualizavam ao mudar o dia de fechamento/vencimento
  (memo com dependências faltando).
- Warning de act() em testes do App ao aguardar resolução de componentes lazy.
- **Lançamentos sumindo da lista**: o hydrate lia o IndexedDB antes da migração
  `localStorage` → IndexedDB terminar e recebia só parte dos registros; o autosave
  então gravava a lista truncada. Toda leitura/escrita agora espera a inicialização,
  e a migração grava cada store em uma única transação.
- `fetchEntries` pagina a leitura do Supabase (o PostgREST corta em 1000 linhas):
  contas grandes deixavam de ver lançamentos mais antigos.
- Layout mobile: abas (Cartões ficava fora da tela), filtros, card de saldo e tabela
  da evolução mensal não estouram mais a largura da tela.
- Alertas: botão de dispensar voltou para a direita do texto.
- Mês no cabeçalho exibia "Out. De 2026" (capitalização por palavra).
- Estados vazios de metas e cartões duplicavam título e CTA.
- Lista longa: o atraso da animação por item escondia os últimos registros por segundos.
- Lista vazia por filtro agora mostra "Nenhum registro encontrado" com "Limpar filtros".
- Conteúdo não fica mais escondido atrás do botão flutuante no fim da página.
- E2E de metas navega até a aba Metas antes de clicar em "Criar meta".

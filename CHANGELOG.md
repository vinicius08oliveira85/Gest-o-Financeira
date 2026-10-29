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

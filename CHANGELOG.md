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

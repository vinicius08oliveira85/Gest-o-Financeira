export const UNLOCK_KEY = 'gestao-financeira-unlocked';
export const ENTRIES_STORAGE_KEY = 'personal-debts';
export const GOALS_STORAGE_KEY = 'gestao-financeira-goals';
export const ONBOARDING_STORAGE_KEY = 'gestao-financeira-onboarding';
export const PASSWORD_STORAGE_KEY = 'gestao-financeira-pw';
export const DISMISSED_ALERTS_KEY = 'gestao-financeira-dismissed-alerts';

/** Limiar (0–1) acima do qual uma categoria de saídas gera alerta de concentração. */
export const ALERT_CONCENTRATION_RATIO = 0.35;

/** Dias antes da data alvo da meta para exibir alerta de prazo. */
export const GOAL_DEADLINE_ALERT_DAYS = 7;

export const CARDS_STORAGE_KEY = 'gestao-financeira-cards';
export const CARD_EXPENSES_STORAGE_KEY = 'gestao-financeira-card-expenses';

/** Limiar (0–1) acima do qual o uso do limite do cartão gera alerta. */
export const CARD_LIMIT_ALERT_RATIO = 0.8;

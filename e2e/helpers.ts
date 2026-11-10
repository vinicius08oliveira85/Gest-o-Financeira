import { type Page } from '@playwright/test';

/**
 * Abre o app. Não há mais tela de senha: espera "Fluxo de Caixa" aparecer.
 */
export async function unlockApp(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByText(/fluxo de caixa/i).waitFor({ state: 'visible', timeout: 10000 });
}

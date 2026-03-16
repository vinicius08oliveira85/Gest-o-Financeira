import { type Page } from '@playwright/test';

/** Senha usada nos testes E2E (mínimo 4 caracteres). Não usar em produção. */
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'e2e-test-pw-1234';

/**
 * Desbloqueia o app: se for primeira vez preenche e confirma senha;
 * se já tiver senha preenche e submete login. Espera "Fluxo de Caixa" aparecer.
 */
export async function unlockApp(page: Page, password: string = E2E_PASSWORD): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const cadastrar = page.getByRole('button', { name: /cadastrar e entrar/i });
  const entrar = page.getByRole('button', { name: /^entrar$/i });

  if (await cadastrar.isVisible()) {
    await page.getByPlaceholder(/mínimo 4 caracteres/i).fill(password);
    await page.getByPlaceholder(/repita a senha/i).fill(password);
    await cadastrar.click();
  } else if (await entrar.isVisible()) {
    await page.getByPlaceholder(/digite sua senha/i).fill(password);
    await entrar.click();
  }

  await page.getByText(/fluxo de caixa/i).waitFor({ state: 'visible', timeout: 10000 });
}

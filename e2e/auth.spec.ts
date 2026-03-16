import { test, expect } from '@playwright/test';
import { E2E_PASSWORD, unlockApp } from './helpers';

test.describe('Auth / desbloqueio', () => {
  test('primeira vez: ao definir senha vai para tela principal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /cadastrar e entrar/i })).toBeVisible();
    await page.getByPlaceholder(/mínimo 4 caracteres/i).fill(E2E_PASSWORD);
    await page.getByPlaceholder(/repita a senha/i).fill(E2E_PASSWORD);
    await page.getByRole('button', { name: /cadastrar e entrar/i }).click();

    await expect(page.getByText(/fluxo de caixa/i)).toBeVisible({ timeout: 10000 });
  });

  test('com senha definida: ao informar senha correta vai para tela principal', async ({
    page,
    context,
  }) => {
    await unlockApp(page);
    await expect(page.getByText(/fluxo de caixa/i)).toBeVisible();

    await context.clearCookies();
    await page.evaluate(() => sessionStorage.removeItem('gestao-financeira-unlocked'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /^entrar$/i })).toBeVisible();
    await page.getByPlaceholder(/digite sua senha/i).fill(E2E_PASSWORD);
    await page.getByRole('button', { name: /^entrar$/i }).click();

    await expect(page.getByText(/fluxo de caixa/i)).toBeVisible({ timeout: 10000 });
  });
});

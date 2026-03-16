import { test, expect } from '@playwright/test';
import { unlockApp } from './helpers';

test.describe('Salvar meta', () => {
  test.beforeEach(async ({ page }) => {
    await unlockApp(page);
  });

  test('abre modal de meta, preenche e salva; exibe toast Meta salva', async ({ page }) => {
    await page
      .getByRole('button', { name: /criar meta|editar meta/i })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: /nova meta|editar meta/i })).toBeVisible();

    await page.getByLabel(/nome da meta/i).fill('E2E Meta Teste');
    await page.getByLabel(/valor alvo \(r\$\)/i).fill('500');
    await page.getByRole('button', { name: /salvar meta/i }).click();

    await expect(page.getByText('Meta salva')).toBeVisible({ timeout: 5000 });
  });
});

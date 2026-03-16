import { test, expect } from '@playwright/test';
import { unlockApp } from './helpers';

test.describe('Criar lançamento', () => {
  test.beforeEach(async ({ page }) => {
    await unlockApp(page);
  });

  test('abre modal, preenche e salva; exibe toast Lançamento salvo', async ({ page }) => {
    await page.getByRole('button', { name: /novo registro/i }).click();
    await expect(page.getByRole('heading', { name: /novo registro/i })).toBeVisible();

    await page.getByLabel(/nome do registro/i).fill('E2E Entrada Teste');
    await page.getByLabel(/valor \(r\$\)/i).fill('100');
    await page.getByLabel(/^data$/i).fill('2025-12-15');
    await page.getByRole('button', { name: /^entrada$/i }).click();
    await page.getByRole('button', { name: /salvar entrada/i }).click();

    await expect(page.getByText('Lançamento salvo')).toBeVisible({ timeout: 5000 });
  });
});

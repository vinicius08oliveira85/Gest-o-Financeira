import { Client, Databases } from 'appwrite';
import { logWarn } from './logger';

/**
 * Conexão com o Appwrite (backend de sincronização).
 *
 * As três variáveis são públicas (podem ir no bundle): o endpoint, o id do
 * projeto e o id do banco. Credenciais de servidor (API key) nunca entram no
 * app — elas só são usadas pelo script `scripts/setup-appwrite.mjs`.
 */
const endpoint = (import.meta.env.VITE_APPWRITE_ENDPOINT ?? '').replace(/\/$/, '');
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID ?? '';

export const APPWRITE_DATABASE_ID =
  import.meta.env.VITE_APPWRITE_DATABASE_ID || 'gestao_financeira';

/** Ids das coleções criadas por `npm run setup:appwrite`. */
export const COLLECTIONS = {
  entries: 'entries',
  goals: 'goals',
  creditCards: 'credit_cards',
  cardExpenses: 'card_expenses',
  loans: 'loans',
  wishlistItems: 'wishlist_items',
} as const;

export type CollectionId = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

const configured = Boolean(endpoint && projectId);

if (!configured) {
  logWarn(
    'Appwrite não configurado: defina VITE_APPWRITE_ENDPOINT e VITE_APPWRITE_PROJECT_ID em .env.local. Os dados usarão apenas o armazenamento local até então.'
  );
}

export const appwriteClient: Client | null = configured
  ? new Client().setEndpoint(endpoint).setProject(projectId)
  : null;

export const databases: Databases | null = appwriteClient ? new Databases(appwriteClient) : null;

export const isCloudConfigured = () => databases !== null;

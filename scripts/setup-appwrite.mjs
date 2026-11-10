#!/usr/bin/env node
/**
 * Cria (ou atualiza) o banco, as coleções, os atributos e os índices usados pelo
 * app no Appwrite. É idempotente: rodar de novo não duplica nada.
 *
 * Uso:
 *   APPWRITE_API_KEY=<chave> npm run setup:appwrite
 *
 * Variáveis (as VITE_* podem vir do .env.local):
 *   APPWRITE_ENDPOINT / VITE_APPWRITE_ENDPOINT   (padrão https://cloud.appwrite.io/v1)
 *   APPWRITE_PROJECT_ID / VITE_APPWRITE_PROJECT_ID
 *   APPWRITE_DATABASE_ID / VITE_APPWRITE_DATABASE_ID (padrão gestao_financeira)
 *   APPWRITE_API_KEY  (obrigatória; crie em Console > Overview > Integrations > API keys)
 *
 * A chave precisa dos escopos de databases, collections, attributes, indexes e documents.
 * Ela nunca é gravada no projeto: fica só no ambiente (Secrets do projeto/shell).
 */
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';

function readEnvLocal() {
  if (!existsSync('.env.local')) return {};
  const env = {};
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const localEnv = readEnvLocal();
const pick = (...names) => names.map((n) => process.env[n] || localEnv[n]).find(Boolean);

const endpoint = (pick('APPWRITE_ENDPOINT', 'VITE_APPWRITE_ENDPOINT') || '').replace(/\/$/, '');
const projectId = pick('APPWRITE_PROJECT_ID', 'VITE_APPWRITE_PROJECT_ID');
const databaseId = pick('APPWRITE_DATABASE_ID', 'VITE_APPWRITE_DATABASE_ID') || 'gestao_financeira';
const apiKey = process.env.APPWRITE_API_KEY;

if (!endpoint || !projectId) {
  console.error(
    'Defina APPWRITE_ENDPOINT e APPWRITE_PROJECT_ID (ou as VITE_APPWRITE_* no .env.local).'
  );
  process.exit(1);
}
if (!apiKey) {
  console.error(
    'Defina APPWRITE_API_KEY no ambiente. Crie a chave em Appwrite Console > Overview > Integrations > API keys\n' +
      'com os escopos de databases, collections, attributes, indexes e documents.'
  );
  process.exit(1);
}

const headers = {
  'X-Appwrite-Project': projectId,
  'X-Appwrite-Key': apiKey,
  'Content-Type': 'application/json',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(method, path, body) {
  for (let attempt = 1; ; attempt += 1) {
    const res = await fetch(`${endpoint}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (res.ok) return json;

    // O Appwrite/Cloudflare devolve HTML em 429/5xx; vale a pena tentar de novo.
    if ((res.status === 429 || res.status >= 500) && attempt <= 5) {
      await sleep(600 * attempt);
      continue;
    }

    const detail =
      json?.message || text.slice(0, 160).replace(/\s+/g, ' ').trim() || res.statusText;
    const error = new Error(`${method} ${path} → ${res.status} ${detail}`);
    error.status = res.status;
    error.type = json?.type;
    throw error;
  }
}

/** Ignora "já existe" para o script poder rodar quantas vezes quiser. */
async function createOrIgnore(label, fn) {
  try {
    await fn();
    console.log(`  + ${label}`);
  } catch (error) {
    if (error.status === 409) {
      console.log(`  = ${label} (já existe)`);
      return;
    }
    throw error;
  }
}

const str = (key, size = 255, required = false, def = null) => ({
  type: 'string',
  key,
  size,
  required,
  default: def,
});
const integer = (key, required = false, def = null) => ({
  type: 'integer',
  key,
  required,
  default: def,
});
const double = (key, required = false, def = null) => ({
  type: 'double',
  key,
  required,
  default: def,
});
const bool = (key, required = false, def = null) => ({
  type: 'boolean',
  key,
  required,
  default: def,
});
const datetime = (key, required = true) => ({ type: 'datetime', key, required, default: null });

const anyPermissions = ['create("any")', 'read("any")', 'update("any")', 'delete("any")'];

const collections = [
  {
    id: 'entries',
    name: 'Lançamentos',
    attributes: [
      str('name', 255, true),
      double('amount', true),
      str('due_date', 10, true),
      bool('is_paid', true),
      str('type', 16, true),
      datetime('created_at'),
      str('category', 120),
      str('tag', 120),
      integer('installments_count'),
      integer('installment_number'),
      str('parent_installment_id', 64),
      bool('is_recurring'),
      integer('recurrence_count'),
      str('recurrence_template_id', 64),
      str('goal_id', 64),
      str('paid_date', 10),
      str('card_id', 64),
      bool('is_card_invoice'),
      str('invoice_payment_due_date', 10),
      datetime('updated_at', false),
      integer('revision', false, 0),
    ],
    indexes: [
      { key: 'idx_created_at', attributes: ['created_at'], orders: ['ASC'] },
      { key: 'idx_due_date', attributes: ['due_date'], orders: ['ASC'] },
      { key: 'idx_goal_id', attributes: ['goal_id'], orders: ['ASC'] },
    ],
  },
  {
    id: 'goals',
    name: 'Metas',
    attributes: [
      str('name', 255, true),
      double('target_amount', true),
      double('current_amount', true, 0),
      str('category', 120),
      str('target_date', 10),
      datetime('created_at'),
    ],
    indexes: [{ key: 'idx_created_at', attributes: ['created_at'], orders: ['ASC'] }],
  },
  {
    id: 'credit_cards',
    name: 'Cartões de crédito',
    attributes: [
      str('name', 255, true),
      double('limit_amount', true),
      integer('closing_day', true),
      integer('due_day', true),
      str('color', 32),
      datetime('created_at'),
    ],
    indexes: [{ key: 'idx_created_at', attributes: ['created_at'], orders: ['ASC'] }],
  },
  {
    id: 'card_expenses',
    name: 'Gastos de cartão',
    attributes: [
      str('card_id', 64, true),
      str('name', 255, true),
      double('amount', true),
      str('date', 10, true),
      integer('billing_month', true),
      integer('billing_year', true),
      str('category', 120),
      str('tag', 120),
      integer('installments_count'),
      integer('installment_number'),
      str('parent_installment_id', 64),
      datetime('created_at'),
    ],
    indexes: [
      { key: 'idx_card_id', attributes: ['card_id'], orders: ['ASC'] },
      { key: 'idx_date', attributes: ['date'], orders: ['ASC'] },
    ],
  },
  {
    id: 'loans',
    name: 'Empréstimos',
    attributes: [
      str('name', 255, true),
      double('amount', true),
      str('source_type', 32, true),
      str('source_name', 160),
      str('due_date', 10, true),
      bool('paid', true, false),
      str('discount_start', 7),
      str('discount_end', 7),
      integer('installments_count'),
      // Parcelas e quitação em JSON (texto): o Appwrite não tem atributo jsonb.
      str('installments', 65535),
      str('settlement', 4000),
      datetime('created_at'),
    ],
    indexes: [{ key: 'idx_created_at', attributes: ['created_at'], orders: ['ASC'] }],
  },
  {
    id: 'wishlist_items',
    name: 'Lista de desejos',
    attributes: [
      str('name', 255, true),
      double('amount', true),
      str('url', 2048),
      bool('purchased', true, false),
      str('purchased_at', 10),
      str('entry_id', 64),
      datetime('created_at'),
    ],
    indexes: [{ key: 'idx_created_at', attributes: ['created_at'], orders: ['ASC'] }],
  },
];

/**
 * O Appwrite responde 403 (limite do plano) antes de checar duplicidade quando o
 * banco já existe, então consultamos antes de tentar criar.
 */
async function ensureDatabase() {
  console.log(`Banco "${databaseId}"`);
  try {
    await api('GET', `/databases/${databaseId}`);
    console.log('  = database (já existe)');
    return;
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  await createOrIgnore('database', () =>
    api('POST', '/databases', { databaseId, name: 'Gestão Financeira' })
  );
}

async function waitForAttribute(collectionId, key, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const attribute = await api(
      'GET',
      `/databases/${databaseId}/collections/${collectionId}/attributes/${key}`
    );
    if (attribute?.status === 'available') return;
    if (attribute?.status === 'failed') {
      throw new Error(
        `Atributo ${collectionId}.${key} falhou: ${attribute.error || 'erro desconhecido'}`
      );
    }
    await sleep(400);
  }
  throw new Error(`Atributo ${collectionId}.${key} não ficou disponível a tempo.`);
}

/** Cria o atributo se ainda não existir e espera ele ficar disponível. */
async function ensureAttribute(collectionId, attribute) {
  const { type, required = false, default: def = null, ...rest } = attribute;
  // O Appwrite expõe o atributo double na rota /attributes/float.
  const route = type === 'double' ? 'float' : type;
  // O Appwrite recusa default em atributo obrigatório; nos obrigatórios o app
  // sempre envia o valor, então o default só faz sentido nos opcionais.
  const body = required ? { ...rest, required } : { ...rest, required, default: def };
  const label = `atributo ${collectionId}.${attribute.key} (${type})`;
  try {
    await api(
      'GET',
      `/databases/${databaseId}/collections/${collectionId}/attributes/${attribute.key}`
    );
    console.log(`  = ${label} (já existe)`);
  } catch (error) {
    if (error.status !== 404) throw error;
    await createOrIgnore(label, () =>
      api('POST', `/databases/${databaseId}/collections/${collectionId}/attributes/${route}`, body)
    );
  }
  await waitForAttribute(collectionId, attribute.key);
}

/** Cria o índice se ainda não existir. */
async function ensureIndex(collectionId, index) {
  const label = `índice ${collectionId}.${index.key}`;
  try {
    await api('GET', `/databases/${databaseId}/collections/${collectionId}/indexes/${index.key}`);
    console.log(`  = ${label} (já existe)`);
    return;
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  await createOrIgnore(label, () =>
    api('POST', `/databases/${databaseId}/collections/${collectionId}/indexes`, {
      key: index.key,
      type: 'key',
      attributes: index.attributes,
      orders: index.orders,
    })
  );
}

async function ensureCollection(collection) {
  console.log(`Coleção "${collection.id}"`);
  await createOrIgnore(`collection ${collection.id}`, () =>
    api('POST', `/databases/${databaseId}/collections`, {
      collectionId: collection.id,
      name: collection.name,
      permissions: anyPermissions,
      documentSecurity: false,
      enabled: true,
    })
  );

  for (const attribute of collection.attributes) {
    await ensureAttribute(collection.id, attribute);
  }

  for (const index of collection.indexes) {
    await ensureIndex(collection.id, index);
  }
}

async function main() {
  console.log(`Endpoint ${endpoint} · projeto ${projectId}`);
  await ensureDatabase();
  for (const collection of collections) {
    await ensureCollection(collection);
  }
  console.log('\nTudo pronto. Coleções: ' + collections.map((c) => c.id).join(', '));
}

main().catch((error) => {
  console.error(`\nFalhou: ${error.message}`);
  process.exit(1);
});

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Gestão Financeira

App de controle de fluxo de caixa: lançamentos de entradas e saídas por mês, metas, alertas e exportação em CSV. Proteção por senha local e suporte a Supabase para sincronização; quando o Supabase não está configurado, os dados ficam apenas no dispositivo (localStorage). Disponível como PWA para instalação no celular.

**Funcionalidades:** entradas e saídas com categorias e tags; filtros por mês e categoria; metas por mês; alertas (concentração de gastos, vencimentos próximos); parcelamento de lançamentos; visualização em lista ou calendário; export CSV; proteção por senha; sincronização opcional com Supabase.

---

# Run and deploy your AI Studio app

This contains everything you need to run your app locally. Stack: React, Vite, Tailwind CSS, Supabase (opcional).

View your app in AI Studio: https://ai.studio/apps/6b1a159b-4885-4319-bd7b-bc9c90bc5ea8

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. (Opcional) Para sincronizar dados com Supabase: execute as migrações em `supabase/migrations/` no SQL Editor **nesta ordem**:
   - `20250306000000_create_entries_table.sql` — cria a tabela `entries`
   - `add_missing_fields.sql` ou `20250316000003_entries_optional_columns_snake.sql` — colunas opcionais em `entries`
   - `20250309000000_entries_rls_policies.sql` — políticas RLS para `entries`
   - `20250316000000_create_goals_table.sql` — cria a tabela `goals`
   - `20250316000001_goals_rls_policies.sql` — políticas RLS para `goals`
   - `20250316000002_insert_entries_batch_rpc.sql` — função RPC para inserção em lote de lançamentos
     No Dashboard do Supabase, ative **Realtime** para a tabela `entries` (Database > Replication); opcionalmente, ative também para `goals`. Defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em `.env.local`. As variáveis estão listadas em [.env.example](.env.example).
3. Run the app:
   `npm run dev`

## Scripts

| Script                 | Descrição                                               |
| ---------------------- | ------------------------------------------------------- |
| `npm run dev`          | Sobe o servidor de desenvolvimento (porta 3001).        |
| `npm run build`        | Gera o build de produção.                               |
| `npm run preview`      | Pré-visualiza o build.                                  |
| `npm run lint`         | Verifica tipos TypeScript (`tsc --noEmit`).             |
| `npm run test`         | Roda os testes em modo watch.                           |
| `npm run test:run`     | Roda os testes unitários uma vez.                       |
| `npm run test:e2e`     | Roda os testes E2E (Playwright).                        |
| `npm run test:e2e:ui`  | Abre a UI do Playwright para rodar E2E.                 |
| `npm run check`        | Executa `lint` e `test:run` (útil antes de commit).     |
| `npm run format`       | Formata o código com Prettier.                          |
| `npm run format:check` | Verifica formatação sem alterar (útil antes de commit). |

## Deploy na Vercel

Para o app persistir dados no Supabase em produção, configure as variáveis de ambiente no projeto Vercel:

1. Vercel Dashboard → seu projeto → **Settings** → **Environment Variables**.
2. Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os mesmos valores do Supabase (Project Settings > API). Atribua a Production (e Preview, se quiser).
3. Após alterar variáveis, faça um **redeploy** para o build incorporar os novos valores.

Sem essas variáveis, o app em produção usará apenas `localStorage` (dados só no dispositivo).

## Solução de problemas (Supabase)

Se o app em produção exibir **"Failed to load entries from Supabase"** e no console aparecer **net::ERR_NAME_NOT_RESOLVED** ao acessar `*.supabase.co`:

- **Causa:** o hostname do projeto Supabase não está resolvendo. No plano gratuito, projetos são **pausados** após inatividade e o subdomínio deixa de responder.
- **Correção:**
  1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard), localize o projeto e, se estiver pausado, use **Restore project**.
  2. Ou crie/use outro projeto ativo, atualize `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente da Vercel e faça **redeploy**.

## Instalar no celular (PWA)

O app é um PWA (Progressive Web App). Para instalar no celular:

1. **Android (Chrome):** Abra o site, toque no menu (⋮) → "Instalar app" ou "Adicionar à tela inicial".
2. **iOS (Safari):** Abra o site, toque no botão Compartilhar → "Adicionar à Tela de Início".

Requisitos: o site deve ser servido via **HTTPS** (em produção ou com tunnel tipo ngrok). No `npm run dev` local você pode testar em rede com `--host`; para instalar no celular use a URL do seu PC na rede (ex.: `http://192.168.x.x:3000`) — em alguns navegadores a instalação PWA pode exigir HTTPS.

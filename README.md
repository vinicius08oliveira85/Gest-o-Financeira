<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Gestão Financeira

App de controle de fluxo de caixa: lançamentos de entradas e saídas por mês, metas, alertas e exportação em CSV. Proteção por senha local e sincronização automática com Appwrite; quando o Appwrite não está configurado, os dados ficam apenas no dispositivo (localStorage). Disponível como PWA para instalação no celular.

**Funcionalidades:** entradas e saídas com categorias e tags; filtros por mês e categoria; metas por mês; alertas (concentração de gastos, vencimentos próximos); parcelamento de lançamentos; visualização em lista ou calendário; export CSV; proteção por senha; sincronização automática com Appwrite.

---

Stack: React 19, Vite, Tailwind CSS 4, TypeScript, Appwrite (opcional).

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. (Opcional) Sincronização com Appwrite:
   1. Crie um projeto no [Appwrite Console](https://cloud.appwrite.io) e copie o **Endpoint** e o **Project ID** (Overview > Settings).
   2. Crie uma **API key** em Overview > Integrations > API keys com os escopos de `databases`, `collections`, `attributes`, `indexes` e `documents`.
   3. Rode o provisionamento do banco (cria o banco `gestao_financeira`, as coleções `entries`, `goals`, `credit_cards`, `card_expenses`, `loans`, `wishlist_items`, seus atributos e índices). O script é **idempotente**:

      ```bash
      APPWRITE_API_KEY=<sua-chave> npm run setup:appwrite
      ```

      O endpoint e o projeto vêm de `APPWRITE_ENDPOINT`/`APPWRITE_PROJECT_ID` ou, se ausentes, das variáveis `VITE_APPWRITE_*` do `.env.local`. A API key é usada só nesse comando e nunca é gravada no projeto.

   4. Cadastre as origens do navegador como **plataformas web** (Overview > Integrations > Platforms > Add platform > Web, hostname sem `https://`). Sem isso o Appwrite responde `403 invalid origin` e o app fica só no modo local. O script já cadastra `localhost`; para incluir outras, use `APPWRITE_PLATFORMS` (lista separada por vírgula):

      ```bash
      APPWRITE_API_KEY=<sua-chave> APPWRITE_PLATFORMS="localhost,meuapp.vercel.app" npm run setup:appwrite
      ```

   5. Defina `VITE_APPWRITE_ENDPOINT`, `VITE_APPWRITE_PROJECT_ID` e (opcional) `VITE_APPWRITE_DATABASE_ID` em `.env.local` — veja [.env.example](.env.example).

   Com as variáveis configuradas, o app grava cada alteração automaticamente no Appwrite (cerca de 1,5 s após a última edição) e mantém um espelho local para funcionar offline. Ao voltar para o app, ele envia o que estiver pendente e busca o que mudou em outros dispositivos. O botão **Salvar** continua disponível para forçar o envio imediato; **Sincronizar** baixa o estado atual do servidor.

3. Run the app:
   `npm run dev`

## Scripts

| Script                   | Descrição                                               |
| ------------------------ | ------------------------------------------------------- |
| `npm run dev`            | Sobe o servidor de desenvolvimento (porta 3001).        |
| `npm run build`          | Gera o build de produção.                               |
| `npm run preview`        | Pré-visualiza o build.                                  |
| `npm run setup:appwrite` | Cria/atualiza plataformas, banco, coleções e índices.   |
| `npm run lint`           | Verifica tipos TypeScript (`tsc --noEmit`).             |
| `npm run test`           | Roda os testes em modo watch.                           |
| `npm run test:run`       | Roda os testes unitários uma vez.                       |
| `npm run test:e2e`       | Roda os testes E2E (Playwright).                        |
| `npm run test:e2e:ui`    | Abre a UI do Playwright para rodar E2E.                 |
| `npm run check`          | Executa `lint` e `test:run` (útil antes de commit).     |
| `npm run format`         | Formata o código com Prettier.                          |
| `npm run format:check`   | Verifica formatação sem alterar (útil antes de commit). |

## Deploy na Vercel

Para o app persistir dados no Appwrite em produção, configure as variáveis de ambiente no projeto Vercel:

1. Vercel Dashboard → seu projeto → **Settings** → **Environment Variables**.
2. Adicione `VITE_APPWRITE_ENDPOINT`, `VITE_APPWRITE_PROJECT_ID` e `VITE_APPWRITE_DATABASE_ID`.
3. Após alterar variáveis, faça um **redeploy** para o build incorporar os novos valores.

Sem essas variáveis, o app em produção usará apenas `localStorage` (dados só no dispositivo). O domínio da Vercel (e qualquer domínio próprio) também precisa estar cadastrado como plataforma web no Appwrite — veja o passo 2.4.

> **Segurança:** as coleções são criadas com permissões para o papel `any` (qualquer pessoa com o endpoint e o Project ID consegue ler e gravar), porque o app não tem login — a senha é local e não protege a nuvem. Para dados financeiros sensíveis em produção, o próximo passo é usar **Appwrite Auth** (e-mail/senha ou anonymous session) com permissões por usuário nas coleções.

## Modelo de dados (Appwrite)

Banco `gestao_financeira` (id configurável por `VITE_APPWRITE_DATABASE_ID`):

| Coleção          | Conteúdo                                                          |
| ---------------- | ----------------------------------------------------------------- |
| `entries`        | lançamentos (entradas/saídas), com recorrência, parcelas e fatura |
| `goals`          | metas e valores acumulados                                        |
| `credit_cards`   | cartões (limite, dia de fechamento/vencimento)                    |
| `card_expenses`  | compras dos cartões e a fatura a que pertencem                    |
| `loans`          | empréstimos, parcelas e quitação (JSON nos atributos de texto)    |
| `wishlist_items` | lista de desejos                                                  |

Os documentos usam o mesmo `id` do app (UUID), então o espelho local continua sendo a fonte de recuperação. O merge de sincronização é feito no cliente: cada lançamento tem `revision` (controle otimista) e `updated_at`; só são apagados na nuvem os ids removidos explicitamente pelo usuário.

## Instalar no celular (PWA)

O app é um PWA (Progressive Web App). Para instalar no celular:

1. **Android (Chrome):** Abra o site, toque no menu (⋮) → "Instalar app" ou "Adicionar à tela inicial".
2. **iOS (Safari):** Abra o site, toque no botão Compartilhar → "Adicionar à Tela de Início".

Requisitos: o site deve ser servido via **HTTPS** (em produção ou com tunnel tipo ngrok). No `npm run dev` local você pode testar em rede com `--host`; para instalar no celular use a URL do seu PC na rede (ex.: `http://192.168.x.x:3000`) — em alguns navegadores a instalação PWA pode exigir HTTPS.

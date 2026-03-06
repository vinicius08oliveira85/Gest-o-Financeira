<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/6b1a159b-4885-4319-bd7b-bc9c90bc5ea8

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. (Opcional) Para sincronizar dados com Supabase: crie a tabela `entries` no SQL Editor (use o arquivo em `supabase/migrations/`) e defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em `.env.local` (veja [.env.example](.env.example)).
4. Run the app:
   `npm run dev`

## Instalar no celular (PWA)

O app é um PWA (Progressive Web App). Para instalar no celular:

1. **Android (Chrome):** Abra o site, toque no menu (⋮) → "Instalar app" ou "Adicionar à tela inicial".
2. **iOS (Safari):** Abra o site, toque no botão Compartilhar → "Adicionar à Tela de Início".

Requisitos: o site deve ser servido via **HTTPS** (em produção ou com tunnel tipo ngrok). No `npm run dev` local você pode testar em rede com `--host`; para instalar no celular use a URL do seu PC na rede (ex.: `http://192.168.x.x:3000`) — em alguns navegadores a instalação PWA pode exigir HTTPS.

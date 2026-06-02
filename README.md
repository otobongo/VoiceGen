# VoiceGen

Turn written text into natural, expressive speech with AI voices. Built with
React + Vite + TypeScript + Tailwind, powered by Google Gemini TTS through a
secure serverless backend.

## How it works

The Gemini API key is **never** exposed to the browser. The client only talks to
this app's own API routes; those routes hold the key server-side and call Gemini.

```
Browser  ->  /api/generate-speech  ->  [server holds key]  ->  Gemini TTS
         ->  /api/enhance-script   ->  [server holds key]  ->  Gemini Flash
```

- `api/generate-speech.ts` — text-to-speech proxy (validation, rate limiting, retry).
- `api/enhance-script.ts` — AI "auto-direct" that adds natural pacing/expression.
- `api/_shared/` — voice/persona model, prosody preprocessing, rate limiter, client factory.
- `src/` — the React studio UI (editor, voice picker, controls, player, take history).

## Run locally

**Prerequisite:** Node.js 18+.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Add your Gemini API key to `.env.local` (gitignored):
   ```
   GEMINI_API_KEY=your_key_here
   ```
   Get a key at https://aistudio.google.com/apikey
3. Start the dev server:
   ```bash
   npm run dev
   ```
   A single process serves the UI and runs the `/api` functions locally (via a
   Vite middleware), so local behavior matches production. No Vercel CLI needed.

## Scripts

- `npm run dev` — local dev (UI + API).
- `npm run build` — typecheck + production build.
- `npm run typecheck` — TypeScript only.
- `npm run preview` — preview the production build (frontend only; `/api` needs Vercel).

## Deploy (Vercel)

The repo is wired to a Vercel project. On push to `main`, Vercel builds the Vite
app and deploys `api/*.ts` as serverless functions.

**Required:** set `GEMINI_API_KEY` in the Vercel project's Environment Variables
(Project → Settings → Environment Variables) before the live app can generate
audio. The key lives only there; it is not in the client bundle or the repo.

## Notes

- Rate limiting is best-effort in-memory (per warm serverless instance). For hard
  guarantees across instances, back it with a shared store (e.g. Redis).
- There is no authentication; anyone with the URL can use the app and consume the
  configured key's quota. Add auth + a durable rate limiter before exposing it
  widely.
- Input is capped at 5,000 characters per request.

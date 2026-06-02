# VoiceGen — adopt remote features into local build

## Plan
PART A (build + verify locally now):
1. Speed fix: chunk long scripts (~1000 chars) + steady-pace instruction, concat audio.
2. Add "African" persona (keep Nigerian + all others; personas are prompts, not voices).
3. Spell/grammar audit: /api/audit endpoint + a check action in Prepare.
4. AI changes log: prepare-copy also returns word/phrasing edits; shown with contexts.
5. Inline tag highlighting in the editor (port HighlightedTextarea).
6. Settings page (gear in header) + shadcn theme (remote palette + Geist); Cal.com
   default; dark/light within each theme; account/sign-out section.

PART B (scaffold; needs Firebase creds to fully run):
7. Firebase Google sign-in gate + guest fallback; users/{uid} Firestore profile;
   firestore.rules; server-verify /api via Admin SDK (inactive until a
   service-account env var is set) + setup guide.

## Assumptions
- Reuse the committed public web config (project gen-lang-client-0909759915).
- Server verification scaffolded but inactive until FIREBASE_SERVICE_ACCOUNT is set.
- User data = profile only (match remote).
- Keep Vercel-serverless + 3-step wizard. Nothing pushed.

## Out of scope
- Creating a Firebase project/service account; deploying; pushing.

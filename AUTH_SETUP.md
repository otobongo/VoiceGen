# Auth setup (Firebase)

VoiceGen uses Firebase Google sign-in, with a guest fallback for trying things
out. Auth comes in two layers:

1. **Client sign-in** (works now) — the public Firebase web config in
   `src/lib/firebase.ts` (project `gen-lang-client-0909759915`, reused from the
   other build). This is not a secret.
2. **Server verification** (opt-in) — the `/api` routes can verify the caller's
   Firebase ID token before doing any work. This is **inactive by default** and
   turns on only when you set `FIREBASE_SERVICE_ACCOUNT`.

## To make real Google sign-in work

1. In the Firebase console for the project, enable **Google** as a sign-in
   provider (Authentication → Sign-in method).
2. Add your hosts to **Authorized domains** (Authentication → Settings):
   - `localhost` (usually present by default) for local dev.
   - your Vercel domain (e.g. `voice-gen-xxxx.vercel.app`) before deploying.
3. Run the app and click **Continue with Google**.

If sign-in is blocked (e.g. the domain isn't authorized), the login screen shows
the error and you can **Continue as guest** instead.

> To use your own Firebase project, replace the config values in
> `src/lib/firebase.ts` and the `firestoreDatabaseId`.

## To turn ON server-side verification (recommended before a public deploy)

1. Firebase console → Project settings → **Service accounts** → **Generate new
   private key**. This downloads a JSON file. **Keep it secret.**
2. Set it as an env var:
   - **Local:** add to `.env.local` as a single line:
     `FIREBASE_SERVICE_ACCOUNT={...the JSON...}` (or base64 of the JSON).
   - **Vercel:** Project → Settings → Environment Variables →
     `FIREBASE_SERVICE_ACCOUNT` = the JSON (or its base64).
3. Redeploy / restart. Now the `/api` routes reject requests without a valid
   Firebase ID token (the client sends it automatically when signed in).

While `FIREBASE_SERVICE_ACCOUNT` is unset, the routes do **not** verify tokens,
so local dev and guest mode keep working.

## Firestore

User profiles are written to `users/{uid}` (uid, email, name, role, createdAt),
governed by `firestore.rules` in this repo. Deploy the rules to your project:

```
firebase deploy --only firestore:rules
```

(or paste `firestore.rules` into the console's Firestore → Rules tab).

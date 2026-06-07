# VoiceGen — Script History (cloud-primary, auth-only)

## Understanding
Authenticated users get a script history. When a master render completes in
Finalize, the script TEXT is auto-saved. Users open a History view, pick a past
script, load it back into the editor, edit it, and regenerate (which saves a new
entry). Guest mode is removed; the app now requires Google sign-in.

## Plan
1. **Remove guest mode**
   - Drop `loginAsGuest` and the guest user object from `AuthContext.tsx`.
   - Remove the "Continue as guest" button + guest copy from `LoginScreen.tsx`.
   - Remove `isGuest` from the `User` type and the "Guest session" branch in
     `SettingsView.tsx` (now always shows the signed-in email).
   - `App.tsx` gate already shows LoginScreen when no user, unchanged.

2. **`useScriptHistory` hook** (`src/hooks/useScriptHistory.ts`)
   - Cloud-primary: reads/writes Firestore `users/{uid}/scripts/{scriptId}`
     ({ text, title, createdAt }), ordered by createdAt desc.
   - `localStorage` cache keyed per-uid for instant load + offline read; refreshed
     from Firestore on sign-in. Guarded reads/writes (never throws), matching
     `useEditorFontSize`.
   - API: `entries`, `loading`, `save(text)`, `remove(id)`, `clear()`.
   - De-dupe: skip save if the newest entry's text is identical (bump its time).
   - Cap: keep most-recent 50 in the local cache; cloud unbounded.

3. **Auto-save on Finalize**
   - In `useStudio.generateMaster`, on a successful master render, call
     `save(text)`. Wired via a callback so the hook stays UI-agnostic.

4. **History UI**
   - `HistoryView.tsx`: full-view panel like Settings, opened from a new clock
     icon in `Header.tsx` (next to the Settings gear).
   - Rows: title preview (first ~60 chars) + relative timestamp; actions **Load**
     and **Delete**. Empty state when none.
   - **Load**: sets editor text and navigates to the Prepare step.

5. **Firestore rules**
   - Add `match /users/{uid}/scripts/{scriptId}` to `firestore.rules`:
     owner-only read/write, validate shape (text:string non-empty, capped length;
     title:string; createdAt:timestamp). Modeled on the existing `users` rules.

## Assumptions (locked)
- Stored content: script TEXT only (no audio, no voice/persona/speed).
- Trigger: auto-save on Finalize master render only (not Preview).
- Load is non-destructive: editing a loaded script and regenerating creates a
  NEW entry; the original is untouched.
- History entry point: clock icon in the header, opens a full view.
- 50-entry local cache cap; cloud holds all.
- No rename / favorite / search in v1.

## Edge cases acknowledged
- De-dupe identical consecutive saves (bump timestamp instead of duplicating).
- Offline / Firestore unavailable: local cache still renders history; writes
  queue to cache and best-effort to cloud (failures don't block the render).
- Removing guest mode: ensure no other code path depends on the guest user.

## Out of scope
- Storing or replaying old audio from history.
- Restoring voice/persona/speed settings.
- Rename, tags, favorites, search, pagination beyond the 50 cap.
- Cross-account sharing.

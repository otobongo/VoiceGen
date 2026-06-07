// Script history: the scripts a user has rendered to a master take.
//
// Cloud-primary, local-cached:
//  - Source of truth is Firestore `users/{uid}/scripts/{id}` (per signed-in user),
//    so history follows the account across devices and survives storage clears.
//  - A per-uid localStorage cache renders instantly on load and keeps history
//    readable offline. Reads/writes are guarded so they never throw (private
//    mode, blocked storage), matching the pattern in useEditorFontSize.
//
// What's stored: the script TEXT only (plus a title preview + createdAt). No
// audio, no voice/persona/speed. Auto-saved on a successful Finalize master
// render (see useStudio). De-duped: re-saving the identical newest text just
// bumps its timestamp rather than creating a duplicate.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export interface ScriptHistoryEntry {
  /** Firestore document id (also the local cache id). */
  id: string;
  /** The full script text. */
  text: string;
  /** Short preview for the list (derived from text). */
  title: string;
  /** Client-set creation time in ms since epoch; the sort key. */
  createdAt: number;
}

// Keep the local cache bounded. The cloud holds everything; this only caps what
// we mirror locally for fast/offline rendering.
const MAX_LOCAL_ENTRIES = 50;
const TITLE_MAX = 60;

function cacheKey(uid: string): string {
  return `voicegen-history:${uid}`;
}

/** First line, trimmed and clipped, used as the list label. */
function makeTitle(text: string): string {
  const firstLine = text.replace(/\s+/g, ' ').trim();
  if (firstLine.length <= TITLE_MAX) return firstLine;
  return firstLine.slice(0, TITLE_MAX).trimEnd() + '…';
}

function readCache(uid: string): ScriptHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(cacheKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive: only keep well-formed entries.
    return parsed.filter(
      (e): e is ScriptHistoryEntry =>
        e &&
        typeof e.id === 'string' &&
        typeof e.text === 'string' &&
        typeof e.title === 'string' &&
        typeof e.createdAt === 'number',
    );
  } catch {
    return [];
  }
}

function writeCache(uid: string, entries: ScriptHistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      cacheKey(uid),
      JSON.stringify(entries.slice(0, MAX_LOCAL_ENTRIES)),
    );
  } catch {
    /* storage blocked — in-memory state still holds for the session */
  }
}

function sortDesc(entries: ScriptHistoryEntry[]): ScriptHistoryEntry[] {
  return [...entries].sort((a, b) => b.createdAt - a.createdAt);
}

export function useScriptHistory() {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const [entries, setEntries] = useState<ScriptHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Track the active uid so async Firestore results can be ignored if the user
  // changed (signed out / switched) before the request resolved.
  const activeUid = useRef<string | null>(null);
  activeUid.current = uid;

  const scriptsCol = useCallback(() => {
    if (!uid) return null;
    return collection(db, 'users', uid, 'scripts');
  }, [uid]);

  // On sign-in (or uid change): show cache immediately, then refresh from cloud.
  useEffect(() => {
    if (!uid) {
      setEntries([]);
      return;
    }
    setEntries(sortDesc(readCache(uid)));

    let cancelled = false;
    const col = scriptsCol();
    if (!col) return;

    setLoading(true);
    (async () => {
      try {
        const snap = await getDocs(
          query(col, orderBy('createdAt', 'desc'), fsLimit(200)),
        );
        if (cancelled || activeUid.current !== uid) return;
        const cloud: ScriptHistoryEntry[] = snap.docs.map((d) => {
          const data = d.data() as Partial<ScriptHistoryEntry>;
          return {
            id: d.id,
            text: typeof data.text === 'string' ? data.text : '',
            title:
              typeof data.title === 'string'
                ? data.title
                : makeTitle(typeof data.text === 'string' ? data.text : ''),
            createdAt:
              typeof data.createdAt === 'number' ? data.createdAt : 0,
          };
        });
        const sorted = sortDesc(cloud);
        setEntries(sorted);
        writeCache(uid, sorted);
      } catch (err) {
        // Offline or rules not deployed yet: keep the cache we already showed.
        console.warn('[history] cloud load failed, using cache:', err);
      } finally {
        if (!cancelled && activeUid.current === uid) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, scriptsCol]);

  /**
   * Save a script. De-dupes: if the newest entry has identical text, just bump
   * its timestamp instead of adding a duplicate. Updates local state + cache
   * immediately; the cloud write is best-effort (a failure never blocks the
   * caller, e.g. a finished render).
   */
  const save = useCallback(
    async (rawText: string): Promise<void> => {
      const text = rawText.trim();
      if (!text || !uid) return;

      const now = Date.now();
      const newest = entries[0];

      // De-dupe against the most recent entry.
      if (newest && newest.text.trim() === text) {
        const bumped: ScriptHistoryEntry = { ...newest, createdAt: now };
        const next = sortDesc([
          bumped,
          ...entries.filter((e) => e.id !== newest.id),
        ]);
        setEntries(next);
        writeCache(uid, next);
        const col = scriptsCol();
        if (col) {
          try {
            await updateDoc(doc(col, newest.id), { createdAt: now });
          } catch (err) {
            console.warn('[history] timestamp bump failed:', err);
          }
        }
        return;
      }

      const entry: ScriptHistoryEntry = {
        id: `local-${now}`,
        text,
        title: makeTitle(text),
        createdAt: now,
      };

      // Optimistic local insert.
      const optimistic = sortDesc([entry, ...entries]);
      setEntries(optimistic);
      writeCache(uid, optimistic);

      // Best-effort cloud write; reconcile the real doc id on success.
      const col = scriptsCol();
      if (!col) return;
      try {
        const ref = await addDoc(col, {
          text: entry.text,
          title: entry.title,
          createdAt: entry.createdAt,
        });
        if (activeUid.current !== uid) return;
        setEntries((prev) => {
          const reconciled = prev.map((e) =>
            e.id === entry.id ? { ...e, id: ref.id } : e,
          );
          writeCache(uid, reconciled);
          return reconciled;
        });
      } catch (err) {
        // Keep the optimistic local entry; it'll sync on a later successful run.
        console.warn('[history] cloud save failed, kept locally:', err);
      }
    },
    [uid, entries, scriptsCol],
  );

  /** Remove one entry locally and from the cloud (best-effort). */
  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!uid) return;
      const next = entries.filter((e) => e.id !== id);
      setEntries(next);
      writeCache(uid, next);
      const col = scriptsCol();
      // Skip cloud delete for ids that never made it to Firestore.
      if (col && !id.startsWith('local-')) {
        try {
          await deleteDoc(doc(col, id));
        } catch (err) {
          console.warn('[history] cloud delete failed:', err);
        }
      }
    },
    [uid, entries, scriptsCol],
  );

  /** Clear all history (local + cloud, best-effort). */
  const clear = useCallback(async (): Promise<void> => {
    if (!uid) return;
    const toDelete = entries;
    setEntries([]);
    writeCache(uid, []);
    const col = scriptsCol();
    if (!col) return;
    await Promise.allSettled(
      toDelete
        .filter((e) => !e.id.startsWith('local-'))
        .map((e) => deleteDoc(doc(col, e.id))),
    );
  }, [uid, entries, scriptsCol]);

  return { entries, loading, save, remove, clear };
}

export type ScriptHistoryApi = ReturnType<typeof useScriptHistory>;

// Script history view: a full-screen panel (like Settings) listing the scripts
// the user has rendered to a master. Each row can be loaded back into the editor
// (to edit + regenerate) or deleted. Opened from the clock icon in the header.

import { ArrowLeft, Clock, Loader2, Trash2 } from 'lucide-react';
import { Button } from './Button';
import type { ScriptHistoryApi, ScriptHistoryEntry } from '@/hooks/useScriptHistory';

interface HistoryViewProps {
  history: ScriptHistoryApi;
  /** Load an entry's text into the editor and leave the history view. */
  onLoad: (text: string) => void;
  onBack: () => void;
}

/** Compact relative time, e.g. "just now", "5m ago", "3d ago". */
function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(ms).toLocaleDateString();
}

export function HistoryView({ history, onLoad, onBack }: HistoryViewProps) {
  const { entries, loading, save: _save, remove, clear } = history;
  void _save; // save is used by the studio, not this view.

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" /> Back to studio
      </button>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Script history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Scripts you’ve rendered. Load one to edit and regenerate.
          </p>
        </div>
        {entries.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void clear()}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            Clear all
          </Button>
        )}
      </div>

      <section className="mt-8">
        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
          </div>
        ) : entries.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <HistoryRow
                key={entry.id}
                entry={entry}
                onLoad={() => onLoad(entry.text)}
                onDelete={() => void remove(entry.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function HistoryRow({
  entry,
  onLoad,
  onDelete,
}: {
  entry: ScriptHistoryEntry;
  onLoad: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-border-strong sm:p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{entry.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{relativeTime(entry.createdAt)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onLoad}>
          Load
        </Button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete script"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-14 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Clock className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium text-foreground">No saved scripts yet</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
        Finish a master render in Finalize and the script lands here automatically.
      </p>
    </div>
  );
}

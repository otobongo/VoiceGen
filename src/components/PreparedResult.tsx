import { useEffect, useState } from 'react';
import { CheckCheck, ListTree, Sparkles, Undo2 } from 'lucide-react';
import { Modal } from './Modal';
import type { StudioApi } from '@/hooks/useStudio';

interface PreparedResultProps {
  studio: StudioApi;
}

/**
 * Result of the unified "Prepare Copy" pass. Collapsed by default: a compact
 * summary in the rail with a "View contexts" action that opens the full grouped
 * view (cards + "Break" separators) in a modal.
 */
export function PreparedResult({ studio }: PreparedResultProps) {
  const {
    contexts,
    changes,
    improvement,
    previousText,
    undoPrepare,
    isPreparing,
    reviewCopy,
  } = studio;
  const [open, setOpen] = useState(false);

  // Close the modal if the contexts go away (e.g. undo or edit).
  useEffect(() => {
    if (contexts.length === 0) setOpen(false);
  }, [contexts.length]);

  const summary = improvement
    ? improvement.reviewedCopy
      ? improvement.changedWording
        ? 'Grammar & flow improved, tags added'
        : 'Reviewed (already clean), tags added'
      : 'Prosody tags added, wording preserved'
    : '';

  return (
    <section className="space-y-3">
      <p className="label-micro flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5" /> Prepared script
      </p>

      {contexts.length > 0 ? (
        <div className="space-y-2 animate-fade-in">
          {/* Collapsed summary */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-2.5">
              <CheckCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {contexts.length} context{contexts.length === 1 ? '' : 's'} detected
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">{summary}</p>
                {changes.length > 0 && (
                  <p className="mt-1 text-xs font-medium text-foreground/80">
                    {changes.length} wording edit{changes.length === 1 ? '' : 's'}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ListTree className="h-3.5 w-3.5" /> View contexts
              </button>
              {previousText !== null && (
                <button
                  type="button"
                  onClick={undoPrepare}
                  className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Undo2 className="h-3.5 w-3.5" /> Undo
                </button>
              )}
            </div>
          </div>

          {/* Full grouped view in a modal */}
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title={`${contexts.length} context${contexts.length === 1 ? '' : 's'}`}
          >
            <div className="overflow-hidden rounded-xl border border-border">
              {contexts.map((ctx, i) => (
                <div key={i}>
                  {i > 0 && (
                    <div className="flex items-center gap-2 px-4 py-1.5" aria-hidden="true">
                      <span className="h-px flex-1 bg-border" />
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        Break
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <div className="px-4 py-3">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[9px] font-bold text-background">
                        {i + 1}
                      </span>
                      {ctx.title}
                    </p>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                      {ctx.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Wording changes the AI made (grammar/flow review only) */}
            {changes.length > 0 && (
              <div className="mt-4">
                <p className="label-micro mb-2">Wording changes</p>
                <div className="space-y-2">
                  {changes.map((c, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs">
                        <span className="text-muted-foreground line-through">{c.original}</span>
                        <span className="mx-1.5 text-muted-foreground">→</span>
                        <span className="font-medium">{c.replacement}</span>
                      </p>
                      {c.reason && (
                        <p className="mt-1 text-[11px] text-muted-foreground">{c.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Modal>
        </div>
      ) : (
        !isPreparing && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-center">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Not prepared yet.</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground/70">
              Run “Prepare Copy” to group your script into contexts and add prosody
              tags{reviewCopy ? ', fixing grammar & flow.' : ' (wording preserved).'}{' '}
              It applies automatically.
            </p>
          </div>
        )
      )}
    </section>
  );
}

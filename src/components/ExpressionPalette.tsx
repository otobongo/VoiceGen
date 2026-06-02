import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { EXPRESSION_GROUPS } from '@/lib/types';
import { Tooltip } from './Tooltip';

interface ExpressionPaletteProps {
  onInsert: (tag: string) => void;
}

/**
 * The manual "power path": grouped expression cues. Collapsed by default so the
 * sidebar isn't a wall of 18 buttons; the AI Enhance flow is the easy path.
 */
export function ExpressionPalette({ onInsert }: ExpressionPaletteProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="label-micro">Expression cues</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="space-y-4 animate-slide-down">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Drop a cue into your script to shape a line. It applies to the
            sentence it starts in.
          </p>
          {EXPRESSION_GROUPS.map((group) => (
            <div key={group.id} className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.tags.map((t) => (
                  <Tooltip key={t.id} label={t.hint}>
                    <button
                      type="button"
                      onClick={() => onInsert(t.tag)}
                      className={cn(
                        'rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium',
                        'text-foreground/80 transition-colors hover:border-border-strong hover:bg-muted hover:text-foreground',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                      )}
                    >
                      {t.label}
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

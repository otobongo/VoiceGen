import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { EditorFontSize } from '@/hooks/useEditorFontSize';

interface FontSizeControlProps {
  font: EditorFontSize;
}

const btn =
  'flex h-7 items-center justify-center rounded-md text-muted-foreground transition-colors ' +
  'hover:bg-background hover:text-foreground disabled:opacity-40 disabled:pointer-events-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Compact A- / A+ / reset control for the editor font size. */
export function FontSizeControl({ font }: FontSizeControlProps) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5"
      role="group"
      aria-label="Editor text size"
    >
      <button
        type="button"
        onClick={font.decrease}
        disabled={!font.canDecrease}
        aria-label="Decrease text size"
        className={cn(btn, 'w-7 text-xs font-semibold')}
      >
        A
      </button>
      <button
        type="button"
        onClick={font.increase}
        disabled={!font.canIncrease}
        aria-label="Increase text size"
        className={cn(btn, 'w-7 text-sm font-bold')}
      >
        A
      </button>
      <button
        type="button"
        onClick={font.reset}
        disabled={font.isDefault}
        aria-label="Reset text size"
        className={cn(btn, 'w-7')}
      >
        <RotateCcw className="h-3 w-3" />
      </button>
    </div>
  );
}

import React, {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import { cn } from '@/lib/cn';

interface HighlightedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  fontSize: number;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

/** Imperative handle so parents can insert a tag at the live caret position. */
export interface HighlightedTextareaHandle {
  /** Insert `snippet` at the caret (replacing any selection), then refocus. */
  insertAtCursor: (snippet: string) => void;
}

// Render the script with [prosody tags] highlighted. Used by the transparent
// textarea's backdrop layer.
function renderHighlighted(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) =>
    part.startsWith('[') && part.endsWith(']') ? (
      <mark
        key={i}
        className="rounded bg-accent/70 px-0.5 text-foreground"
        style={{ textShadow: '0 0 0.4px currentColor' }}
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/**
 * A textarea with inline highlighting of [tags]. Technique: a transparent
 * textarea sits over a styled backdrop that mirrors the same text; the two
 * share identical typography/padding so they align exactly. Scroll is synced.
 */
export const HighlightedTextarea = forwardRef<
  HighlightedTextareaHandle,
  HighlightedTextareaProps
>(function HighlightedTextarea(
  {
    value,
    onChange,
    fontSize,
    disabled,
    placeholder,
    ariaLabel = 'Script text',
    className,
  },
  ref,
) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Caret to restore AFTER the next controlled value update (set by insertAtCursor).
  const pendingCaret = useRef<number | null>(null);

  // Insert a snippet at the caret. We separate words with single spaces so cues
  // read naturally: e.g. "...hello [happy] world" not "...hello[happy]world".
  useImperativeHandle(
    ref,
    () => ({
      insertAtCursor(snippet: string) {
        const el = textareaRef.current;
        // Fall back to end-of-text if the field was never focused.
        const start = el ? el.selectionStart : value.length;
        const end = el ? el.selectionEnd : value.length;

        const before = value.slice(0, start);
        const after = value.slice(end);
        const needsLeadSpace = before.length > 0 && !/\s$/.test(before);
        const needsTrailSpace = after.length > 0 && !/^\s/.test(after);
        const insert =
          (needsLeadSpace ? ' ' : '') + snippet + (needsTrailSpace ? ' ' : '');

        pendingCaret.current = (before + insert).length;
        onChange(before + insert + after);
      },
    }),
    [value, onChange],
  );

  // After the inserted value renders, restore focus + caret right after the tag.
  useLayoutEffect(() => {
    if (pendingCaret.current === null) return;
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  }, [value]);

  // Both layers MUST share these exact metrics to stay aligned.
  const shared: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    lineHeight: 1.625,
    padding: '1.25rem',
    fontFamily: 'inherit',
    letterSpacing: 'inherit',
    tabSize: 4,
  };

  return (
    <div className={cn('relative h-full w-full', className)}>
      <div
        ref={backdropRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words text-foreground"
        style={shared}
      >
        {value ? (
          <>
            {renderHighlighted(value)}
            {value.endsWith('\n') ? <br /> : null}
          </>
        ) : (
          <span className="text-muted-foreground/60">{placeholder}</span>
        )}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => {
          if (backdropRef.current) {
            backdropRef.current.scrollTop = e.currentTarget.scrollTop;
            backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
          }
        }}
        disabled={disabled}
        spellCheck
        aria-label={ariaLabel}
        placeholder={placeholder}
        className="absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre-wrap break-words bg-transparent caret-foreground focus:outline-none disabled:opacity-60"
        // Text itself is transparent so only the backdrop's colored copy shows.
        style={{ ...shared, color: 'transparent', WebkitTextFillColor: 'transparent' }}
      />
    </div>
  );
});

import React, { useRef } from 'react';
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
export function HighlightedTextarea({
  value,
  onChange,
  fontSize,
  disabled,
  placeholder,
  ariaLabel = 'Script text',
  className,
}: HighlightedTextareaProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

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
}

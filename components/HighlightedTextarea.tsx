import React, { useRef, useEffect } from 'react';

interface HighlightedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  containerClassName?: string;
}

export const renderHighlightedText = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return (
        <span 
          key={i} 
          className="text-[var(--color-accent-primary)] bg-[var(--color-accent-primary-subtle)] rounded"
          style={{ textShadow: '0 0 0.5px currentColor' }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

export const HighlightedTextarea = React.forwardRef<HTMLTextAreaElement, HighlightedTextareaProps>(
  ({ value, className, containerClassName, onScroll, ...props }, ref) => {
    const backdropRef = useRef<HTMLDivElement>(null);

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
      if (backdropRef.current) {
        backdropRef.current.scrollTop = e.currentTarget.scrollTop;
        backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
      }
      if (onScroll) {
        onScroll(e);
      }
    };

    return (
      <div className={`relative ${containerClassName || 'w-full h-full'}`}>
        <div 
          ref={backdropRef}
          className={`${className} absolute inset-0 pointer-events-none break-words whitespace-pre-wrap overflow-hidden`}
          aria-hidden="true"
        >
          {value ? (
            <>
              {renderHighlightedText(value)}
              {value.endsWith('\n') ? <br /> : null}
            </>
          ) : (
            props.placeholder ? <span className="text-muted-foreground">{props.placeholder}</span> : null
          )}
        </div>
        <textarea
          ref={ref}
          value={value}
          onScroll={handleScroll}
          aria-label="Script editor"
          className={`${className} absolute inset-0 bg-transparent caret-foreground focus:outline-none resize-none`}
          style={{ color: 'transparent', WebkitTextFillColor: 'transparent' }}
          {...props}
        />
      </div>
    );
  }
);

HighlightedTextarea.displayName = 'HighlightedTextarea';

import { useState } from 'react';
import { ArrowRight, CheckCheck, Loader2, WandSparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { ErrorBanner } from './ErrorBanner';
import { PreparedResult } from './PreparedResult';
import { AuditPanel } from './AuditPanel';
import { FontSizeControl } from './FontSizeControl';
import { HighlightedTextarea } from './HighlightedTextarea';
import type { StudioApi } from '@/hooks/useStudio';
import type { EditorFontSize } from '@/hooks/useEditorFontSize';

interface PrepareStepProps {
  studio: StudioApi;
  font: EditorFontSize;
}

export function PrepareStep({ studio, font }: PrepareStepProps) {
  const {
    text,
    setText,
    charCount,
    maxChars,
    overLimit,
    isEmpty,
    isValid,
    hasPrepared,
    reviewCopy,
    setReviewCopy,
    prepareCopy,
    isPreparing,
    error,
    dismissError,
    goToStep,
  } = studio;

  const [directive, setDirective] = useState('');
  const nearLimit = charCount > maxChars * 0.9;

  const runDirective = () => {
    if (!directive.trim()) return;
    prepareCopy(directive.trim());
    setDirective('');
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:overflow-hidden">
      {/* Editor */}
      <div className="flex min-h-[50vh] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card lg:min-h-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <span className="label-micro">Script</span>
          <div className="flex items-center gap-2">
            <FontSizeControl font={font} />
            {isValid ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-micro font-semibold uppercase text-success">
                <CheckCheck className="h-3 w-3" /> Valid
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-micro font-semibold uppercase text-destructive">
                {isEmpty ? 'Empty' : 'Too long'}
              </span>
            )}
          </div>
        </div>

        <div className="relative flex-1">
          <HighlightedTextarea
            value={text}
            onChange={setText}
            fontSize={font.size}
            disabled={isPreparing}
            placeholder="Start writing your script. What do you want to say?"
          />
          {isPreparing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/70 backdrop-blur-[2px] animate-fade-in">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-foreground" />
                <p className="label-micro">Preparing your copy…</p>
              </div>
            </div>
          )}
        </div>

        {/* Copy-prep controls */}
        <div className="space-y-3 border-t border-border bg-subtle/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={reviewCopy}
                onChange={(e) => setReviewCopy(e.target.checked)}
                className="h-4 w-4 rounded border-border-strong accent-foreground"
              />
              <span className="text-sm">
                <span className="font-medium">Review my copy</span>
                <span className="ml-1.5 text-xs text-muted-foreground">
                  AI corrects grammar &amp; flow
                </span>
              </span>
            </label>
            <span
              className={cn(
                'text-xs tabular-nums',
                overLimit
                  ? 'font-semibold text-destructive'
                  : nearLimit
                    ? 'text-warning'
                    : 'text-muted-foreground',
              )}
              aria-live="polite"
            >
              {charCount.toLocaleString()} / {maxChars.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-card focus-within:border-border-strong">
              <input
                type="text"
                value={directive}
                onChange={(e) => setDirective(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runDirective()}
                disabled={isPreparing}
                placeholder="Optional: tell the AI how to perform it"
                className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 disabled:opacity-50"
                aria-label="Optional AI instruction"
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => prepareCopy(directive.trim() || undefined)}
              disabled={isPreparing || !isValid}
            >
              <WandSparkles className="h-4 w-4" />
              Prepare Copy
            </Button>
          </div>
        </div>
      </div>

      {/* Right rail: scrollable result + a Proceed button pinned to the bottom */}
      <aside className="flex w-full shrink-0 flex-col lg:w-[340px] lg:min-h-0">
        <div className="flex flex-col gap-5 lg:flex-1 lg:overflow-y-auto lg:pr-1">
          {error && (
            <ErrorBanner code={error.code} quota={error.quota} onDismiss={dismissError} />
          )}
          <AuditPanel studio={studio} />
          <PreparedResult studio={studio} />
        </div>

        {/* Sticky proceed dock */}
        <div className="sticky bottom-0 mt-4 space-y-2 border-t border-border bg-background/80 pt-4 backdrop-blur lg:mt-3">
          <Button
            size="lg"
            onClick={() => goToStep('preview')}
            disabled={!isValid || !hasPrepared}
            className="w-full"
          >
            Proceed to Preview <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            {!isValid
              ? 'Add a valid script to continue.'
              : !hasPrepared
                ? 'Run “Prepare Copy” to continue.'
                : 'Your copy is prepared. You can proceed.'}
          </p>
        </div>
      </aside>
    </div>
  );
}

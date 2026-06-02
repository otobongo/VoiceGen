import { ArrowLeft, ArrowRight, Layers, Loader2, Volume2 } from 'lucide-react';
import { Button } from './Button';
import { ErrorBanner } from './ErrorBanner';
import { PersonaSelect } from './PersonaSelect';
import { VoicePicker } from './VoicePicker';
import { ExpressionPalette } from './ExpressionPalette';
import { AudioPlayer } from './AudioPlayer';
import { FontSizeControl } from './FontSizeControl';
import { HighlightedTextarea } from './HighlightedTextarea';
import type { StudioApi } from '@/hooks/useStudio';
import type { EditorFontSize } from '@/hooks/useEditorFontSize';

interface PreviewStepProps {
  studio: StudioApi;
  font: EditorFontSize;
}

export function PreviewStep({ studio, font }: PreviewStepProps) {
  const {
    text,
    setText,
    insertTag,
    voice,
    setVoice,
    persona,
    setPersona,
    speed,
    setSpeed,
    isPreviewing,
    previewTake,
    generatePreview,
    exportTake,
    error,
    dismissError,
    reportError,
    goToStep,
    isValid,
  } = studio;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:overflow-hidden">
      {/* Editable script */}
      <div className="flex min-h-[45vh] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card lg:min-h-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <span className="label-micro flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Script editor
          </span>
          <div className="flex items-center gap-2">
            <FontSizeControl font={font} />
            <button
              type="button"
              onClick={() => goToStep('prepare')}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Prepare
            </button>
          </div>
        </div>

        <div className="relative min-h-[200px] flex-1">
          <HighlightedTextarea
            value={text}
            onChange={setText}
            fontSize={font.size}
          />
        </div>

        <div className="border-t border-border bg-subtle/50 px-4 py-3">
          <ExpressionPalette onInsert={insertTag} />
        </div>
      </div>

      {/* Voice + controls rail */}
      <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-[360px]">
        {error && (
          <ErrorBanner code={error.code} quota={error.quota} onDismiss={dismissError} />
        )}

        <PersonaSelect value={persona} onChange={setPersona} />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="preview-speed" className="label-micro">
              Speed
            </label>
            <span className="text-xs font-semibold tabular-nums">{speed.toFixed(1)}x</span>
          </div>
          <input
            id="preview-speed"
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-valuetext={`${speed.toFixed(1)} times speed`}
          />
        </section>

        <VoicePicker
          selected={voice}
          persona={persona}
          onSelect={setVoice}
          onError={reportError}
        />

        <div className="space-y-2">
          <Button
            size="lg"
            variant="secondary"
            onClick={generatePreview}
            disabled={isPreviewing || !isValid}
            className="w-full"
          >
            {isPreviewing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4" /> {previewTake ? 'Regenerate preview' : 'Preview audio'}
              </>
            )}
          </Button>
          <p className="sr-only" role="status" aria-live="polite">
            {isPreviewing ? 'Generating preview audio, please wait.' : ''}
          </p>
        </div>

        {previewTake && (
          <AudioPlayer take={previewTake} speed={speed} onExport={exportTake} />
        )}

        <Button size="lg" onClick={() => goToStep('finalize')} disabled={!isValid} className="w-full">
          Proceed to Finalize <ArrowRight className="h-4 w-4" />
        </Button>
      </aside>
    </div>
  );
}

import { ArrowLeft, Coins, Loader2, Lock, Mic, Sparkles } from 'lucide-react';
import { Button } from './Button';
import { ErrorBanner } from './ErrorBanner';
import { AudioPlayer } from './AudioPlayer';
import { downloadBlob } from '@/lib/audio';
import { PERSONA_OPTIONS } from '@/lib/types';
import type { StudioApi } from '@/hooks/useStudio';

interface FinalizeStepProps {
  studio: StudioApi;
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1 border-b border-border py-3 last:border-0">
      <p className="label-micro">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export function FinalizeStep({ studio }: FinalizeStepProps) {
  const {
    text,
    voice,
    persona,
    speed,
    sessionTokens,
    charCount,
    masterTake,
    isGenerating,
    generateMaster,
    exportTake,
    error,
    dismissError,
    reportError,
    goToStep,
  } = studio;

  const personaLabel =
    PERSONA_OPTIONS.find((p) => p.id === persona)?.label ?? persona;

  // Generate, then auto-download AND keep the player visible (both, per spec).
  const handleGenerate = async () => {
    const take = await generateMaster();
    // generateMaster already surfaced a banner if it failed; nothing to add.
    if (!take) return;
    // exportTake surfaces NO_AUDIO_TO_EXPORT / EXPORT_FAILED itself on null.
    const blob = exportTake(take.id, speed);
    if (!blob) return;
    const ok = downloadBlob(blob, `voicegen-${take.voice.toLowerCase()}-master.wav`);
    if (!ok) reportError('DOWNLOAD_FAILED');
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:overflow-hidden">
      {/* Locked script */}
      <div className="flex min-h-[40vh] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card lg:min-h-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="label-micro flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Locked script
          </span>
          <button
            type="button"
            onClick={() => goToStep('preview')}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Preview
          </button>
        </div>
        <pre className="flex-1 overflow-auto whitespace-pre-wrap p-5 font-mono text-sm leading-relaxed text-foreground/90">
          {text}
        </pre>
      </div>

      {/* Summary + generate */}
      <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[360px]">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Finalize production</h2>
          <p className="text-sm text-muted-foreground">Review &amp; export</p>
        </div>

        {error && (
          <ErrorBanner code={error.code} quota={error.quota} onDismiss={dismissError} />
        )}

        <div className="rounded-xl border border-border bg-card px-5 py-1">
          <SummaryRow
            label="Voice talent"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Mic className="h-3.5 w-3.5 text-muted-foreground" /> {voice}
              </span>
            }
          />
          <SummaryRow label="Persona" value={personaLabel} />
          <SummaryRow label="Speed" value={`${speed.toFixed(1)}x`} />
          <SummaryRow
            label="Total session usage"
            value={
              <span className="inline-flex items-center gap-1.5 text-success">
                <Coins className="h-3.5 w-3.5" />
                {sessionTokens > 0
                  ? `${sessionTokens.toLocaleString()} tokens`
                  : `${charCount.toLocaleString()} characters`}
              </span>
            }
          />
        </div>

        <div className="rounded-xl border border-border bg-subtle/60 p-5">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="h-4 w-4" /> Generate Master
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Generates the full-fidelity .WAV file. Consumes API quota.
          </p>
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="mt-4 w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              <>{masterTake ? 'Regenerate master' : 'Generate'}</>
            )}
          </Button>
          <p className="sr-only" role="status" aria-live="polite">
            {isGenerating ? 'Generating the full master, please wait.' : ''}
          </p>
        </div>

        {masterTake && (
          <AudioPlayer
            take={masterTake}
            speed={speed}
            onExport={exportTake}
            onError={reportError}
          />
        )}
      </aside>
    </div>
  );
}

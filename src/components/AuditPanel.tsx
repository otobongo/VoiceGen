import { AlertCircle, CheckCircle2, Loader2, SpellCheck } from 'lucide-react';
import { Button } from './Button';
import type { StudioApi } from '@/hooks/useStudio';

interface AuditPanelProps {
  studio: StudioApi;
}

/**
 * Spell / non-English proofreading for the script. Optional, on-demand: the
 * user clicks Check, and any issues (with suggestions) are listed.
 */
export function AuditPanel({ studio }: AuditPanelProps) {
  const { auditIssues, isAuditing, runAudit, isValid } = studio;

  return (
    <section className="space-y-2.5">
      <p className="label-micro flex items-center gap-1.5">
        <SpellCheck className="h-3.5 w-3.5" /> Proofread
      </p>

      <Button
        variant="secondary"
        size="sm"
        onClick={runAudit}
        disabled={isAuditing || !isValid}
        className="w-full"
      >
        {isAuditing ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…
          </>
        ) : (
          <>
            <SpellCheck className="h-3.5 w-3.5" />
            {auditIssues ? 'Re-check spelling' : 'Check spelling & language'}
          </>
        )}
      </Button>

      {auditIssues !== null &&
        (auditIssues.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success animate-fade-in">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span className="text-foreground/90">No spelling or language issues found.</span>
          </div>
        ) : (
          <div className="space-y-1.5 animate-fade-in">
            {auditIssues.map((issue, i) => (
              <div
                key={i}
                className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                  <p className="text-xs">
                    <span className="font-medium">{issue.original}</span>
                    <span className="mx-1.5 text-muted-foreground">→</span>
                    <span className="font-medium text-foreground">{issue.suggestion}</span>
                    <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {issue.type === 'non-english' ? 'non-English' : 'spelling'}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))}
    </section>
  );
}

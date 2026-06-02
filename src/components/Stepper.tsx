import { Check, CircleDot, PencilLine } from 'lucide-react';
import { cn } from '@/lib/cn';
import { WIZARD_STEPS, type WizardStep } from '@/lib/types';

interface StepperProps {
  current: WizardStep;
  /** Whether forward navigation is allowed (script is valid). */
  canAdvance: boolean;
  onNavigate: (step: WizardStep) => void;
}

const META: Record<WizardStep, { label: string; icon: typeof PencilLine }> = {
  prepare: { label: 'Prepare', icon: PencilLine },
  preview: { label: 'Preview', icon: CircleDot },
  finalize: { label: 'Finalize', icon: Check },
};

export function Stepper({ current, canAdvance, onNavigate }: StepperProps) {
  const currentIndex = WIZARD_STEPS.indexOf(current);

  return (
    <nav aria-label="Progress" className="flex items-center gap-2 sm:gap-3">
      {WIZARD_STEPS.map((s, i) => {
        const { label, icon: Icon } = META[s];
        const isActive = s === current;
        const isComplete = i < currentIndex;
        // Can click: any earlier step, or a later step only if script is valid.
        const reachable = i <= currentIndex || canAdvance;

        return (
          <div key={s} className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              disabled={!reachable}
              aria-current={isActive ? 'step' : undefined}
              onClick={() => onNavigate(s)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-micro font-semibold uppercase transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : isComplete
                    ? 'text-foreground hover:bg-muted'
                    : reachable
                      ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      : 'text-muted-foreground/50 cursor-not-allowed',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < WIZARD_STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  'h-px w-4 sm:w-8',
                  i < currentIndex ? 'bg-foreground/40' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

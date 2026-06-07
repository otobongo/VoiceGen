import { Clock, Mic, Moon, Settings, Sun } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { Stepper } from './Stepper';
import type { WizardStep } from '@/lib/types';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  /** Stepper props — omitted on the settings view. */
  step?: WizardStep;
  canAdvance?: boolean;
  onNavigate?: (step: WizardStep) => void;
  showStepper: boolean;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

export function Header({
  isDark,
  onToggleTheme,
  step,
  canAdvance,
  onNavigate,
  showStepper,
  onOpenSettings,
  onOpenHistory,
}: HeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
          <Mic className="h-4 w-4 text-background" />
        </span>
        <h1 className="text-base font-bold tracking-tight">
          Voice<span className="text-muted-foreground">Studio</span>
        </h1>
      </div>

      <div className="flex flex-1 justify-center">
        {showStepper && step && onNavigate && (
          <Stepper current={step} canAdvance={!!canAdvance} onNavigate={onNavigate} />
        )}
      </div>

      <div className="flex items-center gap-2">
        <Tooltip label="History" side="bottom">
          <button
            type="button"
            onClick={onOpenHistory}
            aria-label="Open script history"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Clock className="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip label="Settings" side="bottom">
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open settings"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Settings className="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip label={isDark ? 'Light mode' : 'Dark mode'} side="bottom">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </Tooltip>
      </div>
    </header>
  );
}

import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ERROR_MESSAGES } from '@/lib/types';

interface ErrorBannerProps {
  code: string;
  quota: boolean;
  onDismiss: () => void;
}

export function ErrorBanner({ code, quota, onDismiss }: ErrorBannerProps) {
  const message = ERROR_MESSAGES[code] ?? ERROR_MESSAGES.UNKNOWN;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm animate-slide-down',
        quota
          ? 'border-warning/30 bg-warning/10 text-warning'
          : 'border-destructive/30 bg-destructive/10 text-destructive',
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 leading-relaxed text-foreground/90">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

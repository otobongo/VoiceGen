import { ArrowRight, Mic, ShieldAlert } from 'lucide-react';
import { Button } from './Button';
import { useAuth } from '@/contexts/AuthContext';

export function LoginScreen() {
  const { login, loginAsGuest, authError } = useAuth();

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-foreground">
            <Mic className="h-6 w-6 text-background" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            Voice<span className="text-muted-foreground">Studio</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Turn text into natural, expressive speech. Sign in to start.
          </p>
        </div>

        {authError && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="font-medium text-foreground/90">Couldn’t sign in</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {authError} You can continue as a guest below.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <Button onClick={login} size="lg" className="w-full">
            <GoogleGlyph />
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              or
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button onClick={loginAsGuest} size="lg" variant="secondary" className="w-full">
            Continue as guest <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
          Google sign-in uses Firebase. Guest mode works without an account for
          trying things out.
        </p>
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C17.1 3.1 14.8 2 12 2 6.9 2 2.8 6.1 2.8 11.9S6.9 21.8 12 21.8c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.8H12z"
      />
    </svg>
  );
}

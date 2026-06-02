import { ArrowLeft, Check, LogOut, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { useAuth } from '@/contexts/AuthContext';
import type { ThemeSkin } from '@/hooks/useTheme';

interface SettingsViewProps {
  isDark: boolean;
  onToggleMode: () => void;
  skin: ThemeSkin;
  onSkin: (skin: ThemeSkin) => void;
  onBack: () => void;
}

const THEMES: {
  id: ThemeSkin;
  name: string;
  description: string;
  // Swatch colors to preview the theme's accent + surface.
  swatch: { accent: string; surface: string; border: string };
}[] = [
  {
    id: 'cal',
    name: 'Studio (default)',
    description: 'Clean monochrome, Inter. The default VoiceGen look.',
    swatch: { accent: '#0a0a0a', surface: '#ffffff', border: '#e5e5e5' },
  },
  {
    id: 'shadcn',
    name: 'Teal',
    description: 'Teal brand accent, Geist font. Adopted from the other build.',
    swatch: { accent: '#189AB4', surface: '#ffffff', border: '#D4F1F4' },
  },
];

export function SettingsView({
  isDark,
  onToggleMode,
  skin,
  onSkin,
  onBack,
}: SettingsViewProps) {
  const { user, logout } = useAuth();
  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" /> Back to studio
      </button>

      <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
      <p className="mt-1 text-sm text-muted-foreground">Personalize how VoiceGen looks.</p>

      {/* Theme chooser */}
      <section className="mt-8 space-y-3">
        <p className="label-micro">Theme</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {THEMES.map((t) => {
            const active = skin === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSkin(t.id)}
                aria-pressed={active}
                className={cn(
                  'flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  active
                    ? 'border-foreground bg-foreground/[0.04]'
                    : 'border-border bg-card hover:border-border-strong',
                )}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-10 w-16 items-center gap-1 rounded-md border px-2"
                    style={{ background: t.swatch.surface, borderColor: t.swatch.border }}
                  >
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ background: t.swatch.accent }}
                    />
                    <span
                      className="h-2 flex-1 rounded-full"
                      style={{ background: t.swatch.border }}
                    />
                  </div>
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full border transition-colors',
                      active ? 'border-foreground bg-foreground' : 'border-border-strong',
                    )}
                  >
                    {active && <Check className="h-3 w-3 text-background" />}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Appearance (dark / light) */}
      <section className="mt-8 space-y-3">
        <p className="label-micro">Appearance</p>
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-sm font-medium">{isDark ? 'Dark' : 'Light'} mode</p>
            <p className="text-xs text-muted-foreground">
              Applies within whichever theme you pick.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleMode}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </section>

      {/* Account */}
      {user && (
        <section className="mt-8 space-y-3">
          <p className="label-micro">Account</p>
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              {user.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-9 w-9 rounded-full border border-border"
                />
              )}
              <div>
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user.isGuest ? 'Guest session' : user.email}
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={logout}>
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

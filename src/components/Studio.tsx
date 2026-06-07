import { useCallback, useState } from 'react';
import { useStudio } from '@/hooks/useStudio';
import { useTheme } from '@/hooks/useTheme';
import { useEditorFontSize } from '@/hooks/useEditorFontSize';
import { useScriptHistory } from '@/hooks/useScriptHistory';
import { Header } from './Header';
import { PrepareStep } from './PrepareStep';
import { PreviewStep } from './PreviewStep';
import { FinalizeStep } from './FinalizeStep';
import { SettingsView } from './SettingsView';
import { HistoryView } from './HistoryView';

type Overlay = 'none' | 'settings' | 'history';

export function Studio() {
  const { isDark, toggle, skin, setSkin } = useTheme();
  const history = useScriptHistory();

  // Auto-save the rendered script to history on a successful master render.
  const onMasterRendered = useCallback(
    (text: string) => {
      void history.save(text);
    },
    [history],
  );

  const studio = useStudio({ onMasterRendered });
  // Shared by the Prepare and Preview editors, persisted across sessions.
  const font = useEditorFontSize();
  const [overlay, setOverlay] = useState<Overlay>('none');

  // Load a history entry: put its text in the editor, return to Prepare, close.
  const loadFromHistory = useCallback(
    (text: string) => {
      studio.setText(text);
      studio.goToStep('prepare');
      setOverlay('none');
    },
    [studio],
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground">
      <Header
        isDark={isDark}
        onToggleTheme={toggle}
        step={studio.step}
        canAdvance={studio.isValid && studio.hasPrepared}
        onNavigate={studio.goToStep}
        showStepper={overlay === 'none'}
        onOpenSettings={() => setOverlay('settings')}
        onOpenHistory={() => setOverlay('history')}
      />

      <main className="flex flex-1 flex-col overflow-y-auto lg:overflow-hidden">
        {overlay === 'settings' ? (
          <SettingsView
            isDark={isDark}
            onToggleMode={toggle}
            skin={skin}
            onSkin={setSkin}
            onBack={() => setOverlay('none')}
          />
        ) : overlay === 'history' ? (
          <HistoryView
            history={history}
            onLoad={loadFromHistory}
            onBack={() => setOverlay('none')}
          />
        ) : (
          <>
            {studio.step === 'prepare' && <PrepareStep studio={studio} font={font} />}
            {studio.step === 'preview' && <PreviewStep studio={studio} font={font} />}
            {studio.step === 'finalize' && <FinalizeStep studio={studio} />}
          </>
        )}
      </main>
    </div>
  );
}

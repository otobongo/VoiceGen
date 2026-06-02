import { useState } from 'react';
import { useStudio } from '@/hooks/useStudio';
import { useTheme } from '@/hooks/useTheme';
import { useEditorFontSize } from '@/hooks/useEditorFontSize';
import { Header } from './Header';
import { PrepareStep } from './PrepareStep';
import { PreviewStep } from './PreviewStep';
import { FinalizeStep } from './FinalizeStep';
import { SettingsView } from './SettingsView';

export function Studio() {
  const { isDark, toggle, skin, setSkin } = useTheme();
  const studio = useStudio();
  // Shared by the Prepare and Preview editors, persisted across sessions.
  const font = useEditorFontSize();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground">
      <Header
        isDark={isDark}
        onToggleTheme={toggle}
        step={studio.step}
        canAdvance={studio.isValid && studio.hasPrepared}
        onNavigate={studio.goToStep}
        showStepper={!showSettings}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main className="flex flex-1 flex-col overflow-y-auto lg:overflow-hidden">
        {showSettings ? (
          <SettingsView
            isDark={isDark}
            onToggleMode={toggle}
            skin={skin}
            onSkin={setSkin}
            onBack={() => setShowSettings(false)}
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


import React from 'react';
import { VoiceName, VOICE_OPTIONS } from '../types';

interface VoiceSelectorProps {
  selectedVoice: VoiceName;
  onSelect: (voice: VoiceName) => void;
  disabled?: boolean;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ 
  selectedVoice, onSelect, disabled
}) => {
  return (
    <div className="space-y-4" role="group" aria-labelledby="voice-selector-label">
      <div className="flex items-center justify-between pb-2">
        <div id="voice-selector-label" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Voice Module</div>
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {VOICE_OPTIONS.map(opt => {
          const isSelected = selectedVoice === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => !disabled && onSelect(opt.id)}
              disabled={disabled}
              data-selected={isSelected}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                isSelected 
                  ? 'border-border bg-muted/50' 
                  : 'border-border bg-card hover:border-foreground/20'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-4">
                {/* Custom Radio Button */}
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  isSelected ? 'border-foreground' : 'border-muted-foreground/40'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-foreground" />}
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {opt.name}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                    {opt.gender} • {opt.description}
                  </span>
                </div>
              </div>

              <div className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider transition-colors ${
                isSelected 
                  ? 'bg-foreground text-background' 
                  : 'text-muted-foreground'
              }`}>
                CH-{opt.id.slice(0, 2).toUpperCase()}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default VoiceSelector;

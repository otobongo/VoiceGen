import { ChevronDown } from 'lucide-react';
import { PERSONA_OPTIONS, type PersonaType } from '@/lib/types';

interface PersonaSelectProps {
  value: PersonaType;
  onChange: (p: PersonaType) => void;
}

/** Styled native select — accessible by default, matches the reference UI. */
export function PersonaSelect({ value, onChange }: PersonaSelectProps) {
  return (
    <div className="relative">
      <label htmlFor="persona" className="label-micro mb-2 block">
        Persona style
      </label>
      <div className="relative">
        <select
          id="persona"
          value={value}
          onChange={(e) => onChange(e.target.value as PersonaType)}
          className="h-10 w-full appearance-none rounded-md border border-border bg-card px-3 pr-9 text-sm text-foreground transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {PERSONA_OPTIONS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}

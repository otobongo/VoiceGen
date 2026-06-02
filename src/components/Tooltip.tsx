import React from 'react';
import { cn } from '@/lib/cn';

interface TooltipProps {
  label: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

/**
 * Hover/focus tooltip. The trigger wrapper is focusable-transparent: the child
 * (a button) carries focus, and the tooltip also shows on keyboard focus via
 * group-focus-within so it's not mouse-only.
 */
export function Tooltip({ label, children, side = 'top', className }: TooltipProps) {
  return (
    <span className={cn('relative inline-flex group/tt', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap',
          'rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground',
          'shadow-popover opacity-0 transition-opacity duration-150',
          'group-hover/tt:opacity-100 group-focus-within/tt:opacity-100',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        {label}
      </span>
    </span>
  );
}

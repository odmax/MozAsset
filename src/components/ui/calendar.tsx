'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type CalendarProps = {
  className?: string;
};

export function Calendar({ className }: CalendarProps) {
  return (
    <div className={cn('p-3 border rounded-md bg-card', className)}>
      <p className="text-sm text-muted-foreground">
        Calendar component - use native HTML date input fields instead
      </p>
    </div>
  );
}

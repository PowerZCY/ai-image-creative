'use client';

import * as React from 'react';
import { cn } from '@windrun-huaiin/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({
  className,
  ...props
}, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-24 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm leading-6 text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus-visible:border-(--monica-accent) focus-visible:ring-4 focus-visible:ring-(--monica-accent-soft) disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };

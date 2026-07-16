'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';

export function PublicImageCloseButton({ mode = 'gallery' }: { mode?: 'back' | 'gallery' }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (mode === 'back') {
          router.back();
        } else {
          router.push('/gallery');
        }
      }}
      className="grid size-10 place-items-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground"
      aria-label="Close image detail"
    >
      <X className="size-5" />
    </button>
  );
}

export function PublicImagePromptCopyButton({
  promptText,
  copyPromptLabel = 'Copy',
  copiedLabel = 'Copied',
}: {
  promptText: string;
  copyPromptLabel?: string;
  copiedLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    if (!promptText) return;
    await navigator.clipboard?.writeText(promptText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  if (!promptText) return null;

  return (
    <button
      type="button"
      onClick={() => void copyPrompt()}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium normal-case tracking-normal text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
      {copied ? copiedLabel : copyPromptLabel}
    </button>
  );
}

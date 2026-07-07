'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, Copy, Heart, X } from 'lucide-react';

async function readError(response: Response) {
  try {
    const data = await response.json() as { error?: unknown };
    return typeof data.error === 'string' ? data.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

export function PublicImageCloseButton({ mode = 'explore' }: { mode?: 'back' | 'explore' }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (mode === 'back') {
          router.back();
        } else {
          router.push('/explore');
        }
      }}
      className="grid size-10 place-items-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground"
      aria-label="Close image detail"
    >
      <X className="size-5" />
    </button>
  );
}

export function PublicImageDetailActions({
  publicImageId,
  usePromptLabel = 'Use prompt',
  saveLabel = 'Save',
}: {
  publicImageId: string;
  usePromptLabel?: string;
  saveLabel?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveImage() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/monica/public-images/${publicImageId}/save`, {
        method: 'POST',
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error(await readError(response));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-100">
          {error}
        </div>
      ) : null}
      <div className="flex gap-2">
        <button type="button" onClick={() => { window.location.href = '/'; }} className="monica-button-primary flex-1">
          {usePromptLabel}
        </button>
        <button
          type="button"
          onClick={() => void saveImage()}
          disabled={saving}
          className="grid size-11 shrink-0 place-items-center rounded-md border border-border hover:bg-muted disabled:opacity-50"
          aria-label={saveLabel}
        >
          <Heart className="size-4" />
        </button>
      </div>
    </div>
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

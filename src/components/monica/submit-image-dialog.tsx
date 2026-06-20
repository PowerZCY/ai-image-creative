'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { SpinnerLabel } from './list-components';

export type SubmitImageTarget = {
  imageId: string;
  imageUrl?: string | null;
  width?: number | null;
  height?: number | null;
  defaultThemeId?: string | null;
};

type ThemeOption = {
  id: string;
  title: string;
  brief?: string | null;
};

export type SubmitImageDialogCopy = {
  title: string;
  close: string;
  cancel: string;
  submit: string;
  englishTitle: string;
  englishTitlePlaceholder: string;
  theme: string;
  creationNote: string;
  creationNotePlaceholder: string;
  hint: string;
  loadingThemes: string;
  noThemes: string;
  duplicate: string;
  titleRequired: string;
  themeRequired: string;
};

async function readError(response: Response) {
  try {
    const data = await response.json() as { error?: unknown };
    return typeof data.error === 'string' ? data.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

function dimensions(target: SubmitImageTarget) {
  return {
    width: target.width || 1024,
    height: target.height || 1024,
  };
}

export function SubmitImageDialog({
  target,
  defaultThemeId,
  copy,
  onClose,
  onSubmitted,
}: {
  target: SubmitImageTarget;
  defaultThemeId?: string | number | bigint | null;
  copy: SubmitImageDialogCopy;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [themesLoading, setThemesLoading] = useState(true);
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [title, setTitle] = useState('');
  const [creationNote, setCreationNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preferredThemeId = useMemo(() => (
    target.defaultThemeId ?? defaultThemeId?.toString() ?? ''
  ), [defaultThemeId, target.defaultThemeId]);

  useEffect(() => {
    let active = true;

    async function loadThemes() {
      setThemesLoading(true);
      try {
        const response = await fetch('/api/monica/themes/search', {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({
            page: 1,
            pageSize: 100,
            filters: { keyword: '' },
          }),
        });
        if (!response.ok) throw new Error(await readError(response));
        const data = await response.json() as { items?: ThemeOption[] };
        if (!active) return;

        const nextThemes = data.items ?? [];
        setThemes(nextThemes);
        const preferred = preferredThemeId && nextThemes.some((theme) => theme.id === preferredThemeId)
          ? preferredThemeId
          : nextThemes[0]?.id ?? '';
        setSelectedThemeId(preferred);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      } finally {
        if (active) setThemesLoading(false);
      }
    }

    void loadThemes();
    return () => {
      active = false;
    };
  }, [preferredThemeId]);

  async function submitImage() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError(copy.titleRequired);
      return;
    }
    if (!selectedThemeId) {
      setError(copy.themeRequired);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/monica/submissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          imageId: target.imageId,
          themeId: selectedThemeId,
          title: cleanTitle,
          creatorNote: creationNote,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      onSubmitted?.();
      onClose();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : String(submitError);
      setError(message.includes('already been submitted') ? copy.duplicate : message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogShell title={copy.title} closeLabel={copy.close} onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        {target.imageUrl ? (
          <Image
            src={target.imageUrl}
            alt=""
            width={dimensions(target).width}
            height={dimensions(target).height}
            unoptimized
            className="aspect-square w-full rounded-md object-cover"
          />
        ) : (
          <div className="aspect-square rounded-md bg-muted" />
        )}

        <div className="space-y-4">
          {error ? (
            <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-100">
              {error}
            </div>
          ) : null}

          <label className="block">
            <span className="text-sm font-medium">{copy.englishTitle} *</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="monica-input mt-2 h-11 w-full px-3"
              placeholder={copy.englishTitlePlaceholder}
              maxLength={255}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">{copy.theme} *</span>
            <select
              value={selectedThemeId}
              onChange={(event) => setSelectedThemeId(event.target.value)}
              disabled={themesLoading || themes.length === 0}
              className="monica-input mt-2 h-11 w-full px-3 disabled:opacity-60"
            >
              {themes.length === 0 ? (
                <option value="">{themesLoading ? copy.loadingThemes : copy.noThemes}</option>
              ) : themes.map((theme) => (
                <option key={theme.id} value={theme.id}>{theme.title}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium">{copy.creationNote}</span>
            <textarea
              value={creationNote}
              onChange={(event) => setCreationNote(event.target.value)}
              className="monica-input mt-2 w-full resize-none px-3 py-2"
              placeholder={copy.creationNotePlaceholder}
              rows={4}
            />
          </label>

          <p className="text-xs leading-5 text-muted-foreground">{copy.hint}</p>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="monica-button-secondary min-h-10 px-3 text-sm">
              {copy.cancel}
            </button>
            <button
              type="button"
              onClick={() => void submitImage()}
              disabled={submitting || !selectedThemeId || !title.trim()}
              className="monica-button-primary min-h-10 px-3 text-sm disabled:opacity-50"
            >
              {submitting ? <SpinnerLabel>{copy.submit}</SpinnerLabel> : copy.submit}
            </button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}

export function DialogShell({
  title,
  closeLabel,
  children,
  onClose,
}: {
  title: string;
  closeLabel: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6 backdrop-blur-md">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg border border-border bg-background shadow-2xl ring-1 ring-foreground/10">
        <div className="flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-md border border-border hover:bg-muted" aria-label={closeLabel}>
            <X className="size-4" />
          </button>
        </div>
        <div className="bg-background p-5">{children}</div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import { SpinnerLabel } from './list-components';
import { useMonicaSignUp } from './use-monica-sign-up';

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
  const { isSignedIn, openMonicaSignUp } = useMonicaSignUp();
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [themesLoading, setThemesLoading] = useState(true);
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [title, setTitle] = useState('');
  const [creationNote, setCreationNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const preferredThemeId = useMemo(() => (
    target.defaultThemeId ?? defaultThemeId?.toString() ?? ''
  ), [defaultThemeId, target.defaultThemeId]);
  const selectedTheme = themes.find((theme) => theme.id === selectedThemeId) ?? null;

  useEffect(() => {
    let active = true;

    async function loadThemes() {
      setThemesLoading(true);
      try {
        const response = await fetch('/api/monica/themes/list', {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({
            page: 1,
            pageSize: 100,
            filters: {},
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

  useEffect(() => {
    if (!themeDropdownOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const targetElement = event.target;
      if (!(targetElement instanceof Element)) return;
      if (targetElement.closest('[data-submit-theme-dropdown]')) return;
      setThemeDropdownOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [themeDropdownOpen]);

  async function submitImage() {
    if (!isSignedIn) {
      onClose();
      void openMonicaSignUp();
      return;
    }
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
      <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
        {target.imageUrl ? (
          <Image
            src={target.imageUrl}
            alt=""
            width={dimensions(target).width}
            height={dimensions(target).height}
            unoptimized
            className="aspect-square w-full rounded-lg border border-neutral-200 object-cover"
          />
        ) : (
          <div className="aspect-square rounded-lg border border-neutral-200 bg-neutral-100" />
        )}

        <div className="space-y-4">
          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <label className="block">
            <span className="text-sm font-medium leading-none text-neutral-900">{copy.theme} *</span>
            <div className="relative mt-2" data-submit-theme-dropdown>
              <button
                type="button"
                onClick={() => setThemeDropdownOpen((open) => !open)}
                disabled={themesLoading || themes.length === 0}
                className="inline-flex h-10 w-full items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 shadow-sm outline-none transition hover:border-(--monica-accent-line) hover:bg-neutral-50 focus-visible:border-(--monica-accent) focus-visible:ring-4 focus-visible:ring-(--monica-accent-soft) disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="truncate">
                  {selectedTheme?.title ?? (themesLoading ? copy.loadingThemes : copy.noThemes)}
                </span>
                <ChevronDown className={cn('size-4 shrink-0 text-neutral-500 transition', themeDropdownOpen ? 'rotate-180' : '')} />
              </button>
              {themeDropdownOpen && themes.length > 0 ? (
                <div className="absolute left-0 top-[calc(100%+6px)] z-20 grid max-h-64 w-full gap-1 overflow-auto rounded-md border border-neutral-200 bg-white p-1 shadow-xl shadow-black/15">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        setSelectedThemeId(theme.id);
                        setThemeDropdownOpen(false);
                      }}
                      className={cn(
                        'min-h-9 rounded px-3 py-2 text-left text-sm font-medium transition',
                        selectedThemeId === theme.id
                          ? 'bg-(--monica-accent-soft) text-neutral-950'
                          : 'text-neutral-800 hover:bg-neutral-100',
                      )}
                    >
                      {theme.title}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium leading-none text-neutral-900">{copy.englishTitle} *</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus-visible:border-(--monica-accent) focus-visible:ring-4 focus-visible:ring-(--monica-accent-soft)"
              placeholder={copy.englishTitlePlaceholder}
              maxLength={255}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium leading-none text-neutral-900">{copy.creationNote}</span>
            <textarea
              value={creationNote}
              onChange={(event) => setCreationNote(event.target.value)}
              className="mt-2 flex min-h-24 w-full resize-none rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm leading-6 text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus-visible:border-(--monica-accent) focus-visible:ring-4 focus-visible:ring-(--monica-accent-soft)"
              placeholder={copy.creationNotePlaceholder}
              rows={4}
            />
          </label>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-900 shadow-sm transition hover:bg-neutral-50">
              {copy.cancel}
            </button>
            <button
              type="button"
              onClick={() => void submitImage()}
              disabled={submitting || !selectedThemeId || !title.trim()}
              className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 disabled:pointer-events-none disabled:opacity-50"
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
    <div className="fixed inset-x-0 bottom-0 top-[calc(var(--fd-banner-height)+var(--fd-header-height)+0.5rem)] z-[1000] grid place-items-center bg-black/60 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[calc(100dvh-var(--fd-banner-height)-var(--fd-header-height)-2rem)] w-full max-w-3xl overflow-auto rounded-xl border border-neutral-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4">
          <h2 className="text-lg font-semibold leading-none tracking-tight text-neutral-950">{title}</h2>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950" aria-label={closeLabel}>
            <X className="size-4" />
          </button>
        </div>
        <div className="bg-white p-5">{children}</div>
      </div>
    </div>
  );
}

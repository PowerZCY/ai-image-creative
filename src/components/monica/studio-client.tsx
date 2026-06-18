'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Eye, ImagePlus, Send, X } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import {
  themeButtonGradientClass,
  themeButtonGradientHoverClass,
  themeHeroEyesOnClass,
} from '@windrun-huaiin/base-ui/lib';
import type { MonicaStudioCopy } from './copy';
import { monicaContentWidthClass } from './layout';
import {
  FilterPills,
  ListShell,
  ReviewFlowInline,
  SearchInput,
  SpinnerLabel,
  StatusBadge,
  getStatusTone,
  useMonicaPagedList,
} from './list-components';

type StudioImage = {
  imageId: string;
  imageUrl?: string | null;
  width?: number | null;
  height?: number | null;
  status: string;
  isLocked?: boolean;
  themeId?: string | null;
  theme?: { id: string; title: string; brief?: string | null } | null;
  promptUsed?: string | null;
  model?: string | null;
  style?: string | null;
  ratio?: string | null;
  createdAt?: string | null;
  submissions?: Array<{ id?: string; status: string; reviewFlow?: unknown } | undefined>;
  publicImage?: { publicImageId: string; title?: string | null } | null;
};

type ThemeOption = {
  id: string;
  title: string;
  brief?: string | null;
};

type StudioFilters = {
  keyword: string;
  status: string;
  locked: string;
};

async function readError(response: Response) {
  try {
    const data = await response.json() as { error?: unknown };
    return typeof data.error === 'string' ? data.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

function imageDimensions(image: StudioImage) {
  if (image.width && image.height) return { width: image.width, height: image.height };
  return { width: 1024, height: 1024 };
}

function truncate(value?: string | null, max = 220) {
  const text = value?.trim() ?? '';
  return text.length > max ? `${text.slice(0, max).trimEnd()}...` : text;
}

export function StudioClient({ copy }: { copy: MonicaStudioCopy }) {
  const list = useMonicaPagedList<StudioFilters, StudioImage>({
    endpoint: '/api/monica/studio/images/search',
    initialFilters: { keyword: '', status: 'all', locked: 'all' },
    pageSize: 12,
  });
  const [promptTarget, setPromptTarget] = useState<StudioImage | null>(null);
  const [submitTarget, setSubmitTarget] = useState<StudioImage | null>(null);
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [themesLoading, setThemesLoading] = useState(true);
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [title, setTitle] = useState('');
  const [creationNote, setCreationNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const statusOptions = [
    { value: 'all', label: copy.tabs.all },
    { value: 'generated', label: copy.tabs.generated },
    { value: 'submitted', label: copy.tabs.submitted },
    { value: 'approved', label: copy.statusLabels.approved ?? 'Approved' },
    { value: 'rejected', label: copy.tabs.rejected },
  ];
  const lockOptions = [
    { value: 'all', label: 'All lock states' },
    { value: 'unlocked', label: 'Editable' },
    { value: 'locked', label: 'Locked' },
  ];

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
        if (active) {
          setThemes(data.items ?? []);
        }
      } catch (error) {
        if (active) {
          setActionError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (active) {
          setThemesLoading(false);
        }
      }
    }

    void loadThemes();
    return () => {
      active = false;
    };
  }, []);

  async function submitImage() {
    if (!submitTarget) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const response = await fetch('/api/monica/submissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          imageId: submitTarget.imageId,
          themeId: selectedThemeId,
          title,
          creatorNote: creationNote,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setSubmitTarget(null);
      setSelectedThemeId('');
      setTitle('');
      setCreationNote('');
      list.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="min-h-screen px-4 py-20 md:px-8 md:py-24">
      <div className={monicaContentWidthClass}>
        <div className="mb-8">
          <h1 className={cn('bg-clip-text text-3xl font-semibold text-transparent md:text-5xl', themeHeroEyesOnClass)}>
            {copy.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{copy.description}</p>
        </div>

        {actionError ? (
          <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-100">
            {actionError}
          </div>
        ) : null}

        <ListShell
          title={copy.myImages}
          description="Generated images, submission state, and public publishing controls."
          items={list.items}
          loading={list.loading}
          error={list.error}
          empty={copy.empty}
          pagination={list.pagination}
          onPageChange={list.setPage}
          filters={(
            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto_auto] lg:items-end">
              <SearchInput
                value={list.filters.keyword}
                placeholder="Search prompt or metadata"
                onChange={(keyword) => list.updateFilters({ keyword })}
              />
              <FilterPills
                value={list.filters.status}
                options={statusOptions}
                onChange={(status) => list.updateFilters({ status })}
              />
              <FilterPills
                value={list.filters.locked}
                options={lockOptions}
                onChange={(locked) => list.updateFilters({ locked })}
              />
            </div>
          )}
          renderItem={(image) => {
            const latestSubmission = image.submissions?.[0];
            const canSubmit = !image.isLocked && (image.status === 'generated' || image.status === 'rejected') && themes.length > 0;
            return (
              <article key={image.imageId} className="grid gap-4 rounded-lg border border-border bg-card p-3 md:grid-cols-[160px_minmax(0,1fr)_auto]">
                <div className="overflow-hidden rounded-md bg-muted">
                  {image.imageUrl ? (
                    <Image
                      src={image.imageUrl}
                      alt=""
                      width={imageDimensions(image).width}
                      height={imageDimensions(image).height}
                      unoptimized
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="grid aspect-square place-items-center text-muted-foreground">
                      <ImagePlus className="size-8" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={getStatusTone(image.status)}>{copy.statusLabels[image.status] ?? image.status}</StatusBadge>
                    <StatusBadge tone={image.isLocked ? 'warn' : 'good'}>{image.isLocked ? 'Locked' : 'Editable'}</StatusBadge>
                    {image.theme ? <span className="text-xs text-muted-foreground">{image.theme.title}</span> : null}
                  </div>
                  <p className="line-clamp-3 text-sm leading-6 text-foreground">{truncate(image.promptUsed) || copy.empty}</p>
                  {latestSubmission ? <ReviewFlowInline flow={latestSubmission.reviewFlow} /> : null}
                </div>
                <div className="flex gap-2 md:w-36 md:flex-col">
                  <button
                    type="button"
                    onClick={() => setPromptTarget(image)}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted md:flex-none"
                  >
                    <Eye className="size-4" />
                    {copy.viewPrompt}
                  </button>
                  <button
                    type="button"
                    disabled={!canSubmit}
                    onClick={() => {
                      setSubmitTarget(image);
                      setSelectedThemeId(image.themeId && themes.some((theme) => theme.id === image.themeId) ? image.themeId : themes[0]?.id ?? '');
                      setTitle('');
                      setCreationNote('');
                    }}
                    className={cn(
                      'inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-45 md:flex-none',
                      themeButtonGradientClass,
                      themeButtonGradientHoverClass,
                    )}
                  >
                    <Send className="size-4" />
                    {copy.submitImage}
                  </button>
                </div>
              </article>
            );
          }}
        />
      </div>

      {promptTarget ? (
        <StudioModal title={copy.viewPrompt} closeLabel={copy.close} onClose={() => setPromptTarget(null)}>
          <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-4 text-sm leading-6">
            {promptTarget.promptUsed || copy.empty}
          </p>
        </StudioModal>
      ) : null}

      {submitTarget ? (
        <StudioModal title={copy.submitImage} closeLabel={copy.close} onClose={() => setSubmitTarget(null)}>
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            {submitTarget.imageUrl ? (
              <Image
                src={submitTarget.imageUrl}
                alt=""
                width={imageDimensions(submitTarget).width}
                height={imageDimensions(submitTarget).height}
                unoptimized
                className="aspect-square w-full rounded-md object-cover"
              />
            ) : null}
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium">{copy.theme}</span>
                <select
                  value={selectedThemeId}
                  onChange={(event) => setSelectedThemeId(event.target.value)}
                  disabled={themesLoading || themes.length === 0}
                  className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none disabled:opacity-60"
                >
                  {themes.length === 0 ? (
                    <option value="">{themesLoading ? 'Loading themes...' : 'No published themes'}</option>
                  ) : themes.map((theme) => (
                    <option key={theme.id} value={theme.id}>{theme.title}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium">Image title</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none"
                  placeholder="A lonely figure under a red sun"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">{copy.creatorNote}</span>
                <textarea
                  value={creationNote}
                  onChange={(event) => setCreationNote(event.target.value)}
                  className="mt-2 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
                  placeholder={copy.creatorNotePlaceholder}
                  rows={4}
                />
              </label>
              <p className="text-xs leading-5 text-muted-foreground">{copy.submitHint}</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setSubmitTarget(null)} className="h-10 rounded-md border border-border px-3 text-sm hover:bg-muted">
                  {copy.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => void submitImage()}
                  disabled={submitting || !selectedThemeId}
                  className={cn('h-10 rounded-md px-3 text-sm font-medium text-white disabled:opacity-50', themeButtonGradientClass)}
                >
                  {submitting ? <SpinnerLabel>{copy.submitImage}</SpinnerLabel> : copy.submitImage}
                </button>
              </div>
            </div>
          </div>
        </StudioModal>
      ) : null}
    </section>
  );
}

function StudioModal({
  title,
  closeLabel,
  children,
  onClose,
}: {
  title: string;
  closeLabel: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 px-4 py-6 backdrop-blur-md">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg border border-border bg-background shadow-2xl ring-1 ring-foreground/10">
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-md border border-border hover:bg-muted" aria-label={closeLabel}>
            <X className="size-4" />
          </button>
        </div>
        <div className="bg-background p-4">{children}</div>
      </div>
    </div>
  );
}

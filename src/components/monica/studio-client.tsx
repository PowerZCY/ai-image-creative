'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye, ImagePlus, Send } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import type { MonicaCreatorCopy, MonicaStudioCopy } from './copy';
import { MonicaCreator } from './creator-client';
import { monicaContentWidthClass } from './layout';
import {
  FilterPills,
  ReviewFlowInline,
  SearchInput,
  StatusBadge,
  getStatusTone,
  type Pagination,
  useMonicaPagedList,
} from './list-components';
import { DialogShell, SubmitImageDialog } from './submit-image-dialog';

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

type StudioFilters = {
  keyword: string;
  tab: string;
  submissionStatus: string;
};

type StudioThemeOption = {
  id: string;
  title: string;
  brief?: string | null;
  generatorIdeas?: unknown[];
};

function imageDimensions(image: StudioImage) {
  if (image.width && image.height) return { width: image.width, height: image.height };
  return { width: 1024, height: 1024 };
}

function truncate(value?: string | null, max = 220) {
  const text = value?.trim() ?? '';
  return text.length > max ? `${text.slice(0, max).trimEnd()}...` : text;
}

async function readError(response: Response) {
  try {
    const data = await response.json() as { error?: unknown };
    return typeof data.error === 'string' ? data.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

export function StudioClient({ copy, creatorCopy }: { copy: MonicaStudioCopy; creatorCopy: MonicaCreatorCopy }) {
  const list = useMonicaPagedList<StudioFilters, StudioImage>({
    endpoint: '/api/monica/studio/images/search',
    initialFilters: { keyword: '', tab: 'all', submissionStatus: 'all' },
    pageSize: 12,
  });
  const [promptTarget, setPromptTarget] = useState<StudioImage | null>(null);
  const [submitTarget, setSubmitTarget] = useState<StudioImage | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [themes, setThemes] = useState<StudioThemeOption[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);
  const [selectedIdeaThemeId, setSelectedIdeaThemeId] = useState('');
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  const tabOptions = [
    { value: 'all', label: copy.tabs.all },
    { value: 'submitted', label: copy.tabs.submitted },
  ];
  const submissionStatusOptions = [
    { value: 'all', label: copy.tabs.submitted },
    { value: 'under_review', label: copy.filters.pendingReview },
    { value: 'approved', label: copy.tabs.approved },
    { value: 'rejected', label: copy.tabs.rejected },
  ];
  const selectedIdeaTheme = themes.find((theme) => theme.id === selectedIdeaThemeId) ?? null;

  async function loadThemes() {
    if (themes.length > 0) return;
    setThemesLoading(true);
    setActionError(null);
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
      const data = await response.json() as { items?: StudioThemeOption[] };
      setThemes(data.items ?? []);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setThemesLoading(false);
    }
  }

  async function openThemePicker() {
    setThemePickerOpen(true);
    await loadThemes();
  }

  function chooseIdeaTheme(themeId: string) {
    setSelectedIdeaThemeId(themeId);
    setThemePickerOpen(false);
  }

  return (
    <section className="monica-surface min-h-screen py-20 md:py-24">
      <div className={monicaContentWidthClass}>
        <div className="mb-8">
          <h1 className="monica-page-title">
            {copy.title}
          </h1>
          <p className="monica-copy mt-4 max-w-3xl">{copy.description}</p>
        </div>

        {actionError ? (
          <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-100">
            {actionError}
          </div>
        ) : null}

        <div className="mb-8 monica-panel-soft p-5">
          <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="monica-section-title">{copy.createTitle}</h2>
              <p className="monica-small-copy mt-2">
                {selectedIdeaTheme ? selectedIdeaTheme.title : copy.noIdeaTheme}
              </p>
            </div>
          </div>
          <MonicaCreator
            key={selectedIdeaTheme?.id ?? 'free'}
            copy={creatorCopy}
            sourcePage="studio"
            mode="studio"
            themeId={selectedIdeaTheme?.id}
            themeLabel={selectedIdeaTheme?.title}
            initialAssistantOpen={Boolean(selectedIdeaTheme)}
            onRequestThemeIdeas={() => void openThemePicker()}
            starterIdeas={selectedIdeaTheme?.generatorIdeas ?? []}
          />
        </div>

        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">{copy.myImages}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Generated images, submission state, and public publishing controls.</p>
            </div>
          </div>
          <div className="monica-panel-soft p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-end">
              <SearchInput
                value={list.filters.keyword}
                placeholder={copy.filters.searchPlaceholder}
                onChange={(keyword) => list.updateFilters({ keyword })}
              />
              <FilterPills
                value={list.filters.tab}
                options={tabOptions}
                onChange={(tab) => list.updateFilters({ tab, submissionStatus: tab === 'submitted' ? list.filters.submissionStatus : 'all' })}
              />
              {list.filters.tab === 'submitted' ? (
                <FilterPills
                  value={list.filters.submissionStatus}
                  options={submissionStatusOptions}
                  onChange={(submissionStatus) => list.updateFilters({ submissionStatus })}
                />
              ) : null}
            </div>
          </div>

          {list.error ? (
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-100">{list.error}</div>
          ) : list.loading ? (
            <StudioImageSkeleton />
          ) : list.items.length === 0 ? (
            <div className="rounded-lg border border-border bg-card/60 p-6 text-sm text-muted-foreground">{copy.empty}</div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.items.map((image) => (
                <StudioImageCard
                  key={image.imageId}
                  image={image}
                  copy={copy}
                  onViewPrompt={() => setPromptTarget(image)}
                  onSubmit={() => setSubmitTarget(image)}
                />
              ))}
            </div>
          )}
          <StudioPagination pagination={list.pagination} onPageChange={list.setPage} />
        </section>
      </div>

      {promptTarget ? (
        <DialogShell title={copy.viewPrompt} closeLabel={copy.close} onClose={() => setPromptTarget(null)}>
          <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-4 text-sm leading-6">
            {promptTarget.promptUsed || copy.empty}
          </p>
        </DialogShell>
      ) : null}

      {submitTarget ? (
        <SubmitImageDialog
          target={{
            imageId: submitTarget.imageId,
            imageUrl: submitTarget.imageUrl,
            width: submitTarget.width,
            height: submitTarget.height,
            defaultThemeId: submitTarget.themeId,
          }}
          copy={copy.submitDialog}
          onClose={() => setSubmitTarget(null)}
          onSubmitted={() => list.reload()}
        />
      ) : null}

      {themePickerOpen ? (
        <DialogShell title={copy.ideaThemeLabel} closeLabel={copy.close} onClose={() => setThemePickerOpen(false)}>
          <div className="grid gap-3">
            {themesLoading ? (
              <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">{copy.loading}</div>
            ) : themes.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">{copy.noIdeaTheme}</div>
            ) : (
              themes.map((theme) => (
                <div key={theme.id} className="flex items-center justify-between gap-4 rounded-md border border-border bg-card/60 p-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground">{theme.title}</div>
                    {theme.brief ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{theme.brief}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => chooseIdeaTheme(theme.id)}
                    className="h-9 shrink-0 rounded-md border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted"
                  >
                    {copy.ideaThemeLabel}
                  </button>
                </div>
              ))
            )}
          </div>
        </DialogShell>
      ) : null}
    </section>
  );
}

function StudioImageCard({
  image,
  copy,
  onViewPrompt,
  onSubmit,
}: {
  image: StudioImage;
  copy: MonicaStudioCopy;
  onViewPrompt: () => void;
  onSubmit: () => void;
}) {
  const latestSubmission = image.submissions?.[0];
  const canSubmit = !image.isLocked && (image.status === 'generated' || image.status === 'rejected');

  return (
    <article className="group overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative overflow-hidden bg-muted">
        {image.imageUrl ? (
          <Image
            src={image.imageUrl}
            alt=""
            width={imageDimensions(image).width}
            height={imageDimensions(image).height}
            unoptimized
            className="aspect-square w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid aspect-square place-items-center text-muted-foreground">
            <ImagePlus className="size-8" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <StatusBadge tone={getStatusTone(latestSubmission?.status ?? image.status)}>{copy.statusLabels[latestSubmission?.status ?? image.status] ?? latestSubmission?.status ?? image.status}</StatusBadge>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="line-clamp-2 min-h-12 text-base leading-7 text-foreground">{truncate(image.promptUsed, 140) || copy.empty}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
            {image.theme ? <span>{image.theme.title}</span> : <span>{copy.noTheme}</span>}
            {image.model ? <span>{image.model}</span> : null}
            {image.ratio ? <span>{image.ratio}</span> : null}
          </div>
        </div>
        {latestSubmission ? <ReviewFlowInline flow={latestSubmission.reviewFlow} /> : null}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onViewPrompt}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-semibold hover:bg-muted"
          >
            <Eye className="size-3.5" />
            {copy.viewPrompt}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className={cn(
              'inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foreground px-3 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-45 hover:bg-black',
            )}
          >
            <Send className="size-3.5" />
            {copy.submitImage}
          </button>
        </div>
      </div>
    </article>
  );
}

function StudioImageSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-lg bg-muted" />)}
    </div>
  );
}

function StudioPagination({ pagination, onPageChange }: { pagination: Pagination; onPageChange: (page: number) => void }) {
  if (pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>Page {pagination.page} of {pagination.totalPages}</span>
      <div className="flex gap-2">
        <button type="button" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)} className="h-9 rounded-md border border-border px-3 disabled:opacity-50">Previous</button>
        <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)} className="h-9 rounded-md border border-border px-3 disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}

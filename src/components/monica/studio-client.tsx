'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Download, Heart, ImagePlus, Loader2, Send, Trash2 } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import type { MonicaCreatorCopy, MonicaStudioCopy } from './copy';
import { MonicaCreator } from './creator-client';
import { monicaContentWidthClass } from './layout';
import {
  StatusBadge,
  getStatusTone,
  useMonicaPagedList,
} from './list-components';
import { DialogShell, SubmitImageDialog } from './submit-image-dialog';

type StudioImage = {
  imageId: string;
  jobId?: string | null;
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

type StudioImageBatch = {
  batchId: string;
  dateKey: string;
  dateLabel: string;
  prompt?: string | null;
  model?: string | null;
  style?: string | null;
  ratio?: string | null;
  theme?: StudioImage['theme'];
  createdAt?: string | null;
  images: StudioImage[];
};

type StudioDateGroup = {
  dateKey: string;
  dateLabel: string;
  batches: StudioImageBatch[];
};

type StudioFilters = {
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

function getRatioClassName(ratio?: string | null) {
  if (ratio === '4:5') return 'aspect-[4/5]';
  if (ratio === '9:16') return 'aspect-[9/16]';
  if (ratio === '16:9') return 'aspect-[16/9]';
  return 'aspect-square';
}

function formatCreatedAt(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDateInfo(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const key = validDate.toISOString().slice(0, 10);
  const todayKey = today.toISOString().slice(0, 10);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  if (key === todayKey) return { key, label: 'Today' };
  if (key === yesterdayKey) return { key, label: 'Yesterday' };
  return {
    key,
    label: validDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
}

function groupStudioImages(images: StudioImage[]): StudioImageBatch[] {
  const batches = new Map<string, StudioImageBatch>();

  for (const image of images) {
    const batchId = image.jobId || image.imageId;
    const existing = batches.get(batchId);
    if (existing) {
      existing.images.push(image);
      continue;
    }

    const dateInfo = getDateInfo(image.createdAt);
    batches.set(batchId, {
      batchId,
      dateKey: dateInfo.key,
      dateLabel: dateInfo.label,
      prompt: image.promptUsed,
      model: image.model,
      style: image.style,
      ratio: image.ratio,
      theme: image.theme,
      createdAt: image.createdAt,
      images: [image],
    });
  }

  return [...batches.values()];
}

function groupBatchesByDate(batches: StudioImageBatch[]): StudioDateGroup[] {
  const groups = new Map<string, StudioDateGroup>();

  for (const batch of batches) {
    const existing = groups.get(batch.dateKey);
    if (existing) {
      existing.batches.push(batch);
      continue;
    }

    groups.set(batch.dateKey, {
      dateKey: batch.dateKey,
      dateLabel: batch.dateLabel,
      batches: [batch],
    });
  }

  return [...groups.values()];
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
    initialFilters: { tab: 'all', submissionStatus: 'all' },
    pageSize: 80,
  });
  const [submitTarget, setSubmitTarget] = useState<StudioImage | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [themes, setThemes] = useState<StudioThemeOption[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);
  const [selectedIdeaThemeId, setSelectedIdeaThemeId] = useState('');
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [favoriteImageIds, setFavoriteImageIds] = useState<Set<string>>(() => new Set());
  const [downloadingImageIds, setDownloadingImageIds] = useState<Set<string>>(() => new Set());
  const [deletingImageIds, setDeletingImageIds] = useState<Set<string>>(() => new Set());

  const tabOptions = [
    { value: 'all', label: copy.tabs.all },
    { value: 'submitted', label: copy.tabs.submitted },
  ];
  const submittedStatusValues = ['under_review', 'approved', 'rejected'];
  const submissionStatusOptions = [
    { value: 'under_review', label: copy.filters.pendingReview },
    { value: 'approved', label: copy.tabs.approved },
    { value: 'rejected', label: copy.tabs.rejected },
  ];
  const selectedIdeaTheme = themes.find((theme) => theme.id === selectedIdeaThemeId) ?? null;
  const imageBatches = groupStudioImages(list.items);
  const dateGroups = groupBatchesByDate(imageBatches);

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

  function handleGenerationUpdated() {
    if (list.filters.tab === 'all') {
      list.reload();
      return;
    }

    list.updateFilters({ tab: 'all', submissionStatus: 'all' });
  }

  function toggleFavorite(imageId: string) {
    setFavoriteImageIds((current) => {
      const next = new Set(current);
      if (next.has(imageId)) next.delete(imageId);
      else next.add(imageId);
      return next;
    });
  }

  async function handleDownloadImage(image: StudioImage) {
    if (!image.imageUrl) return;
    setDownloadingImageIds((current) => new Set(current).add(image.imageId));
    setActionError(null);

    try {
      const response = await fetch(image.imageUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `monica-${image.imageId}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Download failed');
    } finally {
      setDownloadingImageIds((current) => {
        const next = new Set(current);
        next.delete(image.imageId);
        return next;
      });
    }
  }

  async function handleDeleteImage(image: StudioImage) {
    if (image.isLocked || (image.status !== 'generated' && image.status !== 'rejected')) return;
    setDeletingImageIds((current) => new Set(current).add(image.imageId));
    setActionError(null);

    try {
      const response = await fetch(`/api/monica/studio/images/${image.imageId}`, {
        method: 'DELETE',
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error(await readError(response));
      list.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setDeletingImageIds((current) => {
        const next = new Set(current);
        next.delete(image.imageId);
        return next;
      });
    }
  }

  return (
    <section className="monica-surface min-h-screen py-20 md:py-24">
      <div className={monicaContentWidthClass}>
        {actionError ? (
          <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-100">
            {actionError}
          </div>
        ) : null}

        <section className="mx-auto mb-12 grid w-full max-w-[1000px] gap-4">
          <div className="px-3">
            <div>
              <h2 className="monica-section-title">{copy.createTitle}</h2>
              <p className="monica-small-copy mt-2">
                {selectedIdeaTheme ? selectedIdeaTheme.title : copy.description}
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
            onGenerationUpdated={handleGenerationUpdated}
            starterIdeas={selectedIdeaTheme?.generatorIdeas ?? []}
          />
        </section>

        <section className="mx-auto w-full max-w-[1000px] space-y-4">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">{copy.myImages}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Review your creations, favorites, and submission results in one place.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StudioFilterPills
                value={list.filters.tab}
                options={tabOptions}
                onChange={(tab) => list.updateFilters({
                  tab,
                  submissionStatus: tab === 'submitted' && submittedStatusValues.includes(list.filters.submissionStatus)
                    ? list.filters.submissionStatus
                    : tab === 'submitted'
                      ? 'under_review'
                      : 'all',
                })}
              />
            </div>
          </div>
          {list.filters.tab === 'submitted' ? (
            <div className="flex flex-wrap gap-2">
              <StudioFilterPills
                value={list.filters.submissionStatus}
                options={submissionStatusOptions}
                onChange={(submissionStatus) => list.updateFilters({ submissionStatus })}
              />
            </div>
          ) : null}

          {list.error ? (
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-100">{list.error}</div>
          ) : list.loading ? (
            <StudioImageSkeleton />
          ) : list.items.length === 0 ? (
            <div className="rounded-lg border border-border bg-card/60 p-6 text-sm text-muted-foreground">{copy.empty}</div>
          ) : (
            <div className="grid gap-12">
              {dateGroups.map((group) => (
                <section key={group.dateKey} className="grid gap-5">
                  <h3 className="text-2xl font-semibold tracking-normal text-foreground">{group.dateLabel}</h3>
                  <div className="grid gap-5">
                    {group.batches.map((batch) => (
                      <StudioImageBatchRow
                        key={batch.batchId}
                        batch={batch}
                        copy={copy}
                        favoriteImageIds={favoriteImageIds}
                        downloadingImageIds={downloadingImageIds}
                        deletingImageIds={deletingImageIds}
                        actionLabels={creatorCopy.actions}
                        onToggleFavorite={toggleFavorite}
                        onDownload={(image) => void handleDownloadImage(image)}
                        onDelete={(image) => void handleDeleteImage(image)}
                        onSubmit={setSubmitTarget}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          {list.filters.tab === 'submitted' && !list.loading && !list.error ? (
            <div className="text-sm text-muted-foreground">
              {list.pagination.total} {list.pagination.total === 1 ? 'image' : 'images'}
            </div>
          ) : null}
        </section>
      </div>

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
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => chooseIdeaTheme(theme.id)}
                  className="block w-full rounded-md border border-border bg-card/60 p-4 text-left transition hover:border-(--monica-accent-line) hover:bg-(--monica-accent-soft)"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground">{theme.title}</div>
                    {theme.brief ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{theme.brief}</p> : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogShell>
      ) : null}
    </section>
  );
}

function StudioImageBatchRow({
  batch,
  copy,
  actionLabels,
  favoriteImageIds,
  downloadingImageIds,
  deletingImageIds,
  onToggleFavorite,
  onDownload,
  onDelete,
  onSubmit,
}: {
  batch: StudioImageBatch;
  copy: MonicaStudioCopy;
  actionLabels: MonicaCreatorCopy['actions'];
  favoriteImageIds: Set<string>;
  downloadingImageIds: Set<string>;
  deletingImageIds: Set<string>;
  onToggleFavorite: (imageId: string) => void;
  onDownload: (image: StudioImage) => void;
  onDelete: (image: StudioImage) => void;
  onSubmit: (image: StudioImage) => void;
}) {
  return (
    <article className="grid gap-5 lg:grid-cols-[minmax(190px,0.48fr)_minmax(0,1.52fr)] lg:items-start">
      <div className="min-w-0">
        <div className="group/prompt relative max-w-[240px]">
          <p className="line-clamp-3 text-sm leading-6 text-foreground">
            {batch.prompt || copy.empty}
          </p>
          {batch.prompt ? (
            <div className="pointer-events-none absolute left-0 top-[calc(100%+8px)] z-30 w-[min(520px,calc(100vw-48px))] rounded-md border border-border bg-white p-3 text-sm leading-6 text-foreground opacity-0 shadow-xl shadow-black/20 transition group-hover/prompt:opacity-100 dark:bg-neutral-950">
              {batch.prompt}
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <StudioMetaItem value={batch.model} />
          <StudioMetaItem value={batch.ratio} />
          <StudioMetaItem value={batch.style} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {batch.images.map((image) => (
          <StudioImageTile
            key={image.imageId}
            image={image}
            copy={copy}
            actionLabels={actionLabels}
            ratio={batch.ratio}
            favorite={favoriteImageIds.has(image.imageId)}
            downloading={downloadingImageIds.has(image.imageId)}
            deleting={deletingImageIds.has(image.imageId)}
            onToggleFavorite={() => onToggleFavorite(image.imageId)}
            onDownload={() => onDownload(image)}
            onDelete={() => onDelete(image)}
            onSubmit={() => onSubmit(image)}
          />
        ))}
      </div>
    </article>
  );
}

function StudioImageTile({
  image,
  copy,
  actionLabels,
  ratio,
  favorite,
  downloading,
  deleting,
  onToggleFavorite,
  onDownload,
  onDelete,
  onSubmit,
}: {
  image: StudioImage;
  copy: MonicaStudioCopy;
  actionLabels: MonicaCreatorCopy['actions'];
  ratio?: string | null;
  favorite: boolean;
  downloading: boolean;
  deleting: boolean;
  onToggleFavorite: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onSubmit: () => void;
}) {
  const latestSubmission = image.submissions?.[0];
  const status = latestSubmission?.status ?? image.status;
  const showStatus = status !== 'generated';
  const canSubmit = !image.isLocked && (image.status === 'generated' || image.status === 'rejected');
  const canDelete = !image.isLocked && (image.status === 'generated' || image.status === 'rejected');

  return (
    <figure className={cn('group relative min-w-0 rounded-lg bg-muted shadow-sm', getRatioClassName(ratio))}>
      <div className="h-full w-full overflow-hidden rounded-lg">
        {image.imageUrl ? (
          <Image
            src={image.imageUrl}
            alt=""
            width={imageDimensions(image).width}
            height={imageDimensions(image).height}
            unoptimized
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <ImagePlus className="size-8" />
          </div>
        )}
      </div>
      {favorite ? (
        <div className="absolute left-2 top-2 grid size-8 place-items-center rounded-full border border-rose-200 bg-white/92 text-rose-600 shadow-sm">
          <Heart className="size-4 fill-current" />
        </div>
      ) : null}
      {showStatus ? (
        <div className="absolute bottom-2 left-2 max-w-[calc(100%-16px)]">
          <StatusBadge tone={getStatusTone(status)}>{copy.statusLabels[status] ?? status}</StatusBadge>
        </div>
      ) : null}
      <div className="absolute right-2 top-2 z-20 flex gap-1 opacity-100 md:opacity-0 md:transition md:group-hover:opacity-100">
        <StudioImageActionButton label={canSubmit ? copy.submitImage : 'Submitted'} disabled={!canSubmit} active={!canSubmit && status !== 'generated'} onClick={onSubmit}>
          <Send className="size-3.5" />
        </StudioImageActionButton>
        <StudioImageActionButton label={actionLabels.favorite} active={favorite} onClick={onToggleFavorite}>
          <Heart className={cn('size-3.5', favorite ? 'fill-current' : '')} />
        </StudioImageActionButton>
        {image.imageUrl ? (
          <StudioImageActionButton label={actionLabels.download} disabled={downloading} onClick={onDownload}>
            {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          </StudioImageActionButton>
        ) : null}
        <StudioImageActionButton label={actionLabels.delete} disabled={!canDelete || deleting} onClick={onDelete}>
          {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        </StudioImageActionButton>
      </div>
    </figure>
  );
}

function StudioFilterPills<TValue extends string>({
  value,
  options,
  onChange,
}: {
  value: TValue;
  options: Array<{ value: TValue; label: string }>;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'h-9 rounded-full border px-4 text-sm font-semibold transition',
            value === option.value
              ? 'border-(--monica-accent-line) bg-(--monica-accent-soft) text-foreground shadow-sm'
              : 'border-border bg-background/70 text-muted-foreground hover:border-(--monica-accent-line) hover:bg-(--monica-accent-soft) hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function StudioMetaItem({ value }: { value?: string | null }) {
  if (!value) return null;

  return (
    <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-card/70 px-3 text-xs font-medium text-muted-foreground">
      <span>{value}</span>
    </span>
  );
}

function StudioImageActionButton({
  children,
  label,
  onClick,
  active = false,
  disabled = false,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group/action relative grid size-8 place-items-center rounded-md border border-white/30 bg-black/55 text-white shadow-sm backdrop-blur transition hover:bg-black/75 disabled:cursor-not-allowed disabled:opacity-55',
        active ? 'border-rose-200 bg-rose-600 hover:bg-rose-600' : '',
      )}
    >
      {children}
      <span className="pointer-events-none absolute right-0 top-[calc(100%+6px)] z-30 whitespace-nowrap rounded-md bg-black px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover/action:opacity-100">
        {label}
      </span>
    </button>
  );
}

function StudioImageSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-lg bg-muted" />)}
    </div>
  );
}

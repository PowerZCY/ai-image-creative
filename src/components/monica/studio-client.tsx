'use client';

import { useState, type ReactNode, useCallback } from 'react';
import Image from 'next/image';
import { Download, ImagePlus, Loader2, Send, Trash2, Copy, Check, ChevronDown } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import type { MonicaCreatorCopy, MonicaStudioCopy } from './copy';
import { MonicaCreator } from './creator-client';
import { monicaContentWidthClass } from './layout';
import {
  FilterPills,
  StatusBadge,
  getStatusTone,
  useMonicaPagedList,
} from './list-components';
import { UnderlineFilterTabs } from './themes-index-client';
import { DialogShell, SubmitImageDialog } from './submit-image-dialog';
import { useMonicaSignUp } from './use-monica-sign-up';

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
  description?: string | null;
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
  const { isSignedIn, openMonicaSignUp } = useMonicaSignUp();
  const list = useMonicaPagedList<StudioFilters, StudioImage>({
    endpoint: '/api/monica/studio/images/search',
    initialFilters: { tab: 'all', submissionStatus: 'all' },
    pageSize: 80,
    enabled: isSignedIn,
  });
  const [submitTarget, setSubmitTarget] = useState<StudioImage | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [themes, setThemes] = useState<StudioThemeOption[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);
  const [selectedIdeaThemeId, setSelectedIdeaThemeId] = useState('');
  const [themePickerOpen, setThemePickerOpen] = useState(false);
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

        <section className="mx-auto mb-12 grid w-full max-w-[1200px] gap-4">
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
            themeNote={selectedIdeaTheme?.description}
            initialAssistantOpen={Boolean(selectedIdeaTheme)}
            onRequestThemeIdeas={() => void openThemePicker()}
            onGenerationUpdated={handleGenerationUpdated}
            starterIdeas={selectedIdeaTheme?.generatorIdeas ?? []}
          />
        </section>

        <section className="mx-auto w-full max-w-[1200px] space-y-4">
          <div className="flex justify-start">
            <FilterPills
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
          {list.filters.tab === 'submitted' ? (
            <div>
              <UnderlineFilterTabs
                value={list.filters.submissionStatus}
                options={submissionStatusOptions}
                onChange={(submissionStatus) => list.updateFilters({ submissionStatus })}
              />
            </div>
          ) : null}

          {!isSignedIn ? (
            <div className="rounded-lg border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
              Sign in to view your creation history.
            </div>
          ) : list.error ? (
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
                        downloadingImageIds={downloadingImageIds}
                        deletingImageIds={deletingImageIds}
                        actionLabels={creatorCopy.actions}
                        onDownload={(image) => void handleDownloadImage(image)}
                        onDelete={(image) => void handleDeleteImage(image)}
                        onSubmit={(image) => {
                          if (!isSignedIn) {
                            void openMonicaSignUp();
                            return;
                          }
                          setSubmitTarget(image);
                        }}
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

function StudioPromptArea({ prompt, emptyLabel }: { prompt?: string | null; emptyLabel: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  }, [prompt]);

  const hasPrompt = Boolean(prompt);

  return (
    <div 
      className={cn(
        "group/prompt relative rounded-lg border border-transparent p-2 -mx-2 transition-colors",
        hasPrompt && "hover:bg-muted/50"
      )}
    >
      <div 
        className={cn(
          "text-sm leading-relaxed text-foreground transition-all duration-200",
          !isExpanded && hasPrompt && "line-clamp-3 cursor-pointer"
        )}
        onClick={() => hasPrompt && setIsExpanded(!isExpanded)}
        title={!isExpanded && hasPrompt ? "Click to expand" : undefined}
      >
        {prompt || emptyLabel}
      </div>
      
      {hasPrompt && (
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover/prompt:opacity-100">
           <button
            onClick={handleCopy}
            className="grid size-7 place-items-center rounded-md border border-border/50 bg-background/95 text-muted-foreground shadow-sm backdrop-blur transition hover:bg-muted hover:text-foreground"
            aria-label="Copy prompt"
            title="Copy prompt"
          >
            {isCopied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      )}

      {hasPrompt && !isExpanded && (
        <button 
           onClick={() => setIsExpanded(true)}
           className="mt-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground opacity-0 transition-opacity group-hover/prompt:opacity-100"
        >
          Read more <ChevronDown className="size-3" />
        </button>
      )}
    </div>
  );
}

function StudioImageBatchRow({
  batch,
  copy,
  actionLabels,
  downloadingImageIds,
  deletingImageIds,
  onDownload,
  onDelete,
  onSubmit,
}: {
  batch: StudioImageBatch;
  copy: MonicaStudioCopy;
  actionLabels: MonicaCreatorCopy['actions'];
  downloadingImageIds: Set<string>;
  deletingImageIds: Set<string>;
  onDownload: (image: StudioImage) => void;
  onDelete: (image: StudioImage) => void;
  onSubmit: (image: StudioImage) => void;
}) {
  const metaList = [batch.model, batch.ratio, batch.style].filter(Boolean);

  return (
    <article className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
      <div className="min-w-0 pr-2">
        <StudioPromptArea prompt={batch.prompt} emptyLabel={copy.empty} />
        
        {metaList.length > 0 ? (
          <div className="mt-3.5 flex flex-wrap gap-1.5 px-0.5">
            {metaList.map((meta, index) => (
              <span 
                key={index} 
                className="inline-flex items-center rounded-md bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
              >
                {meta}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {batch.images.map((image) => (
          <StudioImageTile
            key={image.imageId}
            image={image}
            copy={copy}
            actionLabels={actionLabels}
            ratio={batch.ratio}
            downloading={downloadingImageIds.has(image.imageId)}
            deleting={deletingImageIds.has(image.imageId)}
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
  downloading,
  deleting,
  onDownload,
  onDelete,
  onSubmit,
}: {
  image: StudioImage;
  copy: MonicaStudioCopy;
  actionLabels: MonicaCreatorCopy['actions'];
  ratio?: string | null;
  downloading: boolean;
  deleting: boolean;
  onDownload: () => void;
  onDelete: () => void;
  onSubmit: () => void;
}) {
  const latestSubmission = image.submissions?.[0];
  const status = latestSubmission?.status ?? image.status;
  const showStatus = status !== 'generated' && status !== 'rejected';
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
      {showStatus ? (
        <div className="absolute bottom-2 left-2 max-w-[calc(100%-16px)]">
          <StatusBadge tone={getStatusTone(status)}>
            {status === 'approved' ? 'Featured · +10 credits' : (copy.statusLabels[status] ?? status)}
          </StatusBadge>
        </div>
      ) : null}
      <div className="absolute right-2 top-2 z-20 flex gap-1 opacity-100 md:opacity-0 md:transition md:group-hover:opacity-100">
        <StudioImageActionButton label={canSubmit ? copy.submitImage : 'Submitted'} disabled={!canSubmit} active={!canSubmit && status !== 'generated'} onClick={onSubmit}>
          <Send className="size-3.5" />
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
      {Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-3/4 animate-pulse rounded-lg bg-muted" />)}
    </div>
  );
}

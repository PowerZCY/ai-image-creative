'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Check, ImagePlus, Pencil, Plus, Star, X } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import { monicaContentWidthClass } from './layout';
import {
  FilterPills,
  ListShell,
  ReviewFlowInline,
  SpinnerLabel,
  StatusBadge,
  getStatusTone,
  useMonicaPagedList,
} from './list-components';
import { UnderlineFilterTabs } from './themes-index-client';
import { DialogShell } from './submit-image-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminTab = 'themes' | 'image_submissions';
type ThemeAdminTab = 'theme_submissions' | 'manage_themes';

type ThemeSubmission = {
  themeSubmissionId: string;
  title: string;
  details: string;
  submitReason?: string | null;
  status: string;
  reviewFlow?: unknown;
  user?: { email?: string | null; userName?: string | null } | null;
};

type ThemeGeneratorIdea = {
  idea: string;
  prompt: string;
};

type ThemeItem = {
  id: string;
  issueNumber?: number | null;
  slug: string;
  title: string;
  brief?: string | null;
  description?: string | null;
  sourceType?: string | null;
  publishDate?: string | null;
  coverImageUrl?: string | null;
  featuredImages?: Array<{
    id: string;
    publicImageId?: string | null;
    title?: string | null;
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
  } | null>;
  generatorIdeas?: ThemeGeneratorIdea[];
  promptTexts?: string[];
  tags?: string[];
  seoTitle?: string | null;
  seoMetaDescription?: string | null;
  seoOgImageUrl?: string | null;
  seoKeywords?: string[];
  imageSeoNotes?: unknown;
  readiness?: {
    contentOk: boolean;
    seoOk: boolean;
    ideasOk: boolean;
    featuredCount: number;
    publishDateSet: boolean;
  };
};

type ImageSubmission = {
  id: string;
  title: string;
  status: string;
  creationNote?: string | null;
  promptSnapshot?: string | null;
  reviewFlow?: unknown;
  image?: { imageUrl?: string | null; width?: number | null; height?: number | null } | null;
  user?: { email?: string | null; userName?: string | null } | null;
  theme?: { title?: string | null } | null;
};

type FeaturedPoolImage = {
  id: string;
  publicImageId: string;
  title?: string | null;
  image?: { imageUrl?: string | null; thumbnailUrl?: string | null } | null;
};

type AdminGeneratedImage = {
  imageId: string;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  promptUsed?: string | null;
  publicImage?: { publicImageId: string } | null;
};

type SubmitImageDraft = {
  title: string;
  altText: string;
  creationNote: string;
};

type UploadImageDraft = {
  title: string;
  altText: string;
  model: string;
  prompt: string;
  creationNote: string;
  tags: string;
  setFeatured: boolean;
};

type Filters = {
  keyword: string;
  status: string;
};

type EditAcceptDraft = {
  title: string;
  slug: string;
  issueNumber: string;
  brief: string;
  description: string;
  publishDate: string;
  generatorIdeas: ThemeGeneratorIdea[];
  tags: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSlugInput(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseJsonOrNull(value: string) {
  const text = value.trim();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { notes: text };
  }
}

async function readError(response: Response) {
  try {
    const data = (await response.json()) as { error?: unknown };
    return typeof data.error === 'string' ? data.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

// ─── Shared style constants ───────────────────────────────────────────────────

const inputCls =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground';
const textareaCls =
  'w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground';
const labelSpanCls = 'text-xs font-medium text-muted-foreground';
const adminUploadModelOptions = [
  { value: 'gpt-image-2', label: 'GPT Image 2' },
  { value: 'nano-banana-2', label: 'Nano Banana 2' },
  { value: 'nano-banana-pro', label: 'Nano Banana Pro' },
  { value: 'seedream-4.5', label: 'Seedream 4.5' },
  { value: 'reve-2.0', label: 'Reve 2.0' },
];

// ─── Side nav button ──────────────────────────────────────────────────────────

function SideNavButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-10 w-full items-center justify-start rounded-lg px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:outline-none',
        selected
          ? 'bg-white text-neutral-950 shadow-sm'
          : 'text-neutral-500 hover:bg-white/60 hover:text-neutral-900',
      )}
    >
      {children}
    </button>
  );
}

// ─── ThemeFieldsModal ─────────────────────────────────────────────────────────

function ThemeFieldsModal({
  theme,
  onClose,
  onSaved,
}: {
  theme: ThemeItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(theme.title ?? '');
  const [slug, setSlug] = useState(theme.slug ?? '');
  const [issueNumber, setIssueNumber] = useState(theme.issueNumber?.toString() ?? '');
  const [brief, setBrief] = useState(theme.brief ?? '');
  const [description, setDescription] = useState(theme.description ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(theme.coverImageUrl ?? '');
  const [publishDate, setPublishDate] = useState(
    theme.publishDate ? theme.publishDate.slice(0, 10) : '',
  );
  const [generatorIdeas, setGeneratorIdeas] = useState<ThemeGeneratorIdea[]>(
    () => theme.generatorIdeas?.map(({ idea, prompt }) => ({ idea, prompt })) ?? [],
  );
  const [tags, setTags] = useState((theme.tags ?? []).join('\n'));
  const [seoTitle, setSeoTitle] = useState(theme.seoTitle ?? '');
  const [seoMetaDescription, setSeoMetaDescription] = useState(theme.seoMetaDescription ?? '');
  const [seoOgImageUrl, setSeoOgImageUrl] = useState(theme.seoOgImageUrl ?? '');
  const [seoKeywords, setSeoKeywords] = useState((theme.seoKeywords ?? []).join('\n'));
  const [imageSeoNotes, setImageSeoNotes] = useState(
    theme.imageSeoNotes && typeof theme.imageSeoNotes === 'object'
      ? JSON.stringify(theme.imageSeoNotes, null, 2)
      : '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateGeneratorIdea(index: number, patch: Partial<ThemeGeneratorIdea>) {
    setGeneratorIdeas((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  function addGeneratorIdea() {
    setGeneratorIdeas((current) => [...current, { idea: '', prompt: '' }]);
  }

  function removeGeneratorIdea(index: number) {
    setGeneratorIdeas((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/monica/admin/themes/${theme.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          issueNumber,
          brief,
          description,
          coverImageUrl,
          publishDate,
          generatorIdeas: generatorIdeas
            .map((item) => ({ idea: item.idea.trim(), prompt: item.prompt.trim() }))
            .filter((item) => item.idea || item.prompt),
          tags: splitLines(tags),
          seoTitle,
          seoMetaDescription,
          seoOgImageUrl,
          seoKeywords: splitLines(seoKeywords),
          imageSeoNotes: parseJsonOrNull(imageSeoNotes),
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogShell title="Edit theme fields" closeLabel="Close" onClose={onClose}>
      <div className="grid gap-3">
        {error ? (
          <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-100">
            {error}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(180px,0.65fr)_160px_180px]">
          <label className="block">
            <span className={labelSpanCls}>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cn('mt-1', inputCls)}
            />
          </label>
          <label className="block">
            <span className={labelSpanCls}>Slug</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={cn('mt-1', inputCls)}
            />
          </label>
          <label className="block">
            <span className={labelSpanCls}>Issue #</span>
            <input
              type="number"
              min={1}
              value={issueNumber}
              onChange={(e) => setIssueNumber(e.target.value)}
              className={cn('mt-1', inputCls)}
            />
          </label>
          <label className="block">
            <span className={labelSpanCls}>Publish date</span>
            <input
              type="date"
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
              className={cn('mt-1', inputCls)}
            />
          </label>
        </div>
        <label className="block">
          <span className={labelSpanCls}>Brief</span>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={2}
            className={cn('mt-1', textareaCls)}
          />
        </label>
        <label className="block">
          <span className={labelSpanCls}>Theme note</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={cn('mt-1', textareaCls)}
          />
        </label>
        <label className="block">
          <span className={labelSpanCls}>Cover image URL</span>
          <input
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            className={cn('mt-1', inputCls)}
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className={labelSpanCls}>SEO title</span>
            <input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              className={cn('mt-1', inputCls)}
            />
          </label>
          <label className="block">
            <span className={labelSpanCls}>SEO OG image URL</span>
            <input
              value={seoOgImageUrl}
              onChange={(e) => setSeoOgImageUrl(e.target.value)}
              className={cn('mt-1', inputCls)}
            />
          </label>
        </div>
        <div className="grid gap-3">
          <label className="block">
            <span className={labelSpanCls}>Meta description</span>
            <input
              value={seoMetaDescription}
              onChange={(e) => setSeoMetaDescription(e.target.value)}
              className={cn('mt-1', inputCls)}
            />
          </label>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className={labelSpanCls}>Generator ideas</span>
            <button
              type="button"
              onClick={addGeneratorIdea}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-muted"
            >
              <Plus className="size-3.5" />
              Add idea
            </button>
          </div>
          <div className="grid gap-2">
            {generatorIdeas.length ? (
              generatorIdeas.map((item, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-md border border-border bg-background/70 p-2 md:grid-cols-[2rem_minmax(160px,0.45fr)_minmax(220px,1fr)_2.25rem]"
                >
                  <div className="flex h-10 items-center justify-center text-xs font-medium text-muted-foreground">
                    {index + 1}.
                  </div>
                  <label className="block">
                    <span className="sr-only">Idea {index + 1}</span>
                    <input
                      value={item.idea}
                      onChange={(e) => updateGeneratorIdea(index, { idea: e.target.value })}
                      placeholder="Idea"
                      className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className="sr-only">Prompt {index + 1}</span>
                    <textarea
                      value={item.prompt}
                      onChange={(e) => updateGeneratorIdea(index, { prompt: e.target.value })}
                      placeholder="Prompt"
                      rows={2}
                      className={textareaCls}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeGeneratorIdea(index)}
                    aria-label={`Remove generator idea ${index + 1}`}
                    title="Remove"
                    className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
                No generator ideas.
              </div>
            )}
          </div>
        </div>
        <label className="block">
          <span className={labelSpanCls}>Tags (one per line)</span>
          <textarea
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            rows={4}
            className={cn('mt-1', textareaCls)}
          />
        </label>
        <label className="block">
          <span className={labelSpanCls}>SEO keywords (one per line)</span>
          <textarea
            value={seoKeywords}
            onChange={(e) => setSeoKeywords(e.target.value)}
            rows={4}
            className={cn('mt-1', textareaCls)}
          />
        </label>
        <label className="block">
          <span className={labelSpanCls}>Image SEO notes JSON</span>
          <textarea
            value={imageSeoNotes}
            onChange={(e) => setImageSeoNotes(e.target.value)}
            rows={3}
            className={cn('mt-1', textareaCls)}
          />
        </label>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={saving || !title.trim() || !slug.trim()}
            onClick={() => void handleSave()}
            className="monica-button-primary min-h-10 px-4 text-sm disabled:opacity-50"
          >
            {saving ? <SpinnerLabel>Save</SpinnerLabel> : 'Save fields'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-border px-4 text-sm hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

// ─── FeaturedImagesModal ──────────────────────────────────────────────────────

function FeaturedImagesModal({
  theme,
  onClose,
  onSaved,
}: {
  theme: ThemeItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [featuredPool, setFeaturedPool] = useState<FeaturedPoolImage[]>([]);
  const [selectedFeaturedIds, setSelectedFeaturedIds] = useState<string[]>(
    theme.featuredImages
      ?.map((img) => img?.publicImageId ?? img?.id)
      .filter((id): id is string => Boolean(id)) ?? [],
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/monica/admin/themes/${theme.id}/featured-images`, {
          headers: { accept: 'application/json' },
        });
        if (!response.ok) throw new Error(await readError(response));
        const data = (await response.json()) as {
          selected?: Array<{ publicImageId: string }>;
          pool?: FeaturedPoolImage[];
        };
        setFeaturedPool(data.pool ?? []);
        if (data.selected?.length) {
          setSelectedFeaturedIds(data.selected.map((item) => item.publicImageId));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [theme.id]);

  function toggleFeatured(publicImageId: string) {
    setSelectedFeaturedIds((current) => {
      if (current.includes(publicImageId)) return current.filter((id) => id !== publicImageId);
      return [...current, publicImageId].slice(0, 3);
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/monica/admin/themes/${theme.id}/featured-images`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ publicImageIds: selectedFeaturedIds }),
      });
      if (!response.ok) throw new Error(await readError(response));
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogShell title={`Featured images: ${theme.title}`} closeLabel="Close" onClose={onClose}>
      <div className="grid gap-3">
        {error ? (
          <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-100">
            {error}
          </div>
        ) : null}
        {loading ? (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
            Loading image pool...
          </div>
        ) : featuredPool.length === 0 ? (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
            No public images in this theme pool yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {featuredPool.map((image) => {
              const imageUrl = image.image?.thumbnailUrl || image.image?.imageUrl;
              const publicImageId = image.publicImageId;
              const selected = selectedFeaturedIds.includes(publicImageId);
              return (
                <button
                  key={publicImageId}
                  type="button"
                  onClick={() => toggleFeatured(publicImageId)}
                  className={cn(
                    'overflow-hidden rounded-lg border bg-card text-left',
                    selected
                      ? 'border-foreground ring-2 ring-foreground/20'
                      : 'border-border',
                  )}
                >
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={image.title ?? ''}
                      width={512}
                      height={512}
                      unoptimized
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="grid aspect-square place-items-center bg-muted text-muted-foreground">
                      <ImagePlus className="size-6" />
                    </div>
                  )}
                  <div className="p-2 text-xs text-muted-foreground">
                    {selected ? 'Selected' : (image.title || 'Public image')}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void handleSave()}
            className="monica-button-primary min-h-10 px-4 text-sm disabled:opacity-50"
          >
            {saving ? <SpinnerLabel>Save</SpinnerLabel> : 'Save featured images'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-border px-4 text-sm hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

// ─── SubmitImagesModal ────────────────────────────────────────────────────────

function SubmitImagesModal({
  theme,
  onClose,
  onSaved,
}: {
  theme: ThemeItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [generatedPool, setGeneratedPool] = useState<AdminGeneratedImage[]>([]);
  const [draftsByImageId, setDraftsByImageId] = useState<Record<string, SubmitImageDraft>>({});
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/monica/admin/generated-images/search', {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ page: 1, pageSize: 24, filters: { keyword: '' } }),
        });
        if (!response.ok) throw new Error(await readError(response));
        const data = (await response.json()) as { items?: AdminGeneratedImage[] };
        setGeneratedPool(data.items ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function buildSubmitImageDraft(image: AdminGeneratedImage): SubmitImageDraft {
    const prompt = image.promptUsed ?? '';
    return {
      title: prompt.slice(0, 80) || 'Admin selected image',
      altText: prompt.slice(0, 255) || 'Admin selected image',
      creationNote: prompt,
    };
  }

  function updateSubmitImageDraft(image: AdminGeneratedImage, patch: Partial<SubmitImageDraft>) {
    setDraftsByImageId((current) => ({
      ...current,
      [image.imageId]: {
        ...(current[image.imageId] ?? buildSubmitImageDraft(image)),
        ...patch,
      },
    }));
  }

  async function submitImage(image: AdminGeneratedImage) {
    const draft = draftsByImageId[image.imageId] ?? buildSubmitImageDraft(image);
    setSubmittingId(image.imageId);
    setError(null);
    try {
      const response = await fetch(`/api/monica/admin/themes/${theme.id}/submit-images`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          imageId: image.imageId,
          title: draft.title,
          altText: draft.altText,
          creationNote: draft.creationNote,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <DialogShell title={`Submit images: ${theme.title}`} closeLabel="Close" onClose={onClose}>
      <div className="grid gap-3">
        {error ? (
          <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-100">
            {error}
          </div>
        ) : null}
        {loading ? (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
            Loading generated images...
          </div>
        ) : generatedPool.length === 0 ? (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
            No generated images available.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {generatedPool.map((image) => {
              const imageUrl = image.thumbnailUrl || image.imageUrl;
              const alreadyPublic = Boolean(image.publicImage);
              const isSubmitting = submittingId === image.imageId;
              const draft = draftsByImageId[image.imageId] ?? buildSubmitImageDraft(image);
              return (
                <article key={image.imageId} className="overflow-hidden rounded-lg border border-border bg-card">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt=""
                      width={512}
                      height={512}
                      unoptimized
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="grid aspect-square place-items-center bg-muted text-muted-foreground">
                      <ImagePlus className="size-6" />
                    </div>
                  )}
                  <div className="grid gap-2 p-2">
                    <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {image.promptUsed || image.imageId}
                    </p>
                    <label className="block">
                      <span className={labelSpanCls}>Title</span>
                      <input
                        value={draft.title}
                        onChange={(e) => updateSubmitImageDraft(image, { title: e.target.value })}
                        disabled={alreadyPublic}
                        className={cn('mt-1', inputCls)}
                      />
                    </label>
                    <label className="block">
                      <span className={labelSpanCls}>Alt text</span>
                      <textarea
                        value={draft.altText}
                        onChange={(e) => updateSubmitImageDraft(image, { altText: e.target.value })}
                        disabled={alreadyPublic}
                        rows={2}
                        className={cn('mt-1', textareaCls)}
                      />
                    </label>
                    <label className="block">
                      <span className={labelSpanCls}>Creation note</span>
                      <textarea
                        value={draft.creationNote}
                        onChange={(e) => updateSubmitImageDraft(image, { creationNote: e.target.value })}
                        disabled={alreadyPublic}
                        rows={2}
                        className={cn('mt-1', textareaCls)}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={Boolean(submittingId) || alreadyPublic || !draft.title.trim()}
                      onClick={() => void submitImage(image)}
                      className="monica-button-primary min-h-9 px-3 text-xs disabled:opacity-50"
                    >
                      {alreadyPublic ? 'Already public' : isSubmitting ? 'Submitting...' : 'Add to theme'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-border px-4 text-sm hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

// ─── UploadImageModal ─────────────────────────────────────────────────────────

function UploadImageModal({
  theme,
  onClose,
  onSaved,
}: {
  theme: ThemeItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState<UploadImageDraft>({
    title: '',
    altText: '',
    model: 'seedream-4.5',
    prompt: '',
    creationNote: '',
    tags: '',
    setFeatured: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function updateDraft(patch: Partial<UploadImageDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function handleUpload() {
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set('file', file);
      formData.set('title', draft.title);
      formData.set('altText', draft.altText);
      formData.set('model', draft.model);
      formData.set('prompt', draft.prompt);
      formData.set('creationNote', draft.creationNote);
      formData.set('tags', JSON.stringify(splitLines(draft.tags)));
      formData.set('setFeatured', draft.setFeatured ? 'true' : 'false');

      const response = await fetch(`/api/monica/admin/themes/${theme.id}/uploaded-images`, {
        method: 'POST',
        headers: { accept: 'application/json' },
        body: formData,
      });
      if (!response.ok) throw new Error(await readError(response));
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogShell title={`Upload image: ${theme.title}`} closeLabel="Close" onClose={onClose}>
      <div className="grid gap-3">
        {error ? (
          <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-100">
            {error}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
          <label className="grid min-h-[220px] cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 text-center text-sm text-muted-foreground hover:bg-muted/50">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt=""
                width={512}
                height={512}
                unoptimized
                className="max-h-[360px] w-full object-contain"
              />
            ) : (
              <span className="grid justify-items-center gap-2 px-4">
                <ImagePlus className="size-7" />
                Select image
              </span>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setFile(nextFile);
                setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
                if (nextFile && !draft.title.trim()) {
                  updateDraft({ title: nextFile.name.replace(/\.[^.]+$/, '').slice(0, 80) });
                }
              }}
            />
          </label>
          <div className="grid gap-3">
            <label className="block">
              <span className={labelSpanCls}>Title</span>
              <input
                value={draft.title}
                onChange={(e) => updateDraft({ title: e.target.value })}
                className={cn('mt-1', inputCls)}
              />
            </label>
            <label className="block">
              <span className={labelSpanCls}>Alt text</span>
              <textarea
                value={draft.altText}
                onChange={(e) => updateDraft({ altText: e.target.value })}
                rows={2}
                className={cn('mt-1', textareaCls)}
              />
            </label>
            <label className="block">
              <span className={labelSpanCls}>Model</span>
              <select
                value={draft.model}
                onChange={(e) => updateDraft({ model: e.target.value })}
                className={cn('mt-1', inputCls)}
              >
                {adminUploadModelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelSpanCls}>Prompt</span>
              <textarea
                value={draft.prompt}
                onChange={(e) => updateDraft({ prompt: e.target.value })}
                rows={3}
                className={cn('mt-1', textareaCls)}
              />
            </label>
          </div>
        </div>
        <label className="block">
          <span className={labelSpanCls}>Creation note</span>
          <textarea
            value={draft.creationNote}
            onChange={(e) => updateDraft({ creationNote: e.target.value })}
            rows={2}
            className={cn('mt-1', textareaCls)}
          />
        </label>
        <label className="block">
          <span className={labelSpanCls}>Tags</span>
          <textarea
            value={draft.tags}
            onChange={(e) => updateDraft({ tags: e.target.value })}
            rows={2}
            className={cn('mt-1', textareaCls)}
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={draft.setFeatured}
            onChange={(e) => updateDraft({ setFeatured: e.target.checked })}
            className="size-4 rounded border-border"
          />
          Set as featured image
        </label>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={saving || !file || !draft.title.trim()}
            onClick={() => void handleUpload()}
            className="monica-button-primary min-h-10 px-4 text-sm disabled:opacity-50"
          >
            {saving ? <SpinnerLabel>Upload</SpinnerLabel> : 'Upload image'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-border px-4 text-sm hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

// ─── NewThemeModal ────────────────────────────────────────────────────────────

function NewThemeModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [issueNumber, setIssueNumber] = useState('');
  const [brief, setBrief] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/monica/admin/themes', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ title, slug, issueNumber, brief, description: brief }),
      });
      if (!response.ok) throw new Error(await readError(response));
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogShell title="New theme" closeLabel="Close" onClose={onClose}>
      <div className="grid gap-3">
        {error ? (
          <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-100">
            {error}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(180px,0.65fr)_160px]">
          <label className="block">
            <span className={labelSpanCls}>Theme</span>
            <input
              value={title}
              onChange={(e) => {
                const nextTitle = e.target.value;
                setTitle(nextTitle);
                if (!slugEdited) setSlug(normalizeSlugInput(nextTitle));
              }}
              className={cn('mt-1', inputCls)}
            />
          </label>
          <label className="block">
            <span className={labelSpanCls}>Slug</span>
            <input
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(e.target.value);
              }}
              className={cn('mt-1', inputCls)}
            />
          </label>
          <label className="block">
            <span className={labelSpanCls}>Issue #</span>
            <input
              type="number"
              min={1}
              value={issueNumber}
              onChange={(e) => setIssueNumber(e.target.value)}
              className={cn('mt-1', inputCls)}
            />
          </label>
        </div>
        <label className="block">
          <span className={labelSpanCls}>Brief</span>
          <input
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            className={cn('mt-1', inputCls)}
          />
        </label>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={saving || !title.trim() || !slug.trim()}
            onClick={() => void handleCreate()}
            className="monica-button-primary min-h-10 px-4 text-sm disabled:opacity-50"
          >
            {saving ? <SpinnerLabel>Create</SpinnerLabel> : 'Create theme'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-border px-4 text-sm hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

// ─── ThemeTableRow ────────────────────────────────────────────────────────────

type ThemeModalType = 'fields' | 'featured' | 'submit_images' | 'upload_image';

function ThemeTableRow({
  theme,
  onOpenModal,
}: {
  theme: ThemeItem;
  onOpenModal: (theme: ThemeItem, modal: ThemeModalType) => void;
}) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30">
      {/* Theme title + brief */}
      <td className="py-3 pr-4 align-top">
        <div className="font-medium leading-5">{theme.title}</div>
        {theme.issueNumber || theme.brief ? (
          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {theme.issueNumber ? `Issue #${theme.issueNumber}` : null}
            {theme.issueNumber && theme.brief ? ' · ' : null}
            {theme.brief}
          </div>
        ) : null}
      </td>
      {/* Source */}
      <td className="py-3 pr-4 align-top">
        <span className="text-sm text-muted-foreground">{theme.sourceType || 'admin'}</span>
      </td>
      {/* Publish date */}
      <td className="py-3 pr-4 align-top">
        <span className="text-sm text-muted-foreground">
          {theme.publishDate ? new Date(theme.publishDate).toLocaleDateString() : '—'}
        </span>
      </td>
      {/* Readiness chips */}
      <td className="py-3 pr-4 align-top">
        <div className="flex flex-wrap gap-1">
          <StatusBadge tone={theme.readiness?.contentOk ? 'good' : 'warn'}>
            {theme.readiness?.contentOk ? 'Content' : 'No content'}
          </StatusBadge>
          <StatusBadge tone={theme.readiness?.seoOk ? 'good' : 'warn'}>
            {theme.readiness?.seoOk ? 'SEO' : 'No SEO'}
          </StatusBadge>
          <StatusBadge tone={theme.readiness?.ideasOk ? 'good' : 'warn'}>
            {theme.readiness?.ideasOk ? 'Ideas' : 'No ideas'}
          </StatusBadge>
        </div>
      </td>
      {/* Featured strip */}
      <td className="py-3 pr-4 align-top">
        <FeaturedImageStrip images={theme.featuredImages} />
      </td>
      {/* Actions */}
      <td className="py-3 align-top">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onOpenModal(theme, 'fields')}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-xs hover:bg-muted"
          >
            <Pencil className="size-3" />Edit fields
          </button>
          <button
            type="button"
            onClick={() => onOpenModal(theme, 'featured')}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-xs hover:bg-muted"
          >
            <Star className="size-3" />Featured images
          </button>
          <button
            type="button"
            onClick={() => onOpenModal(theme, 'submit_images')}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-xs hover:bg-muted"
          >
            <ImagePlus className="size-3" />Submit images
          </button>
          <button
            type="button"
            onClick={() => onOpenModal(theme, 'upload_image')}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-xs hover:bg-muted"
          >
            <ImagePlus className="size-3" />Upload image
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── EditAcceptPanel ──────────────────────────────────────────────────────────

function EditAcceptPanel({
  item,
  draft,
  saving,
  disabled,
  onChange,
  onCancel,
  onSave,
}: {
  item: ThemeSubmission;
  draft: EditAcceptDraft;
  saving: boolean;
  disabled: boolean;
  onChange: (patch: Partial<EditAcceptDraft>) => void;
  onCancel: () => void;
  onSave: (draft: EditAcceptDraft) => void;
}) {
  function updateGeneratorIdea(index: number, patch: Partial<ThemeGeneratorIdea>) {
    onChange({
      generatorIdeas: draft.generatorIdeas.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  }

  function addGeneratorIdea() {
    onChange({ generatorIdeas: [...draft.generatorIdeas, { idea: '', prompt: '' }] });
  }

  function removeGeneratorIdea(index: number) {
    onChange({ generatorIdeas: draft.generatorIdeas.filter((_, itemIndex) => itemIndex !== index) });
  }

  return (
    <div className="mt-4 grid gap-3 rounded-md border border-border bg-background/50 p-3">
      <div className="grid gap-3 md:grid-cols-[minmax(180px,0.8fr)_minmax(180px,0.6fr)_150px_180px]">
        <label className="block">
          <span className={labelSpanCls}>Theme title</span>
          <input
            value={draft.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className={cn('mt-1', inputCls)}
          />
        </label>
        <label className="block">
          <span className={labelSpanCls}>Slug</span>
          <input
            value={draft.slug}
            onChange={(e) => onChange({ slug: e.target.value })}
            className={cn('mt-1', inputCls)}
          />
        </label>
        <label className="block">
          <span className={labelSpanCls}>Issue #</span>
          <input
            type="number"
            min={1}
            value={draft.issueNumber}
            onChange={(e) => onChange({ issueNumber: e.target.value })}
            className={cn('mt-1', inputCls)}
          />
        </label>
        <label className="block">
          <span className={labelSpanCls}>Publish date</span>
          <input
            type="date"
            value={draft.publishDate}
            onChange={(e) => onChange({ publishDate: e.target.value })}
            className={cn('mt-1', inputCls)}
          />
        </label>
      </div>
      <label className="block">
        <span className={labelSpanCls}>Brief</span>
        <textarea
          value={draft.brief}
          onChange={(e) => onChange({ brief: e.target.value })}
          rows={2}
          className={cn('mt-1', textareaCls)}
        />
      </label>
      <label className="block">
        <span className={labelSpanCls}>Theme note</span>
        <textarea
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={4}
          className={cn('mt-1', textareaCls)}
        />
      </label>
      {item.submitReason ? (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
          Submit reason: {item.submitReason}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className={labelSpanCls}>Generator ideas</span>
            <button
              type="button"
              onClick={addGeneratorIdea}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-muted"
            >
              <Plus className="size-3.5" />
              Add idea
            </button>
          </div>
          <div className="grid gap-2">
            {draft.generatorIdeas.length ? (
              draft.generatorIdeas.map((item, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-md border border-border bg-background/70 p-2 md:grid-cols-[1.75rem_minmax(120px,0.45fr)_minmax(150px,1fr)_2.25rem]"
                >
                  <div className="flex h-10 items-center justify-center text-xs font-medium text-muted-foreground">
                    {index + 1}.
                  </div>
                  <label className="block">
                    <span className="sr-only">Idea {index + 1}</span>
                    <input
                      value={item.idea}
                      onChange={(e) => updateGeneratorIdea(index, { idea: e.target.value })}
                      placeholder="Idea"
                      className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className="sr-only">Prompt {index + 1}</span>
                    <textarea
                      value={item.prompt}
                      onChange={(e) => updateGeneratorIdea(index, { prompt: e.target.value })}
                      placeholder="Prompt"
                      rows={2}
                      className={textareaCls}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeGeneratorIdea(index)}
                    aria-label={`Remove generator idea ${index + 1}`}
                    title="Remove"
                    className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
                No generator ideas.
              </div>
            )}
          </div>
        </div>
        <label className="block">
          <span className={labelSpanCls}>Tags, one per line</span>
          <textarea
            value={draft.tags}
            onChange={(e) => onChange({ tags: e.target.value })}
            rows={4}
            className={cn('mt-1', textareaCls)}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || !draft.title.trim() || !draft.slug.trim()}
          onClick={() => onSave(draft)}
          className="monica-button-primary min-h-10 px-4 text-sm disabled:opacity-50"
        >
          {saving ? <SpinnerLabel>Schedule</SpinnerLabel> : 'Save scheduled theme'}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onCancel}
          className="h-10 rounded-md border border-border px-4 text-sm hover:bg-muted disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── ThemeCoverPreview ────────────────────────────────────────────────────────

function ThemeCoverPreview({ imageUrl }: { imageUrl?: string | null }) {
  return (
    <div className="h-[88px] overflow-hidden rounded-md bg-muted">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          width={312}
          height={176}
          unoptimized
          className="size-full object-cover"
        />
      ) : (
        <div className="grid size-full place-items-center text-muted-foreground">
          <ImagePlus className="size-5" />
        </div>
      )}
    </div>
  );
}

// ─── FeaturedImageStrip ───────────────────────────────────────────────────────

function FeaturedImageStrip({
  images,
}: {
  images?: Array<{
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
    title?: string | null;
  } | null>;
}) {
  const slots = Array.from({ length: 3 }, (_, index) => images?.[index] ?? null);
  return (
    <div className="grid grid-cols-3 gap-1">
      {slots.map((image, index) => {
        const imageUrl = image?.thumbnailUrl || image?.imageUrl;
        return (
          <div
            key={`${imageUrl ?? 'empty'}-${index}`}
            className="h-10 overflow-hidden rounded bg-muted"
          >
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={image?.title ?? ''}
                width={80}
                height={80}
                unoptimized
                className="size-full object-cover"
              />
            ) : (
              <div className="grid size-full place-items-center text-muted-foreground/60">
                <ImagePlus className="size-3.5" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── AdminReviewClient ────────────────────────────────────────────────────────

export function AdminReviewClient({
  initialTab = 'themes',
  initialThemeAdminTab = 'theme_submissions',
}: {
  initialTab?: AdminTab;
  initialThemeAdminTab?: ThemeAdminTab;
}) {
  const [tab, setTab] = useState<AdminTab>(initialTab);
  const [themeAdminTab, setThemeAdminTab] = useState<ThemeAdminTab>(initialThemeAdminTab);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [editAcceptId, setEditAcceptId] = useState<string | null>(null);
  const [editAcceptDraftById, setEditAcceptDraftById] = useState<Record<string, EditAcceptDraft>>(
    {},
  );
  const [newThemeOpen, setNewThemeOpen] = useState(false);
  const [themeModal, setThemeModal] = useState<{
    type: ThemeModalType;
    theme: ThemeItem;
  } | null>(null);
  const [imageRejectNoteById, setImageRejectNoteById] = useState<Record<string, string>>({});
  const [imageAltTextById, setImageAltTextById] = useState<Record<string, string>>({});

  const themeSubmissions = useMonicaPagedList<Filters, ThemeSubmission>({
    endpoint: '/api/monica/admin/theme-submissions/search',
    initialFilters: { keyword: '', status: 'all' },
    pageSize: 10,
  });
  const themes = useMonicaPagedList<{ keyword: string; visibility: string }, ThemeItem>({
    endpoint: '/api/monica/admin/themes/search',
    initialFilters: { keyword: '', visibility: 'visible' },
    pageSize: 10,
  });
  const imageSubmissions = useMonicaPagedList<Filters, ImageSubmission>({
    endpoint: '/api/monica/admin/image-submissions/search',
    initialFilters: { keyword: '', status: 'all' },
    pageSize: 10,
  });

  const tabOptions: Array<{ value: AdminTab; label: string }> = [
    { value: 'themes', label: 'Themes' },
    { value: 'image_submissions', label: 'Image submissions' },
  ];
  const themeAdminTabOptions: Array<{ value: ThemeAdminTab; label: string }> = [
    { value: 'theme_submissions', label: 'User submissions' },
    { value: 'manage_themes', label: 'Manage themes' },
  ];
  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'under_review', label: 'Under review' },
    { value: 'accepted_to_pool', label: 'Accepted' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  async function reviewThemeSubmission(id: string, action: 'accepted_to_pool' | 'rejected') {
    setActingId(`${id}:${action}`);
    setActionError(null);
    try {
      const response = await fetch(`/api/monica/admin/theme-submissions/${id}/review`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error(await readError(response));
      themeSubmissions.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setActingId(null);
    }
  }

  function buildInitialEditAcceptDraft(item: ThemeSubmission): EditAcceptDraft {
    return {
      title: item.title,
      slug: normalizeSlugInput(item.title),
      issueNumber: '',
      brief: item.details,
      description: item.details,
      publishDate: '',
      generatorIdeas: [],
      tags: '',
    };
  }

  function openEditAccept(item: ThemeSubmission) {
    setEditAcceptId((currentId) =>
      currentId === item.themeSubmissionId ? null : item.themeSubmissionId,
    );
    setEditAcceptDraftById((current) => ({
      ...current,
      [item.themeSubmissionId]:
        current[item.themeSubmissionId] ?? buildInitialEditAcceptDraft(item),
    }));
  }

  function updateEditAcceptDraft(id: string, patch: Partial<EditAcceptDraft>) {
    setEditAcceptDraftById((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? {
          title: '',
          slug: '',
          issueNumber: '',
          brief: '',
          description: '',
          publishDate: '',
          generatorIdeas: [],
          tags: '',
        }),
        ...patch,
      },
    }));
  }

  async function publishThemeSubmission(item: ThemeSubmission, draft: EditAcceptDraft) {
    const status = 'scheduled';
    setActingId(`${item.themeSubmissionId}:${status}`);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/monica/admin/theme-submissions/${item.themeSubmissionId}/publish`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({
            title: draft.title,
            slug: draft.slug,
            issueNumber: draft.issueNumber,
            brief: draft.brief,
            description: draft.description,
            generatorIdeas: draft.generatorIdeas
              .map((idea) => ({ idea: idea.idea.trim(), prompt: idea.prompt.trim() }))
              .filter((idea) => idea.idea || idea.prompt),
            tags: splitLines(draft.tags),
            publishDate: draft.publishDate,
            status,
          }),
        },
      );
      if (!response.ok) throw new Error(await readError(response));
      setEditAcceptId(null);
      themeSubmissions.reload();
      themes.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setActingId(null);
    }
  }

  async function reviewImageSubmission(id: string, action: 'approved' | 'rejected') {
    if (action === 'rejected' && !imageRejectNoteById[id]?.trim()) {
      setActionError('Reject note is required.');
      return;
    }
    setActingId(`${id}:${action}`);
    setActionError(null);
    try {
      const response = await fetch(`/api/monica/admin/image-submissions/${id}/review`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          action,
          note: imageRejectNoteById[id],
          altText: imageAltTextById[id],
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      imageSubmissions.reload();
      setImageRejectNoteById((current) => ({ ...current, [id]: '' }));
      setImageAltTextById((current) => ({ ...current, [id]: '' }));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setActingId(null);
    }
  }

  return (
    <section className="monica-surface min-h-screen py-20 md:py-24">
      <div className={cn(monicaContentWidthClass, 'space-y-6')}>
        {actionError ? (
          <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-100">
            {actionError}
          </div>
        ) : null}

        {/* Layout: compact left side-nav + wide right content panel */}
        <div className="flex items-start gap-4">
          {/* Left sticky nav */}
          <nav className="sticky top-24 inline-grid w-[168px] shrink-0 grid-cols-1 gap-1 rounded-xl border border-neutral-200 bg-neutral-100 p-1 text-neutral-500">
            {tabOptions.map((opt) => (
              <SideNavButton
                key={opt.value}
                selected={tab === opt.value}
                onClick={() => setTab(opt.value)}
              >
                {opt.label}
              </SideNavButton>
            ))}
          </nav>

          {/* Right panel */}
          <div className="min-w-0 flex-1 rounded-lg border border-border bg-card p-6">

            {/* ── Themes panel ─────────────────────────────────── */}
            {tab === 'themes' ? (
              <div className="space-y-5">
                {/* Inner horizontal sub-tabs */}
                <div className="flex justify-start">
                  <FilterPills
                    value={themeAdminTab}
                    options={themeAdminTabOptions}
                    onChange={setThemeAdminTab}
                  />
                </div>

                {/* User submissions tab */}
                {themeAdminTab === 'theme_submissions' ? (
                  <ListShell
                    items={themeSubmissions.items}
                    loading={themeSubmissions.loading}
                    error={themeSubmissions.error}
                    empty="No theme submissions."
                    pagination={themeSubmissions.pagination}
                    onPageChange={themeSubmissions.setPage}
                    filters={(
                      <UnderlineFilterTabs
                        value={themeSubmissions.filters.status}
                        options={statusOptions}
                        onChange={(status) => themeSubmissions.updateFilters({ status })}
                      />
                    )}
                    renderItem={(item) => (
                      <article
                        key={item.themeSubmissionId}
                        className="rounded-lg border border-border bg-card p-5 shadow-sm"
                      >
                        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-xl font-semibold">{item.title}</h3>
                              <StatusBadge tone={getStatusTone(item.status)}>
                                {item.status}
                              </StatusBadge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.user?.email || item.user?.userName || 'Unknown user'}
                            </p>
                            <p className="mt-3 line-clamp-3 text-base leading-7 text-muted-foreground">
                              {item.details}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 md:justify-end">
                            {item.status === 'under_review' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void reviewThemeSubmission(
                                      item.themeSubmissionId,
                                      'accepted_to_pool',
                                    )
                                  }
                                  disabled={Boolean(actingId)}
                                  className="monica-button-primary min-h-10 px-3 text-sm disabled:opacity-50"
                                >
                                  {actingId === `${item.themeSubmissionId}:accepted_to_pool` ? (
                                    <SpinnerLabel>Accept</SpinnerLabel>
                                  ) : (
                                    <>
                                      <Check className="size-4" />
                                      Accept as theme
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void reviewThemeSubmission(item.themeSubmissionId, 'rejected')
                                  }
                                  disabled={Boolean(actingId)}
                                  className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
                                >
                                  <X className="size-4" />
                                  Reject
                                </button>
                              </>
                            ) : null}
                            {item.status === 'under_review' ||
                            item.status === 'accepted_to_pool' ||
                            item.status === 'selected' ? (
                              <button
                                type="button"
                                onClick={() => openEditAccept(item)}
                                disabled={Boolean(actingId)}
                                className="monica-button-primary min-h-10 px-3 text-sm disabled:opacity-50"
                              >
                                <Pencil className="size-4" />
                                Edit and accept
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3">
                          <ReviewFlowInline flow={item.reviewFlow} />
                        </div>
                        {editAcceptId === item.themeSubmissionId ? (
                          <EditAcceptPanel
                            item={item}
                            draft={
                              editAcceptDraftById[item.themeSubmissionId] ??
                              buildInitialEditAcceptDraft(item)
                            }
                            saving={actingId === `${item.themeSubmissionId}:scheduled`}
                            disabled={Boolean(actingId)}
                            onChange={(patch) =>
                              updateEditAcceptDraft(item.themeSubmissionId, patch)
                            }
                            onCancel={() => setEditAcceptId(null)}
                            onSave={(draft) => void publishThemeSubmission(item, draft)}
                          />
                        ) : null}
                      </article>
                    )}
                  />
                ) : null}

                {/* Manage themes tab — compact table */}
                {themeAdminTab === 'manage_themes' ? (
                  <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setNewThemeOpen(true)}
                        className="monica-button-primary min-h-10 px-3 text-sm"
                      >
                        <Plus className="size-4" />New theme
                      </button>
                    </div>

                    {/* Table body */}
                    {themes.loading ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        Loading...
                      </div>
                    ) : themes.error ? (
                      <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-100">
                        {themes.error}
                      </div>
                    ) : themes.items.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        No themes.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                              <th className="py-2 pr-4 text-left font-medium">Theme</th>
                              <th className="py-2 pr-4 text-left font-medium">Source</th>
                              <th className="py-2 pr-4 text-left font-medium">Publish date</th>
                              <th className="py-2 pr-4 text-left font-medium">Readiness</th>
                              <th className="py-2 pr-4 text-left font-medium">Featured</th>
                              <th className="py-2 text-left font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {themes.items.map((theme) => (
                              <ThemeTableRow
                                key={theme.id}
                                theme={theme}
                                onOpenModal={(selectedTheme, type) => {
                                  setThemeModal({ theme: selectedTheme, type });
                                }}
                              />
                            ))}
                          </tbody>
                        </table>
                        {themeModal?.type === 'fields' ? (
                          <ThemeFieldsModal
                            theme={themeModal.theme}
                            onClose={() => setThemeModal(null)}
                            onSaved={themes.reload}
                          />
                        ) : null}
                        {themeModal?.type === 'featured' ? (
                          <FeaturedImagesModal
                            theme={themeModal.theme}
                            onClose={() => setThemeModal(null)}
                            onSaved={themes.reload}
                          />
                        ) : null}
                        {themeModal?.type === 'submit_images' ? (
                          <SubmitImagesModal
                            theme={themeModal.theme}
                            onClose={() => setThemeModal(null)}
                            onSaved={themes.reload}
                          />
                        ) : null}
                        {themeModal?.type === 'upload_image' ? (
                          <UploadImageModal
                            theme={themeModal.theme}
                            onClose={() => setThemeModal(null)}
                            onSaved={themes.reload}
                          />
                        ) : null}
                      </div>
                    )}

                    {/* Pagination */}
                    {themes.pagination && themes.items.length > 0 ? (
                      <div className="flex justify-center gap-2 pt-2">
                        {Array.from(
                          { length: themes.pagination.totalPages },
                          (_, i) => i + 1,
                        ).map((page) => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => themes.setPage(page)}
                            className={cn(
                              'h-8 min-w-8 rounded-md border px-2 text-sm',
                              themes.pagination?.page === page
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border hover:bg-muted',
                            )}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* ── Image submissions panel ───────────────────────── */}
            {tab === 'image_submissions' ? (
              <ListShell
                items={imageSubmissions.items}
                loading={imageSubmissions.loading}
                error={imageSubmissions.error}
                empty="No image submissions."
                pagination={imageSubmissions.pagination}
                onPageChange={imageSubmissions.setPage}
                filters={(
                  <div className="flex justify-start">
                    <FilterPills
                      value={imageSubmissions.filters.status}
                      options={statusOptions}
                      onChange={(status) => imageSubmissions.updateFilters({ status })}
                    />
                  </div>
                )}
                renderItem={(item) => (
                  <article
                    key={item.id}
                    className="grid gap-5 rounded-lg border border-border bg-card p-4 shadow-sm md:grid-cols-[180px_minmax(0,1fr)_auto]"
                  >
                    <div className="overflow-hidden rounded-md bg-muted">
                      {item.image?.imageUrl ? (
                        <Image
                          src={item.image.imageUrl}
                          alt=""
                          width={1024}
                          height={1024}
                          unoptimized
                          className="aspect-square w-full object-cover"
                        />
                      ) : (
                        <div className="grid aspect-square place-items-center text-muted-foreground">
                          <ImagePlus className="size-8" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold">{item.title}</h3>
                        <StatusBadge tone={getStatusTone(item.status)}>
                          {item.status}
                        </StatusBadge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.theme?.title || 'No theme'} &middot;{' '}
                        {item.user?.email || item.user?.userName || 'Unknown user'}
                      </p>
                      <p className="line-clamp-2 text-base leading-7 text-muted-foreground">
                        {item.creationNote || item.promptSnapshot || 'No note.'}
                      </p>
                      <ReviewFlowInline flow={item.reviewFlow} />
                      <label className="mt-2 block">
                        <span className={labelSpanCls}>Alt text</span>
                        <textarea
                          value={imageAltTextById[item.id] ?? ''}
                          onChange={(e) =>
                            setImageAltTextById((current) => ({
                              ...current,
                              [item.id]: e.target.value,
                            }))
                          }
                          rows={2}
                          placeholder="Describe the visible image content for SEO and accessibility"
                          className={cn('mt-1', textareaCls)}
                        />
                      </label>
                      <label className="mt-2 block">
                        <span className={labelSpanCls}>Reject note</span>
                        <textarea
                          value={imageRejectNoteById[item.id] ?? ''}
                          onChange={(e) =>
                            setImageRejectNoteById((current) => ({
                              ...current,
                              [item.id]: e.target.value,
                            }))
                          }
                          rows={2}
                          className={cn('mt-1', textareaCls)}
                        />
                      </label>
                    </div>
                    <div className="flex gap-2 md:w-28 md:flex-col">
                      <button
                        type="button"
                        onClick={() => void reviewImageSubmission(item.id, 'approved')}
                        disabled={Boolean(actingId)}
                        className="h-10 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
                      >
                        {actingId === `${item.id}:approved` ? (
                          <SpinnerLabel>Approve</SpinnerLabel>
                        ) : (
                          'Approve'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void reviewImageSubmission(item.id, 'rejected')}
                        disabled={Boolean(actingId)}
                        className="h-10 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
                      >
                        {actingId === `${item.id}:rejected` ? (
                          <SpinnerLabel>Reject</SpinnerLabel>
                        ) : (
                          'Reject'
                        )}
                      </button>
                    </div>
                  </article>
                )}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* New theme modal */}
      {newThemeOpen ? (
        <NewThemeModal onClose={() => setNewThemeOpen(false)} onCreated={themes.reload} />
      ) : null}
    </section>
  );
}

export { ThemeCoverPreview, FeaturedImageStrip };

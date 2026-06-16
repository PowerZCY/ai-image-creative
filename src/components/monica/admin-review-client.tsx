'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, ImagePlus, Pencil, Star, X } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import { themeButtonGradientClass, themeHeroEyesOnClass } from '@windrun-huaiin/base-ui/lib';
import { monicaContentWidthClass } from './layout';
import { FilterPills, ListShell, ReviewFlowInline, SearchInput, SpinnerLabel, StatusBadge, getStatusTone, useMonicaPagedList } from './list-components';

type AdminTab = 'theme_submissions' | 'themes' | 'image_submissions';

type ThemeSubmission = {
  themeSubmissionId: string;
  title: string;
  details: string;
  submitReason?: string | null;
  status: string;
  reviewFlow?: unknown;
  user?: { email?: string | null; userName?: string | null } | null;
};

type ThemeItem = {
  id: string;
  title: string;
  brief?: string | null;
  description?: string | null;
  sourceType?: string | null;
  publishDate?: string | null;
  coverImageUrl?: string | null;
  featuredImageIds?: string[];
  promptTexts?: string[];
  tags?: string[];
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

type Filters = {
  keyword: string;
  status: string;
};

async function readError(response: Response) {
  try {
    const data = await response.json() as { error?: unknown };
    return typeof data.error === 'string' ? data.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

export function AdminReviewClient() {
  const [tab, setTab] = useState<AdminTab>('theme_submissions');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
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
    { value: 'theme_submissions', label: 'User submissions' },
    { value: 'themes', label: 'Manage themes' },
    { value: 'image_submissions', label: 'Image submissions' },
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

  async function reviewImageSubmission(id: string, action: 'approved' | 'rejected') {
    setActingId(`${id}:${action}`);
    setActionError(null);
    try {
      const response = await fetch(`/api/monica/admin/image-submissions/${id}/review`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error(await readError(response));
      imageSubmissions.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setActingId(null);
    }
  }

  return (
    <section className="min-h-screen px-4 py-20 md:px-8 md:py-24">
      <div className={cn(monicaContentWidthClass, 'space-y-6')}>
        <div>
          <h1 className={cn('bg-clip-text text-3xl font-semibold text-transparent md:text-5xl', themeHeroEyesOnClass)}>
            Admin review
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review theme submissions, manage official themes, and moderate image submissions.
          </p>
        </div>
        <FilterPills value={tab} options={tabOptions} onChange={setTab} />
        {actionError ? <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-100">{actionError}</div> : null}

        {tab === 'theme_submissions' ? (
          <ListShell
            title="User submissions"
            description="Review user submitted theme ideas, then accept them into the formal theme workflow."
            items={themeSubmissions.items}
            loading={themeSubmissions.loading}
            error={themeSubmissions.error}
            empty="No theme submissions."
            pagination={themeSubmissions.pagination}
            onPageChange={themeSubmissions.setPage}
            filters={(
              <div className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_auto] md:items-end">
                <SearchInput value={themeSubmissions.filters.keyword} placeholder="Search submissions" onChange={(keyword) => themeSubmissions.updateFilters({ keyword })} />
                <FilterPills value={themeSubmissions.filters.status} options={statusOptions} onChange={(status) => themeSubmissions.updateFilters({ status })} />
              </div>
            )}
            renderItem={(item) => (
              <article key={item.themeSubmissionId} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{item.title}</h3>
                      <StatusBadge tone={getStatusTone(item.status)}>{item.status}</StatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.user?.email || item.user?.userName || 'Unknown user'}</p>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{item.details}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void reviewThemeSubmission(item.themeSubmissionId, 'accepted_to_pool')}
                      disabled={Boolean(actingId)}
                      className={cn('inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-white disabled:opacity-50', themeButtonGradientClass)}
                    >
                      {actingId === `${item.themeSubmissionId}:accepted_to_pool` ? <SpinnerLabel>Accept</SpinnerLabel> : <><Check className="size-4" />Accept</>}
                    </button>
                    <button
                      type="button"
                      onClick={() => void reviewThemeSubmission(item.themeSubmissionId, 'rejected')}
                      disabled={Boolean(actingId)}
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
                    >
                      <X className="size-4" />Reject
                    </button>
                  </div>
                </div>
                <div className="mt-3"><ReviewFlowInline flow={item.reviewFlow} /></div>
              </article>
            )}
          />
        ) : null}

        {tab === 'themes' ? (
          <ListShell
            title="Manage themes"
            description="Official themes used by theme detail, generation context, and public galleries."
            items={themes.items}
            loading={themes.loading}
            error={themes.error}
            empty="No themes."
            pagination={themes.pagination}
            onPageChange={themes.setPage}
            filters={<SearchInput value={themes.filters.keyword} placeholder="Search themes" onChange={(keyword) => themes.updateFilters({ keyword })} />}
            renderItem={(theme) => (
              <ThemeEditor key={theme.id} theme={theme} onSaved={themes.reload} />
            )}
          />
        ) : null}

        {tab === 'image_submissions' ? (
          <ListShell
            title="Image submissions"
            description="Review submitted images before they become public images."
            items={imageSubmissions.items}
            loading={imageSubmissions.loading}
            error={imageSubmissions.error}
            empty="No image submissions."
            pagination={imageSubmissions.pagination}
            onPageChange={imageSubmissions.setPage}
            filters={(
              <div className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_auto] md:items-end">
                <SearchInput value={imageSubmissions.filters.keyword} placeholder="Search image submissions" onChange={(keyword) => imageSubmissions.updateFilters({ keyword })} />
                <FilterPills value={imageSubmissions.filters.status} options={statusOptions} onChange={(status) => imageSubmissions.updateFilters({ status })} />
              </div>
            )}
            renderItem={(item) => (
              <article key={item.id} className="grid gap-4 rounded-lg border border-border bg-card p-3 md:grid-cols-[150px_minmax(0,1fr)_auto]">
                <div className="overflow-hidden rounded-md bg-muted">
                  {item.image?.imageUrl ? (
                    <Image src={item.image.imageUrl} alt="" width={1024} height={1024} unoptimized className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="grid aspect-square place-items-center text-muted-foreground"><ImagePlus className="size-8" /></div>
                  )}
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold">{item.title}</h3>
                    <StatusBadge tone={getStatusTone(item.status)}>{item.status}</StatusBadge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.theme?.title || 'No theme'} · {item.user?.email || item.user?.userName || 'Unknown user'}</p>
                  <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{item.creationNote || item.promptSnapshot || 'No note.'}</p>
                  <ReviewFlowInline flow={item.reviewFlow} />
                </div>
                <div className="flex gap-2 md:w-28 md:flex-col">
                  <button
                    type="button"
                    onClick={() => void reviewImageSubmission(item.id, 'approved')}
                    disabled={Boolean(actingId)}
                    className="h-10 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
                  >
                    {actingId === `${item.id}:approved` ? <SpinnerLabel>Approve</SpinnerLabel> : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void reviewImageSubmission(item.id, 'rejected')}
                    disabled={Boolean(actingId)}
                    className="h-10 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
                  >
                    {actingId === `${item.id}:rejected` ? <SpinnerLabel>Reject</SpinnerLabel> : 'Reject'}
                  </button>
                </div>
              </article>
            )}
          />
        ) : null}
      </div>
    </section>
  );
}

type ThemeEditMode = 'summary' | 'fields' | 'featured';

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function ThemeEditor({ theme, onSaved }: { theme: ThemeItem; onSaved: () => void }) {
  const [mode, setMode] = useState<ThemeEditMode>('summary');
  const [title, setTitle] = useState(theme.title);
  const [brief, setBrief] = useState(theme.brief ?? '');
  const [description, setDescription] = useState(theme.description ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(theme.coverImageUrl ?? '');
  const [publishDate, setPublishDate] = useState(theme.publishDate ? theme.publishDate.slice(0, 10) : '');
  const [promptTexts, setPromptTexts] = useState((theme.promptTexts ?? []).join('\n'));
  const [tags, setTags] = useState((theme.tags ?? []).join('\n'));
  const [featuredImageIds, setFeaturedImageIds] = useState((theme.featuredImageIds ?? []).join('\n'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveTheme(payload: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/monica/admin/themes/${theme.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await readError(response));
      setMode('summary');
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{theme.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{theme.brief || 'No brief yet.'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge>{theme.sourceType || 'admin'}</StatusBadge>
            <StatusBadge>{theme.publishDate ? new Date(theme.publishDate).toLocaleDateString() : 'No publish date'}</StatusBadge>
            <StatusBadge>{theme.featuredImageIds?.length ?? 0} featured</StatusBadge>
          </div>
        </div>
        <div className="flex gap-2 md:flex-col">
          <button
            type="button"
            onClick={() => setMode(mode === 'fields' ? 'summary' : 'fields')}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted"
          >
            <Pencil className="size-4" />Edit fields
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === 'featured' ? 'summary' : 'featured')}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted"
          >
            <Star className="size-4" />Featured images
          </button>
        </div>
      </div>

      {error ? <div className="mt-3 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-100">{error}</div> : null}

      {mode === 'fields' ? (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Publish date</span>
              <input type="date" value={publishDate} onChange={(event) => setPublishDate(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Brief</span>
            <textarea value={brief} onChange={(event) => setBrief(event.target.value)} rows={2} className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Theme note</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Cover image URL</span>
            <input value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none" />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Generator ideas, one per line</span>
              <textarea value={promptTexts} onChange={(event) => setPromptTexts(event.target.value)} rows={4} className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Tags, one per line</span>
              <textarea value={tags} onChange={(event) => setTags(event.target.value)} rows={4} className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving || !title.trim()}
              onClick={() => void saveTheme({
                title,
                brief,
                description,
                coverImageUrl,
                publishDate,
                promptTexts: splitLines(promptTexts),
                tags: splitLines(tags),
              })}
              className={cn('inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium text-white disabled:opacity-50', themeButtonGradientClass)}
            >
              {saving ? <SpinnerLabel>Save</SpinnerLabel> : 'Save fields'}
            </button>
            <button type="button" onClick={() => setMode('summary')} className="h-10 rounded-md border border-border px-4 text-sm hover:bg-muted">Cancel</button>
          </div>
        </div>
      ) : null}

      {mode === 'featured' ? (
        <div className="mt-4 grid gap-3">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Featured PublicImage numeric IDs, one per line</span>
            <textarea value={featuredImageIds} onChange={(event) => setFeaturedImageIds(event.target.value)} rows={5} className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveTheme({ featuredImageIds: splitLines(featuredImageIds) })}
              className={cn('inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium text-white disabled:opacity-50', themeButtonGradientClass)}
            >
              {saving ? <SpinnerLabel>Save</SpinnerLabel> : 'Save featured images'}
            </button>
            <button type="button" onClick={() => setMode('summary')} className="h-10 rounded-md border border-border px-4 text-sm hover:bg-muted">Cancel</button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

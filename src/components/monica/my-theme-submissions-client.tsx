'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  themeBgColor,
  themeBorderColor,
  themeButtonGradientClass,
  themeHeroEyesOnClass,
  themeIconColor,
} from '@windrun-huaiin/base-ui/lib';
import { cn } from '@windrun-huaiin/lib/utils';
import { monicaContentWidthClass } from './layout';

type ThemeSubmission = {
  themeSubmissionId: string;
  status: string;
  rawTitle: string;
  rawDescription?: string | null;
  editedTitle?: string | null;
  editedBrief?: string | null;
  reviewReason?: string | null;
  sourceType: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  submittedAt?: string | null;
  user?: {
    email?: string | null;
    userName?: string | null;
  } | null;
  acceptedTheme?: {
    title: string;
    status: string;
    publishDate?: string | null;
  } | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type ThemeSubmissionResponse = {
  items: ThemeSubmission[];
  pagination: Pagination;
};

const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'under_review', label: 'Under review' },
  { value: 'accepted_to_pool', label: 'Accepted' },
  { value: 'selected', label: 'Selected' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'duplicate', label: 'Duplicate' },
];
const themeSubmissionPageSize = 12;

async function readError(response: Response) {
  try {
    const data = await response.json();
    return typeof data.error === 'string' ? data.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

function formatDate(value?: string | null) {
  if (!value) return 'No date';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function MyThemeSubmissionsClient() {
  const [items, setItems] = useState<ThemeSubmission[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: themeSubmissionPageSize,
    total: 0,
    totalPages: 1,
  });
  const [status, setStatus] = useState('all');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const page = pagination.page;
  const canGoPrev = page > 1;
  const canGoNext = page < pagination.totalPages;

  const visibleRange = useMemo(() => {
    if (pagination.total === 0) return '0';
    const start = (pagination.page - 1) * pagination.pageSize + 1;
    const end = Math.min(pagination.page * pagination.pageSize, pagination.total);
    return `${start}-${end}`;
  }, [pagination]);

  async function fetchSubmissions(nextStatus = status, nextPage = page) {
    const params = new URLSearchParams({
      status: nextStatus,
      page: String(nextPage),
      pageSize: String(themeSubmissionPageSize),
    });
    const response = await fetch(`/api/monica/themes/my?${params.toString()}`, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error(await readError(response));
    return response.json() as Promise<ThemeSubmissionResponse>;
  }

  async function loadSubmissions(nextStatus = status, nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSubmissions(nextStatus, nextPage);
      setItems(data.items);
      setPagination(data.pagination);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitialPage() {
      try {
        const params = new URLSearchParams({
          status: 'all',
          page: '1',
          pageSize: String(themeSubmissionPageSize),
        });
        const response = await fetch(`/api/monica/themes/my?${params.toString()}`, {
          headers: { accept: 'application/json' },
        });
        if (!response.ok) throw new Error(await readError(response));
        const data = await response.json() as ThemeSubmissionResponse;
        if (active) {
          setItems(data.items);
          setPagination(data.pagination);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInitialPage();

    return () => {
      active = false;
    };
  }, []);

  async function createDraft() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/monica/themes/my', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          rawTitle: title,
          rawDescription: description,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setTitle('');
      setDescription('');
      setStatus('draft');
      await loadSubmissions('draft', 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function submitDraft(themeSubmissionId: string) {
    await mutateSubmission(`/api/monica/themes/my/${themeSubmissionId}/submit`, {});
  }

  async function mutateSubmission(url: string, body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await readError(response));
      await loadSubmissions(status, page);
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : String(mutationError));
    } finally {
      setSaving(false);
    }
  }

  function selectStatus(nextStatus: string) {
    setStatus(nextStatus);
    void loadSubmissions(nextStatus, 1);
  }

  function goToPage(nextPage: number) {
    void loadSubmissions(status, nextPage);
  }

  return (
    <section className="min-h-screen px-4 py-20 md:px-8 md:py-24">
      <div className={monicaContentWidthClass}>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className={cn('bg-clip-text text-4xl font-semibold text-transparent md:text-6xl', themeHeroEyesOnClass)}>
              Theme workspace
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              Create theme drafts, submit ideas, and track how your theme submissions move through review.
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {visibleRange} of {pagination.total}
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-card p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] md:items-end">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                placeholder="Theme title"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Description</span>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                placeholder="What should creators make?"
              />
            </label>
            <button
              type="button"
              disabled={saving || !title.trim()}
              onClick={() => void createDraft()}
              className={cn('h-10 rounded-md px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60', themeButtonGradientClass)}
            >
              New draft
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => selectStatus(filter.value)}
              className={cn(
                'h-9 rounded-md border px-3 text-sm transition',
                status === filter.value
                  ? cn('border-transparent text-white', themeButtonGradientClass)
                  : 'border-border text-muted-foreground hover:bg-background hover:text-foreground',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="mt-6 rounded-lg border border-border bg-card">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading theme ideas...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No theme ideas match this filter.</div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((submission) => (
                <article key={submission.themeSubmissionId} className="p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('rounded-full border px-2 py-1 text-xs', themeBgColor, themeBorderColor, themeIconColor)}>
                          {submission.status}
                        </span>
                        <span className="text-xs text-muted-foreground">{submission.sourceType}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(submission.updatedAt || submission.createdAt)}</span>
                        {submission.user ? (
                          <span className="text-xs text-muted-foreground">
                            {submission.user.email || submission.user.userName || 'unknown user'}
                          </span>
                        ) : null}
                      </div>
                      <h2 className="mt-3 text-base font-semibold text-foreground">
                        {submission.editedTitle || submission.rawTitle}
                      </h2>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                        {submission.editedBrief || submission.rawDescription || 'No description yet.'}
                      </p>
                      {submission.reviewReason ? (
                        <p className="mt-2 text-xs text-muted-foreground">Review: {submission.reviewReason}</p>
                      ) : null}
                      {submission.acceptedTheme ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Theme: {submission.acceptedTheme.title} ({submission.acceptedTheme.status})
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-xs lg:justify-end">
                      {submission.status === 'draft' ? (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void submitDraft(submission.themeSubmissionId)}
                          className="h-9 rounded-md border border-border px-3 text-sm text-foreground hover:bg-muted disabled:opacity-60"
                        >
                          Submit
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={!canGoPrev || loading}
            onClick={() => goToPage(page - 1)}
            className="h-9 rounded-md border border-border px-3 text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} / {pagination.totalPages}
          </div>
          <button
            type="button"
            disabled={!canGoNext || loading}
            onClick={() => goToPage(page + 1)}
            className="h-9 rounded-md border border-border px-3 text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

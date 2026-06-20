'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import { monicaContentWidthClass } from './layout';
import { SpinnerLabel, StatusBadge, getStatusTone, useMonicaPagedList } from './list-components';

type ThemeSubmission = {
  themeSubmissionId: string;
  title: string;
  details: string;
  submitReason?: string | null;
  status: string;
  submittedAt?: string | null;
  notes?: unknown;
  acceptedTheme?: { id?: string; title?: string; slug?: string } | null;
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

export function SubmitThemeClient() {
  const list = useMonicaPagedList<Filters, ThemeSubmission>({
    endpoint: '/api/monica/themes/my/search',
    initialFilters: { keyword: '', status: 'all' },
    pageSize: 10,
  });
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [submitReason, setSubmitReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitTheme() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/monica/themes/my', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          rawTitle: title,
          rawDescription: details,
          triggerType: submitReason,
          submitNow: true,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setTitle('');
      setDetails('');
      setSubmitReason('');
      list.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="monica-surface min-h-screen py-20 md:py-24">
      <div className={cn(monicaContentWidthClass, 'space-y-8')}>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="monica-page-title">
              Submit a theme
            </h1>
            <p className="monica-copy mt-4 max-w-3xl">
              Share a daily theme idea that could inspire people to create AI images. Theme ideas are reviewed as text.
            </p>
          </div>
          <span className="monica-chip w-fit">
            Community ideas
          </span>
        </div>

        <div className="monica-panel p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <h2 className="monica-section-title">Submit a daily theme idea</h2>
              <p className="monica-copy mt-3">
                Submit a text-only theme idea. If it is accepted, admins will turn it into a managed theme with full details, a publish date, and featured images.
              </p>
              <div className="mt-6 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
                Do not attach explanation images here. Images are submitted later from a theme page or My Studio.
              </div>
            </div>
            <div className="space-y-5">
              <label className="block">
                <span className="text-sm font-semibold">Theme name</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="A Scene You Cannot Explain Having Seen Before"
                  className="monica-input mt-2 h-12 w-full px-4"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Theme details</span>
                <textarea
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder="Describe what people should create, what makes the theme open-ended, and what kind of visual thinking it invites."
                  rows={6}
                  className="monica-input mt-2 w-full resize-none px-4 py-3 leading-7"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Why are you submitting this theme? optional</span>
                <textarea
                  value={submitReason}
                  onChange={(event) => setSubmitReason(event.target.value)}
                  placeholder="Optional: explain why this idea could make a strong daily theme."
                  rows={4}
                  className="monica-input mt-2 w-full resize-none px-4 py-3 leading-7"
                />
              </label>
              {error ? <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-100">{error}</div> : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!title.trim() || !details.trim() || submitting}
                  onClick={() => void submitTheme()}
                  className="monica-button-primary disabled:opacity-50"
                >
                  {submitting ? <SpinnerLabel>Submitting</SpinnerLabel> : <><Send className="size-4" />Submit theme idea</>}
                </button>
                <Link href="/explore" className="monica-button-secondary">
                  Browse themes
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="monica-panel-soft p-6 md:p-8">
          <div>
            <h2 className="monica-section-title">My theme ideas</h2>
            <p className="monica-copy mt-3 max-w-3xl">
              Track review status, admin notes, credits, and scheduled publish dates for your submitted ideas.
            </p>
          </div>
          <ThemeIdeasTable
            items={list.items}
            loading={list.loading}
            error={list.error}
            page={list.pagination.page}
            totalPages={list.pagination.totalPages}
            onPageChange={list.setPage}
          />
        </div>
      </div>
    </section>
  );
}

function formatUserThemeStatus(status: string) {
  if (status === 'accepted') return 'Accepted';
  if (status === 'not_selected') return 'Not selected';
  return 'Under review';
}

function formatDate(value?: string | null) {
  if (!value) return 'No date';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ThemeIdeasTable({
  items,
  loading,
  error,
  page,
  totalPages,
  onPageChange,
}: {
  items: ThemeSubmission[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (error) {
    return <div className="mt-4 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-100">{error}</div>;
  }

  if (loading) {
    return <div className="mt-6 rounded-md border border-border bg-muted/40 p-5 text-base text-muted-foreground">Loading theme ideas...</div>;
  }

  if (items.length === 0) {
    return <div className="mt-6 rounded-md border border-border bg-muted/40 p-5 text-base text-muted-foreground">No theme ideas yet.</div>;
  }

  return (
    <div className="mt-6 overflow-hidden rounded-md border border-border bg-white">
      <div className="hidden grid-cols-[minmax(220px,1.25fr)_130px_140px_minmax(180px,0.8fr)] gap-4 bg-muted/50 px-5 py-4 text-xs font-bold uppercase text-muted-foreground md:grid">
        <div>Submitted idea</div>
        <div>Submitted</div>
        <div>Status</div>
        <div>Notes</div>
      </div>
      {items.map((item) => (
        <div key={item.themeSubmissionId} className="grid gap-3 border-t border-border px-5 py-5 text-base md:grid-cols-[minmax(220px,1.25fr)_130px_140px_minmax(180px,0.8fr)] md:items-center">
          <div className="min-w-0">
            <div className="font-semibold text-foreground">{item.title}</div>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.details}</p>
            {item.submitReason ? <p className="mt-1 text-sm leading-6 text-muted-foreground"><span className="font-medium text-foreground">Why:</span> {item.submitReason}</p> : null}
            {item.acceptedTheme ? (
              <Link href={`/themes/${item.acceptedTheme.id ?? item.acceptedTheme.slug ?? item.themeSubmissionId}`} className="mt-2 inline-flex text-sm font-semibold text-foreground underline underline-offset-4">
                Open theme
              </Link>
            ) : null}
          </div>
          <div className="text-sm text-muted-foreground">{formatDate(item.submittedAt)}</div>
          <div><StatusBadge tone={getStatusTone(item.status)}>{formatUserThemeStatus(item.status)}</StatusBadge></div>
          <div className="text-sm leading-6 text-muted-foreground">{formatNotes(item.notes)}</div>
        </div>
      ))}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="h-8 rounded-md border border-border px-3 disabled:opacity-50">Previous</button>
            <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="h-8 rounded-md border border-border px-3 disabled:opacity-50">Next</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatNotes(value: unknown) {
  if (!value) return 'Review pending.';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const latest = value[value.length - 1];
    if (latest && typeof latest === 'object' && 'note' in latest) {
      const note = (latest as { note?: unknown }).note;
      return typeof note === 'string' && note.trim() ? note : 'Review updated.';
    }
  }
  if (typeof value === 'object' && 'note' in value) {
    const note = (value as { note?: unknown }).note;
    return typeof note === 'string' && note.trim() ? note : 'Review updated.';
  }
  return 'Review updated.';
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import { themeButtonGradientClass, themeHeroEyesOnClass } from '@windrun-huaiin/base-ui/lib';
import { monicaContentWidthClass } from './layout';
import { FilterPills, ListShell, ReviewFlowInline, SearchInput, SpinnerLabel, StatusBadge, getStatusTone, useMonicaPagedList } from './list-components';

type ThemeSubmission = {
  themeSubmissionId: string;
  title: string;
  details: string;
  submitReason?: string | null;
  status: string;
  reviewFlow?: unknown;
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

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'under_review', label: 'Under review' },
    { value: 'accepted_to_pool', label: 'Accepted' },
    { value: 'published', label: 'Published' },
    { value: 'rejected', label: 'Not selected' },
  ];

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
    <section className="min-h-screen px-4 py-20 md:px-8 md:py-24">
      <div className={cn(monicaContentWidthClass, 'space-y-8')}>
        <div>
          <h1 className={cn('bg-clip-text text-3xl font-semibold text-transparent md:text-5xl', themeHeroEyesOnClass)}>
            Submit a theme
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Submit a text-only daily theme idea. If it is accepted, admins will turn it into a managed theme.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium">Theme name</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Theme details</span>
                <textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={6} className="mt-2 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Why are you submitting this theme?</span>
                <textarea value={submitReason} onChange={(event) => setSubmitReason(event.target.value)} rows={4} className="mt-2 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" />
              </label>
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
                Do not attach explanation images here. Images are submitted later from a theme page or My Studio.
              </div>
              {error ? <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-100">{error}</div> : null}
              <button
                type="button"
                disabled={!title.trim() || !details.trim() || submitting}
                onClick={() => void submitTheme()}
                className={cn('inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium text-white disabled:opacity-50', themeButtonGradientClass)}
              >
                {submitting ? <SpinnerLabel>Submitting</SpinnerLabel> : <><Send className="size-4" />Submit theme idea</>}
              </button>
            </div>
          </div>

          <ListShell
            title="My theme ideas"
            description="Track review status, admin notes, credits, and publish links."
            items={list.items}
            loading={list.loading}
            error={list.error}
            empty="No theme ideas yet."
            pagination={list.pagination}
            onPageChange={list.setPage}
            filters={(
              <div className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_auto] md:items-end">
                <SearchInput value={list.filters.keyword} placeholder="Search ideas" onChange={(keyword) => list.updateFilters({ keyword })} />
                <FilterPills value={list.filters.status} options={statusOptions} onChange={(status) => list.updateFilters({ status })} />
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
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{item.details}</p>
                  </div>
                  {item.acceptedTheme ? (
                    <Link href={`/themes/${item.acceptedTheme.id ?? item.acceptedTheme.slug ?? item.themeSubmissionId}`} className="shrink-0 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
                      Open theme
                    </Link>
                  ) : null}
                </div>
                <div className="mt-3"><ReviewFlowInline flow={item.reviewFlow} /></div>
              </article>
            )}
          />
        </div>
      </div>
    </section>
  );
}

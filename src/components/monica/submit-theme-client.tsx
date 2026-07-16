'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Clock, MessageSquareText, RotateCcw, Send, X } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import { SpinnerLabel, useMonicaPagedList } from './list-components';

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

type FeedbackType = 'success' | 'error';

const FEEDBACK: Record<FeedbackType, {
  icon: typeof CheckCircle2;
  title: string;
  message: string;
  tone: string;
}> = {
  success: {
    icon: CheckCircle2,
    title: 'Theme idea submitted',
    message: "Thanks for sharing. We'll review your idea soon",
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
  error: {
    icon: AlertCircle,
    title: 'Submission failed',
    message: 'Something went wrong. Please try again in a moment.',
    tone: 'border-red-200 bg-red-50 text-red-900',
  },
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
  const [feedback, setFeedback] = useState<FeedbackType | null>(null);
  const canSubmit = title.trim().length > 0 && details.trim().length > 0 && !submitting;

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 6000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  async function submitTheme() {
    setSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await fetch('/api/monica/themes/my', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          rawTitle: title,
          rawDescription: details,
          triggerType: submitReason,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      await response.json();
      setTitle('');
      setDetails('');
      setSubmitReason('');
      setFeedback('success');
      list.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
      setFeedback('error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="monica-surface min-h-screen bg-white pb-10 pt-16 md:pb-12 md:pt-20">
      <div className="mx-auto w-full max-w-[840px] px-5 sm:px-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold leading-tight tracking-normal text-foreground">
            Submit a daily theme
          </h1>
          <div className="max-w-2xl space-y-1 text-base leading-relaxed text-muted-foreground">
            <p>Got a spark of an idea? Share it with the community.</p>
            <p>Selected ideas can become a daily theme.</p>
          </div>
        </div>

        <form
          className="mt-8 space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            void submitTheme();
          }}
        >
          <label className="block space-y-2">
            <span className="block text-lg font-medium text-foreground">Theme name</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. A scene you can't explain having seen before"
              className="h-[42px] w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
            />
          </label>

          <label className="block space-y-2">
            <span className="block text-lg font-medium text-foreground">Theme details</span>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Explain what people can create, why it's open-ended, and the kind of visual thinking it invites."
              rows={6}
              className="min-h-[158px] w-full resize-y rounded-lg border border-neutral-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
            />
          </label>

          <label className="block space-y-2">
            <span className="flex items-center gap-2 text-lg font-medium text-foreground">
              Why this theme?
              <span className="text-xs font-normal text-muted-foreground">Optional</span>
            </span>
            <textarea
              value={submitReason}
              onChange={(event) => setSubmitReason(event.target.value)}
              placeholder="What would make this a great daily theme?"
              rows={3}
              className="min-h-[90px] w-full resize-y rounded-lg border border-neutral-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
            />
          </label>

          {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

          <div className="pt-1">
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed',
                canSubmit
                  ? 'bg-emerald-600 shadow-sm hover:bg-emerald-700 hover:shadow-md active:translate-y-px'
                  : 'bg-[#8acdb4] opacity-55',
              )}
            >
              {submitting ? <SpinnerLabel>Submitting</SpinnerLabel> : <><Send className="size-4" />Submit theme</>}
            </button>
          </div>
        </form>

        <div className="mt-12 border-t border-neutral-200 pt-12">
          <ThemeIdeasList
            items={list.items}
            loading={list.loading}
            error={list.error}
            page={list.pagination.page}
            totalPages={list.pagination.totalPages}
            onPageChange={list.setPage}
          />
        </div>
      </div>
      {feedback ? <FeedbackDialog feedback={feedback} onClose={() => setFeedback(null)} /> : null}
    </section>
  );
}

function FeedbackDialog({ feedback, onClose }: { feedback: FeedbackType; onClose: () => void }) {
  const config = FEEDBACK[feedback];
  const Icon = config.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/20" aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className={cn('relative w-full max-w-sm rounded-xl border p-5 shadow-xl', config.tone)}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="absolute right-3 top-3 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        <div className="flex flex-col items-center gap-3 text-center">
          <Icon className="size-8 shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-base font-semibold">{config.title}</p>
            <p className="text-sm leading-relaxed opacity-90">{config.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return 'No date';
  return new Date(value).toISOString().slice(0, 10);
}

type ThemeCardStatus = 'accepted' | 'under_review' | 'not_selected';

const statusConfig: Record<ThemeCardStatus, {
  label: string;
  icon: typeof CheckCircle2;
  badgeClassName: string;
  accentClassName: string;
}> = {
  accepted: {
    label: 'Featured',
    icon: CheckCircle2,
    badgeClassName: 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700',
    accentClassName: 'bg-emerald-600',
  },
  under_review: {
    label: 'In review',
    icon: Clock,
    badgeClassName: 'border-amber-600/20 bg-amber-600/10 text-amber-700',
    accentClassName: 'bg-amber-500',
  },
  not_selected: {
    label: 'Maybe next time',
    icon: RotateCcw,
    badgeClassName: 'border-neutral-200 bg-neutral-100 text-muted-foreground',
    accentClassName: 'bg-neutral-400',
  },
};

function normalizeThemeStatus(status: string): ThemeCardStatus {
  if (status === 'accepted') return 'accepted';
  if (status === 'not_selected') return 'not_selected';
  return 'under_review';
}

function ThemeStatusBadge({ status }: { status: string }) {
  const config = statusConfig[normalizeThemeStatus(status)];
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium', config.badgeClassName)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}

function ThemeIdeasList({
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
    return <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>;
  }

  if (loading) {
    return (
      <section>
        <h2 className="text-lg font-semibold tracking-normal text-foreground">Your submissions</h2>
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 text-sm text-muted-foreground">Loading theme ideas...</div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold tracking-normal text-foreground">Your submissions</h2>
        <div className="mt-6 rounded-xl border border-dashed border-neutral-200 bg-white py-12 text-center text-sm text-muted-foreground">
          You haven&apos;t submitted any ideas yet.
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-normal text-foreground">Your submissions</h2>
      <ul className="mt-5 space-y-4">
        {items.map((item) => {
          const config = statusConfig[normalizeThemeStatus(item.status)];
          return (
            <li key={item.themeSubmissionId} className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-5">
              <span className={cn('absolute inset-y-0 left-0 w-1', config.accentClassName)} aria-hidden="true" />
              <div className="flex items-start justify-between gap-3 pl-2">
                <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug text-foreground">{item.title}</h3>
                <ThemeStatusBadge status={item.status} />
              </div>

              <p className="mt-2.5 pl-2 text-sm leading-relaxed text-muted-foreground">{item.details}</p>

              {item.submitReason ? (
                <div className="mt-3 pl-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Why this theme
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.submitReason}</p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-2 border-t border-neutral-200 pl-2 pt-3 text-sm text-muted-foreground md:flex-row md:items-start md:gap-6">
                <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                  <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                  Submitted {formatDate(item.submittedAt)}
                </span>
                <span className="inline-flex min-w-0 flex-1 items-center gap-1.5">
                  <MessageSquareText className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">{formatNotes(item)}</span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="h-8 rounded-md border border-neutral-200 px-3 disabled:opacity-50">Previous</button>
            <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="h-8 rounded-md border border-neutral-200 px-3 disabled:opacity-50">Next</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function formatNotes(item: ThemeSubmission) {
  const fallback = getFallbackNote(item.status);
  if (!item.notes) return fallback;
  if (typeof item.notes === 'string') return item.notes || fallback;
  if (Array.isArray(item.notes)) {
    const latest = item.notes[item.notes.length - 1];
    if (latest && typeof latest === 'object' && 'note' in latest) {
      const note = (latest as { note?: unknown }).note;
      return typeof note === 'string' && note.trim() ? note : fallback;
    }
  }
  if (typeof item.notes === 'object' && 'note' in item.notes) {
    const note = (item.notes as { note?: unknown }).note;
    return typeof note === 'string' && note.trim() ? note : fallback;
  }
  return fallback;
}

function getFallbackNote(status: string) {
  if (status === 'accepted') return 'Featured as a daily theme. 20 free credits added to your account — enjoy!';
  if (status === 'not_selected') return "Not selected this time, but we'd love to see more ideas from you soon.";
  return 'Thanks for sharing! Our team is reviewing this idea.';
}

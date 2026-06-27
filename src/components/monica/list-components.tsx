'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PagedResult<T> = {
  items: T[];
  pagination: Pagination;
};

export type PagedRequest<TFilters> = {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters: TFilters;
};

const emptyPagination: Pagination = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
};

async function readApiError(response: Response) {
  try {
    const data = await response.json() as { error?: unknown };
    return typeof data.error === 'string' ? data.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

export function useMonicaPagedList<TFilters extends Record<string, unknown>, TItem>(options: {
  endpoint: string;
  initialFilters: TFilters;
  initialSortBy?: string;
  pageSize?: number;
}) {
  const [filters, setFilters] = useState<TFilters>(options.initialFilters);
  const [sortBy, setSortBy] = useState(options.initialSortBy);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(options.pageSize ?? 20);
  const [items, setItems] = useState<TItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ ...emptyPagination, pageSize });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestBody = useMemo<PagedRequest<TFilters>>(() => ({
    page,
    pageSize,
    sortBy,
    filters,
  }), [filters, page, pageSize, sortBy]);

  const updateFilters = useCallback((next: Partial<TFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(options.initialFilters);
    setPage(1);
  }, [options.initialFilters]);

  const reload = useCallback(() => setReloadKey((current) => current + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(options.endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
          },
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(await readApiError(response));
        }

        const data = await response.json() as PagedResult<TItem>;
        setItems(data.items ?? []);
        setPagination(data.pagination ?? { ...emptyPagination, page, pageSize });
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setItems([]);
        setPagination({ ...emptyPagination, page, pageSize });
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void run();
    return () => controller.abort();
  }, [options.endpoint, page, pageSize, reloadKey, requestBody]);

  return {
    filters,
    updateFilters,
    clearFilters,
    sortBy,
    setSortBy: (value: string) => {
      setSortBy(value);
      setPage(1);
    },
    page,
    setPage,
    items,
    pagination,
    loading,
    error,
    reload,
  };
}

export function StatusBadge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'good' | 'warn' | 'danger' }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-full border px-3 py-1.5 text-xs font-semibold',
        tone === 'good' && 'border-emerald-300/70 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
        tone === 'warn' && 'border-amber-300/80 bg-amber-500/10 text-amber-800 dark:text-amber-200',
        tone === 'danger' && 'border-rose-300/80 bg-rose-500/10 text-rose-700 dark:text-rose-200',
        tone === 'default' && 'border-border bg-muted/40 text-muted-foreground',
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

export function getStatusTone(status?: string | null): 'default' | 'good' | 'warn' | 'danger' {
  if (!status) return 'default';
  if (status === 'approved' || status === 'published' || status === 'generated') return 'good';
  if (status === 'submitted' || status === 'under_review' || status === 'needs_review' || status === 'withdrawal_requested') return 'warn';
  if (status === 'rejected' || status === 'failed' || status === 'blocked' || status === 'hidden') return 'danger';
  return 'default';
}

export function SearchInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block min-w-0">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="monica-input h-11 w-full pl-9 pr-9 text-base text-foreground placeholder:text-muted-foreground/70"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </label>
  );
}

export function FilterPills<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: TValue;
  options: Array<{ value: TValue; label: string }>;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="min-w-0">
      {label ? <div className="mb-2 text-xs font-semibold text-muted-foreground">{label}</div> : null}
      <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-neutral-200 bg-neutral-100 p-1 text-neutral-500">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={cn(
              'inline-flex h-8 items-center justify-center rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
              value === option.value
                ? 'bg-white text-neutral-950 shadow-sm'
                : 'text-neutral-500 hover:bg-white/60 hover:text-neutral-900',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ListShell<T>({
  title,
  description,
  actions,
  filters,
  items,
  loading,
  error,
  empty,
  pagination,
  onPageChange,
  renderItem,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  filters?: ReactNode;
  items: T[];
  loading: boolean;
  error: string | null;
  empty: string;
  pagination: Pagination;
  onPageChange: (page: number) => void;
  renderItem: (item: T) => ReactNode;
}) {
  return (
    <div className="space-y-4">
      {(title || description || actions) ? (
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            {title ? <h2 className="text-3xl font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}

      {filters}

      {error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/60 p-6 text-base text-muted-foreground">{empty}</div>
      ) : (
        <div className="space-y-3">{items.map(renderItem)}</div>
      )}

      {!loading && !error ? (
        <ListPagination pagination={pagination} onPageChange={onPageChange} />
      ) : null}
    </div>
  );
}

export function ListSkeleton({ image = false }: { image?: boolean }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="grid gap-4 rounded-lg border border-border bg-card/60 p-5 md:grid-cols-[auto_minmax(0,1fr)_auto]">
          {image ? <div className="aspect-square w-full rounded-md bg-muted md:w-28" /> : null}
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-5 w-2/5 rounded-full bg-muted" />
            <div className="flex gap-2">
              <div className="h-5 w-20 rounded-full bg-muted" />
              <div className="h-5 w-24 rounded-full bg-muted" />
            </div>
            <div className="h-4 w-full rounded-full bg-muted" />
            <div className="h-4 w-4/5 rounded-full bg-muted" />
          </div>
          <div className="flex gap-2 md:flex-col">
            <div className="h-9 w-20 rounded-md bg-muted" />
            <div className="h-9 w-20 rounded-md bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListPagination({ pagination, onPageChange }: { pagination: Pagination; onPageChange: (page: number) => void }) {
  const maxPage = Math.max(1, pagination.totalPages);
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-border px-4 py-4 text-sm text-muted-foreground">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
        disabled={pagination.page <= 1}
        className="grid size-9 place-items-center rounded-full border border-border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="font-medium text-foreground">
        {pagination.page} / {maxPage}
      </span>
      <span>{pagination.total} total</span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(maxPage, pagination.page + 1))}
        disabled={pagination.page >= maxPage}
        className="grid size-9 place-items-center rounded-full border border-border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

export function ReviewFlowInline({ flow }: { flow?: unknown }) {
  const nodes = Array.isArray(flow) ? flow : [];
  const last = nodes.at(-1) as { status?: string; note?: string; actorType?: string; createdAt?: string } | undefined;
  if (!last) {
    return <span className="text-sm text-muted-foreground">No review notes</span>;
  }

  return (
    <div className="min-w-0 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={getStatusTone(last.status)}>{last.status ?? 'review'}</StatusBadge>
        <span>{last.actorType ?? 'system'}</span>
        {last.createdAt ? <span>{new Date(last.createdAt).toLocaleString()}</span> : null}
      </div>
      {last.note ? <div className="mt-1 line-clamp-2">{last.note}</div> : null}
    </div>
  );
}

export function SpinnerLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Loader2 className="size-4 animate-spin" />
      {children}
    </span>
  );
}

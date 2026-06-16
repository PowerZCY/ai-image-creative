export type MonicaPagedRequest<TFilter = Record<string, unknown>> = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: TFilter;
};

export type MonicaPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type MonicaPagedResult<TItem> = {
  items: TItem[];
  pagination: MonicaPagination;
};

export function normalizePagination(input: { page?: unknown; pageSize?: unknown }, defaults = { pageSize: 20 }) {
  const rawPage = typeof input.page === 'number' ? input.page : Number(input.page);
  const rawPageSize = typeof input.pageSize === 'number' ? input.pageSize : Number(input.pageSize);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage)) : 1;
  const pageSize = Number.isFinite(rawPageSize)
    ? Math.min(50, Math.max(5, Math.trunc(rawPageSize)))
    : defaults.pageSize;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

export function buildPagination(input: { page: number; pageSize: number; total: number }): MonicaPagination {
  return {
    page: input.page,
    pageSize: input.pageSize,
    total: input.total,
    totalPages: Math.max(1, Math.ceil(input.total / input.pageSize)),
  };
}

export function readStringFilter(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

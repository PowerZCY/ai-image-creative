'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, ImagePlus, Pencil, Plus, Star, X } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import { monicaContentWidthClass } from './layout';
import { FilterPills, ListShell, ReviewFlowInline, SearchInput, SpinnerLabel, StatusBadge, getStatusTone, useMonicaPagedList } from './list-components';

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

type ThemeItem = {
  id: string;
  title: string;
  brief?: string | null;
  description?: string | null;
  sourceType?: string | null;
  publishDate?: string | null;
  coverImageUrl?: string | null;
  featuredImages?: Array<{ id: string; publicImageId?: string | null; title?: string | null; imageUrl?: string | null; thumbnailUrl?: string | null } | null>;
  promptTexts?: string[];
  tags?: string[];
  seoTitle?: string | null;
  seoMetaDescription?: string | null;
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

type Filters = {
  keyword: string;
  status: string;
};

type EditAcceptDraft = {
  title: string;
  brief: string;
  description: string;
  publishDate: string;
  promptTexts: string;
  tags: string;
};

async function readError(response: Response) {
  try {
    const data = await response.json() as { error?: unknown };
    return typeof data.error === 'string' ? data.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

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
  const [editAcceptDraftById, setEditAcceptDraftById] = useState<Record<string, EditAcceptDraft>>({});
  const [newThemeOpen, setNewThemeOpen] = useState(false);
  const [newThemeTitle, setNewThemeTitle] = useState('');
  const [newThemeBrief, setNewThemeBrief] = useState('');
  const [imageRejectNoteById, setImageRejectNoteById] = useState<Record<string, string>>({});
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
      brief: item.details,
      description: item.details,
      publishDate: '',
      promptTexts: '',
      tags: '',
    };
  }

  function openEditAccept(item: ThemeSubmission) {
    setEditAcceptId((currentId) => currentId === item.themeSubmissionId ? null : item.themeSubmissionId);
    setEditAcceptDraftById((current) => ({
      ...current,
      [item.themeSubmissionId]: current[item.themeSubmissionId] ?? buildInitialEditAcceptDraft(item),
    }));
  }

  function updateEditAcceptDraft(id: string, patch: Partial<EditAcceptDraft>) {
    setEditAcceptDraftById((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? {
          title: '',
          brief: '',
          description: '',
          publishDate: '',
          promptTexts: '',
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
      const response = await fetch(`/api/monica/admin/theme-submissions/${item.themeSubmissionId}/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          brief: draft.brief,
          description: draft.description,
          promptTexts: splitLines(draft.promptTexts),
          tags: splitLines(draft.tags),
          publishDate: draft.publishDate,
          status,
        }),
      });
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
        body: JSON.stringify({ action, note: imageRejectNoteById[id] }),
      });
      if (!response.ok) throw new Error(await readError(response));
      imageSubmissions.reload();
      setImageRejectNoteById((current) => ({ ...current, [id]: '' }));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setActingId(null);
    }
  }

  async function createTheme() {
    setActingId('new-theme');
    setActionError(null);
    try {
      const response = await fetch('/api/monica/admin/themes', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          title: newThemeTitle,
          brief: newThemeBrief,
          description: newThemeBrief,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setNewThemeOpen(false);
      setNewThemeTitle('');
      setNewThemeBrief('');
      themes.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setActingId(null);
    }
  }

  return (
    <section className="monica-surface min-h-screen py-20 md:py-24">
      <div className={cn(monicaContentWidthClass, 'space-y-6')}>
        <div>
          <h1 className="monica-page-title">
            Admin review
          </h1>
          <p className="monica-copy mt-4 max-w-3xl">
            Review theme submissions, manage official themes, and moderate image submissions.
          </p>
        </div>
        <FilterPills value={tab} options={tabOptions} onChange={setTab} />
        {actionError ? <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-100">{actionError}</div> : null}

        {tab === 'themes' ? (
          <div className="monica-panel-soft p-5">
            <div className="mb-3">
              <h2 className="text-3xl font-semibold text-foreground">Themes</h2>
              <p className="mt-2 text-base leading-7 text-muted-foreground">
                Review user-submitted ideas, then manage accepted and admin-created themes from one list.
              </p>
            </div>
            <FilterPills value={themeAdminTab} options={themeAdminTabOptions} onChange={setThemeAdminTab} />
          </div>
        ) : null}

        {tab === 'themes' && themeAdminTab === 'theme_submissions' ? (
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
              <article key={item.themeSubmissionId} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold">{item.title}</h3>
                      <StatusBadge tone={getStatusTone(item.status)}>{item.status}</StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.user?.email || item.user?.userName || 'Unknown user'}</p>
                    <p className="mt-3 line-clamp-3 text-base leading-7 text-muted-foreground">{item.details}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {item.status === 'under_review' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void reviewThemeSubmission(item.themeSubmissionId, 'accepted_to_pool')}
                          disabled={Boolean(actingId)}
                          className="monica-button-primary min-h-10 px-3 text-sm disabled:opacity-50"
                        >
                          {actingId === `${item.themeSubmissionId}:accepted_to_pool` ? <SpinnerLabel>Accept</SpinnerLabel> : <><Check className="size-4" />Accept as theme</>}
                        </button>
                        <button
                          type="button"
                          onClick={() => void reviewThemeSubmission(item.themeSubmissionId, 'rejected')}
                          disabled={Boolean(actingId)}
                          className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
                        >
                          <X className="size-4" />Reject
                        </button>
                      </>
                    ) : null}
                    {item.status === 'under_review' || item.status === 'accepted_to_pool' || item.status === 'selected' ? (
                      <button
                        type="button"
                        onClick={() => openEditAccept(item)}
                        disabled={Boolean(actingId)}
                        className="monica-button-primary min-h-10 px-3 text-sm disabled:opacity-50"
                      >
                        <Pencil className="size-4" />Edit and accept
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3"><ReviewFlowInline flow={item.reviewFlow} /></div>
                {editAcceptId === item.themeSubmissionId ? (
                  <EditAcceptPanel
                    item={item}
                    draft={editAcceptDraftById[item.themeSubmissionId] ?? buildInitialEditAcceptDraft(item)}
                    saving={actingId === `${item.themeSubmissionId}:scheduled`}
                    disabled={Boolean(actingId)}
                    onChange={(patch) => updateEditAcceptDraft(item.themeSubmissionId, patch)}
                    onCancel={() => setEditAcceptId(null)}
                    onSave={(draft) => void publishThemeSubmission(item, draft)}
                  />
                ) : null}
              </article>
            )}
          />
        ) : null}

        {tab === 'themes' && themeAdminTab === 'manage_themes' ? (
          <ListShell
            title="Manage themes"
            description="Official themes used by theme detail, generation context, and public galleries."
            items={themes.items}
            loading={themes.loading}
            error={themes.error}
            empty="No themes."
            pagination={themes.pagination}
            onPageChange={themes.setPage}
            filters={(
              <div className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_auto] md:items-end">
                <SearchInput value={themes.filters.keyword} placeholder="Search themes" onChange={(keyword) => themes.updateFilters({ keyword })} />
                <button
                  type="button"
                  onClick={() => setNewThemeOpen((open) => !open)}
                  className="monica-button-primary min-h-10 px-3 text-sm"
                >
                  <Plus className="size-4" />New theme
                </button>
              </div>
            )}
            renderItem={(theme) => (
              <ThemeEditor key={theme.id} theme={theme} onSaved={themes.reload} />
            )}
          />
        ) : null}

        {tab === 'themes' && themeAdminTab === 'manage_themes' && newThemeOpen ? (
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[minmax(180px,0.8fr)_minmax(0,1.2fr)_auto] md:items-end">
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Theme</span>
                <input value={newThemeTitle} onChange={(event) => setNewThemeTitle(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Brief</span>
                <input value={newThemeBrief} onChange={(event) => setNewThemeBrief(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none" />
              </label>
              <button type="button" disabled={!newThemeTitle.trim() || Boolean(actingId)} onClick={() => void createTheme()} className="monica-button-primary min-h-10 px-3 text-sm disabled:opacity-50">
                {actingId === 'new-theme' ? <SpinnerLabel>Create</SpinnerLabel> : 'Create theme'}
              </button>
            </div>
          </div>
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
              <article key={item.id} className="grid gap-5 rounded-lg border border-border bg-card p-4 shadow-sm md:grid-cols-[180px_minmax(0,1fr)_auto]">
                <div className="overflow-hidden rounded-md bg-muted">
                  {item.image?.imageUrl ? (
                    <Image src={item.image.imageUrl} alt="" width={1024} height={1024} unoptimized className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="grid aspect-square place-items-center text-muted-foreground"><ImagePlus className="size-8" /></div>
                  )}
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                    <StatusBadge tone={getStatusTone(item.status)}>{item.status}</StatusBadge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.theme?.title || 'No theme'} · {item.user?.email || item.user?.userName || 'Unknown user'}</p>
                  <p className="line-clamp-2 text-base leading-7 text-muted-foreground">{item.creationNote || item.promptSnapshot || 'No note.'}</p>
                  <ReviewFlowInline flow={item.reviewFlow} />
                  <label className="mt-2 block">
                    <span className="text-xs font-medium text-muted-foreground">Reject note</span>
                    <textarea
                      value={imageRejectNoteById[item.id] ?? ''}
                      onChange={(event) => setImageRejectNoteById((current) => ({ ...current, [item.id]: event.target.value }))}
                      rows={2}
                      className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
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

type ThemeEditMode = 'summary' | 'fields' | 'featured' | 'submit_images';

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
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
  return (
    <div className="mt-4 grid gap-3 rounded-md border border-border bg-background/50 p-3">
      <div className="grid gap-3 md:grid-cols-[minmax(180px,0.8fr)_180px]">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Theme title</span>
          <input
            value={draft.title}
            onChange={(event) => onChange({ title: event.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Publish date</span>
          <input
            type="date"
            value={draft.publishDate}
            onChange={(event) => onChange({ publishDate: event.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Brief</span>
        <textarea
          value={draft.brief}
          onChange={(event) => onChange({ brief: event.target.value })}
          rows={2}
          className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Theme note</span>
        <textarea
          value={draft.description}
          onChange={(event) => onChange({ description: event.target.value })}
          rows={4}
          className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
        />
      </label>
      {item.submitReason ? (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
          Submit reason: {item.submitReason}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Generator ideas, one per line</span>
          <textarea
            value={draft.promptTexts}
            onChange={(event) => onChange({ promptTexts: event.target.value })}
            rows={4}
            className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Tags, one per line</span>
          <textarea
            value={draft.tags}
            onChange={(event) => onChange({ tags: event.target.value })}
            rows={4}
            className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || !draft.title.trim()}
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

function ThemeEditor({ theme, onSaved }: { theme: ThemeItem; onSaved: () => void }) {
  const [mode, setMode] = useState<ThemeEditMode>('summary');
  const [title, setTitle] = useState(theme.title);
  const [brief, setBrief] = useState(theme.brief ?? '');
  const [description, setDescription] = useState(theme.description ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(theme.coverImageUrl ?? '');
  const [publishDate, setPublishDate] = useState(theme.publishDate ? theme.publishDate.slice(0, 10) : '');
  const [promptTexts, setPromptTexts] = useState((theme.promptTexts ?? []).join('\n'));
  const [tags, setTags] = useState((theme.tags ?? []).join('\n'));
  const [seoTitle, setSeoTitle] = useState(theme.seoTitle ?? '');
  const [seoMetaDescription, setSeoMetaDescription] = useState(theme.seoMetaDescription ?? '');
  const [seoKeywords, setSeoKeywords] = useState((theme.seoKeywords ?? []).join('\n'));
  const [imageSeoNotes, setImageSeoNotes] = useState(
    theme.imageSeoNotes && typeof theme.imageSeoNotes === 'object'
      ? JSON.stringify(theme.imageSeoNotes, null, 2)
      : '',
  );
  const [featuredPool, setFeaturedPool] = useState<FeaturedPoolImage[]>([]);
  const [selectedFeaturedIds, setSelectedFeaturedIds] = useState<string[]>(theme.featuredImages?.map((image) => image?.id).filter((id): id is string => Boolean(id)) ?? []);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [generatedPool, setGeneratedPool] = useState<AdminGeneratedImage[]>([]);
  const [generatedLoading, setGeneratedLoading] = useState(false);
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

  async function loadFeaturedPool() {
    setFeaturedLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/monica/admin/themes/${theme.id}/featured-images`, {
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = await response.json() as { selected?: Array<{ publicImageId: string | number }>; pool?: FeaturedPoolImage[] };
      setFeaturedPool(data.pool ?? []);
      if (data.selected?.length) {
        setSelectedFeaturedIds(data.selected.map((item) => item.publicImageId.toString()));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setFeaturedLoading(false);
    }
  }

  async function saveFeaturedImages() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/monica/admin/themes/${theme.id}/featured-images`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ publicImageIds: selectedFeaturedIds }),
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

  function toggleFeatured(publicImageId: string) {
    setSelectedFeaturedIds((current) => {
      if (current.includes(publicImageId)) return current.filter((id) => id !== publicImageId);
      return [...current, publicImageId].slice(0, 3);
    });
  }

  async function loadGeneratedPool() {
    setGeneratedLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/monica/admin/generated-images/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          page: 1,
          pageSize: 24,
          filters: { keyword: '' },
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = await response.json() as { items?: AdminGeneratedImage[] };
      setGeneratedPool(data.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setGeneratedLoading(false);
    }
  }

  async function submitGeneratedImageToTheme(image: AdminGeneratedImage) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/monica/admin/themes/${theme.id}/submit-images`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          imageId: image.imageId,
          title: image.promptUsed?.slice(0, 80) || 'Admin selected image',
          creationNote: image.promptUsed,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setMode('summary');
      onSaved();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-[156px_minmax(0,1fr)_auto]">
        <div className="grid gap-2">
          <ThemeCoverPreview imageUrl={theme.coverImageUrl} />
          <FeaturedImageStrip images={theme.featuredImages} />
        </div>
        <div className="min-w-0">
          <h3 className="text-xl font-semibold">{theme.title}</h3>
          <p className="mt-2 line-clamp-2 text-base leading-7 text-muted-foreground">{theme.brief || 'No brief yet.'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge>{theme.sourceType || 'admin'}</StatusBadge>
            <StatusBadge>{theme.publishDate ? new Date(theme.publishDate).toLocaleDateString() : 'No publish date'}</StatusBadge>
            <StatusBadge>{theme.featuredImages?.filter(Boolean).length ?? 0} featured</StatusBadge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge tone={theme.readiness?.contentOk ? 'good' : 'warn'}>{theme.readiness?.contentOk ? 'Content ok' : 'Missing content'}</StatusBadge>
            <StatusBadge tone={theme.readiness?.seoOk ? 'good' : 'warn'}>{theme.readiness?.seoOk ? 'SEO ok' : 'Missing SEO'}</StatusBadge>
            <StatusBadge tone={theme.readiness?.ideasOk ? 'good' : 'warn'}>{theme.readiness?.ideasOk ? 'Ideas ok' : 'Missing ideas'}</StatusBadge>
            <StatusBadge tone={(theme.readiness?.featuredCount ?? 0) >= 3 ? 'good' : 'warn'}>Featured {theme.readiness?.featuredCount ?? 0}/3</StatusBadge>
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
            onClick={() => {
              const nextMode = mode === 'featured' ? 'summary' : 'featured';
              setMode(nextMode);
              if (nextMode === 'featured') void loadFeaturedPool();
            }}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted"
          >
            <Star className="size-4" />Featured images
          </button>
          <button
            type="button"
            onClick={() => {
              const nextMode = mode === 'submit_images' ? 'summary' : 'submit_images';
              setMode(nextMode);
              if (nextMode === 'submit_images') void loadGeneratedPool();
            }}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted"
          >
            <ImagePlus className="size-4" />Submit images
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
              <span className="text-xs font-medium text-muted-foreground">SEO title</span>
              <input value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Meta description</span>
              <input value={seoMetaDescription} onChange={(event) => setSeoMetaDescription(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none" />
            </label>
          </div>
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
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">SEO keywords, one per line</span>
              <textarea value={seoKeywords} onChange={(event) => setSeoKeywords(event.target.value)} rows={4} className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Image SEO notes JSON</span>
              <textarea value={imageSeoNotes} onChange={(event) => setImageSeoNotes(event.target.value)} rows={4} className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" />
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
                seoTitle,
                seoMetaDescription,
                seoKeywords: splitLines(seoKeywords),
                imageSeoNotes: parseJsonOrNull(imageSeoNotes),
              })}
              className="monica-button-primary min-h-10 px-4 text-sm disabled:opacity-50"
            >
              {saving ? <SpinnerLabel>Save</SpinnerLabel> : 'Save fields'}
            </button>
            <button type="button" onClick={() => setMode('summary')} className="h-10 rounded-md border border-border px-4 text-sm hover:bg-muted">Cancel</button>
          </div>
        </div>
      ) : null}

      {mode === 'featured' ? (
        <div className="mt-4 grid gap-3">
          {featuredLoading ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">Loading image pool...</div>
          ) : featuredPool.length === 0 ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">No public images in this theme pool yet.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featuredPool.map((image) => {
                const imageUrl = image.image?.thumbnailUrl || image.image?.imageUrl;
                const selected = selectedFeaturedIds.includes(image.id);
                return (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => toggleFeatured(image.id)}
                    className={cn('overflow-hidden rounded-lg border bg-card text-left', selected ? 'border-foreground ring-2 ring-foreground/20' : 'border-border')}
                  >
                    {imageUrl ? (
                      <Image src={imageUrl} alt={image.title ?? ''} width={512} height={512} unoptimized className="aspect-square w-full object-cover" />
                    ) : (
                      <div className="grid aspect-square place-items-center bg-muted text-muted-foreground"><ImagePlus className="size-6" /></div>
                    )}
                    <div className="p-2 text-xs text-muted-foreground">{selected ? 'Selected' : image.title || 'Public image'}</div>
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={() => void saveFeaturedImages()} className="monica-button-primary min-h-10 px-4 text-sm disabled:opacity-50">
              {saving ? <SpinnerLabel>Save</SpinnerLabel> : 'Save featured images'}
            </button>
            <button type="button" onClick={() => setMode('summary')} className="h-10 rounded-md border border-border px-4 text-sm hover:bg-muted">Cancel</button>
          </div>
        </div>
      ) : null}

      {mode === 'submit_images' ? (
        <div className="mt-4 grid gap-3">
          {generatedLoading ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">Loading generated images...</div>
          ) : generatedPool.length === 0 ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">No generated images available.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {generatedPool.map((image) => {
                const imageUrl = image.thumbnailUrl || image.imageUrl;
                const alreadyPublic = Boolean(image.publicImage);
                return (
                  <article key={image.imageId} className="overflow-hidden rounded-lg border border-border bg-card">
                    {imageUrl ? (
                      <Image src={imageUrl} alt="" width={512} height={512} unoptimized className="aspect-square w-full object-cover" />
                    ) : (
                      <div className="grid aspect-square place-items-center bg-muted text-muted-foreground"><ImagePlus className="size-6" /></div>
                    )}
                    <div className="grid gap-2 p-2">
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{image.promptUsed || image.imageId}</p>
                      <button
                        type="button"
                        disabled={saving || alreadyPublic}
                        onClick={() => void submitGeneratedImageToTheme(image)}
                        className="monica-button-primary min-h-9 px-3 text-xs disabled:opacity-50"
                      >
                        {alreadyPublic ? 'Already public' : saving ? 'Submitting' : 'Add to theme'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <button type="button" onClick={() => setMode('summary')} className="h-10 w-fit rounded-md border border-border px-4 text-sm hover:bg-muted">Cancel</button>
        </div>
      ) : null}
    </article>
  );
}

function ThemeCoverPreview({ imageUrl }: { imageUrl?: string | null }) {
  return (
    <div className="h-[88px] overflow-hidden rounded-md bg-muted">
      {imageUrl ? (
        <Image src={imageUrl} alt="" width={312} height={176} unoptimized className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-muted-foreground">
          <ImagePlus className="size-5" />
        </div>
      )}
    </div>
  );
}

function FeaturedImageStrip({ images }: { images?: Array<{ imageUrl?: string | null; thumbnailUrl?: string | null; title?: string | null } | null> }) {
  const slots = Array.from({ length: 3 }, (_, index) => images?.[index] ?? null);
  return (
    <div className="grid grid-cols-3 gap-1">
      {slots.map((image, index) => {
        const imageUrl = image?.thumbnailUrl || image?.imageUrl;
        return (
          <div key={`${imageUrl ?? 'empty'}-${index}`} className="h-10 overflow-hidden rounded bg-muted">
            {imageUrl ? (
              <Image src={imageUrl} alt={image?.title ?? ''} width={80} height={80} unoptimized className="size-full object-cover" />
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

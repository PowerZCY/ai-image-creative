'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { Eye, ImagePlus, Loader2, Send, X } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import type { MonicaStudioCopy } from './copy';

type StudioImage = {
  imageId: string;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  status: string;
  themeId?: string | null;
  promptUsed?: string | null;
  model?: string | null;
  style?: string | null;
  ratio?: string | null;
  createdAt?: string | null;
  submissions?: Array<{ status: string; submissionId: string }>;
  publicImage?: { publicImageId: string; status: string } | null;
};

type StudioTab = 'all' | 'generated' | 'submitted' | 'under_review' | 'published' | 'rejected';

async function readError(response: Response) {
  try {
    const data = await response.json();
    return typeof data.error === 'string' ? data.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

function formatStatus(status: string | undefined | null, labels: Record<string, string>, fallback: string) {
  if (!status) return fallback;
  return labels[status] ?? status;
}

export function StudioClient({ copy }: { copy: MonicaStudioCopy }) {
  const [images, setImages] = useState<StudioImage[]>([]);
  const [tab, setTab] = useState<StudioTab>('all');
  const [loading, setLoading] = useState(true);
  const [submittingImageId, setSubmittingImageId] = useState<string | null>(null);
  const [submitTarget, setSubmitTarget] = useState<StudioImage | null>(null);
  const [promptTarget, setPromptTarget] = useState<StudioImage | null>(null);
  const [creatorNote, setCreatorNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tabOptions: Array<{ value: StudioTab; label: string }> = [
    { value: 'all', label: copy.tabs.all },
    { value: 'generated', label: copy.tabs.generated },
    { value: 'submitted', label: copy.tabs.submitted },
    { value: 'under_review', label: copy.tabs.underReview },
    { value: 'published', label: copy.tabs.published },
    { value: 'rejected', label: copy.tabs.rejected },
  ];

  const visibleImages = images.filter((image) => {
    if (tab === 'all') return true;
    const submissionStatus = image.publicImage?.status ?? image.submissions?.[0]?.status;
    if (tab === 'submitted') return Boolean(submissionStatus);
    if (tab === 'generated') return image.status === 'generated' && !submissionStatus;
    if (tab === 'published') return image.status === 'published' || submissionStatus === 'published';
    return submissionStatus === tab || image.status === tab;
  });

  async function fetchImages() {
    const response = await fetch('/api/monica/studio/images', {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(await readError(response));
    }
    const data = await response.json() as { images: StudioImage[] };
    return data.images;
  }

  async function loadImages() {
    setLoading(true);
    setError(null);
    try {
      setImages(await fetchImages());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitialImages() {
      try {
        const nextImages = await fetchImages();
        if (active) {
          setImages(nextImages);
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

    void loadInitialImages();

    return () => {
      active = false;
    };
  }, []);

  async function submitImage(imageId: string, note?: string) {
    setSubmittingImageId(imageId);
    setError(null);
    try {
      const response = await fetch('/api/monica/submissions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ imageId, creatorNote: note }),
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      setSubmitTarget(null);
      setCreatorNote('');
      await loadImages();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setSubmittingImageId(null);
    }
  }

  return (
    <section className="min-h-screen px-4 py-20 md:px-8 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-semibold text-white md:text-5xl">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              {copy.description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadImages()}
            className="h-10 rounded-md border border-white/10 px-4 text-sm text-zinc-200 hover:bg-white/10"
          >
            {copy.refresh}
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 rounded-lg border border-white/10 bg-zinc-950/70 p-2">
          {tabOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTab(option.value)}
              className={cn(
                'h-9 rounded-md px-3 text-sm transition',
                tab === option.value ? 'bg-emerald-300 text-zinc-950' : 'text-zinc-300 hover:bg-white/10',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-white/10 bg-zinc-950/60 text-zinc-400">
            <Loader2 className="mr-2 size-4 animate-spin" />
            {copy.loading}
          </div>
        ) : visibleImages.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-6 text-sm text-zinc-400">
            {copy.empty}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visibleImages.map((image) => (
              <article key={image.imageId} className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
                {image.imageUrl ? (
                  <Image
                    src={image.imageUrl}
                    alt=""
                    width={1024}
                    height={1024}
                    unoptimized
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="grid aspect-square place-items-center text-zinc-500">
                    <ImagePlus className="size-8" />
                  </div>
                )}
                <div className="space-y-3 p-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
                    <span>{formatStatus(image.status, copy.statusLabels, copy.generated)}</span>
                    <span>
                      {formatStatus(
                        image.publicImage?.status ?? image.submissions?.[0]?.status,
                        copy.statusLabels,
                        copy.privateStatus,
                      )}
                    </span>
                  </div>
                  <div className="line-clamp-2 min-h-10 text-xs leading-5 text-zinc-500">
                    {image.promptUsed || copy.prompt}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPromptTarget(image)}
                      className="flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 text-sm text-zinc-200 hover:bg-white/10"
                    >
                      <Eye className="size-4" />
                      <span>{copy.viewPrompt}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitTarget(image);
                        setCreatorNote('');
                      }}
                      disabled={!image.themeId || Boolean(image.publicImage) || submittingImageId === image.imageId}
                      className="flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-300 px-3 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submittingImageId === image.imageId ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      <span>{image.themeId ? copy.submit : copy.noTheme}</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {promptTarget && (
        <Modal title={copy.viewPrompt} closeLabel={copy.close} onClose={() => setPromptTarget(null)}>
          <div className="space-y-4">
            <div>
              <div className="text-xs uppercase text-zinc-500">{copy.prompt}</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                {promptTarget.promptUsed || copy.empty}
              </p>
            </div>
            <div className="grid gap-3 text-sm text-zinc-400 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase text-zinc-500">{copy.theme}</div>
                <div className="mt-1">{promptTarget.themeId || copy.noTheme}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-zinc-500">{copy.model}</div>
                <div className="mt-1">{promptTarget.model || promptTarget.status}</div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {submitTarget && (
        <Modal title={copy.submitImage} closeLabel={copy.close} onClose={() => setSubmitTarget(null)}>
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            {submitTarget.imageUrl ? (
              <Image
                src={submitTarget.imageUrl}
                alt=""
                width={512}
                height={512}
                unoptimized
                className="aspect-square w-full rounded-md object-cover"
              />
            ) : (
              <div className="grid aspect-square place-items-center rounded-md bg-zinc-900 text-zinc-500">
                <ImagePlus className="size-8" />
              </div>
            )}
            <div className="space-y-4">
              <div>
                <div className="text-xs uppercase text-zinc-500">{copy.prompt}</div>
                <p className="mt-2 line-clamp-4 text-sm leading-6 text-zinc-200">
                  {submitTarget.promptUsed || copy.empty}
                </p>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-zinc-200">{copy.creatorNote}</span>
                <textarea
                  value={creatorNote}
                  onChange={(event) => setCreatorNote(event.target.value)}
                  placeholder={copy.creatorNotePlaceholder}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm leading-6 text-white outline-none transition focus:border-emerald-300/70"
                />
              </label>
              <p className="text-xs leading-5 text-zinc-500">{copy.submitHint}</p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubmitTarget(null)}
                  className="h-10 rounded-md border border-white/10 px-3 text-sm text-zinc-200 hover:bg-white/10"
                >
                  {copy.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => void submitImage(submitTarget.imageId, creatorNote)}
                  disabled={submittingImageId === submitTarget.imageId}
                  className="flex h-10 items-center gap-2 rounded-md bg-emerald-300 px-3 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submittingImageId === submitTarget.imageId ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  <span>{copy.submitImage}</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

function Modal({
  title,
  closeLabel,
  children,
  onClose,
}: {
  title: string;
  closeLabel: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-md border border-white/10 text-zinc-300 hover:bg-white/10"
            aria-label={closeLabel}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

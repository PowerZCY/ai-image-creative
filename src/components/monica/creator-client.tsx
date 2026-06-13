'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, Loader2, Sparkles, UploadCloud, X } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import type { MonicaCreatorCopy } from './copy';

type ReferenceImageView = {
  referenceId: string;
  url?: string | null;
  mimeType?: string | null;
  safetyStatus?: string;
};

type GeneratedImageView = {
  imageId: string;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  providerImageIndex?: number | null;
};

type GenerationJobView = {
  jobId: string;
  status: 'pending' | 'queued' | 'running' | 'succeeded' | 'failed' | 'blocked' | 'cancelled';
  estimatedCredits: number;
  chargedCredits: number;
  failureCode?: string | null;
  failureMessage?: string | null;
  images?: GeneratedImageView[];
};

const ratioOptions = [
  { value: '1:1', label: '1:1' },
  { value: '4:5', label: '4:5' },
  { value: '16:9', label: '16:9' },
];

const countOptions = [1, 2, 4];
const terminalStatuses = new Set(['succeeded', 'failed', 'blocked', 'cancelled']);

function formatStatus(status: string, labels: Record<string, string>) {
  return labels[status] ?? status;
}

async function readError(response: Response) {
  try {
    const data = await response.json();
    return typeof data.error === 'string' ? data.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

export function MonicaCreator({ copy }: { copy: MonicaCreatorCopy }) {
  const modelOptions = useMemo(() => [
    { value: 'mock-image-model', label: copy.modelOptions.mock },
    { value: 'openrouter-default', label: copy.modelOptions.openrouter },
  ], [copy.modelOptions.mock, copy.modelOptions.openrouter]);
  const styleOptions = useMemo(() => [
    { value: 'editorial', label: copy.styleOptions.editorial },
    { value: 'cinematic', label: copy.styleOptions.cinematic },
    { value: 'product', label: copy.styleOptions.product },
    { value: 'illustration', label: copy.styleOptions.illustration },
  ], [copy.styleOptions.cinematic, copy.styleOptions.editorial, copy.styleOptions.illustration, copy.styleOptions.product]);

  const [prompt, setPrompt] = useState(copy.initialPrompt);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [model, setModel] = useState(modelOptions[0].value);
  const [style, setStyle] = useState(styleOptions[0].value);
  const [ratio, setRatio] = useState(ratioOptions[0].value);
  const [imageCount, setImageCount] = useState(1);
  const [referenceImage, setReferenceImage] = useState<ReferenceImageView | null>(null);
  const [job, setJob] = useState<GenerationJobView | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const estimatedCredits = useMemo(() => Math.max(1, imageCount), [imageCount]);
  const isPolling = job ? !terminalStatuses.has(job.status) : false;

  const pollJob = useCallback(async (jobId: string) => {
    const response = await fetch(`/api/monica/generation/jobs/${jobId}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const data = await response.json() as { job: GenerationJobView };
    setJob(data.job);
    if (terminalStatuses.has(data.job.status)) {
      setGenerating(false);
    }
  }, []);

  useEffect(() => {
    if (!job?.jobId || terminalStatuses.has(job.status)) {
      return;
    }

    const interval = window.setInterval(() => {
      void pollJob(job.jobId).catch((pollError) => {
        setError(pollError instanceof Error ? pollError.message : String(pollError));
        setGenerating(false);
      });
    }, job.status === 'queued' ? 1500 : 2500);

    return () => window.clearInterval(interval);
  }, [job?.jobId, job?.status, pollJob]);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set('file', file);
      const response = await fetch('/api/monica/reference-images', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = await response.json() as { referenceImage: ReferenceImageView };
      setReferenceImage(data.referenceImage);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setJob(null);

    try {
      const response = await fetch('/api/monica/generation/jobs', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          prompt,
          negativePrompt,
          model,
          style,
          ratio,
          imageCount,
          referenceId: referenceImage?.referenceId,
          sourcePage: 'home',
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = await response.json() as { job: GenerationJobView };
      setJob(data.job);
      if (data.job?.jobId) {
        await pollJob(data.job.jobId);
      }
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : String(generateError));
      setGenerating(false);
    }
  }

  const canGenerate = prompt.trim().length > 0 && !generating;
  const generatedImages = job?.images ?? [];

  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-20 md:px-8 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:items-start">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-100">
              <Sparkles className="size-4" />
              <span>{copy.badge}</span>
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-white md:text-6xl">
              {copy.title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
              {copy.description}
            </p>
          </div>

          <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-3">
            <Metric label={copy.estimatedLabel} value={`${estimatedCredits} ${copy.creditsUnit}`} />
            <Metric label={copy.queueLabel} value={isPolling ? copy.running : copy.ready} />
            <Metric label={copy.resultLabel} value={job ? formatStatus(job.status, copy.statusLabels) : copy.notStarted} />
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-zinc-950/80 p-4 shadow-2xl shadow-black/30 backdrop-blur md:p-5">
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-200">{copy.promptLabel}</span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="mt-2 min-h-36 w-full resize-none rounded-md border border-white/10 bg-zinc-900 px-3 py-3 text-sm leading-6 text-white outline-none transition focus:border-emerald-300/70"
                placeholder={copy.promptPlaceholder}
                maxLength={4000}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-200">{copy.negativePromptLabel}</span>
              <input
                value={negativePrompt}
                onChange={(event) => setNegativePrompt(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-white/10 bg-zinc-900 px-3 text-sm text-white outline-none transition focus:border-emerald-300/70"
                placeholder={copy.negativePromptPlaceholder}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <OptionGroup label={copy.modelLabel} value={model} options={modelOptions} onChange={setModel} />
              <OptionGroup label={copy.styleLabel} value={style} options={styleOptions} onChange={setStyle} />
              <OptionGroup label={copy.ratioLabel} value={ratio} options={ratioOptions} onChange={setRatio} />
              <div>
                <span className="text-sm font-medium text-zinc-200">{copy.imagesLabel}</span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {countOptions.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setImageCount(count)}
                      className={cn(
                        'h-10 rounded-md border text-sm transition',
                        imageCount === count
                          ? 'border-emerald-300 bg-emerald-300 text-zinc-950'
                          : 'border-white/10 bg-zinc-900 text-zinc-200 hover:border-white/30',
                      )}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-dashed border-white/15 bg-zinc-900/70 p-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
              {referenceImage ? (
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-md border border-white/10 bg-zinc-800">
                    {referenceImage.url ? (
                      <Image
                        src={referenceImage.url}
                        alt=""
                        width={64}
                        height={64}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="m-5 size-6 text-zinc-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{referenceImage.referenceId}</div>
                    <div className="text-xs text-zinc-400">
                      {referenceImage.safetyStatus ? formatStatus(referenceImage.safetyStatus, copy.statusLabels) : copy.uploaded}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReferenceImage(null)}
                    className="grid size-9 place-items-center rounded-md border border-white/10 text-zinc-300 hover:bg-white/10"
                    aria-label={copy.removeReference}
                    title={copy.removeReference}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-zinc-950 px-3 py-4 text-sm text-zinc-200 transition hover:border-emerald-300/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                  <span>{uploading ? copy.uploadingReference : copy.uploadReference}</span>
                </button>
              )}
            </div>

            {error && (
              <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!canGenerate}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-300 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              <span>{generating ? copy.generating : copy.generate}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl">
        <ResultPanel job={job} images={generatedImages} copy={copy} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-zinc-950/70 px-3 py-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function OptionGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <span className="text-sm font-medium text-zinc-200">{label}</span>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'h-10 rounded-md border px-3 text-sm transition',
              value === option.value
                ? 'border-emerald-300 bg-emerald-300 text-zinc-950'
                : 'border-white/10 bg-zinc-900 text-zinc-200 hover:border-white/30',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultPanel({
  job,
  images,
  copy,
}: {
  job: GenerationJobView | null;
  images: GeneratedImageView[];
  copy: MonicaCreatorCopy;
}) {
  if (!job) {
    return (
      <div className="rounded-lg border border-white/10 bg-zinc-950/50 p-4 text-sm text-zinc-400">
        {copy.emptyResult}
      </div>
    );
  }

  if (job.status === 'failed' || job.status === 'blocked' || job.status === 'cancelled') {
    return (
      <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
        {job.failureMessage || `${formatStatus(job.status, copy.statusLabels)}. ${copy.failedNoCharge}`}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-zinc-950/50 p-4 text-sm text-zinc-300">
        {formatStatus(job.status, copy.statusLabels)}. {copy.waitingForImages}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {images.map((image) => (
        <figure key={image.imageId} className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
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
          <figcaption className="flex items-center justify-between px-3 py-2 text-xs text-zinc-400">
            <span>{copy.imageLabel} {typeof image.providerImageIndex === 'number' ? image.providerImageIndex + 1 : ''}</span>
            <span>{job.chargedCredits}/{job.estimatedCredits}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

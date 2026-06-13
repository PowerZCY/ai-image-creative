'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, Loader2, Sparkles, UploadCloud, X } from 'lucide-react';
import {
  themeBgColor,
  themeBorderColor,
  themeButtonGradientClass,
  themeButtonGradientHoverClass,
  themeHeroEyesOnClass,
  themeIconColor,
} from '@windrun-huaiin/base-ui/lib';
import { cn } from '@windrun-huaiin/lib/utils';
import { createR2Client } from '@/lib/r2-explorer-sdk';
import type { MonicaCreatorCopy } from './copy';
import { monicaContentWidthClass } from './layout';

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
const r2BaseUrl = process.env.NEXT_PUBLIC_R2_BASE_URL ?? '';
const r2BucketName = process.env.NEXT_PUBLIC_R2_BUCKET_NAME ?? '';
const r2ApiToken = process.env.NEXT_PUBLIC_R2_API_TOKEN ?? '';
const r2EnableMock = process.env.NEXT_PUBLIC_R2_ENABLE_MOCK === 'true';
const r2MockImgUrl = process.env.NEXT_PUBLIC_R2_MOCK_IMG_URL ?? '';
const r2MockTimeoutMs = Number(process.env.NEXT_PUBLIC_R2_MOCK_TIMEOUT ?? 2) * 1000;
const r2UploadImageMaxSizeMB = Number(process.env.NEXT_PUBLIC_R2_UPLOAD_IMAGE_MAX_SIZE ?? 10);

function isAllowedImageFile(file: File) {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
}

function sanitizeFilenamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function getExtension(filename: string, mimeType: string) {
  const fromName = filename.includes('.') ? filename.split('.').pop() : undefined;
  if (fromName && /^[a-z0-9]{1,12}$/i.test(fromName)) {
    return fromName.toLowerCase();
  }

  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'jpg';
}

function createReferenceImageStorageKey(file: File) {
  const mimeType = file.type || 'application/octet-stream';
  const ext = getExtension(file.name, mimeType);
  const safeName = sanitizeFilenamePart(file.name.replace(/\.[^.]+$/, '')) || 'reference';
  return `monica/reference-images/${Date.now()}-${crypto.randomUUID()}-${safeName}.${ext}`;
}

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
  const r2Client = useMemo(() => createR2Client({
    baseUrl: r2BaseUrl,
    bucketName: r2BucketName,
    apiToken: r2ApiToken,
  }), []);

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
      if (!isAllowedImageFile(file)) {
        throw new Error('Please upload a JPG, PNG, WEBP, or GIF image.');
      }

      if (file.size > r2UploadImageMaxSizeMB * 1024 * 1024) {
        throw new Error(`Please select an image file less than ${r2UploadImageMaxSizeMB}MB.`);
      }

      const mimeType = file.type || 'application/octet-stream';
      let storageKey = createReferenceImageStorageKey(file);
      let url: string | undefined;

      if (r2EnableMock) {
        if (!r2MockImgUrl) {
          throw new Error('NEXT_PUBLIC_R2_MOCK_IMG_URL is required when R2 mock mode is enabled');
        }
        await new Promise((resolve) => window.setTimeout(resolve, r2MockTimeoutMs));
        storageKey = `monica/reference-images/mock/${Date.now()}-${crypto.randomUUID()}`;
        url = r2MockImgUrl;
      } else {
        if (!r2BaseUrl || !r2BucketName || !r2ApiToken) {
          throw new Error('NEXT_PUBLIC_R2_BASE_URL, NEXT_PUBLIC_R2_BUCKET_NAME, and NEXT_PUBLIC_R2_API_TOKEN are required');
        }

        const uploadResult = await r2Client.upload(storageKey, file, mimeType);
        storageKey = uploadResult.file.storedFilename || storageKey;
        url = uploadResult.share_urls?.public?.view || uploadResult.share_urls?.protected?.view;
        if (!uploadResult.success || !url) {
          throw new Error('Upload failed: No public URL received');
        }
      }

      const response = await fetch('/api/monica/reference-images', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          storageKey,
          url,
          mimeType,
        }),
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
      <div className={cn(monicaContentWidthClass, 'grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:items-start')}>
        <div className="space-y-6">
          <div className="space-y-4">
            <div className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm',
              themeBgColor,
              themeBorderColor,
              themeIconColor,
            )}>
              <Sparkles className="size-4" />
              <span>{copy.badge}</span>
            </div>
            <h1 className={cn('max-w-3xl bg-clip-text text-4xl font-semibold leading-tight text-transparent md:text-6xl', themeHeroEyesOnClass)}>
              {copy.title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              {copy.description}
            </p>
          </div>

          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <Metric label={copy.estimatedLabel} value={`${estimatedCredits} ${copy.creditsUnit}`} />
            <Metric label={copy.queueLabel} value={isPolling ? copy.running : copy.ready} />
            <Metric label={copy.resultLabel} value={job ? formatStatus(job.status, copy.statusLabels) : copy.notStarted} />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card/80 p-4 shadow-2xl shadow-black/10 backdrop-blur dark:shadow-black/30 md:p-5">
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-foreground">{copy.promptLabel}</span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className={cn(
                  'mt-2 min-h-36 w-full resize-none rounded-md border border-border bg-background px-3 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground/70',
                  'focus:border-current',
                  themeIconColor,
                )}
                placeholder={copy.promptPlaceholder}
                maxLength={4000}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-foreground">{copy.negativePromptLabel}</span>
              <input
                value={negativePrompt}
                onChange={(event) => setNegativePrompt(event.target.value)}
                className={cn(
                  'mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70',
                  'focus:border-current',
                  themeIconColor,
                )}
                placeholder={copy.negativePromptPlaceholder}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <OptionGroup label={copy.modelLabel} value={model} options={modelOptions} onChange={setModel} />
              <OptionGroup label={copy.styleLabel} value={style} options={styleOptions} onChange={setStyle} />
              <OptionGroup label={copy.ratioLabel} value={ratio} options={ratioOptions} onChange={setRatio} />
              <div>
                <span className="text-sm font-medium text-foreground">{copy.imagesLabel}</span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {countOptions.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setImageCount(count)}
                      className={cn(
                        'h-10 rounded-md border text-sm transition',
                        imageCount === count
                          ? cn('border-transparent text-white', themeButtonGradientClass)
                          : 'border-border bg-background text-foreground hover:bg-muted',
                      )}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-dashed border-border bg-muted/40 p-3">
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
                  <div className="h-16 w-16 overflow-hidden rounded-md border border-border bg-muted">
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
                      <ImagePlus className="m-5 size-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{referenceImage.referenceId}</div>
                    <div className="text-xs text-muted-foreground">
                      {referenceImage.safetyStatus ? formatStatus(referenceImage.safetyStatus, copy.statusLabels) : copy.uploaded}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReferenceImage(null)}
                    className="grid size-9 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
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
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-md border bg-background px-3 py-4 text-sm text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60',
                    themeBorderColor,
                  )}
                >
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                  <span>{uploading ? copy.uploadingReference : copy.uploadReference}</span>
                </button>
              )}
            </div>

            {error && (
              <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-100">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!canGenerate}
              className={cn(
                'flex h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60',
                themeButtonGradientClass,
                themeButtonGradientHoverClass,
              )}
            >
              {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              <span>{generating ? copy.generating : copy.generate}</span>
            </button>
          </div>
        </div>
      </div>

      <div className={cn(monicaContentWidthClass, 'mt-8')}>
        <ResultPanel job={job} images={generatedImages} copy={copy} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card/70 px-3 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
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
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'h-10 rounded-md border px-3 text-sm transition',
              value === option.value
                ? cn('border-transparent text-white', themeButtonGradientClass)
                : 'border-border bg-background text-foreground hover:bg-muted',
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
      <div className="rounded-lg border border-border bg-card/50 p-4 text-sm text-muted-foreground">
        {copy.emptyResult}
      </div>
    );
  }

  if (job.status === 'failed' || job.status === 'blocked' || job.status === 'cancelled') {
    return (
      <div className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-800 dark:text-amber-100">
        {job.failureMessage || `${formatStatus(job.status, copy.statusLabels)}. ${copy.failedNoCharge}`}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-4 text-sm text-muted-foreground">
        {formatStatus(job.status, copy.statusLabels)}. {copy.waitingForImages}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {images.map((image) => (
        <figure key={image.imageId} className="overflow-hidden rounded-lg border border-border bg-card">
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
            <div className="grid aspect-square place-items-center text-muted-foreground">
              <ImagePlus className="size-8" />
            </div>
          )}
          <figcaption className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
            <span>{copy.imageLabel} {typeof image.providerImageIndex === 'number' ? image.providerImageIndex + 1 : ''}</span>
            <span>{job.chargedCredits}/{job.estimatedCredits}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

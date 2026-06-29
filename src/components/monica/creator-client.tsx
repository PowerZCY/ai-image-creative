'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, Download, Heart, ImagePlus, Lightbulb, Loader2, MessageCircle, Sparkles, Trash2, UploadCloud, Wand2, X } from 'lucide-react';
import {
  themeBgColor,
  themeBorderColor,
  themeIconColor,
} from '@windrun-huaiin/base-ui/lib';
import { cn } from '@windrun-huaiin/lib/utils';
import { dispatchCreditOverviewRefresh } from '@windrun-huaiin/third-ui/main/credit';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { createR2Client } from '@/lib/r2-explorer-sdk';
import type { MonicaCreatorCopy } from './copy';
import { monicaContentWidthClass } from './layout';
import { SubmitImageDialog, type SubmitImageTarget } from './submit-image-dialog';

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

type SourcePage = 'home' | 'theme_detail' | 'studio' | 'explore_image_detail' | 'theme_gallery';

type StarterIdea = {
  idea: string;
  prompt: string;
};

type AssistantMode = 'ideas' | 'improve' | 'ask';

type AskMessage = {
  role: 'user' | 'assistant';
  text: string;
  ideas?: StarterIdea[];
};

type AssistantPromptMessage = {
  role: 'user' | 'assistant';
  text: string;
};

type AssistantPromptResponse = {
  message?: string;
  ideas?: StarterIdea[];
  improvedPrompt?: string;
  interactionId?: string;
};

type GenerationBatch = {
  batchId: string;
  job: GenerationJobView;
  prompt: string;
  model: string;
  ratio?: string;
  imageCount: number;
  referenceImage?: ReferenceImageView | null;
  createdAt: string;
};

type GenerationSnapshot = {
  prompt: string;
  model: string;
  ratio?: string;
  imageCount: number;
  referenceImage?: ReferenceImageView | null;
};

type CreateGenerationJobResponse = {
  job: GenerationJobView;
  dispatchMode?: 'queue' | 'client-run' | 'inline';
  runUrl?: string;
};

type GenerationDispatchMode = NonNullable<CreateGenerationJobResponse['dispatchMode']>;

const ratioOptions = [
  { value: '1:1', label: '1:1' },
  { value: '4:5', label: '4:5' },
  { value: '9:16', label: '9:16' },
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
const assistantRetryMessage = 'Something went wrong. Please click again.';
const maxImprovedPromptHistory = 5;

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


function normalizeStarterIdeas(value: unknown): StarterIdea[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') {
        const text = item.trim();
        return text ? { idea: text, prompt: text } : null;
      }
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const idea = typeof record.idea === 'string' ? record.idea.trim() : '';
      const prompt = typeof record.prompt === 'string' ? record.prompt.trim() : '';
      if (!idea && !prompt) return null;
      return {
        idea: idea || prompt,
        prompt: prompt || idea,
      };
    })
    .filter((item): item is StarterIdea => Boolean(item));
}

function pickIdeas(ideas: StarterIdea[], count = 3) {
  return [...ideas]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

function promptFromIdea(idea: StarterIdea) {
  if (idea.prompt.trim()) return idea.prompt;
  return `${idea.idea}, clear subject, thoughtful composition, rich scene details, coherent lighting, balanced color palette, ready for high-quality AI image generation.`;
}

function formatAskMessageForAssistant(message: AskMessage): AssistantPromptMessage {
  if (message.role === 'user' || !message.ideas?.length) {
    return {
      role: message.role,
      text: message.text,
    };
  }

  return {
    role: 'assistant',
    text: [
      message.text,
      ...message.ideas.map((idea) => `Idea: ${idea.idea}\nPrompt: ${idea.prompt}`),
    ].join('\n'),
  };
}

function assistantTitle(mode: AssistantMode | null, copy: MonicaCreatorCopy) {
  if (mode === 'ideas') return 'Ideas';
  if (mode === 'improve') return copy.assistant.improvedPrompt;
  if (mode === 'ask') return copy.assistant.assistantName;
  return null;
}

async function readError(response: Response) {
  try {
    const data = await response.json();
    return typeof data.error === 'string' ? data.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

export function MonicaCreator({
  copy,
  themeId,
  sourcePage = 'home',
  starterIdeas = [],
  mode = 'home',
  themeLabel,
  themeNote,
  initialAssistantOpen = false,
  onRequestThemeIdeas,
  onGenerationUpdated,
}: {
  copy: MonicaCreatorCopy;
  themeId?: string | number | bigint | null;
  sourcePage?: SourcePage;
  starterIdeas?: unknown[];
  mode?: 'home' | 'theme_detail' | 'studio';
  themeLabel?: string | null;
  themeNote?: string | null;
  initialAssistantOpen?: boolean;
  onRequestThemeIdeas?: () => void;
  onGenerationUpdated?: () => void;
}) {
  const modelOptions = useMemo(() => [
    { value: 'gpt-image-2', label: copy.modelOptions.gptImage2 },
    { value: 'nano-banana-2', label: copy.modelOptions.nanoBanana2 },
    { value: 'nano-banana-pro', label: copy.modelOptions.nanoBananaPro },
    { value: 'seedream-4.5', label: copy.modelOptions.seedream45 },
  ], [copy.modelOptions.gptImage2, copy.modelOptions.nanoBanana2, copy.modelOptions.nanoBananaPro, copy.modelOptions.seedream45]);
  const starterIdeaPool = useMemo(() => {
    return normalizeStarterIdeas(starterIdeas);
  }, [starterIdeas]);

  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(modelOptions[0].value);
  const [ratio, setRatio] = useState(ratioOptions[0].value);
  const [imageCount, setImageCount] = useState(1);
  const [referenceImage, setReferenceImage] = useState<ReferenceImageView | null>(null);
  const [job, setJob] = useState<GenerationJobView | null>(null);
  const [batches, setBatches] = useState<GenerationBatch[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<Set<string>>(() => new Set());
  const [favoriteImageIds, setFavoriteImageIds] = useState<Set<string>>(() => new Set());
  const [submittedImageIds, setSubmittedImageIds] = useState<Set<string>>(() => new Set());
  const [submitTarget, setSubmitTarget] = useState<SubmitImageTarget | null>(null);
  const [deletingImageIds, setDeletingImageIds] = useState<Set<string>>(() => new Set());
  const [downloadingImageIds, setDownloadingImageIds] = useState<Set<string>>(() => new Set());
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pendingDeleteImageId, setPendingDeleteImageId] = useState<string | null>(null);
  const [activeDispatchMode, setActiveDispatchMode] = useState<GenerationDispatchMode | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSelectKey, setOpenSelectKey] = useState<string | null>(null);
  const [assistantMode, setAssistantMode] = useState<AssistantMode | null>(() => initialAssistantOpen ? 'ideas' : null);
  const [assistantIdeas, setAssistantIdeas] = useState<StarterIdea[]>(() => initialAssistantOpen ? pickIdeas(starterIdeaPool) : []);
  const [assistantMessage, setAssistantMessage] = useState<string | null>(() => initialAssistantOpen ? assistantTitle('ideas', copy) : null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [improvedPrompt, setImprovedPrompt] = useState<string | null>(null);
  const [improvedPromptHistory, setImprovedPromptHistory] = useState<string[]>([]);
  const [askInput, setAskInput] = useState('');
  const [askMessages, setAskMessages] = useState<AskMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const assistantRequestIdRef = useRef(0);
  const assistantInFlightRef = useRef(false);
  const assistantAbortRef = useRef<AbortController | null>(null);
  const terminalCreditRefreshJobIdRef = useRef<string | null>(null);
  const jobSnapshotsRef = useRef(new Map<string, GenerationSnapshot>());
  const r2Client = useMemo(() => createR2Client({
    baseUrl: r2BaseUrl,
    bucketName: r2BucketName,
    apiToken: r2ApiToken,
  }), []);

  const estimatedCredits = useMemo(() => Math.max(1, imageCount), [imageCount]);

  useEffect(() => {
    if (!openSelectKey) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-creator-dropdown]')) return;
      setOpenSelectKey(null);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openSelectKey]);

  useEffect(() => {
    if (!actionMessage) return;
    const timeout = window.setTimeout(() => setActionMessage(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  useEffect(() => {
    return () => {
      assistantAbortRef.current?.abort();
      assistantAbortRef.current = null;
      assistantInFlightRef.current = false;
      invalidateAssistantRequest();
    };
  }, []);

  const upsertBatch = useCallback((nextJob: GenerationJobView) => {
    setBatches((current) => {
      const existingIndex = current.findIndex((batch) => batch.job.jobId === nextJob.jobId);
      if (existingIndex >= 0) {
        const updated = [...current];
        updated[existingIndex] = { ...updated[existingIndex], job: nextJob };
        return updated;
      }

      const snapshot = jobSnapshotsRef.current.get(nextJob.jobId) ?? {
        prompt,
        model,
        ratio,
        imageCount,
        referenceImage,
      };

      return [
        {
          batchId: nextJob.jobId,
          job: nextJob,
          ...snapshot,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ];
    });
  }, [imageCount, model, prompt, ratio, referenceImage]);

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
    upsertBatch(data.job);
    if (terminalStatuses.has(data.job.status)) {
      setGenerating(false);
      onGenerationUpdated?.();
      if (terminalCreditRefreshJobIdRef.current !== data.job.jobId) {
        terminalCreditRefreshJobIdRef.current = data.job.jobId;
        dispatchCreditOverviewRefresh();
      }
    }
  }, [onGenerationUpdated, upsertBatch]);

  const runJob = useCallback(async (runUrl: string) => {
    const response = await fetch(runUrl, {
      method: 'POST',
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const data = await response.json() as { job: GenerationJobView };
    setJob(data.job);
    upsertBatch(data.job);
    setGenerating(false);
    onGenerationUpdated?.();
    if (terminalCreditRefreshJobIdRef.current !== data.job.jobId) {
      terminalCreditRefreshJobIdRef.current = data.job.jobId;
      dispatchCreditOverviewRefresh();
    }
  }, [onGenerationUpdated, upsertBatch]);

  useEffect(() => {
    if (activeDispatchMode !== 'queue' || !job?.jobId || terminalStatuses.has(job.status)) {
      return;
    }

    const interval = window.setInterval(() => {
      void pollJob(job.jobId).catch((pollError) => {
        setError(pollError instanceof Error ? pollError.message : String(pollError));
        setGenerating(false);
      });
    }, job.status === 'queued' ? 1500 : 2500);

    return () => window.clearInterval(interval);
  }, [activeDispatchMode, job?.jobId, job?.status, pollJob]);

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

  async function handleGenerate(promptOverride?: string) {
    const promptForRequest = promptOverride ?? prompt;
    setGenerating(true);
    setError(null);
    setActiveDispatchMode(null);

    try {
      const response = await fetch('/api/monica/generation/jobs', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          prompt: promptForRequest,
          model,
          ratio,
          imageCount,
          referenceId: referenceImage?.referenceId,
          sourcePage,
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = await response.json() as CreateGenerationJobResponse;
      const dispatchMode = data.dispatchMode ?? 'queue';
      jobSnapshotsRef.current.set(data.job.jobId, {
        prompt: promptForRequest,
        model,
        ratio,
        imageCount,
        referenceImage,
      });
      terminalCreditRefreshJobIdRef.current = null;
      setActiveDispatchMode(dispatchMode);
      setJob(data.job);
      upsertBatch(data.job);
      dispatchCreditOverviewRefresh();
      if (dispatchMode === 'client-run' && data.runUrl) {
        await runJob(data.runUrl);
      } else if (dispatchMode === 'queue' && data.job?.jobId) {
        await pollJob(data.job.jobId);
      } else {
        setGenerating(false);
        onGenerationUpdated?.();
      }
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : String(generateError));
      setGenerating(false);
    }
  }

  const canGenerate = prompt.trim().length > 0 && !generating;

  async function requestPromptAssistant(input: {
    mode: AssistantMode;
    userInput?: string;
    promptOverride?: string;
    includeThemeContext?: boolean;
    messages?: AssistantPromptMessage[];
    existingIdeas?: StarterIdea[];
    previousImprovedPrompts?: string[];
    signal?: AbortSignal;
  }) {
    const includeThemeContext = input.includeThemeContext ?? false;
    const response = await fetch('/api/monica/assistant/prompt', {
      method: 'POST',
      signal: input.signal,
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        mode: input.mode,
        prompt: input.promptOverride ?? prompt,
        userInput: input.userInput,
        messages: input.messages,
        existingIdeas: input.existingIdeas,
        previousImprovedPrompts: input.previousImprovedPrompts,
        themeLabel: includeThemeContext ? themeLabel : undefined,
        themeNote: includeThemeContext ? themeNote : undefined,
        themeId: includeThemeContext ? themeId?.toString() : undefined,
        sourcePage,
      }),
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    return response.json() as Promise<AssistantPromptResponse>;
  }

  async function generateMoreIdeas(sourceIdeas: StarterIdea[], signal?: AbortSignal) {
    const data = await requestPromptAssistant({
      mode: 'ideas',
      promptOverride: '',
      includeThemeContext: true,
      existingIdeas: sourceIdeas,
      signal,
    });
    const ideas = normalizeStarterIdeas(data.ideas);
    if (!ideas.length) {
      throw new Error('No ideas returned');
    }
    return ideas;
  }

  function beginAssistantRequest() {
    assistantRequestIdRef.current += 1;
    return assistantRequestIdRef.current;
  }

  function invalidateAssistantRequest() {
    assistantRequestIdRef.current += 1;
  }

  function isCurrentAssistantRequest(requestId: number) {
    return requestId === assistantRequestIdRef.current;
  }

  function beginAssistantFetch() {
    if (assistantInFlightRef.current) return null;
    assistantInFlightRef.current = true;
    const controller = new AbortController();
    assistantAbortRef.current = controller;
    const requestId = beginAssistantRequest();
    setAssistantLoading(true);
    return { requestId, signal: controller.signal };
  }

  function finishAssistantFetch(requestId: number) {
    if (!isCurrentAssistantRequest(requestId)) return;
    assistantInFlightRef.current = false;
    assistantAbortRef.current = null;
    setAssistantLoading(false);
  }

  function cancelAssistantFetch() {
    assistantAbortRef.current?.abort();
    assistantAbortRef.current = null;
    assistantInFlightRef.current = false;
    invalidateAssistantRequest();
    setAssistantLoading(false);
  }

  function isAbortError(value: unknown) {
    return value instanceof DOMException && value.name === 'AbortError';
  }

  async function handleGetIdeas() {
    if (assistantLoading || assistantInFlightRef.current) return;

    if (mode === 'studio' && !themeId && onRequestThemeIdeas) {
      onRequestThemeIdeas();
      return;
    }

    setAssistantMode('ideas');
    setImprovedPrompt(null);
    setAskMessages([]);
    setAssistantMessage(assistantTitle('ideas', copy));

    if (starterIdeaPool.length) {
      invalidateAssistantRequest();
      setAssistantLoading(false);
      setAssistantIdeas(pickIdeas(starterIdeaPool, 3));
      return;
    }

    const request = beginAssistantFetch();
    if (!request) return;
    try {
      const ideas = await generateMoreIdeas([], request.signal);
      if (!isCurrentAssistantRequest(request.requestId)) return;
      setAssistantIdeas(ideas);
      setAssistantMessage(assistantTitle('ideas', copy));
    } catch (ideasError) {
      if (isAbortError(ideasError)) return;
      if (!isCurrentAssistantRequest(request.requestId)) return;
      setAssistantMessage(assistantRetryMessage);
    } finally {
      finishAssistantFetch(request.requestId);
    }
  }

  async function handleMoreIdeas() {
    if (assistantLoading || assistantInFlightRef.current) return;

    setAssistantMode('ideas');
    setImprovedPrompt(null);
    setAskMessages([]);
    const request = beginAssistantFetch();
    if (!request) return;
    setAssistantMessage(assistantTitle('ideas', copy));

    try {
      const ideas = await generateMoreIdeas(assistantIdeas.length ? assistantIdeas : starterIdeaPool, request.signal);
      if (!isCurrentAssistantRequest(request.requestId)) return;
      setAssistantIdeas(ideas);
      setAssistantMessage(assistantTitle('ideas', copy));
    } catch (ideasError) {
      if (isAbortError(ideasError)) return;
      if (!isCurrentAssistantRequest(request.requestId)) return;
      setAssistantMessage(assistantRetryMessage);
    } finally {
      finishAssistantFetch(request.requestId);
    }
  }

  async function handleImprovePrompt() {
    if (assistantLoading || assistantInFlightRef.current) return;

    const promptForImprovement = prompt.trim();
    const isRetry = assistantMode === 'improve' && Boolean(improvedPrompt);
    setAssistantMode('improve');
    setAssistantIdeas([]);
    setAskMessages([]);

    if (!promptForImprovement) {
      invalidateAssistantRequest();
      setImprovedPrompt(null);
      setAssistantLoading(false);
      setAssistantMessage(copy.assistant.improveNeedsPrompt);
      return;
    }

    const request = beginAssistantFetch();
    if (!request) return;
    setAssistantMessage(assistantTitle('improve', copy));

    try {
      const data = await requestPromptAssistant({
        mode: 'improve',
        promptOverride: promptForImprovement,
        userInput: isRetry ? 'Try another improved version.' : undefined,
        previousImprovedPrompts: isRetry ? improvedPromptHistory : undefined,
        includeThemeContext: false,
        signal: request.signal,
      });
      if (!isCurrentAssistantRequest(request.requestId)) return;
      const nextPrompt = data.improvedPrompt?.trim();
      setImprovedPrompt(nextPrompt || null);
      if (nextPrompt) {
        setImprovedPromptHistory((current) => [...current, nextPrompt].slice(-maxImprovedPromptHistory));
      }
      setAssistantMessage(nextPrompt ? assistantTitle('improve', copy) : copy.assistant.improveNeedsPrompt);
    } catch (improveError) {
      if (isAbortError(improveError)) return;
      if (!isCurrentAssistantRequest(request.requestId)) return;
      setImprovedPrompt(null);
      setAssistantMessage(assistantRetryMessage);
    } finally {
      finishAssistantFetch(request.requestId);
    }
  }

  function handleAskAssistant() {
    if (assistantLoading || assistantInFlightRef.current) return;

    invalidateAssistantRequest();
    setAssistantMode('ask');
    setImprovedPrompt(null);
    setImprovedPromptHistory([]);
    setAssistantIdeas([]);
    setAssistantMessage(assistantTitle('ask', copy));
  }

  async function handleSendAsk() {
    if (assistantLoading || assistantInFlightRef.current) return;

    const ask = askInput.trim();
    if (!ask) return;
    setAskMessages((current) => [
      ...current,
      { role: 'user', text: ask },
    ]);
    setAskInput('');
    const request = beginAssistantFetch();
    if (!request) return;
    setAssistantMessage(assistantTitle('ask', copy));

    try {
      const data = await requestPromptAssistant({
        mode: 'ask',
        userInput: ask,
        messages: askMessages.map(formatAskMessageForAssistant),
        includeThemeContext: false,
        signal: request.signal,
      });
      const ideas = normalizeStarterIdeas(data.ideas);
      if (!ideas.length) {
        throw new Error('No directions returned');
      }
      if (!isCurrentAssistantRequest(request.requestId)) return;
      setAskMessages((current) => [
        ...current,
        { role: 'assistant', text: copy.assistant.chooseDirection, ideas },
      ]);
      setAssistantMessage(assistantTitle('ask', copy));
    } catch (askError) {
      if (isAbortError(askError)) return;
      if (!isCurrentAssistantRequest(request.requestId)) return;
      setAskMessages((current) => [
        ...current,
        { role: 'assistant', text: assistantRetryMessage },
      ]);
      setAssistantMessage(assistantRetryMessage);
    } finally {
      finishAssistantFetch(request.requestId);
    }
  }

  function closeAssistant() {
    cancelAssistantFetch();
    setAssistantMode(null);
    setAssistantIdeas([]);
    setImprovedPrompt(null);
    setImprovedPromptHistory([]);
    setAskMessages([]);
    setAssistantMessage(null);
    setAssistantLoading(false);
  }

  function handleUseIdea(idea: StarterIdea) {
    setPrompt(promptFromIdea(idea));
    setImprovedPromptHistory([]);
  }

  function handlePromptChange(value: string) {
    setPrompt(value);
    setImprovedPrompt(null);
    setImprovedPromptHistory([]);
  }

  function handleReplacePrompt(value: string) {
    setPrompt(value);
    setImprovedPrompt(null);
    setImprovedPromptHistory([]);
    setAssistantMessage('Prompt replaced');
  }

  async function handleDownloadImage(image: GeneratedImageView) {
    if (!image.imageUrl) return;
    setDownloadingImageIds((current) => new Set(current).add(image.imageId));
    setActionMessage(null);

    try {
      const response = await fetch(image.imageUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `monica-${image.imageId}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      setActionMessage(downloadError instanceof Error ? downloadError.message : 'Download failed');
    } finally {
      setDownloadingImageIds((current) => {
        const next = new Set(current);
        next.delete(image.imageId);
        return next;
      });
    }
  }

  function handleRequestDeleteImage(imageId: string) {
    if (submittedImageIds.has(imageId)) {
      setActionMessage('Submitted images cannot be deleted.');
      return;
    }

    setPendingDeleteImageId(imageId);
  }

  async function handleConfirmDeleteImage() {
    const imageId = pendingDeleteImageId;
    if (!imageId) return;
    setDeletingImageIds((current) => new Set(current).add(imageId));
    setPendingDeleteImageId(null);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/monica/studio/images/${imageId}`, {
        method: 'DELETE',
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error(await readError(response));
      setDeletedImageIds((current) => new Set(current).add(imageId));
      setActionMessage('Image deleted.');
    } catch (deleteError) {
      setActionMessage(deleteError instanceof Error ? deleteError.message : 'Delete failed');
    } finally {
      setDeletingImageIds((current) => {
        const next = new Set(current);
        next.delete(imageId);
        return next;
      });
    }
  }

  const shellClassName = mode === 'studio'
    ? 'px-0 py-0'
    : 'monica-surface px-0 py-16 md:py-20';
  const contentClassName = mode === 'studio'
    ? 'grid gap-5'
    : cn(monicaContentWidthClass, 'grid gap-10');
  const creatorWidthClassName = 'mx-auto w-full max-w-[1000px]';
  const assistantOpen = assistantMode !== null;

  return (
    <section className={shellClassName}>
      <div className={contentClassName}>
        {mode === 'home' ? (
          <div className="mx-auto max-w-4xl text-center">
            <div className={cn(
              'monica-chip mx-auto gap-2 normal-case',
              themeBgColor,
              themeBorderColor,
              themeIconColor,
            )}>
              <Sparkles className="size-4" />
              <span>{copy.badge}</span>
            </div>
            <h1 className="monica-page-title mt-5">
              {copy.title}
            </h1>
            <p className="monica-copy mx-auto mt-5 max-w-2xl">
              {copy.description}
            </p>
          </div>
        ) : null}

        <div className={cn(
          creatorWidthClassName,
          'grid gap-2 transition-[max-width,transform] duration-200',
          assistantOpen ? 'xl:max-w-[880px] xl:-translate-x-20 2xl:max-w-[960px] 2xl:-translate-x-24' : '',
        )}>
          <div className="flex flex-wrap gap-2 px-3">
            <AssistantButton icon={<Lightbulb className="size-4" />} label={mode === 'theme_detail' ? copy.assistant.getIdeasTheme : mode === 'studio' ? copy.assistant.getIdeasFromTheme : copy.assistant.getIdeasToday} onClick={handleGetIdeas} disabled={assistantLoading} />
            <AssistantButton icon={<Wand2 className="size-4" />} label={copy.assistant.improvePrompt} onClick={handleImprovePrompt} disabled={assistantLoading} />
            <AssistantButton icon={<MessageCircle className="size-4" />} label={copy.assistant.askAssistant} onClick={handleAskAssistant} disabled={assistantLoading} />
          </div>

          <div className="monica-panel bg-white/95 backdrop-blur-sm p-5 pb-2 shadow-[0_4px_30px_rgb(0,0,0,0.06)] md:p-7 md:pb-3">
            <div className="space-y-5">
              <div className="flex gap-4 md:gap-6">
                <div className="hidden shrink-0 md:block">
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
                    <div className="relative h-32 w-24 overflow-hidden rounded-md border border-border bg-muted">
                      {referenceImage.url ? (
                        <Image src={referenceImage.url} alt="" width={96} height={128} unoptimized className="size-full object-cover" />
                      ) : (
                        <ImagePlus className="m-8 size-8 text-muted-foreground" />
                      )}
                      <button
                        type="button"
                        onClick={() => setReferenceImage(null)}
                        className="absolute right-1 top-1 grid size-7 place-items-center rounded bg-black/55 text-white"
                        aria-label={copy.removeReference}
                        title={copy.removeReference}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="grid h-32 w-24 place-items-center rounded-lg border border-black/10 bg-neutral-50 text-neutral-400 transition hover:-rotate-2 hover:border-black/20 hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-60 shadow-sm"
                      aria-label={copy.uploadReference}
                      title={copy.uploadReference}
                    >
                      {uploading ? <Loader2 className="size-5 animate-spin" /> : <UploadCloud className="size-6" />}
                    </button>
                  )}
                </div>

                <label className="min-w-0 flex-1">
                  <span className="sr-only">{copy.promptLabel}</span>
                  <textarea
                    value={prompt}
                    onChange={(event) => handlePromptChange(event.target.value)}
                    className="min-h-36 w-full resize-none border-0 bg-transparent p-0 text-[1.1rem] leading-8 text-neutral-800 outline-none placeholder:text-neutral-400 focus:ring-0 md:text-2xl md:leading-9"
                    placeholder={copy.promptPlaceholder}
                    maxLength={4000}
                  />
                </label>
              </div>

            <div className="flex flex-col gap-3 border-t border-border pt-2 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <ControlDropdown
                  id="model"
                  label={copy.modelLabel}
                  icon={<Sparkles className="size-4" />}
                  value={model}
                  options={modelOptions}
                  open={openSelectKey === 'model'}
                  onToggle={() => setOpenSelectKey((key) => key === 'model' ? null : 'model')}
                  onClose={() => setOpenSelectKey(null)}
                  onChange={setModel}
                />
                <ControlDropdown
                  id="images"
                  label={copy.imagesLabel}
                  icon={<ImagePlus className="size-4" />}
                  value={imageCount.toString()}
                  options={countOptions.map((count) => ({ value: count.toString(), label: `${count} img` }))}
                  open={openSelectKey === 'images'}
                  onToggle={() => setOpenSelectKey((key) => key === 'images' ? null : 'images')}
                  onClose={() => setOpenSelectKey(null)}
                  onChange={(value) => setImageCount(Number(value))}
                />
                <ControlDropdown
                  id="ratio"
                  label={copy.ratioLabel}
                  icon={<span className="block size-4 rounded-[2px] border-2 border-current" aria-hidden="true" />}
                  value={ratio}
                  options={ratioOptions}
                  open={openSelectKey === 'ratio'}
                  onToggle={() => setOpenSelectKey((key) => key === 'ratio' ? null : 'ratio')}
                  onClose={() => setOpenSelectKey(null)}
                  onChange={setRatio}
                />
              </div>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={!canGenerate}
                className="inline-flex h-12 min-h-12 items-center justify-center gap-2 rounded-full bg-(--monica-accent) px-8 text-base font-bold text-white shadow-sm transition hover:bg-(--monica-accent-hover) disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                <span>{generating ? copy.generating : copy.generate}</span>
                <span className="text-white/75">{estimatedCredits} {copy.creditsUnit}</span>
              </button>
            </div>

            {error && (
              <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-100">
                {error}
              </div>
            )}

          </div>
        </div>
      </div>
      </div>

      <AssistantDialog
        open={assistantOpen}
        mode={assistantMode}
        title={assistantMessage}
        loading={assistantLoading}
        ideas={assistantIdeas}
        improvedPrompt={improvedPrompt}
        askInput={askInput}
        askMessages={askMessages}
        onOpenChange={(open) => {
          if (!open) closeAssistant();
        }}
        onAskInputChange={setAskInput}
        onSendAsk={handleSendAsk}
        onUseIdea={handleUseIdea}
        onMoreIdeas={handleMoreIdeas}
        onReplacePrompt={handleReplacePrompt}
        onTryAnother={handleImprovePrompt}
        onClose={closeAssistant}
        copy={copy}
      />

      {mode !== 'studio' && batches.length > 0 ? (
        <div className={cn(monicaContentWidthClass, 'mt-10')}>
          <div className={creatorWidthClassName}>
            <ResultPanel
              batches={batches}
              copy={copy}
              actionMessage={actionMessage}
              deletedImageIds={deletedImageIds}
              deletingImageIds={deletingImageIds}
              downloadingImageIds={downloadingImageIds}
              favoriteImageIds={favoriteImageIds}
              onDeleteImage={handleRequestDeleteImage}
              onDownloadImage={(image) => void handleDownloadImage(image)}
              onToggleFavorite={(imageId) => setFavoriteImageIds((current) => {
                const next = new Set(current);
                if (next.has(imageId)) next.delete(imageId);
                else next.add(imageId);
                return next;
              })}
              onSubmitImage={(target) => setSubmitTarget(target)}
              submittedImageIds={submittedImageIds}
              defaultThemeId={themeId}
            />
          </div>
        </div>
      ) : null}

      {submitTarget ? (
        <SubmitImageDialog
          target={submitTarget}
          defaultThemeId={themeId}
          copy={copy.submitDialog}
          onClose={() => setSubmitTarget(null)}
          onSubmitted={() => setSubmittedImageIds((current) => new Set(current).add(submitTarget.imageId))}
        />
      ) : null}

      {pendingDeleteImageId ? (
        <ConfirmDialog
          title="Delete image?"
          description="This image will be removed from your Studio. This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onCancel={() => setPendingDeleteImageId(null)}
          onConfirm={() => void handleConfirmDeleteImage()}
        />
      ) : null}
    </section>
  );
}

function ControlDropdown({
  id,
  label,
  icon,
  value,
  options,
  open,
  onToggle,
  onClose,
  onChange,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  value: string;
  options: Array<{ value: string; label: string }>;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="relative" data-creator-dropdown>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-transparent px-3 text-[13px] font-medium text-neutral-600 transition hover:bg-neutral-100/80 hover:text-neutral-900"
        aria-expanded={open}
        aria-controls={`creator-${id}-menu`}
        title={label}
      >
        {icon}
        <span>{selected?.label ?? value}</span>
        <ChevronDown className={cn('size-3.5 text-muted-foreground transition', open ? 'rotate-180' : '')} />
      </button>
      {open ? (
        <div
          id={`creator-${id}-menu`}
          className="absolute left-0 top-[calc(100%+6px)] z-20 grid min-w-full gap-1 rounded-md border border-border bg-white p-1 shadow-xl shadow-black/15"
        >
          <span className="sr-only">{label}</span>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(option.value);
              onClose();
            }}
            className={cn(
              'h-9 whitespace-nowrap rounded px-3 text-left text-sm font-medium transition',
              value === option.value
                ? 'bg-(--monica-accent-soft) text-foreground'
                : 'text-foreground hover:bg-muted',
            )}
          >
            {option.label}
          </button>
        ))}
        </div>
      ) : null}
    </div>
  );
}

function AssistantButton({ icon, label, onClick, disabled = false }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-10 items-center justify-center gap-2 rounded-full bg-neutral-100/50 px-4 py-2 text-[13px] font-medium text-neutral-600 transition hover:bg-neutral-200/60 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-neutral-100/50 disabled:hover:text-neutral-600"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function AssistantDialog({
  open,
  onOpenChange,
  ...contentProps
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & AssistantPanelContentProps) {
  const dialogTitle = assistantTitle(contentProps.mode, contentProps.copy) ?? contentProps.copy.assistant.output;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false} disablePointerDismissal>
      <DialogContent
        className={cn(
          'fixed bottom-3 right-3 left-auto top-16 z-30 flex max-h-[calc(100vh-4.75rem)] w-[calc(100vw-1.5rem)] max-w-none translate-x-0 translate-y-0 grid-rows-none flex-col gap-0 overflow-hidden rounded-2xl border border-black/5 bg-white p-0 shadow-[0_8px_30px_rgb(0,0,0,0.08)] ring-0 duration-200 data-closed:slide-out-to-right data-open:slide-in-from-right',
          'sm:w-[440px] lg:w-[460px]',
        )}
        showCloseButton={false}
        showOverlay={false}
      >
        <DialogHeader className="border-b border-black/5 px-5 py-4 text-left">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="truncate text-[15px] font-semibold text-neutral-900">
              {dialogTitle}
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-mr-2 size-8 shrink-0 text-neutral-500 hover:text-neutral-900"
              onClick={contentProps.onClose}
              aria-label={contentProps.copy.assistant.close}
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        <AssistantPanelContent {...contentProps} />
      </DialogContent>
    </Dialog>
  );
}

type AssistantPanelContentProps = {
  mode: AssistantMode | null;
  title: string | null;
  loading: boolean;
  ideas: StarterIdea[];
  improvedPrompt: string | null;
  askInput: string;
  askMessages: AskMessage[];
  onAskInputChange: (value: string) => void;
  onSendAsk: () => void;
  onUseIdea: (idea: StarterIdea) => void;
  onMoreIdeas: () => void;
  onReplacePrompt: (prompt: string) => void;
  onTryAnother: () => void;
  onClose: () => void;
  copy: MonicaCreatorCopy;
};

function AssistantPanelContent({
  mode,
  title,
  loading,
  ideas,
  improvedPrompt,
  askInput,
  askMessages,
  onAskInputChange,
  onSendAsk,
  onUseIdea,
  onMoreIdeas,
  onReplacePrompt,
  onTryAnother,
  copy,
}: AssistantPanelContentProps) {
  const visibleAskMessages = askMessages.filter((message) => !(message.role === 'assistant' && message.ideas?.length));
  const askIdeaGroups = askMessages
    .map((message) => message.ideas ?? [])
    .filter((messageIdeas) => messageIdeas.length > 0);
  const askEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mode !== 'ask') return;

    askEndRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [askIdeaGroups.length, askMessages.length, loading, mode]);

  if (!mode && !title && ideas.length === 0 && !improvedPrompt && !loading) return null;
  const showRetryMessage = title === assistantRetryMessage;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="flex-1">
        <div className="grid gap-4 px-4 py-5 sm:px-5">
          {loading && mode === 'improve' ? (
            <div className="flex items-center gap-2 rounded-2xl bg-neutral-50 px-4 py-3 text-[13px] font-medium text-neutral-500">
              <Loader2 className="size-4 animate-spin" />
              <span>{title || copy.assistant.assistantName}</span>
            </div>
          ) : null}

          {mode === 'ideas' && showRetryMessage && ideas.length === 0 && !loading ? (
            <p className="text-sm leading-6 text-muted-foreground">{assistantRetryMessage}</p>
          ) : null}

          {mode === 'improve' && !improvedPrompt && showRetryMessage ? (
            <p className="text-sm leading-6 text-muted-foreground">{assistantRetryMessage}</p>
          ) : null}

          {mode === 'improve' && !loading && !improvedPrompt && !showRetryMessage ? (
            <p className="text-sm leading-6 text-muted-foreground">{copy.assistant.improveNeedsPrompt}</p>
          ) : null}

          {mode === 'improve' && improvedPrompt ? (
            <div className="grid gap-3">
              <div className="rounded-2xl bg-neutral-50 px-4 py-3">
                <p className="text-[14px] leading-6 text-neutral-800">{improvedPrompt}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <SmallActionButton onClick={() => onReplacePrompt(improvedPrompt)} disabled={loading}>{copy.assistant.use}</SmallActionButton>
                <SmallActionButton onClick={onTryAnother} disabled={loading}>{copy.assistant.tryAnother}</SmallActionButton>
              </div>
            </div>
          ) : null}

          {mode === 'ideas' && (ideas.length > 0 || loading) ? (
            <div className="grid gap-3">
              {loading && ideas.length === 0 ? (
                <div className="flex items-center gap-2 rounded-2xl bg-neutral-50 px-4 py-3 text-[13px] font-medium text-neutral-500">
                  <Loader2 className="size-4 animate-spin" />
                  <span>{title || copy.assistant.output}</span>
                </div>
              ) : null}
              {ideas.map((idea, index) => (
                <div key={`${idea.idea}-${index}`} className="group rounded-2xl bg-neutral-50/60 px-4 py-3.5 transition hover:bg-neutral-50">
                  <div className="text-[14.5px] font-medium leading-6 text-neutral-900">{index + 1}. {idea.idea}</div>
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-5 text-neutral-600">{idea.prompt}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SmallActionButton onClick={() => onUseIdea(idea)} disabled={loading}>{copy.assistant.use}</SmallActionButton>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-1">
                <SmallActionButton onClick={onMoreIdeas} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : copy.assistant.moreIdeas}
                </SmallActionButton>
              </div>
            </div>
          ) : null}

          {mode === 'ask' ? (
            <div className="grid gap-4">
              {visibleAskMessages.length > 0 ? (
                <div className="grid gap-4">
                  {visibleAskMessages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className={cn('flex flex-col', message.role === 'user' ? 'items-end' : 'items-start')}>
                      <div className={cn('mb-1 px-1 text-[11px] font-medium', message.role === 'user' ? 'text-neutral-400' : 'text-neutral-400')}>
                        {message.role === 'user' ? copy.assistant.you : copy.assistant.assistantName}
                      </div>
                      <div className={cn(
                        'max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-6',
                        message.role === 'user'
                          ? 'rounded-br-sm bg-(--monica-accent-soft) text-neutral-900'
                          : 'rounded-bl-sm bg-neutral-50 text-neutral-800',
                      )}>
                        <p>{message.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {askIdeaGroups.length > 0 ? (
                <div className="grid gap-4 pt-2">
                  {askIdeaGroups.map((ideaGroup, groupIndex) => (
                    <div key={groupIndex} className="grid gap-2">
                      <div className="px-1 text-[13px] font-medium text-neutral-500">{copy.assistant.chooseDirection}</div>
                      {ideaGroup.map((idea, index) => (
                        <div key={`${idea.idea}-${index}`} className="group rounded-2xl bg-neutral-50/60 px-4 py-3 transition hover:bg-neutral-50">
                          <div className="text-[14px] font-medium leading-6 text-neutral-900">{index + 1}. {idea.idea}</div>
                          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-neutral-500">{idea.prompt}</p>
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            <SmallActionButton onClick={() => onUseIdea(idea)} disabled={loading}>{copy.assistant.use}</SmallActionButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}

              {loading ? (
                <div className="flex flex-col items-start">
                  <div className="mb-1 px-1 text-[11px] font-medium text-neutral-400">{copy.assistant.assistantName}</div>
                  <div className="flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-neutral-50 px-4 py-2.5 text-[13px] font-medium text-neutral-500">
                    <Loader2 className="size-4 animate-spin" />
                    <span>{title || copy.assistant.assistantName}</span>
                  </div>
                </div>
              ) : null}

              <div ref={askEndRef} aria-hidden="true" />
            </div>
          ) : null}
        </div>
      </ScrollArea>

      {mode === 'ask' ? (
        <div className="border-t border-black/5 bg-neutral-50/50 p-4">
          <div className="relative">
            <Textarea
              value={askInput}
              onChange={(event) => onAskInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;

                event.preventDefault();
                onSendAsk();
              }}
              className="min-h-[100px] resize-none rounded-xl border border-black/10 bg-white pb-12 pt-3 text-[14.5px] shadow-sm focus-visible:ring-1 focus-visible:ring-neutral-300"
              placeholder={copy.assistant.askPlaceholder}
            />
            <div className="absolute bottom-2 right-2 flex gap-2">
              <Button type="button" size="sm" onClick={onSendAsk} disabled={loading || !askInput.trim()} className="h-8 rounded-lg bg-neutral-900 px-4 font-medium text-white shadow-sm hover:bg-neutral-800 disabled:opacity-60">
                {copy.assistant.send}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SmallActionButton({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg bg-neutral-100 px-3 text-[13px] font-medium text-neutral-600 transition hover:bg-neutral-200 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-neutral-100 disabled:hover:text-neutral-600"
    >
      {children}
    </button>
  );
}

function ResultPanel({
  batches,
  copy,
  actionMessage,
  deletedImageIds,
  deletingImageIds,
  downloadingImageIds,
  favoriteImageIds,
  onDeleteImage,
  onDownloadImage,
  onToggleFavorite,
  onSubmitImage,
  submittedImageIds,
  defaultThemeId,
}: {
  batches: GenerationBatch[];
  copy: MonicaCreatorCopy;
  actionMessage: string | null;
  deletedImageIds: Set<string>;
  deletingImageIds: Set<string>;
  downloadingImageIds: Set<string>;
  favoriteImageIds: Set<string>;
  onDeleteImage: (imageId: string) => void;
  onDownloadImage: (image: GeneratedImageView) => void;
  onToggleFavorite: (imageId: string) => void;
  onSubmitImage: (target: SubmitImageTarget) => void;
  submittedImageIds: Set<string>;
  defaultThemeId?: string | number | bigint | null;
}) {
  return (
    <div className="monica-panel max-h-[780px] overflow-y-auto p-5 md:p-7 bg-transparent border-0 shadow-none">
      <div className="mb-5 flex flex-col justify-between gap-3 border-b border-border pb-4 md:flex-row md:items-center">
        <div>
          <div className="text-lg font-semibold text-foreground">Your new images</div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Your latest creations are shown here. Open Studio to view everything you have generated.
          </p>
        </div>
        <Link href="/studio" className="monica-button-secondary min-h-10 shrink-0 px-4 text-sm">
          {copy.openStudio}
        </Link>
      </div>
      {actionMessage ? (
        <div className="mb-4 rounded-md border border-(--monica-accent-line) bg-(--monica-accent-soft) px-3 py-2 text-sm font-medium text-foreground">
          {actionMessage}
        </div>
      ) : null}
      <div className="grid gap-10">
        {batches.map((batch) => {
          const visibleImages = (batch.job.images ?? []).filter((image) => !deletedImageIds.has(image.imageId));
          const failed = batch.job.status === 'failed' || batch.job.status === 'blocked' || batch.job.status === 'cancelled';
          return (
            <article key={batch.batchId} className="grid gap-5 lg:grid-cols-[minmax(220px,0.62fr)_minmax(0,1.38fr)]">
              <div className="min-w-0">
                <p className="line-clamp-6 text-[15px] leading-6 text-foreground md:text-[15px] md:leading-7">{batch.prompt}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-neutral-400 font-medium tracking-wide">
                  <span>{batch.model}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>{batch.ratio}</span>
                  {batch.referenceImage ? (
                    <>
                      <span aria-hidden="true">&middot;</span>
                      <span>Ref Image</span>
                    </>
                  ) : null}
                </div>
              </div>

              {failed ? (
                <div className="rounded-md border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-800 dark:text-amber-100">
                  {copy.failedNoCharge}
                </div>
              ) : visibleImages.length === 0 ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {Array.from({ length: Math.max(1, batch.imageCount) }).map((_, index) => (
                    <div key={`${batch.batchId}-placeholder-${index}`} className={cn('grid place-items-center rounded-lg bg-black/5 text-muted-foreground', getRatioClassName(batch.ratio))}>
                      <Loader2 className="size-5 animate-spin" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {visibleImages.map((image) => (
                    <figure key={image.imageId} className="group relative">
                      <div className={cn('relative overflow-hidden rounded-lg bg-black/5 shadow-sm', getRatioClassName(batch.ratio))}>
                        {image.imageUrl ? (
                          <Image
                            src={image.imageUrl}
                            alt=""
                            width={1024}
                            height={1024}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-muted-foreground">
                            <ImagePlus className="size-8" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-transparent opacity-0 transition group-hover:opacity-100 md:opacity-0" />
                        {favoriteImageIds.has(image.imageId) ? (
                          <div className="absolute left-2 top-2 grid size-8 place-items-center rounded-full border border-rose-200 bg-white/92 text-rose-600 shadow-sm z-10">
                            <Heart className="size-4 fill-current" />
                          </div>
                        ) : null}
                        <div className="absolute right-2 top-2 flex gap-1 opacity-100 md:opacity-0 md:transition md:group-hover:opacity-100 z-10">
                          <ImageActionButton
                            label={submittedImageIds.has(image.imageId) ? 'Submitted' : copy.actions.submit}
                            disabled={submittedImageIds.has(image.imageId)}
                            active={submittedImageIds.has(image.imageId)}
                            onClick={() => onSubmitImage({
                              imageId: image.imageId,
                              imageUrl: image.imageUrl,
                              defaultThemeId: defaultThemeId?.toString() ?? null,
                            })}
                          >
                            <UploadCloud className="size-3.5" />
                          </ImageActionButton>
                          <ImageActionButton label={copy.actions.favorite} active={favoriteImageIds.has(image.imageId)} onClick={() => onToggleFavorite(image.imageId)}><Heart className="size-3.5" /></ImageActionButton>
                          {image.imageUrl ? (
                            <ImageActionButton label={copy.actions.download} disabled={downloadingImageIds.has(image.imageId)} onClick={() => onDownloadImage(image)}>
                              {downloadingImageIds.has(image.imageId) ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                            </ImageActionButton>
                          ) : null}
                          <ImageActionButton label={copy.actions.delete} disabled={deletingImageIds.has(image.imageId)} onClick={() => onDeleteImage(image.imageId)}>
                            {deletingImageIds.has(image.imageId) ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                          </ImageActionButton>
                        </div>
                      </div>
                    </figure>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function getRatioClassName(ratio?: string | null) {
  if (ratio === '4:5') return 'aspect-[4/5]';
  if (ratio === '9:16') return 'aspect-[9/16]';
  if (ratio === '16:9') return 'aspect-[16/9]';
  return 'aspect-square';
}


function ImageActionButton({
  children,
  label,
  onClick,
  active = false,
  disabled = false,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group/action relative grid size-8 place-items-center rounded-md border border-white/30 bg-black/55 text-white shadow-sm backdrop-blur transition hover:bg-black/75 disabled:cursor-not-allowed disabled:opacity-55',
        active ? 'border-rose-200 bg-rose-600 hover:bg-rose-600' : '',
      )}
    >
      {children}
      <span className="pointer-events-none absolute right-0 top-[calc(100%+6px)] z-30 whitespace-nowrap rounded-md bg-black px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover/action:opacity-100">
        {label}
      </span>
    </button>
  );
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold leading-none text-neutral-950">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600">{description}</p>
          </div>
          <button type="button" onClick={onCancel} className="grid size-8 shrink-0 place-items-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950" aria-label={cancelLabel}>
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-900 shadow-sm transition hover:bg-neutral-50">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

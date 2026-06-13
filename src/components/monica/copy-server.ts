import { getTranslations } from 'next-intl/server';
import type { MonicaCreatorCopy, MonicaExploreCopy, MonicaStudioCopy, MonicaThemeCopy } from './copy';

function rawArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

export async function getMonicaCreatorCopy(locale: string): Promise<MonicaCreatorCopy> {
  const t = await getTranslations({ locale, namespace: 'monica.creator' });
  return {
    badge: t('badge'),
    title: t('title'),
    description: t('description'),
    promptLabel: t('promptLabel'),
    promptPlaceholder: t('promptPlaceholder'),
    negativePromptLabel: t('negativePromptLabel'),
    negativePromptPlaceholder: t('negativePromptPlaceholder'),
    modelLabel: t('modelLabel'),
    styleLabel: t('styleLabel'),
    ratioLabel: t('ratioLabel'),
    imagesLabel: t('imagesLabel'),
    uploadReference: t('uploadReference'),
    uploadingReference: t('uploadingReference'),
    removeReference: t('removeReference'),
    generate: t('generate'),
    generating: t('generating'),
    estimatedLabel: t('estimatedLabel'),
    queueLabel: t('queueLabel'),
    resultLabel: t('resultLabel'),
    creditsUnit: t('creditsUnit'),
    ready: t('ready'),
    running: t('running'),
    notStarted: t('notStarted'),
    uploaded: t('uploaded'),
    emptyResult: t('emptyResult'),
    waitingForImages: t('waitingForImages'),
    failedNoCharge: t('failedNoCharge'),
    imageLabel: t('imageLabel'),
    initialPrompt: t('initialPrompt'),
    modelOptions: {
      mock: t('modelOptions.mock'),
      openrouter: t('modelOptions.openrouter'),
    },
    styleOptions: {
      editorial: t('styleOptions.editorial'),
      cinematic: t('styleOptions.cinematic'),
      product: t('styleOptions.product'),
      illustration: t('styleOptions.illustration'),
    },
    statusLabels: {
      pending: t('statusLabels.pending'),
      queued: t('statusLabels.queued'),
      running: t('statusLabels.running'),
      succeeded: t('statusLabels.succeeded'),
      failed: t('statusLabels.failed'),
      blocked: t('statusLabels.blocked'),
      cancelled: t('statusLabels.cancelled'),
    },
  };
}

export async function getMonicaStudioCopy(locale: string): Promise<MonicaStudioCopy> {
  const t = await getTranslations({ locale, namespace: 'monica.studio' });
  return {
    title: t('title'),
    description: t('description'),
    myImages: t('myImages'),
    refresh: t('refresh'),
    loading: t('loading'),
    empty: t('empty'),
    privateStatus: t('privateStatus'),
    submit: t('submit'),
    noTheme: t('noTheme'),
    generated: t('generated'),
    prompt: t('prompt'),
    theme: t('theme'),
    model: t('model'),
    viewPrompt: t('viewPrompt'),
    close: t('close'),
    cancel: t('cancel'),
    submitImage: t('submitImage'),
    creatorNote: t('creatorNote'),
    creatorNotePlaceholder: t('creatorNotePlaceholder'),
    submitHint: t('submitHint'),
    tabs: {
      all: t('tabs.all'),
      generated: t('tabs.generated'),
      submitted: t('tabs.submitted'),
      underReview: t('tabs.underReview'),
      published: t('tabs.published'),
      rejected: t('tabs.rejected'),
    },
    statusLabels: {
      active: t('statusLabels.active'),
      approved: t('statusLabels.approved'),
      blocked: t('statusLabels.blocked'),
      draft: t('statusLabels.draft'),
      failed: t('statusLabels.failed'),
      generated: t('statusLabels.generated'),
      pending: t('statusLabels.pending'),
      private: t('statusLabels.private'),
      published: t('statusLabels.published'),
      queued: t('statusLabels.queued'),
      rejected: t('statusLabels.rejected'),
      running: t('statusLabels.running'),
      succeeded: t('statusLabels.succeeded'),
      under_review: t('statusLabels.under_review'),
    },
  };
}

export async function getMonicaExploreCopy(locale: string): Promise<MonicaExploreCopy> {
  const t = await getTranslations({ locale, namespace: 'monica.explore' });
  return {
    title: t('title'),
    description: t('description'),
    loading: t('loading'),
    empty: t('empty'),
    emptyThemes: t('emptyThemes'),
    untitled: t('untitled'),
    searchPlaceholder: t('searchPlaceholder'),
    viewTheme: t('viewTheme'),
    createFromTheme: t('createFromTheme'),
    openDetail: t('openDetail'),
    imageDetail: t('imageDetail'),
    prompt: t('prompt'),
    close: t('close'),
    usePrompt: t('usePrompt'),
    copyPrompt: t('copyPrompt'),
    copied: t('copied'),
    tabs: {
      themes: t('tabs.themes'),
      images: t('tabs.images'),
    },
    filters: {
      latest: t('filters.latest'),
      popular: t('filters.popular'),
      cinematic: t('filters.cinematic'),
      surreal: t('filters.surreal'),
    },
    sort: {
      newest: t('sort.newest'),
      mostLiked: t('sort.mostLiked'),
      featured: t('sort.featured'),
    },
    actions: {
      like: t('actions.like'),
      save: t('actions.save'),
    },
    themes: rawArray(t.raw('themes')),
  };
}

export async function getMonicaThemeCopy(locale: string): Promise<MonicaThemeCopy> {
  const t = await getTranslations({ locale, namespace: 'monica.theme' });
  return {
    date: t('date'),
    eyebrow: t('eyebrow'),
    title: t('title'),
    homeTitle: t('homeTitle'),
    homeDescription: t('homeDescription'),
    homeCta: t('homeCta'),
    recentTitle: t('recentTitle'),
    stats: rawArray(t.raw('stats')),
    tags: rawArray(t.raw('tags')),
    notes: rawArray(t.raw('notes')),
    submissionHint: t('submissionHint'),
    galleryTitle: t('galleryTitle'),
    galleryTabs: {
      featured: t('galleryTabs.featured'),
      mostLiked: t('galleryTabs.mostLiked'),
      newest: t('galleryTabs.newest'),
    },
    recent: rawArray(t.raw('recent')),
    gallery: rawArray(t.raw('gallery')),
  };
}

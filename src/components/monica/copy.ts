import type { SubmitImageDialogCopy } from './submit-image-dialog';

export type MonicaCreatorCopy = {
  badge: string;
  title: string;
  description: string;
  promptLabel: string;
  promptPlaceholder: string;
  modelLabel: string;
  styleLabel: string;
  ratioLabel: string;
  imagesLabel: string;
  uploadReference: string;
  uploadingReference: string;
  removeReference: string;
  generate: string;
  generating: string;
  estimatedLabel: string;
  queueLabel: string;
  resultLabel: string;
  creditsUnit: string;
  ready: string;
  running: string;
  notStarted: string;
  uploaded: string;
  emptyResult: string;
  waitingForImages: string;
  failedNoCharge: string;
  imageLabel: string;
  initialPrompt: string;
  sessionResults: string;
  openStudio: string;
  noReference: string;
  modelOptions: {
    gptImage2: string;
    nanoBanana2: string;
    nanoBananaPro: string;
    seedream45: string;
  };
  assistant: {
    getIdeasToday: string;
    getIdeasTheme: string;
    getIdeasFromTheme: string;
    improvePrompt: string;
    askAssistant: string;
    output: string;
    tryOne: string;
    use: string;
    ideaHint: string;
    ideasBasedOn: string;
    originalPrompt: string;
    addStartingIdea: string;
    improveNeedsPrompt: string;
    askIntro: string;
    askPlaceholder: string;
    send: string;
    you: string;
    assistantName: string;
    chooseDirection: string;
    assistantDirectionHint: string;
    moreIdeas: string;
    close: string;
    improvedPrompt: string;
    replacePrompt: string;
    tryAnother: string;
  };
  actions: {
    submit: string;
    delete: string;
    favorite: string;
    download: string;
  };
  submitDialog: SubmitImageDialogCopy;
  styleOptions: {
    editorial: string;
    cinematic: string;
    product: string;
    illustration: string;
  };
  statusLabels: Record<string, string>;
};

export type MonicaStudioCopy = {
  title: string;
  description: string;
  myImages: string;
  refresh: string;
  loading: string;
  empty: string;
  privateStatus: string;
  submit: string;
  noTheme: string;
  generated: string;
  prompt: string;
  theme: string;
  model: string;
  viewPrompt: string;
  close: string;
  cancel: string;
  submitImage: string;
  creatorNote: string;
  creatorNotePlaceholder: string;
  submitHint: string;
  submitDialog: SubmitImageDialogCopy;
  createTitle: string;
  ideaThemeLabel: string;
  noIdeaTheme: string;
  filters: {
    searchPlaceholder: string;
    pendingReview: string;
  };
  tabs: {
    all: string;
    submitted: string;
    approved: string;
    rejected: string;
  };
  statusLabels: Record<string, string>;
};

export type MonicaThemeSummary = {
  title: string;
  date: string;
  brief: string;
  stats: string;
  tags: string[];
  coverImageUrl?: string;
};

export type MonicaExploreCopy = {
  title: string;
  description: string;
  loading: string;
  empty: string;
  emptyThemes: string;
  untitled: string;
  searchPlaceholder: string;
  viewTheme: string;
  createFromTheme: string;
  openDetail: string;
  imageDetail: string;
  prompt: string;
  close: string;
  usePrompt: string;
  copyPrompt: string;
  copied: string;
  useAsInspiration: string;
  tabs: {
    themes: string;
    images: string;
  };
  filters: {
    latest: string;
    popular: string;
    cinematic: string;
    surreal: string;
  };
  sort: {
    newest: string;
    mostLiked: string;
    featured: string;
  };
  actions: {
    like: string;
    save: string;
  };
  themes: MonicaThemeSummary[];
};

export type MonicaGalleryImage = {
  title: string;
  author: string;
  theme: string;
  imageUrl: string;
  alt: string;
  prompt: string;
  tags: string[];
};

export type MonicaThemeCopy = {
  date: string;
  eyebrow: string;
  title: string;
  homeTitle: string;
  homeDescription: string;
  homeCta: string;
  recentTitle: string;
  stats: string[];
  tags: string[];
  notes: string[];
  submissionHint: string;
  galleryTitle: string;
  galleryTabs: {
    featured: string;
    mostLiked: string;
    newest: string;
  };
  recent: Array<{
    label: string;
    title: string;
    brief: string;
  }>;
  gallery: MonicaGalleryImage[];
};

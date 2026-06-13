export type MonicaCreatorCopy = {
  badge: string;
  title: string;
  description: string;
  promptLabel: string;
  promptPlaceholder: string;
  negativePromptLabel: string;
  negativePromptPlaceholder: string;
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
  modelOptions: {
    mock: string;
    openrouter: string;
  };
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
  tabs: {
    all: string;
    generated: string;
    submitted: string;
    underReview: string;
    published: string;
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

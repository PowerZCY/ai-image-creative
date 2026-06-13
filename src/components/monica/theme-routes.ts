import type { MonicaThemeCopy } from './copy';

export const defaultThemeSlug = 'after-putting-on-glasses';

export function slugifyThemeTitle(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || defaultThemeSlug;
}

export function getTodayThemeSlug(copy: MonicaThemeCopy) {
  return slugifyThemeTitle(copy.homeTitle || copy.title);
}

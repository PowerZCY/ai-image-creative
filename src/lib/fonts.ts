import { Inter } from 'next/font/google';

export const appSans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-app-sans',
});

export const appSansStack = [
  'var(--font-app-sans)',
  'ui-sans-serif',
  'system-ui',
  '-apple-system',
  'BlinkMacSystemFont',
  'Segoe UI',
  'sans-serif',
].join(', ');

import { MonicaCreator } from './creator-client';
import type { MonicaCreatorCopy } from './copy';

export function HomeCreatorSection({ copy }: { copy: MonicaCreatorCopy }) {
  return <MonicaCreator copy={copy} sourcePage="home" mode="home" />;
}

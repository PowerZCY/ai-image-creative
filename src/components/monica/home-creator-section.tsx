import { MonicaCreator } from './creator-client';
import type { MonicaCreatorCopy } from './copy';

type HomeCreatorTheme = {
  id?: string | number | bigint | null;
  title?: string | null;
  description?: string | null;
  generatorIdeas?: unknown[];
};

export function HomeCreatorSection({ copy, theme }: { copy: MonicaCreatorCopy; theme?: HomeCreatorTheme | null }) {
  return (
    <MonicaCreator
      copy={copy}
      sourcePage="home"
      mode="home"
      themeId={theme?.id}
      themeLabel={theme?.title}
      themeNote={theme?.description}
      starterIdeas={theme?.generatorIdeas ?? []}
    />
  );
}

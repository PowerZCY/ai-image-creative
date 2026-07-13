import createNextIntlPlugin from 'next-intl/plugin';
import { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

function imageRemotePattern(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return { protocol: url.protocol.replace(':', '') as 'http' | 'https', hostname: url.hostname };
  } catch {
    return null;
  }
}

const configuredImagePatterns = [
  imageRemotePattern(process.env.NEXT_PUBLIC_CDN_ACCESS_DOMAIN),
  imageRemotePattern(process.env.NEXT_PUBLIC_R2_BASE_URL),
].filter((pattern): pattern is { protocol: 'http' | 'https'; hostname: string } => Boolean(pattern));

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // Monorepo development config
  transpilePackages: [
    '@windrun-huaiin/base-ui',
    '@windrun-huaiin/third-ui',
    '@windrun-huaiin/lib',
    '@windrun-huaiin/fumadocs-local-md',
  ],
  // mdx config
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'favicon.im',
      },
      {
        protocol: 'https',
        hostname: 'r2.d8ger.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      ...configuredImagePatterns,
    ],
    // allow remote svg image
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Ensuring outputFileTracingIncludes is a top-level property
  outputFileTracingIncludes: {
    // Ensure MDX files for the llm-content API route are included in the serverless function
    // Adjust the key if your API route path is different in the output structure
    '/api/blog/llm-content': ['./src/mdx/blog/**/*', './.source/**/*'],
    '/api/legal/llm-content': ['./src/mdx/legal/**/*', './.source/**/*'],
    '/blog': ['./.source/**/*'],
    '/blog/[[...slug]]': ['./.source/**/*'],
    '/[locale]/blog': ['./.source/**/*'],
    '/[locale]/blog/[[...slug]]': ['./.source/**/*'],
    '/legal': ['./.source/**/*'],
    '/legal/[[...slug]]': ['./.source/**/*'],
    '/[locale]/legal': ['./.source/**/*'],
    '/[locale]/legal/[[...slug]]': ['./.source/**/*'],
  },

  outputFileTracingExcludes: {
    '*': [
      './tsconfig.tsbuildinfo',
      './tsconfig.json',
      './tsconfig.node.json',
      './dev-scripts.config.json',
      './components.json',
      './eslint.config.js',
      './postcss.config.mjs',
      './next.config.ts',
      './CHANGELOG.md',
      './LICENSE',
      './logs/**/*',
      './github/**/*',
      './changeset/**/*',
      './database/**/*',
      './docs/**/*',
      './node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client/runtime/query_compiler_bg.cockroachdb.*',
      './node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client/runtime/query_compiler_bg.mysql.*',
      './node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client/runtime/query_compiler_bg.sqlite.*',
      './node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client/runtime/query_compiler_bg.sqlserver.*',
      './node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client/runtime/query_compiler_bg.postgresql.js',
      './node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client/runtime/query_compiler_bg.postgresql.wasm-base64.js',
    ],
  }
};

export default withNextIntl(nextConfig);

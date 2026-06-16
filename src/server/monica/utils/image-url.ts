type ImageLocation = {
  sourceImageUrl?: string | null;
  cdnImagePrefix?: string | null;
  storageKey?: string | null;
};

function cleanSegment(value: string, trimLeft = true, trimRight = true) {
  let next = value;
  if (trimLeft) next = next.replace(/^\/+/, '');
  if (trimRight) next = next.replace(/\/+$/, '');
  return next;
}

export function buildStoredImageUrl(input: ImageLocation) {
  if (input.sourceImageUrl) {
    return input.sourceImageUrl;
  }
  if (!input.storageKey) {
    return null;
  }

  const explicitBase = process.env.IMAGE_CDN_BASE_URL ?? process.env.NEXT_PUBLIC_IMAGE_CDN_BASE_URL;
  if (explicitBase) {
    const prefix = input.cdnImagePrefix ? `${cleanSegment(input.cdnImagePrefix)}/` : '';
    return `${cleanSegment(explicitBase, false)}/${prefix}${cleanSegment(input.storageKey)}`;
  }

  const r2BaseUrl = process.env.R2_BASE_URL ?? process.env.NEXT_PUBLIC_R2_BASE_URL;
  const bucketName = process.env.R2_BUCKET_NAME ?? process.env.NEXT_PUBLIC_R2_BUCKET_NAME;
  if (!r2BaseUrl || !bucketName) {
    return null;
  }

  const prefix = input.cdnImagePrefix ? `${cleanSegment(input.cdnImagePrefix)}/` : '';
  const key = `${prefix}${cleanSegment(input.storageKey)}`;
  return `${cleanSegment(r2BaseUrl, false)}/api/buckets/${encodeURIComponent(bucketName)}/${key
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')}`;
}

export const DEFAULT_PAGES_BASE_PATH = '/landing-zone-next-gen/';

export function normalizeBasePath(value: string = DEFAULT_PAGES_BASE_PATH): string {
  const trimmed = String(value || '/').trim();
  if (trimmed === '/' || trimmed === '') return '/';

  return `/${trimmed.replace(/^\/+|\/+$/g, '')}/`;
}

export function getRouterBasename(basePath: string = '/'): string | undefined {
  const normalized = normalizeBasePath(basePath);
  return normalized === '/' ? undefined : normalized.replace(/\/$/, '');
}

const LOCAL_DEV_URL = "http://localhost:3000";

function normalizeUrl(value?: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function getSiteUrl(): URL {
  const resolved =
    normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeUrl(process.env.SITE_URL) ||
    normalizeUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normalizeUrl(process.env.VERCEL_URL) ||
    LOCAL_DEV_URL;

  return new URL(resolved);
}

export function getSiteOrigin(): string {
  return getSiteUrl().toString().replace(/\/$/, "");
}

export function buildSiteUrl(path = "/"): string {
  return new URL(path, getSiteUrl()).toString();
}

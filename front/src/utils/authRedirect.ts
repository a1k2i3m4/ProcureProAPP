function isLocalHostname(hostname: string): boolean {
  const value = String(hostname || '').toLowerCase();
  return value === 'localhost' || value === '127.0.0.1' || value === '::1';
}

function safeCurrentOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin || '';
}

function normalizeUrl(rawUrl: string | undefined, fallback: string): string {
  const value = String(rawUrl || '').trim();
  if (!value) return fallback;

  // Keep relative paths as-is.
  if (value.startsWith('/')) return value;

  try {
    const target = new URL(value);
    const origin = safeCurrentOrigin();
    if (!origin) return value;

    const current = new URL(origin);
    const currentIsLocal = isLocalHostname(current.hostname);
    const targetIsLocal = isLocalHostname(target.hostname);

    // If the app is opened in a different environment than the configured auth URL,
    // prefer the current origin so local builds stay local and prod stays prod.
    if (currentIsLocal !== targetIsLocal) {
      return origin;
    }

    return value;
  } catch {
    return fallback;
  }
}

export function resolveAuthLoginUrl(): string {
  const fallback = safeCurrentOrigin() || '/';
  return normalizeUrl((import.meta as any).env?.VITE_AUTH_LOGIN_URL, fallback);
}

export function resolveAuthServiceUrl(): string {
  const fallback = safeCurrentOrigin();
  return normalizeUrl((import.meta as any).env?.VITE_AUTH_SERVICE_URL, fallback).replace(/\/+$/, '');
}


import { Language } from '../types';

export type LandingExperienceType = 'day-trips' | 'overnight-stays' | 'sailing';

export interface LandingRouteInfo {
  type: LandingExperienceType | null;
  lang: Language | null;
}

/**
 * Normalizes any URL or pathname for robust routing comparison.
 * - Handles protocols/origins (https://gunayalapanama.com/...)
 * - Strips query parameters (?lang=es, ?ref=...)
 * - Strips hash anchors (#itinerary)
 * - Strips .html and /index.html extensions
 * - Strips trailing slashes
 * - Converts to lowercase for case-insensitivity
 */
export function normalizePath(rawPath: string): string {
  if (!rawPath) return '/';
  let p = rawPath;
  try {
    if (p.startsWith('http://') || p.startsWith('https://')) {
      p = new URL(p).pathname;
    }
  } catch {
    // ignore parse error if relative string
  }
  p = p.split('?')[0].split('#')[0].trim().toLowerCase();
  if (p.endsWith('/index.html')) {
    p = p.slice(0, -'/index.html'.length);
  } else if (p.endsWith('.html')) {
    p = p.slice(0, -'.html'.length);
  }
  p = p.replace(/\/+$/, '');
  return p || '/';
}

/**
 * Maps a normalized URL path to its corresponding landing experience and language.
 * Covers all 6 bilingual SEO landing page routes:
 * 1. /san-blas-day-trips (EN)
 * 2. /es/san-blas-day-trips (ES)
 * 3. /san-blas-overnight-stays (EN)
 * 4. /es/san-blas-overnight-stays (ES)
 * 5. /san-blas-sailing (EN)
 * 6. /es/san-blas-sailing (ES)
 */
export function getLandingRouteInfo(pathname: string): LandingRouteInfo {
  const norm = normalizePath(pathname);
  if (norm === '/san-blas-day-trips') return { type: 'day-trips', lang: 'en' };
  if (norm === '/es/san-blas-day-trips') return { type: 'day-trips', lang: 'es' };
  if (norm === '/san-blas-overnight-stays') return { type: 'overnight-stays', lang: 'en' };
  if (norm === '/es/san-blas-overnight-stays') return { type: 'overnight-stays', lang: 'es' };
  if (norm === '/san-blas-sailing') return { type: 'sailing', lang: 'en' };
  if (norm === '/es/san-blas-sailing') return { type: 'sailing', lang: 'es' };
  return { type: null, lang: null };
}

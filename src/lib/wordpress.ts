const BASE = import.meta.env.WC_URL || 'https://pastapanarese.it';
const WP_USER = import.meta.env.WP_USER || '';
const WP_APP_PASSWORD = import.meta.env.WP_APP_PASSWORD || '';

function authHeaders(): Record<string, string> {
  if (WP_USER && WP_APP_PASSWORD) {
    return { Authorization: 'Basic ' + btoa(`${WP_USER}:${WP_APP_PASSWORD}`) };
  }
  return {};
}

export interface WPPage {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  featured_media: number;
  link: string;
}

export interface WPMedia {
  id: number;
  source_url: string;
  alt_text: string;
  media_details: {
    width: number;
    height: number;
    sizes: Record<string, { source_url: string; width: number; height: number }>;
  };
}

async function wp<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${BASE}/wp-json/wp/v2/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) throw new Error(`WP API error ${res.status}: ${endpoint}`);
  return res.json();
}

export async function getPages(params: Record<string, string | number> = {}): Promise<WPPage[]> {
  return wp<WPPage[]>('pages', { per_page: 50, status: 'publish', ...params });
}

export async function getPageBySlug(slug: string): Promise<WPPage | null> {
  const pages = await wp<WPPage[]>('pages', { slug });
  return pages[0] ?? null;
}

export async function getMedia(id: number): Promise<WPMedia | null> {
  if (!id) return null;
  try {
    return await wp<WPMedia>(`media/${id}`);
  } catch {
    return null;
  }
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;/g, '-')
    .trim();
}

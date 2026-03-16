const BASE = import.meta.env.WC_URL;
const KEY = import.meta.env.WC_KEY;
const SECRET = import.meta.env.WC_SECRET;

function auth() {
  return 'Basic ' + btoa(`${KEY}:${SECRET}`);
}

async function wc<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${BASE}/wp-json/wc/v3/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: auth() },
  });
  if (!res.ok) throw new Error(`WC API error ${res.status}: ${endpoint}`);
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WCImage {
  id: number;
  src: string;
  alt: string;
}

export interface WCCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  image: WCImage | null;
  description: string;
}

export interface WCAttribute {
  id: number;
  name: string;
  options: string[];
}

export interface WCProduct {
  id: number;
  name: string;
  slug: string;
  status: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  images: WCImage[];
  categories: { id: number; name: string; slug: string }[];
  attributes: WCAttribute[];
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  weight: string;
  dimensions: { length: string; width: string; height: string };
  meta_data: { key: string; value: string }[];
}

// ── API helpers ───────────────────────────────────────────────────────────────

export async function getProducts(params: Record<string, string | number> = {}): Promise<WCProduct[]> {
  return wc<WCProduct[]>('products', { per_page: 100, status: 'publish', ...params });
}

export async function getProduct(slug: string): Promise<WCProduct | null> {
  const products = await wc<WCProduct[]>('products', { slug, status: 'publish' });
  return products[0] ?? null;
}

export async function getProductById(id: number): Promise<WCProduct> {
  return wc<WCProduct>(`products/${id}`);
}

export async function getCategories(params: Record<string, string | number> = {}): Promise<WCCategory[]> {
  return wc<WCCategory[]>('products/categories', { per_page: 100, ...params });
}

export async function getCategoryBySlug(slug: string): Promise<WCCategory | null> {
  const cats = await wc<WCCategory[]>('products/categories', { slug });
  return cats[0] ?? null;
}

export function formatPrice(price: string | number): string {
  const n = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

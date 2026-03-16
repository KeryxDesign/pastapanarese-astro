export interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string;
  slug: string;
  quantity: number;
}

const KEY = 'pp_cart';

function load(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}

function save(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('pp-cart', { detail: items }));
}

export function getItems(): CartItem[] { return load(); }

export function addToCart(item: Omit<CartItem, 'quantity'>, qty = 1) {
  const items = load();
  const i = items.findIndex(x => x.id === item.id);
  if (i >= 0) items[i].quantity += qty;
  else items.push({ ...item, quantity: qty });
  save(items);
}

export function removeFromCart(id: number) {
  save(load().filter(i => i.id !== id));
}

export function updateQuantity(id: number, quantity: number) {
  if (quantity <= 0) { removeFromCart(id); return; }
  save(load().map(i => i.id === id ? { ...i, quantity } : i));
}

export function clearCart() { save([]); }

export function onCartChange(fn: (items: CartItem[]) => void) {
  const handler = (e: Event) => fn((e as CustomEvent<CartItem[]>).detail);
  window.addEventListener('pp-cart', handler);
  return () => window.removeEventListener('pp-cart', handler);
}

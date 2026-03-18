import { useState, useEffect } from 'react';
import { getItems, onCartChange, removeFromCart, updateQuantity } from '../stores/cart';
import type { CartItem } from '../stores/cart';

export default function CartPage({ base = '' }: { base?: string }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(getItems());
    return onCartChange(setItems);
  }, []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const fmt = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-2xl font-heading mb-4">Il carrello è vuoto</p>
        <a href={`${base}/prodotti`} className="inline-block bg-amber text-brown px-6 py-3 rounded-xl hover:bg-brown-dark transition-colors">
          Vai ai prodotti
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 bg-white rounded-card p-4 shadow-sm">
            <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-lg" />
            <div className="flex-1">
              <a href={`${base}/prodotti/${item.slug}`} className="font-semibold hover:text-amber transition-colors">
                {item.name}
              </a>
              <p className="text-amber font-bold mt-1">{fmt(item.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100 transition-colors">−</button>
              <span className="w-6 text-center font-semibold">{item.quantity}</span>
              <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100 transition-colors">+</button>
            </div>
            <button onClick={() => removeFromCart(item.id)}
              className="text-gray-400 hover:text-red-500 transition-colors ml-2" aria-label="Rimuovi">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-card p-6 shadow-sm">
        <div className="flex justify-between items-center text-xl font-bold mb-6">
          <span>Totale</span>
          <span className="text-amber">{fmt(total)}</span>
        </div>
        <a
          href={`${base}/checkout`}
          className="block w-full text-center bg-amber text-brown py-4 rounded-xl font-bold text-lg hover:bg-amber-dark transition-colors">
          Procedi al checkout
        </a>
        <a href={`${base}/prodotti`} className="block text-center text-sm text-gray-500 mt-3 hover:text-amber transition-colors">
          ← Continua lo shopping
        </a>
      </div>
    </div>
  );
}

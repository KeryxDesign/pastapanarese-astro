import { useState } from 'react';
import { addToCart } from '../stores/cart';

interface Props {
  id: number;
  name: string;
  price: string;
  image: string;
  slug: string;
}

export default function AddToCart({ id, name, price, image, slug }: Props) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addToCart({ id, name, price: parseFloat(price), image, slug }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setQty(Math.max(1, qty - 1))}
          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors text-lg font-bold"
        >−</button>
        <span className="w-8 text-center font-semibold text-lg">{qty}</span>
        <button
          onClick={() => setQty(qty + 1)}
          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors text-lg font-bold"
        >+</button>
      </div>
      <button
        onClick={handleAdd}
        className={`w-full py-3 px-6 rounded-xl font-semibold text-brown transition-all duration-200 ${
          added
            ? 'bg-green-600'
            : 'bg-amber hover:bg-brown-dark active:scale-95'
        }`}
      >
        {added ? '✓ Aggiunto al carrello' : 'Aggiungi al carrello'}
      </button>
    </div>
  );
}

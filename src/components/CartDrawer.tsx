import { useState, useEffect } from 'react';
import { getItems, onCartChange, removeFromCart, updateQuantity, clearCart } from '../stores/cart';
import type { CartItem } from '../stores/cart';

const PROVINCES = [
  'AG','AL','AN','AO','AP','AQ','AR','AT','AV','BA','BG','BI','BL','BN','BO',
  'BR','BS','BT','BZ','CA','CB','CE','CH','CL','CN','CO','CR','CS','CT','CZ',
  'EN','FC','FE','FG','FI','FM','FR','GE','GO','GR','IM','IS','KR','LC','LE',
  'LI','LO','LT','LU','MB','MC','ME','MI','MN','MO','MS','MT','NA','NO','NU',
  'OG','OR','OT','PA','PC','PD','PE','PG','PI','PN','PO','PR','PT','PU','PV',
  'PZ','RA','RC','RE','RG','RI','RM','RN','RO','SA','SI','SO','SP','SR','SS',
  'SU','SV','TA','TE','TN','TO','TP','TR','TS','TV','UD','VA','VB','VC','VE',
  'VI','VR','VT','VV'
];

interface BillingData {
  first_name: string; last_name: string; email: string; phone: string;
  address_1: string; city: string; postcode: string; state: string;
  company: string; codice_fiscale: string; piva: string;
}

const WC_URL = 'https://www.pastapanarese.it';
const WC_KEY = 'ck_aa88b6215b311a08b1e017d1d7f1a26d0efa0fff';
const WC_SECRET = 'cs_10e6fd6be90ca5464a241ad9377b52135c3d1651';

export default function CartDrawer({ base = '' }: { base?: string }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'cart' | 'checkout' | 'processing' | 'error'>('cart');
  const [errorMsg, setErrorMsg] = useState('');
  const [customerType, setCustomerType] = useState<'private' | 'business'>('private');
  const [shipToDifferent, setShipToDifferent] = useState(false);
  const [notes, setNotes] = useState('');

  const [billing, setBilling] = useState<BillingData>({
    first_name: '', last_name: '', email: '', phone: '',
    address_1: '', city: '', postcode: '', state: '',
    company: '', codice_fiscale: '', piva: ''
  });
  const [shipping, setShipping] = useState({
    first_name: '', last_name: '', address_1: '', city: '',
    postcode: '', state: ''
  });

  useEffect(() => {
    setItems(getItems());
    const unsub = onCartChange(setItems);
    const handleOpen = () => setOpen(true);
    window.addEventListener('pp-cart-open', handleOpen);
    return () => { unsub(); window.removeEventListener('pp-cart-open', handleOpen); };
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const freeThreshold = 49;
  const shippingCost = subtotal >= freeThreshold ? 0 : 7.90;
  const total = subtotal + shippingCost;

  const updateBilling = (f: keyof BillingData, v: string) => setBilling(p => ({ ...p, [f]: v }));
  const updateShipping = (f: string, v: string) => setShipping(p => ({ ...p, [f]: v }));

  const close = () => { setOpen(false); setTimeout(() => { if (view !== 'processing') setView('cart'); }, 300); };

  const validate = (): string | null => {
    if (!billing.first_name.trim()) return 'Inserisci il nome';
    if (!billing.last_name.trim()) return 'Inserisci il cognome';
    if (!billing.email.trim() || !billing.email.includes('@')) return "Inserisci un'email valida";
    if (!billing.phone.trim()) return 'Inserisci il telefono';
    if (customerType === 'business') {
      if (!billing.company.trim()) return 'Inserisci la ragione sociale';
      if (!billing.piva.trim()) return 'Inserisci la Partita IVA';
    }
    if (!billing.address_1.trim()) return "Inserisci l'indirizzo";
    if (!billing.city.trim()) return 'Inserisci la città';
    if (!billing.postcode.trim() || billing.postcode.length !== 5) return 'CAP non valido (5 cifre)';
    if (!billing.state) return 'Seleziona la provincia';
    if (shipToDifferent) {
      if (!shipping.first_name.trim() || !shipping.last_name.trim()) return 'Nome/cognome spedizione mancante';
      if (!shipping.address_1.trim()) return 'Indirizzo spedizione mancante';
      if (!shipping.city.trim() || !shipping.postcode.trim() || !shipping.state) return 'Dati spedizione incompleti';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setErrorMsg(err); return; }
    setErrorMsg('');
    setView('processing');

    const shippingData = shipToDifferent
      ? { ...shipping, country: 'IT' }
      : { first_name: billing.first_name, last_name: billing.last_name, address_1: billing.address_1, city: billing.city, postcode: billing.postcode, state: billing.state, country: 'IT' };

    const billingMeta: { key: string; value: string }[] = [];
    if (billing.codice_fiscale) billingMeta.push({ key: 'billing_codice_fiscale', value: billing.codice_fiscale });
    if (billing.piva) billingMeta.push({ key: 'billing_piva', value: billing.piva });

    const orderData = {
      payment_method: '',
      payment_method_title: '',
      set_paid: false,
      billing: {
        first_name: billing.first_name,
        last_name: billing.last_name,
        email: billing.email,
        phone: billing.phone,
        address_1: billing.address_1,
        city: billing.city,
        postcode: billing.postcode,
        state: billing.state,
        country: 'IT',
        company: billing.company,
      },
      shipping: shippingData,
      line_items: items.map(i => ({ product_id: i.id, quantity: i.quantity })),
      customer_note: notes,
      meta_data: billingMeta,
    };

    try {
      const res = await fetch(`${WC_URL}/wp-json/wc/v3/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(`${WC_KEY}:${WC_SECRET}`),
        },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Errore ${res.status}`);
      }

      const order = await res.json();

      // Redirect to WooCommerce payment page
      clearCart();
      window.location.href = order.payment_url || `${WC_URL}/checkout/order-pay/${order.id}/?pay_for_order=true&key=${order.order_key}`;

    } catch (err: any) {
      setErrorMsg(err.message || 'Errore nella creazione dell\'ordine. Riprova.');
      setView('checkout');
    }
  };

  const ic = "w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber/50 focus:border-amber transition-colors text-earth text-sm";
  const lc = "block text-xs font-medium text-brown mb-1";

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={close} />}

      <div className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl transform transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
            <h2 className="font-heading text-lg font-bold text-earth">
              {view === 'cart' ? <>Carrello {count > 0 && <span className="text-amber">({count})</span>}</> : view === 'checkout' ? 'Checkout' : 'Elaborazione...'}
            </h2>
            <div className="flex items-center gap-2">
              {view === 'checkout' && (
                <button onClick={() => setView('cart')} className="text-sm text-amber hover:underline">
                  ← Carrello
                </button>
              )}
              <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100" aria-label="Chiudi">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">

            {/* === CART VIEW === */}
            {view === 'cart' && (
              <div className="p-4">
                {items.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400 text-lg mb-4">Il carrello è vuoto</p>
                    <button onClick={close} className="text-amber hover:underline font-semibold">Continua lo shopping</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                        <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-earth truncate">{item.name}</p>
                          <p className="text-amber font-bold text-sm mt-0.5">{fmt(item.price)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 rounded-full border text-xs flex items-center justify-center hover:bg-gray-200">−</button>
                            <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 rounded-full border text-xs flex items-center justify-center hover:bg-gray-200">+</button>
                          </div>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 flex-shrink-0" aria-label="Rimuovi">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* === CHECKOUT VIEW === */}
            {view === 'checkout' && (
              <form onSubmit={handleSubmit} id="checkout-form" className="p-4 space-y-5">
                {/* Order summary mini */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-earth truncate">{item.name} × {item.quantity}</span>
                      <span className="font-semibold text-brown ml-2">{fmt(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between text-sm">
                    <span className="text-muted">Spedizione</span>
                    <span className={shippingCost === 0 ? 'text-green-600 font-medium' : ''}>
                      {shippingCost === 0 ? 'Gratuita' : fmt(shippingCost)}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Totale</span>
                    <span className="text-amber text-lg">{fmt(total)}</span>
                  </div>
                </div>

                {/* Customer type toggle */}
                <div>
                  <p className="text-sm font-medium text-brown mb-2">Acquisto come:</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomerType('private')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold border-2 transition-colors ${
                        customerType === 'private'
                          ? 'border-amber bg-amber/10 text-brown'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      Privato
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerType('business')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold border-2 transition-colors ${
                        customerType === 'business'
                          ? 'border-amber bg-amber/10 text-brown'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      Azienda / P.IVA
                    </button>
                  </div>
                </div>

                {/* Billing */}
                <div>
                  <h3 className="font-heading font-bold text-brown mb-3">Dati di fatturazione</h3>

                  {customerType === 'business' && (
                    <>
                      <div className="mb-3"><label className={lc}>Ragione Sociale *</label><input type="text" value={billing.company} onChange={e => updateBilling('company', e.target.value)} className={ic} placeholder="Es. Ristorante Da Mario Srl" required /></div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div><label className={lc}>Partita IVA *</label><input type="text" value={billing.piva} onChange={e => updateBilling('piva', e.target.value)} className={ic} placeholder="IT01234567890" required /></div>
                        <div><label className={lc}>Codice Fiscale</label><input type="text" value={billing.codice_fiscale} onChange={e => updateBilling('codice_fiscale', e.target.value)} className={ic} placeholder="Opzionale" /></div>
                      </div>
                    </>
                  )}

                  {customerType === 'private' && (
                    <div className="mb-3"><label className={lc}>Codice Fiscale</label><input type="text" value={billing.codice_fiscale} onChange={e => updateBilling('codice_fiscale', e.target.value)} className={ic} placeholder="Opzionale" /></div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lc}>Nome *</label><input type="text" value={billing.first_name} onChange={e => updateBilling('first_name', e.target.value)} className={ic} required /></div>
                    <div><label className={lc}>Cognome *</label><input type="text" value={billing.last_name} onChange={e => updateBilling('last_name', e.target.value)} className={ic} required /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div><label className={lc}>Email *</label><input type="email" value={billing.email} onChange={e => updateBilling('email', e.target.value)} className={ic} required /></div>
                    <div><label className={lc}>Telefono *</label><input type="tel" value={billing.phone} onChange={e => updateBilling('phone', e.target.value)} className={ic} required /></div>
                  </div>
                  <div className="mt-3"><label className={lc}>Indirizzo *</label><input type="text" value={billing.address_1} onChange={e => updateBilling('address_1', e.target.value)} className={ic} placeholder="Via Roma 1" required /></div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div><label className={lc}>Città *</label><input type="text" value={billing.city} onChange={e => updateBilling('city', e.target.value)} className={ic} required /></div>
                    <div><label className={lc}>CAP *</label><input type="text" value={billing.postcode} onChange={e => updateBilling('postcode', e.target.value.replace(/\D/g, '').slice(0, 5))} className={ic} maxLength={5} required /></div>
                    <div><label className={lc}>Prov. *</label>
                      <select value={billing.state} onChange={e => updateBilling('state', e.target.value)} className={ic} required>
                        <option value="">--</option>
                        {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Shipping */}
                <div>
                  <h3 className="font-heading font-bold text-brown mb-3">Spedizione</h3>
                  {subtotal < freeThreshold && (
                    <p className="text-xs text-muted mb-3">Ti mancano {fmt(freeThreshold - subtotal)} per la spedizione gratuita</p>
                  )}
                  {subtotal >= freeThreshold && (
                    <p className="text-xs text-green-600 font-medium mb-3">✓ Spedizione gratuita!</p>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={shipToDifferent} onChange={e => setShipToDifferent(e.target.checked)} className="rounded border-gray-300 text-amber focus:ring-amber" />
                    Spedisci a un indirizzo diverso
                  </label>
                  {shipToDifferent && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={lc}>Nome *</label><input type="text" value={shipping.first_name} onChange={e => updateShipping('first_name', e.target.value)} className={ic} required /></div>
                        <div><label className={lc}>Cognome *</label><input type="text" value={shipping.last_name} onChange={e => updateShipping('last_name', e.target.value)} className={ic} required /></div>
                      </div>
                      <div><label className={lc}>Indirizzo *</label><input type="text" value={shipping.address_1} onChange={e => updateShipping('address_1', e.target.value)} className={ic} required /></div>
                      <div className="grid grid-cols-3 gap-3">
                        <div><label className={lc}>Città *</label><input type="text" value={shipping.city} onChange={e => updateShipping('city', e.target.value)} className={ic} required /></div>
                        <div><label className={lc}>CAP *</label><input type="text" value={shipping.postcode} onChange={e => updateShipping('postcode', e.target.value.replace(/\D/g, '').slice(0, 5))} className={ic} maxLength={5} required /></div>
                        <div><label className={lc}>Prov. *</label>
                          <select value={shipping.state} onChange={e => updateShipping('state', e.target.value)} className={ic} required>
                            <option value="">--</option>
                            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className={lc}>Note sull'ordine</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} className={ic + ' resize-none'} rows={2} placeholder="Eventuali note (opzionale)" />
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{errorMsg}</div>
                )}
              </form>
            )}

            {/* === PROCESSING === */}
            {view === 'processing' && (
              <div className="text-center py-20 px-4">
                <div className="w-12 h-12 border-4 border-amber border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="font-heading text-brown text-lg">Creazione ordine...</p>
                <p className="text-muted text-sm mt-1">Verrai reindirizzato al pagamento sicuro</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && view === 'cart' && (
            <div className="border-t p-4 space-y-3 flex-shrink-0">
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Totale</span>
                <span className="text-amber">{fmt(subtotal)}</span>
              </div>
              <button
                onClick={() => setView('checkout')}
                className="block w-full text-center bg-amber text-brown py-3 rounded-xl font-bold hover:bg-amber/90 transition-colors"
              >
                Procedi all'ordine
              </button>
            </div>
          )}

          {items.length > 0 && view === 'checkout' && (
            <div className="border-t p-4 flex-shrink-0">
              <button
                type="submit"
                form="checkout-form"
                className="w-full bg-amber text-brown py-3 rounded-xl font-bold text-lg hover:bg-amber/90 transition-colors"
              >
                Procedi al pagamento — {fmt(total)}
              </button>
              <div className="flex items-center justify-center gap-2 text-xs text-muted mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Pagamento sicuro su pastapanarese.it
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import { getItems, onCartChange, clearCart } from '../stores/cart';
import type { CartItem } from '../stores/cart';

interface BillingData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_1: string;
  city: string;
  postcode: string;
  state: string;
  country: string;
  company: string;
  codice_fiscale: string;
}

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

export default function CheckoutForm({ base = '' }: { base?: string }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [step, setStep] = useState<'form' | 'processing' | 'error'>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [shipToDifferent, setShipToDifferent] = useState(false);
  const [shippingCost] = useState(7.90);
  const [freeShippingThreshold] = useState(49);
  const [notes, setNotes] = useState('');

  const [billing, setBilling] = useState<BillingData>({
    first_name: '', last_name: '', email: '', phone: '',
    address_1: '', city: '', postcode: '', state: '', country: 'IT',
    company: '', codice_fiscale: ''
  });

  const [shipping, setShipping] = useState({
    first_name: '', last_name: '', address_1: '', city: '',
    postcode: '', state: '', country: 'IT'
  });

  useEffect(() => {
    setItems(getItems());
    return onCartChange(setItems);
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shippingTotal = isFreeShipping ? 0 : shippingCost;
  const total = subtotal + shippingTotal;

  const updateBilling = (field: keyof BillingData, value: string) =>
    setBilling(prev => ({ ...prev, [field]: value }));

  const updateShipping = (field: string, value: string) =>
    setShipping(prev => ({ ...prev, [field]: value }));

  const validate = (): string | null => {
    if (!billing.first_name.trim()) return 'Inserisci il nome';
    if (!billing.last_name.trim()) return 'Inserisci il cognome';
    if (!billing.email.trim() || !billing.email.includes('@')) return "Inserisci un'email valida";
    if (!billing.phone.trim()) return 'Inserisci il telefono';
    if (!billing.address_1.trim()) return "Inserisci l'indirizzo";
    if (!billing.city.trim()) return 'Inserisci la citta';
    if (!billing.postcode.trim() || billing.postcode.length !== 5) return 'Inserisci un CAP valido (5 cifre)';
    if (!billing.state) return 'Seleziona la provincia';
    if (shipToDifferent) {
      if (!shipping.first_name.trim()) return 'Inserisci il nome per la spedizione';
      if (!shipping.last_name.trim()) return 'Inserisci il cognome per la spedizione';
      if (!shipping.address_1.trim()) return "Inserisci l'indirizzo di spedizione";
      if (!shipping.city.trim()) return 'Inserisci la citta di spedizione';
      if (!shipping.postcode.trim()) return 'Inserisci il CAP di spedizione';
      if (!shipping.state) return 'Seleziona la provincia di spedizione';
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setErrorMsg(err); return; }
    setErrorMsg('');
    setStep('processing');

    const orderData = {
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
      shipping: shipToDifferent ? {
        first_name: shipping.first_name,
        last_name: shipping.last_name,
        address_1: shipping.address_1,
        city: shipping.city,
        postcode: shipping.postcode,
        state: shipping.state,
        country: 'IT',
      } : {
        first_name: billing.first_name,
        last_name: billing.last_name,
        address_1: billing.address_1,
        city: billing.city,
        postcode: billing.postcode,
        state: billing.state,
        country: 'IT',
      },
      line_items: items.map(i => ({
        product_id: i.id,
        quantity: i.quantity,
      })),
      customer_note: notes,
    };

    // Encode UTF-8 safe and redirect to WooCommerce checkout bridge
    const json = JSON.stringify(orderData);
    const payload = btoa(unescape(encodeURIComponent(json)));
    window.location.href = 'https://pastapanarese.it/?pp_checkout=' + payload;
  };

  // Empty cart
  if (items.length === 0 && step === 'form') {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 bg-amber/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
        </div>
        <p className="text-2xl font-heading text-brown mb-2">Il carrello e vuoto</p>
        <p className="text-muted mb-6">Aggiungi qualche prodotto prima di procedere</p>
        <a href={base + '/prodotti'} className="inline-block bg-amber text-brown font-semibold px-8 py-3 rounded-lg hover:bg-amber-dark transition-colors">
          Vai ai prodotti
        </a>
      </div>
    );
  }

  // Processing
  if (step === 'processing') {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 border-4 border-amber border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <p className="text-xl font-heading text-brown">Stiamo preparando il tuo ordine...</p>
        <p className="text-muted mt-2">Verrai reindirizzato al pagamento sicuro</p>
      </div>
    );
  }

  const ic = "w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber/50 focus:border-amber transition-colors text-earth";
  const lc = "block text-sm font-medium text-brown mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-5 gap-8">

        {/* Left: Form */}
        <div className="lg:col-span-3 space-y-8">

          {/* Billing */}
          <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-heading font-bold text-brown mb-6 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber text-brown rounded-full flex items-center justify-center text-sm font-bold">1</span>
              Dati di fatturazione
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={lc}>Nome *</label>
                <input type="text" value={billing.first_name}
                  onChange={e => updateBilling('first_name', e.target.value)}
                  className={ic} placeholder="Mario" required />
              </div>
              <div>
                <label className={lc}>Cognome *</label>
                <input type="text" value={billing.last_name}
                  onChange={e => updateBilling('last_name', e.target.value)}
                  className={ic} placeholder="Rossi" required />
              </div>
            </div>

            <div className="mt-4">
              <label className={lc}>Azienda (opzionale)</label>
              <input type="text" value={billing.company}
                onChange={e => updateBilling('company', e.target.value)}
                className={ic} placeholder="Ragione sociale" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className={lc}>Email *</label>
                <input type="email" value={billing.email}
                  onChange={e => updateBilling('email', e.target.value)}
                  className={ic} placeholder="mario@email.it" required />
              </div>
              <div>
                <label className={lc}>Telefono *</label>
                <input type="tel" value={billing.phone}
                  onChange={e => updateBilling('phone', e.target.value)}
                  className={ic} placeholder="+39 333 1234567" required />
              </div>
            </div>

            <div className="mt-4">
              <label className={lc}>Codice Fiscale / P.IVA (opzionale)</label>
              <input type="text" value={billing.codice_fiscale}
                onChange={e => updateBilling('codice_fiscale', e.target.value)}
                className={ic} placeholder="RSSMRA80A01H501U" />
            </div>

            <div className="mt-4">
              <label className={lc}>Indirizzo *</label>
              <input type="text" value={billing.address_1}
                onChange={e => updateBilling('address_1', e.target.value)}
                className={ic} placeholder="Via Roma 1" required />
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mt-4">
              <div>
                <label className={lc}>Citta *</label>
                <input type="text" value={billing.city}
                  onChange={e => updateBilling('city', e.target.value)}
                  className={ic} placeholder="Roma" required />
              </div>
              <div>
                <label className={lc}>CAP *</label>
                <input type="text" value={billing.postcode}
                  onChange={e => updateBilling('postcode', e.target.value.replace(/\D/g, '').slice(0, 5))}
                  className={ic} placeholder="00100" maxLength={5} required />
              </div>
              <div>
                <label className={lc}>Provincia *</label>
                <select value={billing.state}
                  onChange={e => updateBilling('state', e.target.value)}
                  className={ic} required>
                  <option value="">Seleziona</option>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-heading font-bold text-brown mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber text-brown rounded-full flex items-center justify-center text-sm font-bold">2</span>
              Spedizione
            </h2>

            <div className={`rounded-lg p-4 mb-4 ${isFreeShipping ? 'bg-green-50 border border-green-200' : 'bg-amber/5 border border-amber/20'}`}>
              {isFreeShipping ? (
                <p className="text-green-700 font-medium flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Spedizione gratuita!
                </p>
              ) : (
                <p className="text-brown-light text-sm">
                  Spedizione: <strong>{fmt(shippingCost)}</strong> — Gratuita sopra i {fmt(freeShippingThreshold)}
                  <span className="block mt-1 text-muted">
                    Ti mancano {fmt(freeShippingThreshold - subtotal)} per la spedizione gratuita
                  </span>
                </p>
              )}
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" checked={shipToDifferent}
                onChange={e => setShipToDifferent(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-amber focus:ring-amber" />
              <span className="text-sm text-earth group-hover:text-brown transition-colors">
                Spedisci a un indirizzo diverso
              </span>
            </label>

            {shipToDifferent && (
              <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={lc}>Nome *</label>
                    <input type="text" value={shipping.first_name}
                      onChange={e => updateShipping('first_name', e.target.value)}
                      className={ic} required />
                  </div>
                  <div>
                    <label className={lc}>Cognome *</label>
                    <input type="text" value={shipping.last_name}
                      onChange={e => updateShipping('last_name', e.target.value)}
                      className={ic} required />
                  </div>
                </div>
                <div>
                  <label className={lc}>Indirizzo *</label>
                  <input type="text" value={shipping.address_1}
                    onChange={e => updateShipping('address_1', e.target.value)}
                    className={ic} required />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className={lc}>Citta *</label>
                    <input type="text" value={shipping.city}
                      onChange={e => updateShipping('city', e.target.value)}
                      className={ic} required />
                  </div>
                  <div>
                    <label className={lc}>CAP *</label>
                    <input type="text" value={shipping.postcode}
                      onChange={e => updateShipping('postcode', e.target.value.replace(/\D/g, '').slice(0, 5))}
                      className={ic} maxLength={5} required />
                  </div>
                  <div>
                    <label className={lc}>Provincia *</label>
                    <select value={shipping.state}
                      onChange={e => updateShipping('state', e.target.value)}
                      className={ic} required>
                      <option value="">Seleziona</option>
                      {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-heading font-bold text-brown mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber text-brown rounded-full flex items-center justify-center text-sm font-bold">3</span>
              Note sull'ordine
            </h2>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              className={ic + ' resize-none'} rows={3}
              placeholder="Eventuali note per la spedizione o l'ordine (opzionale)" />
          </div>
        </div>

        {/* Right: Summary */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 lg:sticky lg:top-8">
            <h2 className="text-xl font-heading font-bold text-brown mb-6">Riepilogo ordine</h2>

            <div className="space-y-4 mb-6">
              {items.map(item => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-cream flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-brown text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-earth truncate">{item.name}</p>
                    <p className="text-xs text-muted mt-0.5">{fmt(item.price)} cad.</p>
                  </div>
                  <p className="text-sm font-semibold text-brown whitespace-nowrap">
                    {fmt(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotale</span>
                <span className="font-medium">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Spedizione</span>
                <span className={'font-medium ' + (isFreeShipping ? 'text-green-600' : '')}>
                  {isFreeShipping ? 'Gratuita' : fmt(shippingTotal)}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                <span className="text-lg font-heading font-bold text-brown">Totale</span>
                <span className="text-2xl font-bold text-amber">{fmt(total)}</span>
              </div>
            </div>

            {/* Security */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-muted mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Pagamento sicuro con crittografia SSL
              </div>
              <div className="flex items-center gap-2 text-xs text-muted mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Dati protetti e mai condivisi
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                Visa, Mastercard, PayPal, Bonifico
              </div>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {errorMsg}
              </div>
            )}

            <button type="submit"
              className="mt-6 w-full bg-amber hover:bg-amber-dark text-brown font-bold py-4 px-6 rounded-xl text-lg transition-all hover:shadow-lg active:scale-[0.98]">
              Procedi al pagamento
            </button>

            <a href={base + '/carrello'}
              className="block text-center text-sm text-muted mt-4 hover:text-amber transition-colors">
              &larr; Torna al carrello
            </a>
          </div>
        </div>
      </div>
    </form>
  );
}

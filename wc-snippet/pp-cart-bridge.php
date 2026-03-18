<?php
/**
 * Pasta Panarese - Cart & Checkout Bridge
 *
 * Gestisce due modalità:
 * 1. pp_fill_cart  = riempie il carrello e va al checkout WC
 * 2. pp_checkout   = crea un ordine completo con dati cliente e va al pagamento
 *
 * INSTALLAZIONE:
 * Copia in wp-content/mu-plugins/pp-cart-bridge.php
 *
 * UTILIZZO:
 * ?pp_fill_cart=BASE64  → JSON array [{id, qty}]
 * ?pp_checkout=BASE64   → JSON {billing, shipping, line_items, customer_note}
 */

add_action('wp_loaded', function () {
    if (!function_exists('WC')) return;

    // ── Modalità 1: Solo riempimento carrello ──────────────────────────────────
    if (isset($_GET['pp_fill_cart'])) {
        $raw = base64_decode(sanitize_text_field($_GET['pp_fill_cart']));
        if (!$raw) return;
        $items = json_decode($raw, true);
        if (!is_array($items)) return;

        WC()->cart->empty_cart();
        foreach ($items as $item) {
            $product_id = absint($item['id'] ?? 0);
            $quantity = absint($item['qty'] ?? 1);
            if ($product_id > 0 && $quantity > 0) {
                WC()->cart->add_to_cart($product_id, $quantity);
            }
        }
        wp_safe_redirect(wc_get_checkout_url());
        exit;
    }

    // ── Modalità 2: Checkout completo da Astro ─────────────────────────────────
    if (isset($_GET['pp_checkout'])) {
        $raw = base64_decode(sanitize_text_field($_GET['pp_checkout']));
        if (!$raw) return;

        // Decodifica UTF-8 (il JS usa encodeURIComponent)
        $raw = rawurldecode($raw);
        $data = json_decode($raw, true);
        if (!is_array($data) || empty($data['line_items'])) return;

        // 1. Riempi il carrello
        WC()->cart->empty_cart();
        foreach ($data['line_items'] as $item) {
            $product_id = absint($item['product_id'] ?? 0);
            $quantity = absint($item['quantity'] ?? 1);
            if ($product_id > 0 && $quantity > 0) {
                WC()->cart->add_to_cart($product_id, $quantity);
            }
        }

        // 2. Salva i dati del cliente nella sessione WC
        $billing_fields = ['first_name', 'last_name', 'email', 'phone',
                           'address_1', 'city', 'postcode', 'state', 'country', 'company'];

        if (!empty($data['billing'])) {
            foreach ($billing_fields as $field) {
                $val = sanitize_text_field($data['billing'][$field] ?? '');
                if ($val) {
                    WC()->customer->{"set_billing_$field"}($val);
                }
            }
        }

        $shipping_fields = ['first_name', 'last_name', 'address_1', 'city',
                            'postcode', 'state', 'country'];

        if (!empty($data['shipping'])) {
            foreach ($shipping_fields as $field) {
                $val = sanitize_text_field($data['shipping'][$field] ?? '');
                if ($val) {
                    WC()->customer->{"set_shipping_$field"}($val);
                }
            }
        }

        // 3. Salva nota cliente
        if (!empty($data['customer_note'])) {
            WC()->session->set('pp_customer_note', sanitize_textarea_field($data['customer_note']));
        }

        // Salva i dati del customer
        WC()->customer->save();

        // 4. Redirect al checkout WC con i campi pre-compilati
        wp_safe_redirect(wc_get_checkout_url());
        exit;
    }
});

// Inserisci la nota del cliente automaticamente nel checkout
add_action('woocommerce_checkout_update_order_meta', function ($order_id) {
    if (!function_exists('WC') || !WC()->session) return;
    $note = WC()->session->get('pp_customer_note');
    if ($note) {
        $order = wc_get_order($order_id);
        if ($order) {
            $order->set_customer_note($note);
            $order->save();
        }
        WC()->session->set('pp_customer_note', null);
    }
});

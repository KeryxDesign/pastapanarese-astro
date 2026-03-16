<?php
/**
 * Pasta Panarese - Cart Bridge
 *
 * Riceve i prodotti dal sito Astro via URL e li aggiunge al carrello WooCommerce,
 * poi redirige al checkout.
 *
 * INSTALLAZIONE:
 * 1. Copia questo file in wp-content/mu-plugins/pp-cart-bridge.php
 * 2. Oppure incolla il codice nel functions.php del tema
 *
 * UTILIZZO:
 * https://pastapanarese.it/?pp_fill_cart=BASE64_ENCODED_JSON
 * dove il JSON è un array di {id: product_id, qty: quantity}
 */

add_action('wp_loaded', function () {
    if (!isset($_GET['pp_fill_cart']) || !function_exists('WC')) {
        return;
    }

    $raw = base64_decode(sanitize_text_field($_GET['pp_fill_cart']));
    if (!$raw) {
        return;
    }

    $items = json_decode($raw, true);
    if (!is_array($items)) {
        return;
    }

    // Svuota il carrello e aggiungi i nuovi prodotti
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
});

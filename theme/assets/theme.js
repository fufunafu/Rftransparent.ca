/* ============================================================
   RF TRANSPARENT — THEME JAVASCRIPT
   Vanilla ES6+, no dependencies
   ============================================================ */

'use strict';

/* ============================================================
   UTILITIES
   ============================================================ */
function formatMoney(cents) {
  const amount = (cents / 100).toFixed(2);
  return '$' + amount.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fetchCart() {
  return fetch('/cart.js').then(r => r.json());
}

/* ============================================================
   HEADER — Transparent on hero, solid on scroll
   ============================================================ */
(function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  if (document.body.classList.contains('template-index')) {
    header.classList.add('is-transparent');

    window.addEventListener('scroll', function () {
      if (window.scrollY > 60) {
        header.classList.remove('is-transparent');
        header.classList.add('is-scrolled');
      } else {
        header.classList.add('is-transparent');
        header.classList.remove('is-scrolled');
      }
    }, { passive: true });
  }
})();

/* ============================================================
   MOBILE MENU
   ============================================================ */
(function initMobileMenu() {
  const btn = document.querySelector('.mobile-menu-btn');
  const nav = document.querySelector('#mobile-nav');
  if (!btn || !nav) return;

  function toggleMenu(forceClose) {
    const isOpen = nav.classList.contains('is-open') || forceClose;
    btn.classList.toggle('is-open', !isOpen);
    nav.classList.toggle('is-open', !isOpen);
    nav.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
    document.body.style.overflow = isOpen ? '' : 'hidden';
    btn.setAttribute('aria-expanded', String(!isOpen));
  }

  btn.addEventListener('click', () => toggleMenu());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) toggleMenu(true);
  });
})();

/* ============================================================
   CART DRAWER
   ============================================================ */
const CartDrawer = {
  drawer: null,
  overlay: null,
  countEls: [],

  init() {
    this.drawer = document.querySelector('#cart-drawer');
    this.overlay = document.querySelector('#cart-overlay');
    if (!this.drawer) return;

    this.countEls = Array.from(document.querySelectorAll('.cart-count'));

    const closeBtn = this.drawer.querySelector('.cart-drawer__close');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    if (this.overlay) this.overlay.addEventListener('click', () => this.close());

    const cartToggles = document.querySelectorAll('[data-cart-toggle]');
    cartToggles.forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); this.open(); }));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.drawer.classList.contains('is-open')) this.close();
    });

    // Set initial count from page load
    fetchCart().then(cart => this.updateCount(cart.item_count)).catch(e => { console.warn('[CartDrawer] initial count fetch failed:', e); });
  },

  open() {
    if (!this.drawer) return;
    this.drawer.classList.add('is-open');
    this.drawer.setAttribute('aria-hidden', 'false');
    if (this.overlay) this.overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    this.refresh();
  },

  close() {
    if (!this.drawer) return;
    this.drawer.classList.remove('is-open');
    this.drawer.setAttribute('aria-hidden', 'true');
    if (this.overlay) this.overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  },

  async refresh() {
    try {
      const cart = await fetchCart();
      this.renderItems(cart);
      this.updateCount(cart.item_count);
    } catch (e) {
      console.error('[CartDrawer] refresh failed:', e);
    }
  },

  renderItems(cart) {
    const itemsEl = this.drawer.querySelector('.cart-drawer__items');
    const footerEl = this.drawer.querySelector('.cart-drawer__footer');
    if (!itemsEl) return;

    if (cart.item_count === 0) {
      itemsEl.innerHTML = `
        <div class="cart-drawer__empty">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.2">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          <p>Your cart is empty</p>
          <a href="/collections/all-products" class="btn btn--primary btn--sm">Browse Products</a>
        </div>`;
      if (footerEl) footerEl.style.display = 'none';
      return;
    }

    if (footerEl) footerEl.style.display = '';

    itemsEl.innerHTML = cart.items.map(item => `
      <div class="cart-item" data-key="${item.key}">
        <img
          src="${item.featured_image ? item.featured_image.url : item.image}"
          alt="${item.title}"
          class="cart-item__image"
          loading="lazy"
          width="80"
          height="80"
        >
        <div>
          <div class="cart-item__title">${item.product_title}</div>
          ${item.variant_title && item.variant_title !== 'Default Title'
            ? `<div class="cart-item__variant">${item.variant_title}</div>`
            : ''}
          <div class="cart-item__qty">
            <button class="cart-item__qty-btn" data-key="${item.key}" data-qty="${item.quantity - 1}" aria-label="Decrease quantity">−</button>
            <span class="cart-item__qty-val">${item.quantity}</span>
            <button class="cart-item__qty-btn" data-key="${item.key}" data-qty="${item.quantity + 1}" aria-label="Increase quantity">+</button>
          </div>
          <button class="cart-item__remove" data-key="${item.key}" data-qty="0">Remove</button>
        </div>
        <div class="cart-item__price">${formatMoney(item.final_line_price)}</div>
      </div>`).join('');

    // Bind buttons
    itemsEl.querySelectorAll('[data-qty]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.key;
        const qty = parseInt(btn.dataset.qty);
        await this.updateItem(key, qty);
      });
    });

    // Update subtotal
    const subtotalEl = this.drawer.querySelector('.cart-drawer__subtotal-price');
    if (subtotalEl) subtotalEl.textContent = formatMoney(cart.total_price);
  },

  async updateItem(key, quantity) {
    try {
      const res = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity })
      });
      const cart = await res.json();
      this.renderItems(cart);
      this.updateCount(cart.item_count);
    } catch (e) {
      console.error('[CartDrawer] updateItem failed:', e);
    }
  },

  updateCount(count) {
    this.countEls.forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }
};

/* ============================================================
   ADD TO CART (AJAX)
   ============================================================ */
async function handleAddToCart(form) {
  const btn = form.querySelector('.product-form__atc');
  if (!btn) return;

  const formData = new FormData(form);
  const variantId = formData.get('id');
  const quantity = parseInt(formData.get('quantity')) || 1;

  if (!variantId) return;

  const originalText = btn.textContent;
  btn.textContent = 'Adding…';
  btn.disabled = true;
  form.classList.add('loading');

  try {
    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.description || 'Could not add to cart');
    }

    btn.textContent = 'Added ✓';
    setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 1600);
    CartDrawer.open();
  } catch (e) {
    btn.textContent = 'Try again';
    setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 2000);
    console.error('[ATC] error:', e.message);
  } finally {
    form.classList.remove('loading');
  }
}

document.querySelectorAll('.product-form').forEach(form => {
  form.addEventListener('submit', (e) => { e.preventDefault(); handleAddToCart(form); });
});

// Quick-add buttons on product cards
document.querySelectorAll('.product-card__quick-add').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const variantId = btn.dataset.variantId;
    if (!variantId) return;

    const originalText = btn.textContent;
    btn.textContent = 'Adding…';

    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: variantId, quantity: 1 })
      });
      if (!res.ok) throw new Error();
      btn.textContent = 'Added ✓';
      setTimeout(() => { btn.textContent = originalText; }, 1500);
      CartDrawer.open();
    } catch (e) {
      console.warn('[QuickAdd] failed:', e);
      btn.textContent = originalText;
    }
  });
});

/* ============================================================
   PRODUCT GALLERY
   ============================================================ */
(function initGallery() {
  const main = document.querySelector('.product-gallery__main');
  const mainImg = main ? main.querySelector('img') : null;
  const thumbs = document.querySelectorAll('.product-gallery__thumb');
  if (!mainImg || !thumbs.length) return;

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', function () {
      const src = this.querySelector('img')?.src;
      const srcset = this.querySelector('img')?.srcset;
      if (!src) return;

      mainImg.src = src;
      if (srcset) mainImg.srcset = srcset;

      thumbs.forEach(t => t.classList.remove('is-active'));
      this.classList.add('is-active');
    });
  });
})();

/* ============================================================
   PRODUCT VARIANT SELECTOR
   ============================================================ */
(function initVariants() {
  const form = document.querySelector('.product-form');
  if (!form || !window.__productVariants) return;

  const variants = window.__productVariants;
  const idInput = form.querySelector('input[name="id"]');
  const priceEl = document.querySelector('.product-info__price');
  const comparePriceEl = document.querySelector('.product-info__price--compare');
  const atcBtn = form.querySelector('.product-form__atc');

  const groups = form.querySelectorAll('.variant-group');

  function getSelectedOptions() {
    const opts = [];
    groups.forEach(group => {
      const selected = group.querySelector('.variant-option.is-selected');
      if (selected) opts.push(selected.dataset.value);
    });
    return opts;
  }

  function findVariant(options) {
    return variants.find(v => v.options.every((opt, i) => opt === options[i]));
  }

  function updateUI(variant) {
    if (!variant) {
      if (atcBtn) { atcBtn.textContent = 'Unavailable'; atcBtn.disabled = true; }
      return;
    }

    if (idInput) idInput.value = variant.id;

    if (priceEl) priceEl.textContent = formatMoney(variant.price);

    if (comparePriceEl) {
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        comparePriceEl.textContent = formatMoney(variant.compare_at_price);
        comparePriceEl.style.display = '';
      } else {
        comparePriceEl.style.display = 'none';
      }
    }

    if (atcBtn) {
      atcBtn.disabled = !variant.available;
      atcBtn.textContent = variant.available ? 'Add to Cart' : 'Sold Out';
    }
  }

  groups.forEach(group => {
    group.querySelectorAll('.variant-option').forEach(option => {
      option.addEventListener('click', function () {
        group.querySelectorAll('.variant-option').forEach(o => o.classList.remove('is-selected'));
        this.classList.add('is-selected');
        const variant = findVariant(getSelectedOptions());
        updateUI(variant);
      });
    });
  });

  // Init with first available variant
  const initVariant = findVariant(getSelectedOptions());
  updateUI(initVariant);
})();

/* ============================================================
   PRODUCT TABS
   ============================================================ */
(function initTabs() {
  const tabs = document.querySelectorAll('.product-tabs__tab');
  const panels = document.querySelectorAll('.product-tabs__panel');
  if (!tabs.length) return;

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', function () {
      tabs.forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      panels.forEach(p => p.classList.remove('is-active'));
      this.classList.add('is-active');
      this.setAttribute('aria-selected', 'true');
      if (panels[i]) panels[i].classList.add('is-active');
    });
  });
})();

/* ============================================================
   QUANTITY SELECTORS (Product Page)
   ============================================================ */
document.querySelectorAll('.qty-selector').forEach(selector => {
  const input = selector.querySelector('.qty-selector__input');
  selector.querySelectorAll('.qty-selector__btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const current = parseInt(input.value) || 1;
      const isIncrease = this.dataset.action === 'increase';
      input.value = Math.max(1, isIncrease ? current + 1 : current - 1);
    });
  });
});

/* ============================================================
   CART PAGE — Quantity update & remove
   ============================================================ */
(function initCartPage() {
  const cartForm = document.querySelector('.cart-page-form');
  if (!cartForm) return;

  cartForm.querySelectorAll('.cart-line__qty-btn').forEach(btn => {
    btn.addEventListener('click', async function () {
      const key = this.closest('[data-key]')?.dataset.key;
      const input = this.closest('.qty-selector')?.querySelector('.qty-selector__input');
      if (!key || !input) return;

      const current = parseInt(input.value) || 1;
      const qty = this.dataset.action === 'increase' ? current + 1 : Math.max(0, current - 1);

      try {
        await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: key, quantity: qty })
        });
        window.location.reload();
      } catch (e) {
        console.error('[Cart] update failed:', e);
      }
    });
  });
})();

/* ============================================================
   SORT SELECT — Collection page
   ============================================================ */
(function initSort() {
  const sortSelect = document.querySelector('.sort-select');
  if (!sortSelect) return;

  sortSelect.addEventListener('change', function () {
    const url = new URL(window.location.href);
    url.searchParams.set('sort_by', this.value);
    window.location.href = url.toString();
  });

  // Set selected option based on URL
  const params = new URLSearchParams(window.location.search);
  const currentSort = params.get('sort_by');
  if (currentSort) sortSelect.value = currentSort;
})();

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
(function initReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length || !window.IntersectionObserver) {
    reveals.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  reveals.forEach(el => observer.observe(el));
})();

/* ============================================================
   INIT
   ============================================================ */
/* ============================================================
   KEYBOARD NAVIGATION — Dropdown menus
   ============================================================ */
(function initDropdownKeyNav() {
  const items = document.querySelectorAll('.site-nav__item');
  items.forEach(item => {
    const trigger = item.querySelector('.site-nav__link');
    const dropdown = item.querySelector('.site-nav__dropdown');
    if (!trigger || !dropdown) return;

    const links = dropdown.querySelectorAll('.site-nav__dropdown-link');
    if (!links.length) return;

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        dropdown.style.opacity = '1';
        dropdown.style.visibility = 'visible';
        dropdown.style.pointerEvents = 'auto';
        links[0].focus();
      }
    });

    links.forEach((link, i) => {
      link.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (i < links.length - 1) links[i + 1].focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (i > 0) links[i - 1].focus();
          else trigger.focus();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          dropdown.style.opacity = '';
          dropdown.style.visibility = '';
          dropdown.style.pointerEvents = '';
          trigger.focus();
        }
      });
    });
  });
})();

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  CartDrawer.init();
});

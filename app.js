// -------------------------------
// Catalog (Sample Data)
// -------------------------------
const CATALOG = [
  { id: 'amox500', name: 'Amoxicillin 500mg (20 caps)', basePrice: 24.99, prescriptionRequired: true },
  { id: 'ator20', name: 'Atorvastatin 20mg (30 tabs)', basePrice: 34.5, prescriptionRequired: true },
  { id: 'met500', name: 'Metformin 500mg (60 tabs)', basePrice: 18.25, prescriptionRequired: true },
  { id: 'omep20', name: 'Omeprazole 20mg (14 caps)', basePrice: 9.95, prescriptionRequired: false }, // OTC example
];

// -------------------------------
// Product Model and Factory
// -------------------------------
class Product {
  constructor({ id, name, basePrice, prescriptionRequired }) {
    this.id = id;
    this.name = name;
    this.basePrice = Number(basePrice);
    this.prescriptionRequired = Boolean(prescriptionRequired);
  }
  getPrice() { return this.basePrice; }
  getName() { return this.name; }
}

class ProductFactory {
  static createProduct(productId) {
    const found = CATALOG.find(p => p.id === productId);
    if (!found) throw new Error(`Unknown product id: ${productId}`);
    return new Product(found);
  }
}

// -------------------------------
// Decorators
// -------------------------------
class ProductDecorator extends Product {
  constructor(wrappee) {
    super(wrappee);
    this.wrappee = wrappee;
  }
  getPrice() { return this.wrappee.getPrice(); }
  getName() { return this.wrappee.getName(); }
}

class DiscountDecorator extends ProductDecorator {
  constructor(wrappee, percent) {
    super(wrappee);
    this.percent = Math.max(0, Math.min(100, Number(percent)));
  }
  getPrice() {
    const p = this.wrappee.getPrice();
    return +(p * (1 - this.percent / 100)).toFixed(2);
  }
  getName() { return `${this.wrappee.getName()} (−${this.percent}% discount)`; }
}

class InsuranceDecorator extends ProductDecorator {
  constructor(wrappee, coveragePercent = 30) {
    super(wrappee);
    this.coveragePercent = Math.max(0, Math.min(100, Number(coveragePercent)));
  }
  getPrice() {
    const p = this.wrappee.getPrice();
    return +(p * (1 - this.coveragePercent / 100)).toFixed(2);
  }
  getName() { return `${this.wrappee.getName()} (insurance applied)`; }
}

// -------------------------------
// Observer Pattern: Cart (Subject) and TotalDisplay (Observer)
// -------------------------------
class CartSubject {
  constructor() {
    this.items = []; // { product: Product, qty: number }
    this.observers = [];
  }
  addObserver(observer) {
    this.observers.push(observer);
  }
  removeObserver(observer) {
    this.observers = this.observers.filter(o => o !== observer);
  }
  notify() {
    this.observers.forEach(o => o.update && o.update(this));
  }
  addItem(product, qty = 1) {
    const quantity = Math.max(1, Number(qty));
    this.items.push({ product, qty: quantity });
    this.notify();
  }
  removeItem(index) {
    this.items.splice(index, 1);
    this.notify();
  }
  clear() {
    this.items = [];
    this.notify();
  }
  getTotal() {
    return this.items.reduce((sum, item) => sum + item.product.getPrice() * item.qty, 0);
  }
}

class TotalDisplayObserver {
  constructor(targetEl) { this.targetEl = targetEl; }
  update(cart) {
    this.targetEl.textContent = `$${cart.getTotal().toFixed(2)}`;
  }
}

// -------------------------------
// Prescription Flow
// -------------------------------
const Prescription = (() => {
  let verified = false;
  return {
    isVerified() { return verified; },
    verify({ hasFile, confirmed }) {
      if (!hasFile) {
        alert('A prescription file is required.');
        return false;
      }
      if (!confirmed) {
        alert('Please confirm that the uploaded file is a valid prescription.');
        return false;
      }
      verified = true;
      return true;
    }
  };
})();

// -------------------------------
// UI Rendering & Wiring
// -------------------------------
const formatMoney = (n) => `$${Number(n).toFixed(2)}`;

function renderProducts(listEl) {
  listEl.innerHTML = '';
  CATALOG.forEach(p => {
    const el = document.createElement('div');
    el.className = 'product-card';
    el.innerHTML = `
      <div class="title">${p.name}</div>
      <div class="row">
        <span class="price">${formatMoney(p.basePrice)}</span>
        <span class="chip">${p.prescriptionRequired ? 'Rx Required' : 'OTC'}</span>
      </div>
      <div class="controls">
        <div class="row">
          <label>Discount %</label>
          <select class="discount">
            <option value="0">0%</option>
            <option value="5">5%</option>
            <option value="10">10%</option>
            <option value="15">15%</option>
            <option value="20">20%</option>
          </select>
        </div>
        <div class="row">
          <label>Apply insurance</label>
          <select class="insurance">
            <option value="none">No</option>
            <option value="30">Yes (30%)</option>
            <option value="50">Yes (50%)</option>
          </select>
        </div>
        <div class="row">
          <label>Qty</label>
          <input class="qty" type="number" min="1" value="1" />
        </div>
        <button class="btn primary add" data-id="${p.id}">Add to Cart</button>
      </div>
    `;
    listEl.appendChild(el);
  });
}

function renderCartItems(listEl, cart) {
  listEl.innerHTML = '';
  cart.items.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'cart-item';
    const subtotal = item.product.getPrice() * item.qty;
    li.innerHTML = `
      <div>
        <div class="name">${item.product.getName()}</div>
        <div class="meta">${item.qty} × ${formatMoney(item.product.getPrice())}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <div class="subtotal">${formatMoney(subtotal)}</div>
        <button class="btn danger remove">×</button>
      </div>
    `;
    li.querySelector('.remove').addEventListener('click', () => {
      cart.removeItem(idx);
      renderCartItems(listEl, cart);
      // total auto-updates via observer
      document.getElementById('checkout').disabled = cart.items.length === 0;
    });
    listEl.appendChild(li);
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const productListEl = document.getElementById('product-list');
  const cartItemsEl = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('checkout');

  // Render products
  renderProducts(productListEl);

  // Setup cart and observer
  const cart = new CartSubject();
  const totalDisplay = new TotalDisplayObserver(totalEl);
  cart.addObserver(totalDisplay);
  cart.notify();

  // Hook add to cart buttons (event delegation)
  productListEl.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains('add')) return;

    // Identify card context
    const card = target.closest('.product-card');
    const productId = target.getAttribute('data-id');
    const discount = Number(card.querySelector('.discount').value);
    const insuranceSel = card.querySelector('.insurance').value;
    const qty = Number(card.querySelector('.qty').value) || 1;

    // Create product via factory
    let product = ProductFactory.createProduct(productId);

    // Guard: prescription requirement
    if (product.prescriptionRequired === true && !Prescription.isVerified()) {
      alert('This item requires a verified prescription before adding to cart.');
      return;
    }

    // Apply decorators
    if (discount > 0) {
      product = new DiscountDecorator(product, discount);
    }
    if (insuranceSel !== 'none') {
      product = new InsuranceDecorator(product, Number(insuranceSel));
    }

    cart.addItem(product, qty);
    renderCartItems(cartItemsEl, cart);
    checkoutBtn.disabled = cart.items.length === 0;
  });

  // Prescription verify flow
  const rxFile = document.getElementById('rx-file');
  const rxConfirm = document.getElementById('rx-confirm');
  const rxVerifyBtn = document.getElementById('rx-verify');
  const rxStatus = document.getElementById('rx-status');

  rxVerifyBtn.addEventListener('click', () => {
    const ok = Prescription.verify({ hasFile: rxFile.files.length > 0, confirmed: rxConfirm.checked });
    if (ok) {
      rxStatus.textContent = 'Verified';
      rxStatus.classList.add('ok');
      rxStatus.classList.remove('warn');
    } else {
      rxStatus.textContent = 'Not verified';
      rxStatus.classList.remove('ok');
      rxStatus.classList.add('warn');
    }
  });

  // Checkout
  checkoutBtn.addEventListener('click', () => {
    if (cart.items.length === 0) return;
    alert(`Thank you! Your total is ${formatMoney(cart.getTotal())}.`);
    cart.clear();
    renderCartItems(cartItemsEl, cart);
    checkoutBtn.disabled = true;
  });
});



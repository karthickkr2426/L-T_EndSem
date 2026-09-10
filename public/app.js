// State management
let currentRole = 'Customer';
let activeToken = '';
let currentCategory = '';
let searchTimeout = null;
let activeReviewProductId = null;
let currentAppliedCoupon = null;

// Pre-seeded credentials for quick switching
const credentials = {
  Customer: { email: 'customer1@example.com', password: 'Customer@123', name: 'Alice Customer' },
  Seller: { email: 'seller1@example.com', password: 'Seller@123', name: 'ElectroTech Seller' },
  Admin: { email: 'admin@example.com', password: 'Admin@123', name: 'System Admin' },
  Guest: null
};

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✔' : type === 'error' ? '✖' : 'ℹ'}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// API Helper
async function apiCall(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (activeToken && currentRole !== 'Guest') {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }
  try {
    const res = await fetch(endpoint, { ...options, headers });
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 500, ok: false, data: { success: false, message: err.message, errorCode: 'NETWORK_ERROR' } };
  }
}

// Switch Active Role
async function switchRole(role) {
  currentRole = role;
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role === role);
  });

  if (role === 'Guest') {
    activeToken = '';
    showToast('Switched to Guest (Unauthenticated mode). Protected routes will return 401.', 'info');
    updateCartCount();
    return;
  }

  const cred = credentials[role];
  const { ok, data } = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: cred.email, password: cred.password })
  });

  if (ok && data.data && data.data.token) {
    activeToken = data.data.token;
    showToast(`Logged in as ${cred.name} (${role})`, 'success');
  } else {
    showToast(`Login failed for ${role}: ${data.message}`, 'error');
  }

  updateCartCount();
  if (document.getElementById('tab-orders').classList.contains('active')) fetchOrders();
  if (document.getElementById('tab-seller').classList.contains('active')) fetchSellerDashboard();
  if (document.getElementById('tab-admin').classList.contains('active')) fetchAdminAnalytics();
}

// Navigation Tabs
function openTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) {
    targetTab.classList.add('active');
  }

  const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabName));
  if (activeBtn) activeBtn.classList.add('active');

  if (tabName === 'cart') renderCartView();
  if (tabName === 'orders') fetchOrders();
  if (tabName === 'seller') fetchSellerDashboard();
  if (tabName === 'admin') fetchAdminAnalytics();
}

// 1. Storefront: Fetch and Render Products
async function loadProducts(search = '', categoryId = '') {
  const container = document.getElementById('product-grid');
  container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">Fetching catalog...</div>';

  let url = '/api/products?limit=20';
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (categoryId) url += `&categoryId=${encodeURIComponent(categoryId)}`;

  const { ok, data } = await apiCall(url);
  if (!ok || !data.data || !data.data.products) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--danger);">Failed to load products: ${data.message || 'Error'}</div>`;
    return;
  }

  const products = data.data.products;
  if (products.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">No products found matching your filter criteria.</div>';
    return;
  }

  container.innerHTML = products.map(product => {
    let stockBadge = '<span class="product-stock stock-in">In Stock</span>';
    if (product.stock === 0) stockBadge = '<span class="product-stock stock-out">Out of Stock</span>';
    else if (product.stock <= 5) stockBadge = `<span class="product-stock stock-low">Low Stock (${product.stock} left)</span>`;

    const img = (product.images && product.images[0]) ? product.images[0] : 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f';
    const categoryName = product.categoryId ? product.categoryId.name : 'General';
    const stars = '★'.repeat(Math.round(product.ratingAvg || 0)) + '☆'.repeat(5 - Math.round(product.ratingAvg || 0));

    return `
      <div class="product-card">
        <img src="${img}" class="product-image" alt="${product.name}" onerror="this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f'">
        <div class="product-body">
          <div class="product-category">${categoryName}</div>
          <div class="product-header">
            <h4 class="product-title">${product.name}</h4>
          </div>
          <p class="product-desc">${product.description}</p>
          <div class="product-meta">
            <div class="product-price">₹${product.price}</div>
            ${stockBadge}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; font-size: 0.82rem;">
            <span class="rating-stars">${stars} (${product.ratingAvg || 0})</span>
            <button onclick="openReviewModal('${product._id}', '${product.name}')" style="background:transparent; border:none; color:var(--accent); font-size: 0.78rem; cursor: pointer; text-decoration: underline;">Reviews (${product.ratingCount || 0})</button>
          </div>
          <button class="add-cart-btn" onclick="addToCart('${product._id}', '${product.name}')" ${product.stock === 0 ? 'disabled' : ''}>
            ${product.stock === 0 ? 'Out of Stock' : '🛒 Add to Cart'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Fetch categories for filter pills
async function loadCategories() {
  const { ok, data } = await apiCall('/api/categories');
  if (ok && data.data && data.data.categories) {
    const container = document.getElementById('category-pills');
    const pillsHtml = data.data.categories.map(cat => `
      <button class="category-pill" data-id="${cat._id}" onclick="filterCategory('${cat._id}')">${cat.name}</button>
    `).join('');
    container.innerHTML = `<button class="category-pill active" onclick="filterCategory('')">All Products</button>` + pillsHtml;
  }
}

function filterCategory(catId) {
  currentCategory = catId;
  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.id === catId || (!catId && !pill.dataset.id));
  });
  const search = document.getElementById('search-input').value;
  loadProducts(search, catId);
}

function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const query = document.getElementById('search-input').value;
    loadProducts(query, currentCategory);
  }, 300);
}

// 2. Shopping Cart Operations
async function updateCartCount() {
  if (currentRole === 'Guest') {
    document.getElementById('cart-count').innerText = '0';
    return;
  }
  const { ok, data } = await apiCall('/api/cart');
  if (ok && data.data && data.data.cart) {
    document.getElementById('cart-count').innerText = data.data.cart.totalItems || 0;
  }
}

async function addToCart(productId, productName) {
  if (currentRole === 'Guest') {
    showToast('Authentication required. Please switch to Customer role above.', 'error');
    return;
  }
  const { ok, data } = await apiCall('/api/cart', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity: 1 })
  });

  if (ok) {
    showToast(`Added '${productName}' to cart!`, 'success');
    updateCartCount();
  } else {
    showToast(`Cannot add to cart: ${data.message}`, 'error');
  }
}

async function renderCartView() {
  if (currentRole === 'Guest') {
    document.getElementById('cart-items-list').innerHTML = `
      <p style="color: var(--warning); text-align: center; padding: 2rem;">
        🔒 You are currently viewing as Guest. Switch to <b>Customer (Alice)</b> in the top navbar to view and manage your shopping cart.
      </p>
    `;
    document.getElementById('cart-subtotal').innerText = '₹0';
    document.getElementById('cart-total').innerText = '₹0';
    return;
  }

  const { ok, data } = await apiCall('/api/cart');
  if (!ok || !data.data || !data.data.cart || data.data.cart.items.length === 0) {
    document.getElementById('cart-items-list').innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">Your cart is empty.</p>';
    document.getElementById('cart-subtotal').innerText = '₹0';
    document.getElementById('cart-total').innerText = '₹0';
    document.getElementById('discount-row').style.display = 'none';
    currentAppliedCoupon = null;
    return;
  }

  const cart = data.data.cart;
  document.getElementById('cart-items-list').innerHTML = cart.items.map(item => `
    <div class="cart-item-row">
      <div class="cart-item-info">
        <img src="${(item.product.images && item.product.images[0]) || ''}" class="cart-item-thumb" alt="">
        <div>
          <h4 style="font-size: 0.95rem;">${item.product.name}</h4>
          <span style="font-size: 0.8rem; color: #38bdf8;">₹${item.product.price} each (Stock: ${item.product.stock})</span>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 1.5rem;">
        <div class="cart-qty-ctrl">
          <button class="qty-btn" onclick="updateItemQty('${item.product._id}', ${item.quantity - 1})">-</button>
          <span style="font-weight: 700; width: 20px; text-align: center;">${item.quantity}</span>
          <button class="qty-btn" onclick="updateItemQty('${item.product._id}', ${item.quantity + 1})">+</button>
        </div>
        <div style="font-weight: 800; min-width: 70px; text-align: right;">₹${item.subtotal}</div>
        <button onclick="removeItemFromCart('${item.product._id}')" style="background:transparent; border:none; color:var(--danger); cursor: pointer;">🗑️</button>
      </div>
    </div>
  `).join('');

  document.getElementById('cart-subtotal').innerText = `₹${cart.totalAmount}`;
  recalculateCartTotal(cart.totalAmount);
}

async function updateItemQty(productId, newQty) {
  if (newQty <= 0) {
    return removeItemFromCart(productId);
  }
  const { ok, data } = await apiCall(`/api/cart/${productId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity: newQty })
  });
  if (ok) {
    renderCartView();
    updateCartCount();
  } else {
    showToast(data.message, 'error');
  }
}

async function removeItemFromCart(productId) {
  const { ok, data } = await apiCall(`/api/cart/${productId}`, { method: 'DELETE' });
  if (ok) {
    showToast('Item removed from cart', 'info');
    renderCartView();
    updateCartCount();
  } else {
    showToast(data.message, 'error');
  }
}

async function clearUserCart() {
  const { ok } = await apiCall('/api/cart', { method: 'DELETE' });
  if (ok) {
    showToast('Cart cleared', 'info');
    renderCartView();
    updateCartCount();
  }
}

function useCouponChip(code) {
  document.getElementById('coupon-input').value = code;
  applyEnteredCoupon();
}

async function applyEnteredCoupon() {
  const code = document.getElementById('coupon-input').value.trim();
  if (!code) return;

  const subtotalStr = document.getElementById('cart-subtotal').innerText.replace('₹', '');
  const orderAmount = Number(subtotalStr);

  if (orderAmount <= 0) {
    showToast('Add products to cart before applying coupon', 'warning');
    return;
  }

  const { ok, data } = await apiCall('/api/coupons/apply', {
    method: 'POST',
    body: JSON.stringify({ code, orderAmount })
  });

  if (ok && data.data) {
    currentAppliedCoupon = data.data;
    showToast(`Coupon '${data.data.code}' applied! Saved ₹${data.data.discountAmount}`, 'success');
    document.getElementById('discount-row').style.display = 'flex';
    document.getElementById('cart-discount').innerText = `-₹${data.data.discountAmount}`;
    document.getElementById('cart-total').innerText = `₹${data.data.finalAmount}`;
  } else {
    currentAppliedCoupon = null;
    document.getElementById('discount-row').style.display = 'none';
    document.getElementById('cart-total').innerText = `₹${orderAmount}`;
    showToast(`Coupon rejected: ${data.message}`, 'error');
  }
}

function recalculateCartTotal(subtotal) {
  if (currentAppliedCoupon) {
    applyEnteredCoupon();
  } else {
    document.getElementById('cart-total').innerText = `₹${subtotal}`;
  }
}

async function checkoutOrder() {
  if (currentRole !== 'Customer') {
    showToast('Only Customer can place orders. Please switch to Customer.', 'error');
    return;
  }

  const street = document.getElementById('ship-street').value.trim();
  const paymentMode = document.getElementById('payment-mode').value;

  const payload = {
    shippingAddress: {
      street: street || '12 Maple Street',
      city: 'Boston',
      state: 'Massachusetts',
      zipCode: '02108',
      country: 'USA'
    },
    paymentMode,
    couponCode: currentAppliedCoupon ? currentAppliedCoupon.code : undefined
  };

  const { ok, data } = await apiCall('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (ok && data.data && data.data.order) {
    showToast(`Order #${data.data.order._id.slice(-6)} placed successfully!`, 'success');
    currentAppliedCoupon = null;
    renderCartView();
    updateCartCount();
    loadProducts(); // Refresh stock in catalog
    openTab('orders');
  } else {
    showToast(`Checkout failed: ${data.message}`, 'error');
  }
}

// 3. Orders List & State Machine Workflow
async function fetchOrders() {
  const tbody = document.getElementById('orders-list');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Fetching orders...</td></tr>';

  const { ok, data } = await apiCall('/api/orders');
  if (!ok || !data.data || !data.data.orders || data.data.orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No orders found for current user role.</td></tr>';
    return;
  }

  tbody.innerHTML = data.data.orders.map(order => {
    const customerName = order.userId ? order.userId.name : 'Unknown';
    const itemsSummary = order.items.map(i => `${i.productName} (x${i.quantity})`).join(', ');

    // State machine action buttons
    let transitionBtns = '';
    if (order.status === 'Placed') {
      transitionBtns = `
        <button class="chip-btn" onclick="transitionOrderStatus('${order._id}', 'Confirmed')" style="background: #059669; color:white;">Confirm</button>
        <button class="chip-btn" onclick="transitionOrderStatus('${order._id}', 'Cancelled')" style="background: #dc2626; color:white;">Cancel</button>
        <button class="chip-btn" onclick="transitionOrderStatus('${order._id}', 'Delivered')" title="Test Illegal Jump" style="opacity: 0.6;">Test Invalid Jump</button>
      `;
    } else if (order.status === 'Confirmed') {
      transitionBtns = `
        <button class="chip-btn" onclick="transitionOrderStatus('${order._id}', 'Shipped')" style="background: #d97706; color:white;">Ship Order</button>
        <button class="chip-btn" onclick="transitionOrderStatus('${order._id}', 'Cancelled')" style="background: #dc2626; color:white;">Cancel</button>
      `;
    } else if (order.status === 'Shipped') {
      transitionBtns = `
        <button class="chip-btn" onclick="transitionOrderStatus('${order._id}', 'Delivered')" style="background: #7c3aed; color:white;">Mark Delivered</button>
      `;
    } else if (order.status === 'Delivered') {
      transitionBtns = `
        <span style="color: #a78bfa; font-size: 0.78rem;">Order Completed</span>
        <button class="chip-btn" onclick="transitionOrderStatus('${order._id}', 'Shipped')" title="Test Illegal Transition" style="opacity: 0.5;">Test Rewind (400)</button>
      `;
    } else if (order.status === 'Cancelled') {
      transitionBtns = `<span style="color: #f87171; font-size: 0.78rem;">Order Cancelled (Stock Restored)</span>`;
    }

    return `
      <tr>
        <td style="font-family: var(--font-mono); font-size: 0.8rem;">#${order._id.slice(-6)}</td>
        <td>${customerName}</td>
        <td style="font-size: 0.82rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${itemsSummary}</td>
        <td style="font-weight: 700; color: #38bdf8;">₹${order.totalAmount}</td>
        <td><span class="status-badge status-${order.status}">${order.status}</span></td>
        <td><div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">${transitionBtns}</div></td>
      </tr>
    `;
  }).join('');
}

async function transitionOrderStatus(orderId, targetStatus) {
  const { ok, data } = await apiCall(`/api/orders/${orderId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: targetStatus })
  });

  if (ok) {
    showToast(`Order status updated to '${targetStatus}'`, 'success');
    fetchOrders();
    loadProducts(); // In case stock was replenished on cancellation
  } else {
    showToast(`State Machine Rejection: ${data.message} (${data.errorCode || 'ERROR'})`, 'error');
  }
}

// 4. Reviews & Verified Purchase Check
function openReviewModal(productId, productName) {
  activeReviewProductId = productId;
  document.getElementById('review-product-title').innerText = `Review: ${productName}`;
  document.getElementById('review-modal').style.display = 'flex';
}

function closeReviewModal() {
  document.getElementById('review-modal').style.display = 'none';
  activeReviewProductId = null;
}

async function submitReviewForm() {
  if (!activeReviewProductId) return;
  const rating = document.getElementById('review-rating').value;
  const comment = document.getElementById('review-comment').value.trim();

  if (!comment) {
    showToast('Please enter a review comment', 'warning');
    return;
  }

  const { ok, data } = await apiCall(`/api/products/${activeReviewProductId}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ rating: Number(rating), comment })
  });

  if (ok) {
    showToast('Verified review submitted successfully! Rating recalculated.', 'success');
    closeReviewModal();
    loadProducts();
  } else {
    showToast(`Review rejected: ${data.message}`, 'error');
  }
}

// 5. Seller Dashboard
async function fetchSellerDashboard() {
  const { ok, data } = await apiCall('/api/seller/dashboard');
  if (ok && data.data) {
    const m = data.data.metrics;
    document.getElementById('seller-products').innerText = m.totalProducts;
    document.getElementById('seller-revenue').innerText = `₹${m.totalRevenue}`;
    document.getElementById('seller-units').innerText = m.totalUnitsSold;
    document.getElementById('seller-pending').innerText = m.pendingOrders;
    document.getElementById('seller-lowstock').innerText = m.lowStockProducts;
  }

  const lowStockRes = await apiCall('/api/seller/products/low-stock');
  const tbody = document.getElementById('seller-lowstock-table');
  if (lowStockRes.ok && lowStockRes.data.data.products.length > 0) {
    tbody.innerHTML = lowStockRes.data.data.products.map(p => `
      <tr>
        <td style="font-weight: 600;">${p.name}</td>
        <td>${p.categoryId ? p.categoryId.name : 'General'}</td>
        <td style="color: #38bdf8;">₹${p.price}</td>
        <td style="color: #fbbf24; font-weight: 800;">${p.stock}</td>
        <td><span class="product-stock stock-low">Alert: ≤ 5 left</span></td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--success);">All inventory items are well-stocked!</td></tr>';
  }
}

// 6. Admin Analytics
async function fetchAdminAnalytics() {
  const { ok, data } = await apiCall('/api/admin/reports/overview');
  if (ok && data.data) {
    const o = data.data;
    document.getElementById('admin-users').innerText = o.totalUsers;
    document.getElementById('admin-products').innerText = o.totalProducts;
    document.getElementById('admin-orders').innerText = o.totalOrders;
    document.getElementById('admin-revenue').innerText = `₹${o.totalRevenue}`;
  }

  const prodRes = await apiCall('/api/admin/reports/products');
  if (prodRes.ok && prodRes.data.data) {
    const dist = prodRes.data.data.categoryDistribution;
    document.getElementById('admin-category-dist').innerHTML = dist.map(c => `
      <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); font-size: 0.88rem;">
        <span>${c.categoryName}</span>
        <span style="font-weight: 700; color: var(--accent);">${c.productCount} Products (Avg ₹${c.avgPrice})</span>
      </div>
    `).join('');
  }

  const salesRes = await apiCall('/api/admin/reports/sales');
  if (salesRes.ok && salesRes.data.data) {
    const pm = salesRes.data.data.paymentModeBreakdown;
    document.getElementById('admin-payment-breakdown').innerHTML = pm.map(p => `
      <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); font-size: 0.88rem;">
        <span style="font-weight: 600;">${p._id}</span>
        <span style="color: #34d399; font-weight: 700;">₹${p.revenue} (${p.orders} orders)</span>
      </div>
    `).join('');
  }
}

// 7. Interactive API Inspector
async function testEndpoint(method, url) {
  document.getElementById('api-request-info').innerText = `${method} ${url}`;
  document.getElementById('api-status-info').innerText = 'Calling...';
  document.getElementById('api-response-body').innerText = 'Sending request...';

  const { status, data } = await apiCall(url, { method });
  document.getElementById('api-status-info').innerText = `HTTP ${status}`;
  document.getElementById('api-status-info').style.color = status < 400 ? 'var(--success)' : 'var(--danger)';
  document.getElementById('api-response-body').innerText = JSON.stringify(data, null, 2);
}

// Initial Boot
window.addEventListener('DOMContentLoaded', async () => {
  await switchRole('Customer');
  loadCategories();
  loadProducts();
});

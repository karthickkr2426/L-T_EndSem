/**
 * Automated End-to-End API Integration & Business Rules Test Suite
 * Tests all 14 modules using native Node.js fetch
 */
const http = require('http');
const dotenv = require('dotenv');
dotenv.config();
process.env.NODE_ENV = 'test';

const app = require('../server');

const PORT = 5055; // Use dedicated test port
let server;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

let adminToken = '';
let seller1Token = '';
let seller2Token = '';
let customer1Token = '';
let customer2Token = '';

let sampleProductId = '';
let sampleSeller1ProductId = '';
let sampleCategoryId = '';

const stats = { passed: 0, failed: 0 };

const test = async (name, fn) => {
  try {
    await fn();
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${name}`);
    stats.passed++;
  } catch (err) {
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${name}`);
    console.error(`    \x1b[31mError:\x1b[0m ${err.message}`, err.cause ? err.cause : '');
    stats.failed++;
  }
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
};

const runTests = async () => {
  console.log('\n======================================================');
  console.log('  STARTING E-COMMERCE BACKEND API TEST SUITE');
  console.log('======================================================\n');

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(PORT, '127.0.0.1', () => {
      console.log(`Test server running on http://127.0.0.1:${PORT}\n`);
      resolve();
    });
  });

  try {
    // -----------------------------------------------------------------
    console.log('\n--- 1. SYSTEM HEALTH & API BASICS ---');
    // -----------------------------------------------------------------
    await test('GET /api/health should return 200 OK', async () => {
      const res = await fetch(`${BASE_URL}/health`);
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(body.success === true, 'Expected success === true');
    });

    // -----------------------------------------------------------------
    console.log('\n--- 2. AUTHENTICATION & VALIDATION ---');
    // -----------------------------------------------------------------
    await test('POST /api/auth/login as Admin should return token', async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@example.com', password: 'Admin@123' })
      });
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(body.data.token, 'Expected JWT token in response');
      assert(body.data.user.role === 'Admin', 'Expected user role to be Admin');
      adminToken = body.data.token;
    });

    await test('POST /api/auth/login as Seller 1 should return token', async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'seller1@example.com', password: 'Seller@123' })
      });
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      seller1Token = body.data.token;
    });

    await test('POST /api/auth/login as Seller 2 should return token', async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'seller2@example.com', password: 'Seller@123' })
      });
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      seller2Token = body.data.token;
    });

    await test('POST /api/auth/login as Customer 1 should return token', async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer1@example.com', password: 'Customer@123' })
      });
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      customer1Token = body.data.token;
    });

    await test('POST /api/auth/login as Customer 2 should return token', async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer2@example.com', password: 'Customer@123' })
      });
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      customer2Token = body.data.token;
    });

    await test('POST /api/auth/login with invalid password should return 401 UNAUTHORIZED', async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer1@example.com', password: 'WrongPassword' })
      });
      const body = await res.json();
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      assert(body.errorCode === 'UNAUTHORIZED', `Expected UNAUTHORIZED, got ${body.errorCode}`);
    });

    await test('POST /api/auth/register should fail on duplicate email (409)', async () => {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicate Test',
          email: 'customer1@example.com',
          password: 'Password@123'
        })
      });
      const body = await res.json();
      assert(res.status === 409, `Expected 409, got ${res.status}`);
      assert(body.errorCode === 'BUSINESS_RULE_ERROR', `Expected BUSINESS_RULE_ERROR, got ${body.errorCode}`);
    });

    // -----------------------------------------------------------------
    console.log('\n--- 3. ROLE-BASED ACCESS CONTROL (RBAC) ---');
    // -----------------------------------------------------------------
    await test('Unauthenticated access to protected route returns 401 UNAUTHORIZED', async () => {
      const res = await fetch(`${BASE_URL}/cart`);
      const body = await res.json();
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      assert(body.errorCode === 'UNAUTHORIZED', 'Expected UNAUTHORIZED');
    });

    await test('Customer accessing Admin route returns 403 FORBIDDEN', async () => {
      const res = await fetch(`${BASE_URL}/admin/reports/overview`, {
        headers: { Authorization: `Bearer ${customer1Token}` }
      });
      const body = await res.json();
      assert(res.status === 403, `Expected 403, got ${res.status}`);
      assert(body.errorCode === 'FORBIDDEN', 'Expected FORBIDDEN');
    });

    await test('Customer accessing Seller dashboard returns 403 FORBIDDEN', async () => {
      const res = await fetch(`${BASE_URL}/seller/dashboard`, {
        headers: { Authorization: `Bearer ${customer1Token}` }
      });
      const body = await res.json();
      assert(res.status === 403, `Expected 403, got ${res.status}`);
      assert(body.errorCode === 'FORBIDDEN', 'Expected FORBIDDEN');
    });

    // -----------------------------------------------------------------
    console.log('\n--- 4. CATEGORIES & HIERARCHY ---');
    // -----------------------------------------------------------------
    await test('GET /api/categories should return top-level & subcategories', async () => {
      const res = await fetch(`${BASE_URL}/categories`);
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(body.data.categories), 'Expected categories array');
      sampleCategoryId = body.data.categories[0]._id;
    });

    await test('POST /api/categories with non-admin token returns 403 FORBIDDEN', async () => {
      const res = await fetch(`${BASE_URL}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer1Token}`
        },
        body: JSON.stringify({ name: 'Unauthorized Category' })
      });
      assert(res.status === 403, `Expected 403, got ${res.status}`);
    });

    // -----------------------------------------------------------------
    console.log('\n--- 5. PRODUCTS, SEARCH & FILTERING ---');
    // -----------------------------------------------------------------
    await test('GET /api/products with search=iPhone returns matching product', async () => {
      const res = await fetch(`${BASE_URL}/products?search=iPhone`);
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(body.data.products.length > 0, 'Expected at least 1 product');
      assert(body.data.products[0].name.includes('iPhone'), 'Expected iPhone');
      sampleProductId = body.data.products[0]._id;
      sampleSeller1ProductId = body.data.products[0]._id;
    });

    await test('GET /api/products with minPrice and maxPrice filtering', async () => {
      const res = await fetch(`${BASE_URL}/products?minPrice=50&maxPrice=150`);
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      body.data.products.forEach((p) => {
        assert(p.price >= 50 && p.price <= 150, `Price ${p.price} out of range`);
      });
    });

    await test('Seller 2 cannot update Seller 1’s product (403 FORBIDDEN)', async () => {
      const res = await fetch(`${BASE_URL}/products/${sampleSeller1ProductId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${seller2Token}`
        },
        body: JSON.stringify({ price: 999 })
      });
      const body = await res.json();
      assert(res.status === 403, `Expected 403, got ${res.status}`);
      assert(body.errorCode === 'FORBIDDEN', 'Expected FORBIDDEN');
    });

    await test('Seller 1 CAN update their own product (200 OK)', async () => {
      const res = await fetch(`${BASE_URL}/products/${sampleSeller1ProductId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${seller1Token}`
        },
        body: JSON.stringify({ price: 1199 })
      });
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(body.data.product.price === 1199, 'Expected price updated');
    });

    // -----------------------------------------------------------------
    console.log('\n--- 6. SHOPPING CART MANAGEMENT ---');
    // -----------------------------------------------------------------
    await test('Customer adds product to cart', async () => {
      const res = await fetch(`${BASE_URL}/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer2Token}`
        },
        body: JSON.stringify({ productId: sampleProductId, quantity: 2 })
      });
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(body.data.cart.items.length > 0, 'Expected items in cart');
    });

    await test('Customer adding quantity exceeding stock is rejected (400)', async () => {
      const res = await fetch(`${BASE_URL}/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer2Token}`
        },
        body: JSON.stringify({ productId: sampleProductId, quantity: 9999 })
      });
      const body = await res.json();
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(body.errorCode === 'BUSINESS_RULE_ERROR', 'Expected BUSINESS_RULE_ERROR');
    });

    // -----------------------------------------------------------------
    console.log('\n--- 7. DISCOUNT & COUPON ENGINE ---');
    // -----------------------------------------------------------------
    await test('POST /api/coupons/apply with valid coupon WELCOME10', async () => {
      const res = await fetch(`${BASE_URL}/coupons/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer2Token}`
        },
        body: JSON.stringify({ code: 'WELCOME10', orderAmount: 2000 })
      });
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(body.data.discountAmount === 200, `Expected 200 discount, got ${body.data.discountAmount}`);
      assert(body.data.finalAmount === 1800, `Expected 1800 final amount, got ${body.data.finalAmount}`);
    });

    await test('POST /api/coupons/apply with expired coupon EXPIRED50 is rejected (400)', async () => {
      const res = await fetch(`${BASE_URL}/coupons/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer2Token}`
        },
        body: JSON.stringify({ code: 'EXPIRED50', orderAmount: 500 })
      });
      const body = await res.json();
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(body.errorCode === 'BUSINESS_RULE_ERROR', 'Expected BUSINESS_RULE_ERROR');
    });

    await test('POST /api/coupons/apply below minimum order value is rejected (400)', async () => {
      const res = await fetch(`${BASE_URL}/coupons/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer2Token}`
        },
        body: JSON.stringify({ code: 'FLAT500', orderAmount: 500 }) // Min is 1500
      });
      const body = await res.json();
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(body.errorCode === 'BUSINESS_RULE_ERROR', 'Expected BUSINESS_RULE_ERROR');
    });

    // -----------------------------------------------------------------
    console.log('\n--- 8. ORDER PLACEMENT & STATUS WORKFLOW ---');
    // -----------------------------------------------------------------
    let newOrderId = '';
    await test('Customer 2 places order from cart with WELCOME10 coupon', async () => {
      const res = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer2Token}`
        },
        body: JSON.stringify({
          shippingAddress: {
            street: '77 Pine Road',
            city: 'Seattle',
            state: 'WA',
            zipCode: '98101',
            country: 'USA'
          },
          paymentMode: 'CARD',
          couponCode: 'WELCOME10'
        })
      });
      const body = await res.json();
      assert(res.status === 201, `Expected 201, got ${res.status}`);
      assert(body.data.order.status === 'Placed', 'Expected Placed status');
      assert(body.data.order.discountAmount > 0, 'Expected discount applied');
      newOrderId = body.data.order._id;
    });

    await test('Customer 2 cart is emptied after order placement', async () => {
      const res = await fetch(`${BASE_URL}/cart`, {
        headers: { Authorization: `Bearer ${customer2Token}` }
      });
      const body = await res.json();
      assert(body.data.cart.items.length === 0, 'Expected cart to be empty');
    });

    await test('Order transition Placed -> Confirmed succeeds', async () => {
      const res = await fetch(`${BASE_URL}/orders/${newOrderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${seller1Token}`
        },
        body: JSON.stringify({ status: 'Confirmed' })
      });
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(body.data.order.status === 'Confirmed', 'Expected Confirmed status');
    });

    await test('Invalid order transition Confivered -> Delivered fails with INVALID_STATUS_TRANSITION', async () => {
      const res = await fetch(`${BASE_URL}/orders/${newOrderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${seller1Token}`
        },
        body: JSON.stringify({ status: 'Delivered' }) // Cannot jump Confirmed -> Delivered directly
      });
      const body = await res.json();
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(body.errorCode === 'INVALID_STATUS_TRANSITION', `Expected INVALID_STATUS_TRANSITION, got ${body.errorCode}`);
    });

    // -----------------------------------------------------------------
    console.log('\n--- 9. REVIEWS & RATINGS ---');
    // -----------------------------------------------------------------
    await test('Reviewing an unpurchased/undelivered product is rejected (403)', async () => {
      // customer2 has NOT received MacBook Pro
      const productsRes = await fetch(`${BASE_URL}/products?search=MacBook`);
      const prodBody = await productsRes.json();
      const macbookId = prodBody.data.products[0]._id;

      const res = await fetch(`${BASE_URL}/products/${macbookId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer2Token}`
        },
        body: JSON.stringify({ rating: 5, comment: 'I have not bought this but I like it' })
      });
      const body = await res.json();
      assert(res.status === 403, `Expected 403, got ${res.status}`);
      assert(body.errorCode === 'BUSINESS_RULE_ERROR', 'Expected BUSINESS_RULE_ERROR');
    });

    await test('Customer 1 reviewing already delivered Running Shoes succeeds', async () => {
      const productsRes = await fetch(`${BASE_URL}/products?search=Running+Shoes`);
      const prodBody = await productsRes.json();
      const shoeId = prodBody.data.products[0]._id;

      const res = await fetch(`${BASE_URL}/products/${shoeId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer1Token}`
        },
        body: JSON.stringify({ rating: 4, comment: 'Great running sneakers, very comfortable!' })
      });
      const body = await res.json();
      assert(res.status === 201, `Expected 201, got ${res.status}`);
      assert(body.data.productStats.ratingAvg === 4, `Expected ratingAvg 4, got ${body.data.productStats.ratingAvg}`);
    });

    await test('Duplicate review by Customer 1 for Running Shoes is rejected (400)', async () => {
      const productsRes = await fetch(`${BASE_URL}/products?search=Running+Shoes`);
      const prodBody = await productsRes.json();
      const shoeId = prodBody.data.products[0]._id;

      const res = await fetch(`${BASE_URL}/products/${shoeId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer1Token}`
        },
        body: JSON.stringify({ rating: 5, comment: 'Submitting again!' })
      });
      const body = await res.json();
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(body.errorCode === 'BUSINESS_RULE_ERROR', 'Expected BUSINESS_RULE_ERROR');
    });

    // -----------------------------------------------------------------
    console.log('\n--- 10. SELLER & ADMIN ANALYTICS ---');
    // -----------------------------------------------------------------
    await test('GET /api/seller/dashboard returns seller metrics', async () => {
      const res = await fetch(`${BASE_URL}/seller/dashboard`, {
        headers: { Authorization: `Bearer ${seller1Token}` }
      });
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(body.data.metrics.totalProducts > 0, 'Expected totalProducts > 0');
      assert(body.data.metrics.lowStockProducts > 0, 'Expected lowStockProducts > 0');
    });

    await test('GET /api/seller/products/low-stock returns products below threshold', async () => {
      const res = await fetch(`${BASE_URL}/seller/products/low-stock`, {
        headers: { Authorization: `Bearer ${seller1Token}` }
      });
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(body.data.products.length > 0, 'Expected low stock products');
      body.data.products.forEach((p) => {
        assert(p.stock <= body.data.threshold, 'Product stock exceeds threshold');
      });
    });

    await test('GET /api/admin/reports/overview returns platform overview', async () => {
      const res = await fetch(`${BASE_URL}/admin/reports/overview`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(body.data.totalUsers >= 5, 'Expected at least 5 users');
      assert(body.data.totalProducts >= 9, 'Expected at least 9 products');
    });

    await test('GET /api/admin/reports/sales returns sales time-series', async () => {
      const res = await fetch(`${BASE_URL}/admin/reports/sales`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(body.data.summary.totalRevenue > 0, 'Expected total revenue > 0');
    });

  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n======================================================');
  console.log(`  TEST RESULTS: ${stats.passed} PASSED | ${stats.failed} FAILED`);
  console.log('======================================================\n');

  if (stats.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runTests();

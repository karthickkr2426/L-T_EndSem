# Enterprise E-Commerce Backend REST API

A scalable, secure, and production-ready **E-Commerce Backend REST API** built with **Node.js**, **Express.js**, and **MongoDB (Mongoose)** following a clean **MVC (Model-View-Controller) Architecture**. Designed with enterprise-grade business rules, Role-Based Access Control (RBAC), atomic inventory control, coupon discount calculation, review integrity, and comprehensive analytics.

---

## 1. Problem Statement

Modern e-commerce platforms require a robust, secure backend that handles complex business rules beyond basic CRUD operations. Common pitfalls in standard e-commerce systems include:
- **Overselling & Race Conditions**: Inability to safely decrement inventory during concurrent checkouts.
- **Client-Side Tampering**: Trusting frontend price calculations or coupon deductions.
- **Arbitrary Status Transitions**: Allowing invalid order flows (e.g. shipping an already delivered or cancelled package).
- **Review Spoofing**: Allowing users to review products they never purchased or received.
- **Data Inconsistency**: Failing to snapshot product prices and details when orders are placed.

This project solves these challenges by implementing a state-machine workflow engine, atomic database operations, server-authoritative calculations, and verified-purchase review validation.

---

## 2. Key Features

- **Authentication & RBAC**: Customer, Seller, and Admin roles with bcrypt password hashing and JWT authorization.
- **Hierarchical Category Management**: Self-referencing subcategories with circular dependency detection.
- **Product Catalog with Search & Filters**: Regex/text search, category filtering, price range, rating filter, pagination, and sorting.
- **Shopping Cart Management**: Customer-only cart with real-time stock verification and duplicate item merging.
- **Server-Authoritative Checkout**: Backend total calculation, atomic inventory decrements, and cart clearance.
- **Strict Order Workflow Engine**: Enforces valid status transitions (`Placed -> Confirmed -> Shipped -> Delivered` and cancellations) with automatic inventory replenishment.
- **Discount & Coupon Engine**: Percentage and flat discounts, expiration validation, and minimum order enforcement.
- **Mock Payment Gateway Tracking**: Payment mode (`COD`, `CARD`, `UPI`) and status tracking (`Pending`, `Paid`, `Failed`, `Refunded`).
- **Verified Purchase Reviews**: Only customers with delivered orders can review; automated real-time recalculation of aggregate ratings.
- **Seller Dashboard**: Real-time sales metrics, units sold, low-stock alerts, and pending orders isolated per seller.
- **Admin Platform Analytics**: MongoDB aggregation pipelines for revenue breakdown, sales time-series, product health, and user growth.

---

## 3. Tech Stack

- **Runtime**: Node.js (v20+)
- **Framework**: Express.js
- **Database**: MongoDB (v8.0+) & Mongoose ODM
- **Authentication**: JSON Web Tokens (`jsonwebtoken`)
- **Security**: `bcryptjs` for password hashing
- **Validation**: Joi schema validation
- **Logging & Utilities**: Morgan, CORS, Dotenv

---

## 4. Architecture

The application follows the **MVC (Model-View-Controller)** pattern with modular routing and decoupled middleware:

```
Client (Postman / Web App)
           │ HTTP Requests
           ▼
 Express Application (server.js)
           │
 ┌─────────┴─────────┐
 │ Global Middleware │ (CORS, Morgan, JSON Parser)
 └─────────┬─────────┘
           │
 ┌─────────┴─────────────────────────────────────────┐
 │ Routing Layer (routes/*.routes.js)                │
 │ - Request Validation Middleware (validate.js)     │
 │ - JWT Authentication Guard (auth.js)              │
 │ - Role-Based Access Control Guard (role.js)       │
 └─────────┬─────────────────────────────────────────┘
           │
 ┌─────────┴─────────────────────────────────────────┐
 │ Controller Layer (controllers/*.controller.js)    │
 │ - Business Logic & State Machines                 │
 │ - Atomic Inventory & Stock Checks                 │
 │ - Error Handlers & Helpers                        │
 └─────────┬─────────────────────────────────────────┘
           │
 ┌─────────┴─────────────────────────────────────────┐
 │ Data Layer (models/*.js - Mongoose ODM)           │
 │ - Users, Products, Categories, Carts, Orders,     │
 │   Coupons, Reviews                                │
 └─────────┬─────────────────────────────────────────┘
           │
           ▼
  MongoDB Database (ecommerce_db)
```

---

## 5. Project Structure

```text
ecommerce-backend-api/
├── config/
│   └── db.js                    # Mongoose database connection setup
├── models/
│   ├── User.js                  # User schema & bcrypt methods
│   ├── Category.js              # Hierarchical category schema
│   ├── Product.js               # Product catalog & stock schema
│   ├── Cart.js                  # Customer shopping cart schema
│   ├── Order.js                 # Snapshot-based order schema
│   ├── Coupon.js                # Discount coupon schema
│   └── Review.js                # Review & rating aggregation schema
├── routes/
│   ├── auth.routes.js           # Register, login, profile routes
│   ├── user.routes.js           # Admin user management routes
│   ├── category.routes.js       # Category hierarchy routes
│   ├── product.routes.js        # Catalog, search, and nested review routes
│   ├── cart.routes.js           # Customer cart routes
│   ├── order.routes.js          # Order checkout & status workflow routes
│   ├── coupon.routes.js         # Coupon application & management routes
│   ├── review.routes.js         # Review CRUD routes
│   ├── seller.routes.js         # Seller dashboard & analytics routes
│   └── admin.routes.js          # Admin platform reporting routes
├── controllers/
│   ├── auth.controller.js       # Authentication logic
│   ├── user.controller.js       # User management logic
│   ├── category.controller.js   # Category & hierarchy logic
│   ├── product.controller.js    # Catalog & search logic
│   ├── cart.controller.js       # Cart manipulation & stock checking
│   ├── order.controller.js      # Checkout, atomic stock & workflow logic
│   ├── coupon.controller.js     # Discount computation logic
│   ├── review.controller.js     # Verified review validation & aggregation
│   ├── seller.controller.js     # Seller KPI metrics
│   └── admin.controller.js      # Aggregation pipelines for admin reports
├── middleware/
│   ├── auth.js                  # JWT extraction & validation
│   ├── role.js                  # Role-based authorization middleware
│   ├── validate.js              # Joi request payload validator
│   └── errorHandler.js          # Centralized error handler
├── utils/
│   ├── generateToken.js         # JWT signing helper
│   └── helpers.js               # Standard response formatting & AppError
├── validators/
│   ├── auth.validator.js        # Joi schema for auth
│   ├── category.validator.js    # Joi schema for categories
│   ├── product.validator.js     # Joi schema for products & catalog queries
│   ├── cart.validator.js        # Joi schema for cart items
│   ├── order.validator.js       # Joi schema for orders & status
│   ├── coupon.validator.js      # Joi schema for coupons
│   └── review.validator.js      # Joi schema for reviews
├── scripts/
│   ├── seed.js                  # Database seed script with realistic data
│   └── test-api.js              # 33-step automated E2E integration test runner
├── postman/
│   └── ecommerce_api.postman_collection.json # Ready-to-import Postman test suite
├── .env                         # Environment variables (git-ignored)
├── .env.example                 # Environment variables template
├── .gitignore                   # Ignored files
├── package.json                 # Project dependencies & npm scripts
├── server.js                    # Express app entry point
└── README.md                    # Project documentation
```

---

## 6. Installation & Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ installed
- [MongoDB](https://www.mongodb.com/) running locally on port `27017`

### Steps
1. **Navigate to the project root**:
   ```bash
   cd /Users/karthickraja/.gemini/antigravity-ide/scratch/ecommerce-backend-api
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. **Seed the Database with Sample Data**:
   ```bash
   npm run seed
   ```
5. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Server will start at: `http://localhost:5000`

6. **Run Automated Test Suite**:
   ```bash
   npm run test:api
   ```

---

## 7. Environment Variables

| Variable | Description | Default Value |
|---|---|---|
| `PORT` | HTTP port for the Express application | `5000` |
| `NODE_ENV` | Environment (`development`, `production`, `test`) | `development` |
| `MONGO_URI` | MongoDB connection connection string | `mongodb://127.0.0.1:27017/ecommerce_db` |
| `JWT_SECRET` | Secret key used to sign and verify JWT tokens | `super_secure_ecommerce_jwt_secret_key_2026_academic_project` |
| `JWT_EXPIRES_IN` | Validity duration for JWT authentication | `7d` |
| `LOW_STOCK_THRESHOLD` | Threshold under which products trigger low-stock alerts | `5` |

---

## 8. Database Modeling: Reference vs. Embedding

### References (Normalized)
- **User ➔ Products**: `sellerId` references `User._id`. Sellers and products are managed independently.
- **Category ➔ Sub-Categories**: `parentCategoryId` references `Category._id`. Enables hierarchical category trees without nesting depth limits.
- **Order ➔ User**: `userId` references `User._id`. Keeps user profile updates separate from past orders.
- **Review ➔ Product & User**: `productId` and `userId` reference their respective documents to maintain clean foreign key relationships and unique compound indexing (`{ productId: 1, userId: 1 }`).

### Embedding (Denormalized)
- **Order Items**: Order items are **embedded** snapshots inside `Order.items`. When an order is placed, the current `productName`, `price`, `quantity`, and calculated `subtotal` are stored directly within the order document. This guarantees historical financial integrity even if a seller changes the product name or price later.
- **User Address**: Address components (`street`, `city`, `state`, `zipCode`, `country`) are embedded directly into User and Order documents.

---

## 9. API Endpoint Summary

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a customer or seller
- `POST /api/auth/login` — Authenticate and receive JWT token
- `GET /api/auth/me` — Get current user profile (Bearer token)

### Categories (`/api/categories`)
- `GET /api/categories` — List categories (supports `?format=tree`)
- `GET /api/categories/:id` — Get category details with immediate subcategories
- `POST /api/categories` — Create category (Admin only)
- `PUT /api/categories/:id` — Update category (Admin only; circular check)
- `DELETE /api/categories/:id` — Delete category (Admin only)

### Products (`/api/products`)
- `GET /api/products` — Search and filter products (`search`, `categoryId`, `minPrice`, `maxPrice`, `rating`, `page`, `limit`, `sortBy`, `order`)
- `GET /api/products/:id` — Get single product details
- `POST /api/products` — Create product (Seller / Admin)
- `PUT /api/products/:id` — Update product (Seller owns product or Admin)
- `DELETE /api/products/:id` — Delete product (Seller owns product or Admin)

### Shopping Cart (`/api/cart`)
- `GET /api/cart` — View current customer cart with totals
- `POST /api/cart` — Add product to cart (stock check)
- `PUT /api/cart/:productId` — Update item quantity in cart
- `DELETE /api/cart/:productId` — Remove specific product from cart
- `DELETE /api/cart` — Empty cart

### Orders & Checkout (`/api/orders`)
- `POST /api/orders` — Checkout cart to order (stock decrement & coupon application)
- `GET /api/orders` — List orders (Customer sees own; Seller sees relevant; Admin sees all)
- `GET /api/orders/:id` — Get order details
- `PUT /api/orders/:id/status` — Update order status (strict state transitions)
- `PUT /api/orders/:id/payment` — Mock payment update (`Pending`, `Paid`, `Failed`, `Refunded`)

### Coupons (`/api/coupons`)
- `POST /api/coupons/apply` — Validate coupon and calculate discount
- `GET /api/coupons` — List active coupons (Admin sees all)
- `POST /api/coupons` — Create coupon (Admin only)
- `PUT /api/coupons/:id` — Update coupon (Admin only)
- `DELETE /api/coupons/:id` — Delete coupon (Admin only)

### Reviews (`/api/products/:id/reviews` & `/api/reviews`)
- `GET /api/products/:id/reviews` — Get all reviews for a product
- `POST /api/products/:id/reviews` — Submit review (Customer with delivered order)
- `PUT /api/reviews/:id` — Update own review
- `DELETE /api/reviews/:id` — Delete review (Author or Admin)

### Seller Dashboard (`/api/seller`)
- `GET /api/seller/dashboard` — Overview metrics (revenue, orders, low-stock count)
- `GET /api/seller/products/performance` — Per-product sales & revenue metrics
- `GET /api/seller/orders/pending` — Orders waiting for confirmation/shipping
- `GET /api/seller/products/low-stock` — Products with stock <= threshold

### Admin Reports (`/api/admin`)
- `GET /api/admin/reports/overview` — Platform-wide revenue, users, and orders
- `GET /api/admin/reports/sales` — Daily sales trends & payment breakdown
- `GET /api/admin/reports/products` — Top sellers, stock health & category breakdown
- `GET /api/admin/reports/users` — Role breakdown & user growth
- `GET /api/admin/reports/orders` — Order status distribution

---

## 10. Core Business Rules Implemented

1. **Duplicate Email Prevention**: Registration fails with HTTP 409 and `BUSINESS_RULE_ERROR` if an email is already in use.
2. **Role-Based Access Control**: Protected routes enforce `Customer`, `Seller`, or `Admin` privileges. Unauthorized calls return 401, while forbidden actions return 403.
3. **Seller Data Isolation**: Sellers can only view, edit, or delete their own products. Sellers cannot view sales or orders of other sellers.
4. **Stock Oversell Prevention**: Checkout uses atomic conditional decrements (`findOneAndUpdate({ _id, stock: { $gte: qty } })`). If stock is insufficient, the transaction fails and rolls back.
5. **Server-Side Financial Calculations**: Cart and order totals are calculated dynamically from product database records. Client-provided prices are ignored.
6. **Strict Order State Workflow**:
   - `Placed` ➔ `Confirmed` or `Cancelled`
   - `Confirmed` ➔ `Shipped` or `Cancelled`
   - `Shipped` ➔ `Delivered`
   - Prohibited jumps (e.g. `Delivered ➔ Shipped` or `Cancelled ➔ Confirmed`) are rejected with HTTP 400 and `INVALID_STATUS_TRANSITION`.
7. **Inventory Replenishment**: When an order in `Placed` or `Confirmed` status is cancelled, product stock is automatically restored to the inventory.
8. **Coupon Eligibility**: Enforces expiry checks, minimum order values, and prevents negative final amounts.
9. **Verified Purchase Reviews**: A customer can only review a product if they have an order containing that product in `Delivered` status.
10. **Review Uniqueness**: Unique compound index `{ productId: 1, userId: 1 }` prevents a customer from posting duplicate reviews for the same product.
11. **Real-Time Rating Aggregation**: Mongoose post-hooks automatically recalculate and update `ratingAvg` and `ratingCount` on the product whenever a review is added, edited, or removed.
12. **Circular Category Prevention**: Categories cannot be set as their own parent or as a child of any of their descendants.

---

## 11. Seed Data Credentials

The seed script (`npm run seed`) populates the following accounts for immediate testing:

| Role | Email | Password | Details |
|---|---|---|---|
| **Admin** | `admin@example.com` | `Admin@123` | Global administrative access |
| **Seller 1** | `seller1@example.com` | `Seller@123` | ElectroTech (Smartphones, Laptops) |
| **Seller 2** | `seller2@example.com` | `Seller@123` | VogueApparel (Clothing, Footwear) |
| **Customer 1** | `customer1@example.com` | `Customer@123` | Has delivered order (Eligible for reviews) |
| **Customer 2** | `customer2@example.com` | `Customer@123` | Active customer for checkout demos |

---

## 12. Postman Testing Guide

1. Open **Postman**.
2. Click **Import** and select:
   `/Users/karthickraja/.gemini/antigravity-ide/scratch/ecommerce-backend-api/postman/ecommerce_api.postman_collection.json`
3. Execute the collection requests in sequence:
   - Run **Login as Admin** / **Login as Seller 1** / **Login as Customer 1**: Test scripts automatically store JWT tokens into collection variables (`adminToken`, `seller1Token`, `customerToken`).
   - Run **RBAC Edge Cases**: Confirms `401 Unauthorized` and `403 Forbidden` responses.
   - Run **Cart & Order Checkout**: Tests stock checking, coupon application, and cart clearance.
   - Run **Workflow Transitions**: Validates order state progression and status rule rejections.
   - Run **Reviews**: Verifies purchase check on delivered items.
   - Run **Seller & Admin Analytics**: Tests aggregate reporting endpoints.

---

## 13. Known Limitations & Future Roadmap

- **Payment Gateway**: Current implementation uses a mock payment system. A production environment would integrate Stripe, Razorpay, or PayPal webhook listeners with idempotent event handlers.
- **Cloud Image Storage**: Product images currently store URLs. Future versions can integrate AWS S3 or Cloudinary with Multer for direct file uploads.
- **Distributed Caching**: High-frequency search queries could be cached using Redis with cache-invalidation on product mutations.

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const Review = require('../models/Review');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Seed]: Connected to MongoDB');

    // Clean existing database
    console.log('[Seed]: Cleaning existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Cart.deleteMany({}),
      Order.deleteMany({}),
      Coupon.deleteMany({}),
      Review.deleteMany({})
    ]);

    console.log('[Seed]: Creating Users...');
    const adminPassword = await User.hashPassword('Admin@123');
    const sellerPassword = await User.hashPassword('Seller@123');
    const customerPassword = await User.hashPassword('Customer@123');

    const [admin, seller1, seller2, customer1, customer2] = await User.create([
      {
        name: 'System Admin',
        email: 'admin@example.com',
        passwordHash: adminPassword,
        role: 'Admin',
        address: {
          street: '100 Admin Blvd',
          city: 'Tech City',
          state: 'California',
          zipCode: '90001',
          country: 'USA'
        }
      },
      {
        name: 'ElectroTech Seller',
        email: 'seller1@example.com',
        passwordHash: sellerPassword,
        role: 'Seller',
        address: {
          street: '202 Silicon Way',
          city: 'San Jose',
          state: 'California',
          zipCode: '95101',
          country: 'USA'
        }
      },
      {
        name: 'VogueApparel Seller',
        email: 'seller2@example.com',
        passwordHash: sellerPassword,
        role: 'Seller',
        address: {
          street: '404 Fashion Ave',
          city: 'New York',
          state: 'New York',
          zipCode: '10001',
          country: 'USA'
        }
      },
      {
        name: 'Alice Customer',
        email: 'customer1@example.com',
        passwordHash: customerPassword,
        role: 'Customer',
        address: {
          street: '12 Maple Street',
          city: 'Boston',
          state: 'Massachusetts',
          zipCode: '02108',
          country: 'USA'
        }
      },
      {
        name: 'Bob Buyer',
        email: 'customer2@example.com',
        passwordHash: customerPassword,
        role: 'Customer',
        address: {
          street: '77 Pine Road',
          city: 'Seattle',
          state: 'Washington',
          zipCode: '98101',
          country: 'USA'
        }
      }
    ]);

    console.log('[Seed]: Creating Categories...');
    // Root categories
    const electronics = await Category.create({
      name: 'Electronics',
      parentCategoryId: null
    });

    const fashion = await Category.create({
      name: 'Fashion & Apparel',
      parentCategoryId: null
    });

    // Subcategories
    const smartPhones = await Category.create({
      name: 'Smartphones',
      parentCategoryId: electronics._id
    });

    const laptops = await Category.create({
      name: 'Laptops',
      parentCategoryId: electronics._id
    });

    const mensWear = await Category.create({
      name: "Men's Clothing",
      parentCategoryId: fashion._id
    });

    const footwear = await Category.create({
      name: 'Footwear',
      parentCategoryId: fashion._id
    });

    console.log('[Seed]: Creating Products...');
    const products = await Product.create([
      {
        name: 'iPhone 15 Pro Max',
        description: 'Titanium design, A17 Pro chip, 48MP main camera system with 5x optical zoom.',
        price: 1199,
        categoryId: smartPhones._id,
        sellerId: seller1._id,
        stock: 25,
        images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569']
      },
      {
        name: 'Samsung Galaxy S24 Ultra',
        description: 'Galaxy AI is here. 200MP camera, built-in S Pen, and Snapdragon 8 Gen 3 processor.',
        price: 1299,
        categoryId: smartPhones._id,
        sellerId: seller1._id,
        stock: 18,
        images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf']
      },
      {
        name: 'MacBook Pro 16" M3 Max',
        description: 'Extreme performance with 16-core CPU, 40-core GPU, 36GB unified memory.',
        price: 3499,
        categoryId: laptops._id,
        sellerId: seller1._id,
        stock: 10,
        images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8']
      },
      {
        name: 'Compact Mechanical Gaming Keyboard',
        description: 'Hot-swappable RGB mechanical switches, gasket mounted, USB-C connectivity.',
        price: 89,
        categoryId: electronics._id,
        sellerId: seller1._id,
        stock: 3, // Low stock product (threshold <= 5)
        images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3']
      },
      {
        name: 'Multiport 7-in-1 USB-C Hub',
        description: '4K HDMI, 100W Power Delivery, SD/TF card reader, 3x USB 3.0 ports.',
        price: 39,
        categoryId: electronics._id,
        sellerId: seller1._id,
        stock: 2, // Low stock product
        images: ['https://images.unsplash.com/photo-1622445262464-84b1456045b6']
      },
      {
        name: 'Classic Vintage Denim Jacket',
        description: '100% durable cotton denim with metal button closure and relaxed chest fit.',
        price: 79,
        categoryId: mensWear._id,
        sellerId: seller2._id,
        stock: 40,
        images: ['https://images.unsplash.com/photo-1576995853123-5a10305d93c0']
      },
      {
        name: 'Pro Performance Running Shoes',
        description: 'Breathable flyknit upper, responsive cushioned foam sole, high traction grip.',
        price: 120,
        categoryId: footwear._id,
        sellerId: seller2._id,
        stock: 22,
        images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff']
      },
      {
        name: 'Premium Heavyweight Crewneck T-Shirt',
        description: '240 GSM organic ring-spun combed cotton, pre-shrunk, reinforced collar.',
        price: 35,
        categoryId: mensWear._id,
        sellerId: seller2._id,
        stock: 60,
        images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518']
      },
      {
        name: 'Handcrafted Heritage Leather Boots',
        description: 'Full-grain waterproof leather, Goodyear welt construction, Vibram lug outsole.',
        price: 260,
        categoryId: footwear._id,
        sellerId: seller2._id,
        stock: 0, // Out of stock
        images: ['https://images.unsplash.com/photo-1520639888713-7851133b1ed0']
      }
    ]);

    console.log('[Seed]: Creating Coupons...');
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const fifteenDaysLater = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    await Coupon.create([
      {
        code: 'WELCOME10',
        discountType: 'percentage',
        value: 10,
        minOrderValue: 50,
        validTill: thirtyDaysLater,
        isActive: true
      },
      {
        code: 'FLAT500',
        discountType: 'flat',
        value: 500,
        minOrderValue: 1500,
        validTill: thirtyDaysLater,
        isActive: true
      },
      {
        code: 'SAVE20',
        discountType: 'percentage',
        value: 20,
        minOrderValue: 100,
        validTill: fifteenDaysLater,
        isActive: true
      },
      {
        code: 'EXPIRED50',
        discountType: 'percentage',
        value: 50,
        minOrderValue: 50,
        validTill: tenDaysAgo,
        isActive: true
      }
    ]);

    console.log('[Seed]: Creating Historical Orders for analytics and review demonstrations...');
    // Order 1: Delivered order for customer1 (allows customer1 to review iPhone and Running Shoes)
    const deliveredOrder = await Order.create({
      userId: customer1._id,
      items: [
        {
          productId: products[0]._id, // iPhone 15 Pro Max
          productName: products[0].name,
          price: products[0].price,
          quantity: 1,
          subtotal: products[0].price
        },
        {
          productId: products[6]._id, // Running Shoes
          productName: products[6].name,
          price: products[6].price,
          quantity: 1,
          subtotal: products[6].price
        }
      ],
      totalAmount: products[0].price + products[6].price,
      discountAmount: 0,
      shippingAddress: customer1.address,
      status: 'Delivered',
      paymentMode: 'CARD',
      paymentStatus: 'Paid'
    });

    // Order 2: Placed order for customer2
    await Order.create({
      userId: customer2._id,
      items: [
        {
          productId: products[5]._id, // Denim Jacket
          productName: products[5].name,
          price: products[5].price,
          quantity: 1,
          subtotal: products[5].price
        }
      ],
      totalAmount: products[5].price,
      discountAmount: 0,
      shippingAddress: customer2.address,
      status: 'Placed',
      paymentMode: 'COD',
      paymentStatus: 'Pending'
    });

    console.log('[Seed]: Creating Initial Reviews...');
    const rev1 = await Review.create({
      productId: products[0]._id,
      userId: customer1._id,
      rating: 5,
      comment: 'Superb build quality! The titanium frame feels so light and premium in hand.'
    });

    await Review.calcAverageRating(products[0]._id);

    console.log('[Seed]: Database successfully seeded!');
    console.log('\n--- Seeded Credentials Summary ---');
    console.log('Admin:      admin@example.com      / Admin@123');
    console.log('Seller 1:   seller1@example.com    / Seller@123');
    console.log('Seller 2:   seller2@example.com    / Seller@123');
    console.log('Customer 1: customer1@example.com  / Customer@123');
    console.log('Customer 2: customer2@example.com  / Customer@123');
    console.log('------------------------------------\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedDatabase();

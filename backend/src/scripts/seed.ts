/**
 * Seed script for PostgreSQL.
 * Seeds categories, brands, and products into the database.
 *
 * Usage: npx ts-node src/scripts/seed.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Seed Data ─────────────────────────────────────────────

const CATEGORIES = [
    { name: 'Electronics', slug: 'electronics' },
    { name: 'Apparel', slug: 'apparel' },
    { name: 'Accessories', slug: 'accessories' },
    { name: 'Home & Living', slug: 'home-living' },
    { name: 'Sports', slug: 'sports' },
    { name: 'Beauty', slug: 'beauty' },
];

const BRANDS = [
    { name: 'TechPro', slug: 'techpro' },
    { name: 'Niko', slug: 'niko' },
    { name: 'UrbanStyle', slug: 'urbanstyle' },
    { name: 'FitLife', slug: 'fitlife' },
    { name: 'HomeComfort', slug: 'homecomfort' },
    { name: 'GlowUp', slug: 'glowup' },
];

const PRODUCTS = [
    {
        name: 'Wireless Noise-Cancelling Headphones',
        slug: 'wireless-noise-cancelling-headphones',
        description: 'Premium over-ear headphones with active noise cancellation, 30-hour battery life, and crystal-clear audio.',
        price: 299.99,
        originalPrice: 399.99,
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600'],
        categorySlug: 'electronics',
        brandSlug: 'techpro',
        rating: 4.7,
        reviewCount: 234,
        isTrending: true,
        stock: 50,
    },
    {
        name: 'Smart Fitness Watch',
        slug: 'smart-fitness-watch',
        description: 'Track your health with heart rate monitoring, GPS, and 7-day battery life. Water resistant to 50m.',
        price: 199.99,
        originalPrice: 249.99,
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'],
        categorySlug: 'electronics',
        brandSlug: 'fitlife',
        rating: 4.5,
        reviewCount: 189,
        isTrending: true,
        stock: 75,
    },
    {
        name: 'Premium Leather Backpack',
        slug: 'premium-leather-backpack',
        description: 'Handcrafted full-grain leather backpack with laptop compartment. Perfect for work and travel.',
        price: 149.99,
        originalPrice: 199.99,
        images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600'],
        categorySlug: 'accessories',
        brandSlug: 'urbanstyle',
        rating: 4.8,
        reviewCount: 156,
        isTrending: false,
        stock: 30,
    },
    {
        name: 'Running Shoes Ultra Lite',
        slug: 'running-shoes-ultra-lite',
        description: 'Lightweight running shoes with responsive cushioning and breathable mesh upper.',
        price: 129.99,
        originalPrice: 159.99,
        images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'],
        categorySlug: 'sports',
        brandSlug: 'niko',
        rating: 4.6,
        reviewCount: 312,
        isTrending: true,
        stock: 100,
    },
    {
        name: 'Organic Face Serum',
        slug: 'organic-face-serum',
        description: '100% organic vitamin C serum for glowing, youthful skin. Dermatologist recommended.',
        price: 49.99,
        originalPrice: 69.99,
        images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600'],
        categorySlug: 'beauty',
        brandSlug: 'glowup',
        rating: 4.4,
        reviewCount: 98,
        isTrending: false,
        stock: 200,
    },
    {
        name: 'Minimalist Desk Lamp',
        slug: 'minimalist-desk-lamp',
        description: 'Modern LED desk lamp with adjustable brightness and color temperature. USB-C charging port.',
        price: 79.99,
        images: ['https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=600'],
        categorySlug: 'home-living',
        brandSlug: 'homecomfort',
        rating: 4.3,
        reviewCount: 67,
        isTrending: false,
        stock: 45,
    },
    {
        name: 'Classic Denim Jacket',
        slug: 'classic-denim-jacket',
        description: 'Timeless denim jacket with a modern fit. Made from premium selvedge denim.',
        price: 89.99,
        originalPrice: 119.99,
        images: ['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600'],
        categorySlug: 'apparel',
        brandSlug: 'urbanstyle',
        rating: 4.5,
        reviewCount: 203,
        isTrending: true,
        stock: 60,
    },
    {
        name: 'Bluetooth Portable Speaker',
        slug: 'bluetooth-portable-speaker',
        description: 'Waterproof portable speaker with 360° sound and 20-hour battery. Perfect for outdoor adventures.',
        price: 69.99,
        originalPrice: 89.99,
        images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600'],
        categorySlug: 'electronics',
        brandSlug: 'techpro',
        rating: 4.2,
        reviewCount: 145,
        isTrending: false,
        stock: 80,
    },
    {
        name: 'Yoga Mat Premium',
        slug: 'yoga-mat-premium',
        description: 'Extra thick eco-friendly yoga mat with alignment lines. Non-slip surface for all yoga styles.',
        price: 59.99,
        images: ['https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=600'],
        categorySlug: 'sports',
        brandSlug: 'fitlife',
        rating: 4.7,
        reviewCount: 88,
        isTrending: false,
        stock: 120,
    },
    {
        name: 'Stainless Steel Water Bottle',
        slug: 'stainless-steel-water-bottle',
        description: 'Double-wall insulated water bottle that keeps drinks cold for 24h or hot for 12h.',
        price: 34.99,
        images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600'],
        categorySlug: 'accessories',
        brandSlug: 'fitlife',
        rating: 4.6,
        reviewCount: 276,
        isTrending: true,
        stock: 150,
    },
    {
        name: 'Wireless Charging Pad',
        slug: 'wireless-charging-pad',
        description: 'Fast wireless charger compatible with all Qi-enabled devices. Sleek minimalist design.',
        price: 29.99,
        images: ['https://images.unsplash.com/photo-1586816879360-004f5b0c51e3?w=600'],
        categorySlug: 'electronics',
        brandSlug: 'techpro',
        rating: 4.1,
        reviewCount: 134,
        isTrending: false,
        stock: 90,
    },
    {
        name: 'Scented Candle Set',
        slug: 'scented-candle-set',
        description: 'Set of 3 hand-poured soy candles in lavender, vanilla, and sandalwood. 40-hour burn time each.',
        price: 39.99,
        images: ['https://images.unsplash.com/photo-1602607666160-e3149e834783?w=600'],
        categorySlug: 'home-living',
        brandSlug: 'homecomfort',
        rating: 4.8,
        reviewCount: 92,
        isTrending: false,
        stock: 70,
    },
];

// ─── Main Seed Function ────────────────────────────────────

async function main() {
    console.log('🌱 Starting seed...\n');

    // Clear existing data
    console.log('  Clearing existing data...');
    await prisma.review.deleteMany();
    await prisma.wishlistItem.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.brand.deleteMany();
    await prisma.address.deleteMany();
    await prisma.user.deleteMany();

    // Seed categories
    console.log('  Seeding categories...');
    const categoryMap = new Map<string, string>();
    for (const cat of CATEGORIES) {
        const created = await prisma.category.create({ data: cat });
        categoryMap.set(cat.slug, created.id);
    }

    // Seed brands
    console.log('  Seeding brands...');
    const brandMap = new Map<string, string>();
    for (const brand of BRANDS) {
        const created = await prisma.brand.create({ data: brand });
        brandMap.set(brand.slug, created.id);
    }

    // Seed products + inventory
    console.log('  Seeding products + inventory...');
    for (const product of PRODUCTS) {
        const categoryId = categoryMap.get(product.categorySlug)!;
        const brandId = brandMap.get(product.brandSlug)!;

        await prisma.product.create({
            data: {
                name: product.name,
                slug: product.slug,
                description: product.description,
                price: product.price,
                originalPrice: product.originalPrice,
                images: product.images,
                rating: product.rating,
                reviewCount: product.reviewCount,
                isTrending: product.isTrending,
                categoryId,
                brandId,
                inventory: {
                    create: {
                        quantity: product.stock,
                        reserved: 0,
                    },
                },
            },
        });
    }

    console.log(`\n✅ Seeded ${CATEGORIES.length} categories, ${BRANDS.length} brands, ${PRODUCTS.length} products`);
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

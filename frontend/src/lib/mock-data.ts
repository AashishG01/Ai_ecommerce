import type { Product, Category, Brand, Review } from './types';
import { placeholderImages } from './placeholder-images.json';

export const allBrands: Brand[] = [
  { id: '1', name: 'Niko', slug: 'niko' },
  { id: '2', name: 'Soni', slug: 'soni' },
  { id: '3', name: 'Adida', slug: 'adida' },
  { id: '4', name: 'Pupple', slug: 'pupple' },
  { id: '5', name: 'Zephyr', slug: 'zephyr' },
  { id: '6', name: 'Lumina', slug: 'lumina' },
];

export const allCategories: Category[] = [
  { id: '1', name: 'Apparel', slug: 'apparel' },
  { id: '2', name: 'Electronics', slug: 'electronics' },
  { id: '3', name: 'Accessories', slug: 'accessories' },
  { id: '4', name: 'Home Goods', slug: 'home-goods' },
];

// Helper to get first image from placeholder JSON or fallback
const getImg = (id: string, fallback: string) => {
  const found = placeholderImages.filter(p => p.id.startsWith(id)).map(p => p.imageUrl);
  return found.length > 0 ? found : [fallback];
};

export const allProducts: Product[] = [
  // ═══════════════════════════════════════════════════════════
  // APPAREL (IDs 1-15)
  // ═══════════════════════════════════════════════════════════
  {
    id: '1', name: 'Urban Explorer Backpack', slug: 'urban-explorer-backpack',
    description: 'A stylish and durable backpack for your daily commute or weekend adventures. Features multiple compartments and a padded laptop sleeve.',
    price: 89.99, originalPrice: 120.0,
    images: getImg('product-1', 'https://images.unsplash.com/photo-1600019248002-f4c4898f739b?w=400'),
    category: allCategories[0], brand: allBrands[0], rating: 4.5, reviewCount: 120, stock: 50, isTrending: true,
  },
  {
    id: '4', name: 'StrideMax Runners', slug: 'stridemax-runners',
    description: 'Lightweight and responsive running shoes designed for maximum comfort and performance. Perfect for both casual joggers and serious runners.',
    price: 130.0,
    images: getImg('product-4', 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400'),
    category: allCategories[0], brand: allBrands[2], rating: 4.6, reviewCount: 180, stock: 100, isTrending: true,
  },
  {
    id: '9', name: 'Classic Denim Jeans', slug: 'classic-denim-jeans',
    description: 'A wardrobe staple. These high-quality denim jeans offer a comfortable fit and timeless style.',
    price: 75.0,
    images: getImg('product-9', 'https://images.unsplash.com/photo-1714729382668-7bc3bb261662?w=400'),
    category: allCategories[0], brand: allBrands[2], rating: 4.5, reviewCount: 200, stock: 80, isTrending: false,
  },
  {
    id: '10', name: 'Cozy Knit Sweater', slug: 'cozy-knit-sweater',
    description: 'Stay warm and stylish with this soft, comfortable knit sweater. Perfect for chilly evenings.',
    price: 65.0,
    images: getImg('product-10', 'https://images.unsplash.com/photo-1608984361471-ff566593088f?w=400'),
    category: allCategories[0], brand: allBrands[0], rating: 4.6, reviewCount: 90, stock: 60, isTrending: true,
  },
  {
    id: '13', name: 'Alpine Puffer Jacket', slug: 'alpine-puffer-jacket',
    description: 'Stay warm in extreme cold with this lightweight yet ultra-insulated puffer jacket. Water-resistant shell with recycled down fill.',
    price: 189.99, originalPrice: 249.99,
    images: ['https://images.unsplash.com/photo-1544923246-77307dd270cf?w=400'],
    category: allCategories[0], brand: allBrands[0], rating: 4.7, reviewCount: 145, stock: 35, isTrending: true,
  },
  {
    id: '14', name: 'Performance Yoga Pants', slug: 'performance-yoga-pants',
    description: 'Buttery-soft, four-way stretch yoga pants with moisture-wicking fabric. High waistband with hidden pocket.',
    price: 68.0,
    images: ['https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400'],
    category: allCategories[0], brand: allBrands[2], rating: 4.8, reviewCount: 312, stock: 90, isTrending: false,
  },
  {
    id: '15', name: 'Vintage Graphic Tee', slug: 'vintage-graphic-tee',
    description: 'Retro-inspired graphic t-shirt made from 100% organic cotton. Pre-washed for that perfectly broken-in feel.',
    price: 35.0,
    images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'],
    category: allCategories[0], brand: allBrands[4], rating: 4.3, reviewCount: 88, stock: 200, isTrending: false,
  },
  {
    id: '16', name: 'Linen Summer Dress', slug: 'linen-summer-dress',
    description: 'Effortlessly elegant linen midi dress perfect for warm days. Features adjustable straps and side pockets.',
    price: 95.0,
    images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400'],
    category: allCategories[0], brand: allBrands[5], rating: 4.6, reviewCount: 76, stock: 45, isTrending: true,
  },
  {
    id: '17', name: 'TrailBlazer Hiking Boots', slug: 'trailblazer-hiking-boots',
    description: 'Rugged waterproof hiking boots with Vibram outsoles. Ankle support and cushioned insoles for all-day comfort on the trail.',
    price: 175.0, originalPrice: 220.0,
    images: ['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400'],
    category: allCategories[0], brand: allBrands[0], rating: 4.7, reviewCount: 230, stock: 40, isTrending: false,
  },
  {
    id: '18', name: 'Slim Fit Chino Pants', slug: 'slim-fit-chino-pants',
    description: 'Versatile slim-fit chinos in stretch cotton twill. Dress them up or down — perfect for office or weekend.',
    price: 59.99,
    images: ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400'],
    category: allCategories[0], brand: allBrands[2], rating: 4.4, reviewCount: 167, stock: 120, isTrending: false,
  },
  {
    id: '19', name: 'Cashmere Blend Scarf', slug: 'cashmere-blend-scarf',
    description: 'Luxuriously soft cashmere-wool blend scarf. Lightweight enough for spring, warm enough for winter.',
    price: 85.0,
    images: ['https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400'],
    category: allCategories[0], brand: allBrands[5], rating: 4.8, reviewCount: 54, stock: 30, isTrending: false,
  },
  {
    id: '20', name: 'Athletic Performance Shorts', slug: 'athletic-performance-shorts',
    description: 'Quick-dry athletic shorts with built-in liner. Reflective details and zippered pockets for your run or gym session.',
    price: 45.0,
    images: ['https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400'],
    category: allCategories[0], brand: allBrands[2], rating: 4.5, reviewCount: 198, stock: 150, isTrending: false,
  },

  // ═══════════════════════════════════════════════════════════
  // ELECTRONICS (IDs 2,5,8,12, 21-32)
  // ═══════════════════════════════════════════════════════════
  {
    id: '2', name: 'AcousticBliss Wireless Headphones', slug: 'acousticbliss-wireless-headphones',
    description: 'Immerse yourself in high-fidelity sound with these noise-cancelling wireless headphones. Long-lasting battery and comfortable design.',
    price: 199.99,
    images: getImg('product-2', 'https://images.unsplash.com/photo-1628202926206-c63a34b1618f?w=400'),
    category: allCategories[1], brand: allBrands[1], rating: 4.8, reviewCount: 250, stock: 30, isTrending: true,
  },
  {
    id: '5', name: 'SmartHome Hub', slug: 'smarthome-hub',
    description: 'The central command for your smart home. Control lights, thermostats, and other devices with your voice.',
    price: 129.99, originalPrice: 150.0,
    images: getImg('product-5', 'https://images.unsplash.com/photo-1752262167753-37a0ec83f614?w=400'),
    category: allCategories[1], brand: allBrands[1], rating: 4.4, reviewCount: 75, stock: 45, isTrending: false,
  },
  {
    id: '8', name: 'ZenBook Pro Laptop', slug: 'zenbook-pro-laptop',
    description: 'A powerful and sleek laptop for professionals and creatives. Features a stunning 4K display and top-of-the-line specs.',
    price: 1499.99,
    images: getImg('product-8', 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400'),
    category: allCategories[1], brand: allBrands[1], rating: 4.7, reviewCount: 110, stock: 15, isTrending: false,
  },
  {
    id: '12', name: 'Compact Digital Camera', slug: 'compact-digital-camera',
    description: "Capture life's moments in stunning detail. This compact camera is perfect for travel and everyday use.",
    price: 450.0,
    images: getImg('product-12', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400'),
    category: allCategories[1], brand: allBrands[1], rating: 4.7, reviewCount: 130, stock: 25, isTrending: false,
  },
  {
    id: '21', name: 'ProMax Wireless Earbuds', slug: 'promax-wireless-earbuds',
    description: 'True wireless earbuds with active noise cancellation, transparency mode, and 30-hour total battery life with the case.',
    price: 149.99, originalPrice: 199.99,
    images: ['https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400'],
    category: allCategories[1], brand: allBrands[1], rating: 4.6, reviewCount: 420, stock: 80, isTrending: true,
  },
  {
    id: '22', name: '4K Ultra HD Monitor', slug: '4k-ultra-hd-monitor',
    description: '32-inch 4K UHD monitor with HDR support, USB-C connectivity, and factory-calibrated colors for creators.',
    price: 549.99,
    images: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400'],
    category: allCategories[1], brand: allBrands[1], rating: 4.8, reviewCount: 95, stock: 20, isTrending: false,
  },
  {
    id: '23', name: 'Mechanical Gaming Keyboard', slug: 'mechanical-gaming-keyboard',
    description: 'RGB mechanical keyboard with hot-swappable switches, per-key lighting, and aircraft-grade aluminum frame.',
    price: 129.99,
    images: ['https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400'],
    category: allCategories[1], brand: allBrands[4], rating: 4.7, reviewCount: 380, stock: 55, isTrending: true,
  },
  {
    id: '24', name: 'Portable Bluetooth Speaker', slug: 'portable-bluetooth-speaker',
    description: 'Waterproof Bluetooth speaker with 360° sound, 20-hour battery life, and built-in speakerphone. Perfect for outdoors.',
    price: 79.99,
    images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400'],
    category: allCategories[1], brand: allBrands[1], rating: 4.5, reviewCount: 267, stock: 100, isTrending: false,
  },
  {
    id: '25', name: 'Smart Fitness Tracker', slug: 'smart-fitness-tracker',
    description: 'Track steps, heart rate, sleep, and 20+ exercises. AMOLED display, 7-day battery, and water resistance up to 50m.',
    price: 99.99, originalPrice: 129.99,
    images: ['https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400'],
    category: allCategories[1], brand: allBrands[2], rating: 4.4, reviewCount: 510, stock: 70, isTrending: true,
  },
  {
    id: '26', name: 'USB-C Charging Station', slug: 'usb-c-charging-station',
    description: '6-port USB-C charging station with 100W total output. GaN technology for fast, efficient charging of all your devices.',
    price: 59.99,
    images: ['https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400'],
    category: allCategories[1], brand: allBrands[4], rating: 4.6, reviewCount: 145, stock: 90, isTrending: false,
  },
  {
    id: '27', name: 'Wireless Gaming Mouse', slug: 'wireless-gaming-mouse',
    description: 'Ultra-lightweight wireless gaming mouse with 25K DPI sensor, 70-hour battery, and customizable RGB lighting.',
    price: 89.99,
    images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400'],
    category: allCategories[1], brand: allBrands[4], rating: 4.7, reviewCount: 290, stock: 65, isTrending: false,
  },
  {
    id: '28', name: 'Tablet Pro 11-inch', slug: 'tablet-pro-11-inch',
    description: '11-inch tablet with M2 chip, Liquid Retina display, and all-day battery. Perfect for drawing, note-taking, and entertainment.',
    price: 799.99,
    images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400'],
    category: allCategories[1], brand: allBrands[1], rating: 4.8, reviewCount: 180, stock: 25, isTrending: true,
  },
  {
    id: '29', name: 'Noise-Cancelling Mic', slug: 'noise-cancelling-mic',
    description: 'Professional USB condenser microphone with AI noise cancellation. Crystal-clear audio for streaming, podcasting, and calls.',
    price: 119.99,
    images: ['https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=400'],
    category: allCategories[1], brand: allBrands[5], rating: 4.5, reviewCount: 134, stock: 40, isTrending: false,
  },

  // ═══════════════════════════════════════════════════════════
  // ACCESSORIES (IDs 3,7,11, 30-40)
  // ═══════════════════════════════════════════════════════════
  {
    id: '3', name: 'ChronoClassic Wristwatch', slug: 'chronoclassic-wristwatch',
    description: 'A timeless piece that combines classic design with modern precision. Features a leather strap and stainless steel case.',
    price: 250.0,
    images: getImg('product-3', 'https://images.unsplash.com/photo-1619946928632-abefa12506e2?w=400'),
    category: allCategories[2], brand: allBrands[3], rating: 4.7, reviewCount: 95, stock: 20, isTrending: false,
  },
  {
    id: '7', name: 'HydroFlask Water Bottle', slug: 'hydroflask-water-bottle',
    description: 'Keep your drinks cold for 24 hours or hot for 12. This insulated water bottle is a must-have for any lifestyle.',
    price: 45.0,
    images: getImg('product-7', 'https://images.unsplash.com/photo-1616118133712-8c947f7b822c?w=400'),
    category: allCategories[2], brand: allBrands[0], rating: 4.8, reviewCount: 320, stock: 150, isTrending: false,
  },
  {
    id: '11', name: 'Aviator Sunglasses', slug: 'aviator-sunglasses',
    description: 'Classic aviator sunglasses with polarized lenses. Protect your eyes in style.',
    price: 150.0,
    images: getImg('product-11', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400'),
    category: allCategories[2], brand: allBrands[3], rating: 4.8, reviewCount: 150, stock: 70, isTrending: true,
  },
  {
    id: '30', name: 'Genuine Leather Wallet', slug: 'genuine-leather-wallet',
    description: 'Slim bifold wallet crafted from full-grain Italian leather. RFID blocking with 8 card slots and a bill compartment.',
    price: 79.99,
    images: ['https://images.unsplash.com/photo-1627123424574-724758594e93?w=400'],
    category: allCategories[2], brand: allBrands[3], rating: 4.6, reviewCount: 210, stock: 85, isTrending: false,
  },
  {
    id: '31', name: 'Canvas Tote Bag', slug: 'canvas-tote-bag',
    description: 'Oversized organic canvas tote with reinforced handles and interior zip pocket. Carry everything in eco-friendly style.',
    price: 38.0,
    images: ['https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=400'],
    category: allCategories[2], brand: allBrands[5], rating: 4.4, reviewCount: 130, stock: 180, isTrending: false,
  },
  {
    id: '32', name: 'Titanium Travel Mug', slug: 'titanium-travel-mug',
    description: 'Double-wall vacuum insulated titanium travel mug. Keeps coffee hot for 8 hours. Ultra-light at just 180g.',
    price: 55.0,
    images: ['https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400'],
    category: allCategories[2], brand: allBrands[4], rating: 4.7, reviewCount: 175, stock: 60, isTrending: true,
  },
  {
    id: '33', name: 'Silk Pocket Square Set', slug: 'silk-pocket-square-set',
    description: 'Set of 4 hand-rolled silk pocket squares in classic patterns. Elevate any suit or blazer instantly.',
    price: 49.99,
    images: ['https://images.unsplash.com/photo-1598532163257-ae3c6b2524f6?w=400'],
    category: allCategories[2], brand: allBrands[3], rating: 4.5, reviewCount: 67, stock: 50, isTrending: false,
  },
  {
    id: '34', name: 'Weekender Duffle Bag', slug: 'weekender-duffle-bag',
    description: 'Waxed canvas and leather weekender bag with shoe compartment. The perfect carry-on for short trips.',
    price: 135.0, originalPrice: 180.0,
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400'],
    category: allCategories[2], brand: allBrands[0], rating: 4.7, reviewCount: 89, stock: 30, isTrending: true,
  },
  {
    id: '35', name: 'Minimalist Card Holder', slug: 'minimalist-card-holder',
    description: 'Sleek aluminum card holder with RFID protection. Holds up to 12 cards with quick-access ejection mechanism.',
    price: 29.99,
    images: ['https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400'],
    category: allCategories[2], brand: allBrands[4], rating: 4.3, reviewCount: 245, stock: 200, isTrending: false,
  },
  {
    id: '36', name: 'Leather Belt — Classic', slug: 'leather-belt-classic',
    description: 'Hand-stitched full-grain leather belt with brushed nickel buckle. Will last a lifetime with proper care.',
    price: 65.0,
    images: ['https://images.unsplash.com/photo-1624222247344-550fb60ae41e?w=400'],
    category: allCategories[2], brand: allBrands[3], rating: 4.6, reviewCount: 178, stock: 75, isTrending: false,
  },
  {
    id: '37', name: 'Polarized Sport Sunglasses', slug: 'polarized-sport-sunglasses',
    description: 'Wraparound sport sunglasses with polarized lenses, anti-slip nose pads, and lightweight TR90 frame.',
    price: 89.99,
    images: ['https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400'],
    category: allCategories[2], brand: allBrands[2], rating: 4.5, reviewCount: 156, stock: 90, isTrending: false,
  },
  {
    id: '38', name: 'Beaded Bracelet Set', slug: 'beaded-bracelet-set',
    description: 'Set of 3 natural stone beaded bracelets — lava rock, tiger eye, and howlite. Adjustable and unisex.',
    price: 24.99,
    images: ['https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400'],
    category: allCategories[2], brand: allBrands[5], rating: 4.4, reviewCount: 340, stock: 250, isTrending: false,
  },

  // ═══════════════════════════════════════════════════════════
  // HOME GOODS (IDs 6, 39-50)
  // ═══════════════════════════════════════════════════════════
  {
    id: '6', name: 'AeroPress Coffee Maker', slug: 'aeropress-coffee-maker',
    description: 'Brew the perfect cup of coffee every time. The AeroPress is renowned for its rich, smooth, and grit-free coffee.',
    price: 39.95,
    images: getImg('product-6', 'https://images.unsplash.com/photo-1638129284529-bed6d6f588e7?w=400'),
    category: allCategories[3], brand: allBrands[3], rating: 4.9, reviewCount: 500, stock: 200, isTrending: true,
  },
  {
    id: '39', name: 'Bamboo Cutting Board Set', slug: 'bamboo-cutting-board-set',
    description: 'Set of 3 organic bamboo cutting boards in graduated sizes. Naturally antimicrobial with deep juice grooves.',
    price: 42.99,
    images: ['https://images.unsplash.com/photo-1594226801341-41427b4e5c22?w=400'],
    category: allCategories[3], brand: allBrands[5], rating: 4.7, reviewCount: 220, stock: 100, isTrending: false,
  },
  {
    id: '40', name: 'Cast Iron Dutch Oven', slug: 'cast-iron-dutch-oven',
    description: '6-quart enameled cast iron Dutch oven. Perfect for braising, soups, stews, and baking artisan bread.',
    price: 89.99, originalPrice: 120.0,
    images: ['https://images.unsplash.com/photo-1585232004423-244e0e6904e3?w=400'],
    category: allCategories[3], brand: allBrands[3], rating: 4.8, reviewCount: 345, stock: 50, isTrending: true,
  },
  {
    id: '41', name: 'Essential Oil Diffuser', slug: 'essential-oil-diffuser',
    description: 'Ceramic ultrasonic aromatherapy diffuser with ambient LED lighting. 300ml capacity, runs up to 10 hours.',
    price: 34.99,
    images: ['https://images.unsplash.com/photo-1602928321679-560bb453f190?w=400'],
    category: allCategories[3], brand: allBrands[5], rating: 4.5, reviewCount: 890, stock: 120, isTrending: true,
  },
  {
    id: '42', name: 'Premium Throw Blanket', slug: 'premium-throw-blanket',
    description: 'Chunky knit throw blanket in 100% cotton. Cozy, breathable, and machine washable. 50x60 inches.',
    price: 58.0,
    images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400'],
    category: allCategories[3], brand: allBrands[5], rating: 4.7, reviewCount: 410, stock: 75, isTrending: false,
  },
  {
    id: '43', name: 'Stainless Steel Knife Set', slug: 'stainless-steel-knife-set',
    description: '8-piece professional knife set with walnut block. German stainless steel blades, full tang construction.',
    price: 159.99,
    images: ['https://images.unsplash.com/photo-1566454419290-57a64afe208e?w=400'],
    category: allCategories[3], brand: allBrands[4], rating: 4.6, reviewCount: 175, stock: 35, isTrending: false,
  },
  {
    id: '44', name: 'Smart LED Desk Lamp', slug: 'smart-led-desk-lamp',
    description: 'Adjustable LED desk lamp with 5 color temperatures, auto-dimming, and wireless phone charging base.',
    price: 69.99,
    images: ['https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=400'],
    category: allCategories[3], brand: allBrands[1], rating: 4.5, reviewCount: 234, stock: 60, isTrending: false,
  },
  {
    id: '45', name: 'Ceramic Plant Pots (Set of 3)', slug: 'ceramic-plant-pots-set',
    description: 'Minimalist matte ceramic planters with bamboo saucers. Three sizes for herbs, succulents, or small plants.',
    price: 36.99,
    images: ['https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400'],
    category: allCategories[3], brand: allBrands[5], rating: 4.4, reviewCount: 567, stock: 150, isTrending: true,
  },
  {
    id: '46', name: 'French Press Coffee Maker', slug: 'french-press-coffee-maker',
    description: 'Double-wall borosilicate glass French press with precision stainless steel filter. Brew 34oz of perfect coffee.',
    price: 32.99,
    images: ['https://images.unsplash.com/photo-1572119865084-43c285814d63?w=400'],
    category: allCategories[3], brand: allBrands[3], rating: 4.6, reviewCount: 290, stock: 80, isTrending: false,
  },
  {
    id: '47', name: 'Scented Candle Collection', slug: 'scented-candle-collection',
    description: 'Set of 4 hand-poured soy wax candles: Vanilla, Lavender, Sandalwood, and Ocean Breeze. 40-hour burn each.',
    price: 44.99,
    images: ['https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=400'],
    category: allCategories[3], brand: allBrands[5], rating: 4.8, reviewCount: 678, stock: 200, isTrending: true,
  },
  {
    id: '48', name: 'Weighted Comforter', slug: 'weighted-comforter',
    description: '15lb weighted blanket with cooling glass beads and breathable bamboo cover. Improves sleep quality naturally.',
    price: 119.99, originalPrice: 159.99,
    images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400'],
    category: allCategories[3], brand: allBrands[5], rating: 4.6, reviewCount: 445, stock: 45, isTrending: false,
  },
  {
    id: '49', name: 'Pour-Over Coffee Dripper', slug: 'pour-over-coffee-dripper',
    description: 'Ceramic pour-over coffee dripper with reusable stainless steel filter. No paper filters needed — eco-friendly brewing.',
    price: 28.0,
    images: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400'],
    category: allCategories[3], brand: allBrands[3], rating: 4.5, reviewCount: 189, stock: 110, isTrending: false,
  },
  {
    id: '50', name: 'Wall Art Print Set', slug: 'wall-art-print-set',
    description: 'Set of 3 abstract botanical art prints on premium matte paper. Gallery-quality prints ready to frame. 11x14 inches each.',
    price: 49.99,
    images: ['https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400'],
    category: allCategories[3], brand: allBrands[5], rating: 4.3, reviewCount: 134, stock: 90, isTrending: false,
  },
];

export const getProductBySlug = (slug: string): Product | undefined => {
  return allProducts.find((p) => p.slug === slug);
};

export const getTrendingProducts = (): Product[] => {
  return allProducts.filter((p) => p.isTrending);
};

export const getFeaturedCategories = (): Category[] => {
  return allCategories;
};

export const getRelatedProducts = (currentProductId: string, categoryId: string): Product[] => {
  return allProducts.filter(p => p.category.id === categoryId && p.id !== currentProductId).slice(0, 4);
};

export const allReviews: Review[] = [
  { id: '1', author: 'Jane Doe', avatar: '/avatars/01.png', rating: 5, date: '2023-05-20', comment: 'Absolutely love this backpack! It\'s stylish, spacious, and very comfortable to wear. The laptop compartment is a huge plus.' },
  { id: '2', author: 'John Smith', avatar: '/avatars/02.png', rating: 4, date: '2023-05-18', comment: 'Great quality and design. My only minor complaint is that I wish it had one more small pocket on the outside.' },
  { id: '3', author: 'Emily White', avatar: '/avatars/03.png', rating: 5, date: '2023-05-15', comment: 'Perfect for my daily commute. It holds everything I need without being too bulky. Highly recommend!' },
];

export const getReviewsForProduct = (productId: string): Review[] => {
  return allReviews;
};

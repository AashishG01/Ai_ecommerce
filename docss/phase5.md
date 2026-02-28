# Phase 5 — Reviews, Search & Admin

> Complete documentation of the review system with rating aggregation, full-text product search with filters, and the admin dashboard API.

---

## Table of Contents

1. [What Was Built](#1-what-was-built)
2. [Reviews — Rating Aggregation Deep Dive](#2-reviews--rating-aggregation-deep-dive)
3. [Search — Full-Text with Filters](#3-search--full-text-with-filters)
4. [Admin Dashboard — Architecture](#4-admin-dashboard--architecture)
5. [File-by-File Breakdown](#5-file-by-file-breakdown)
6. [API Reference](#6-api-reference)
7. [Design Decisions](#7-design-decisions)

---

## 1. What Was Built

### Files Created (10 new files)

```
backend/src/modules/
├── reviews/
│   ├── reviews.schema.ts        # Zod: rating 1-5, comment max 2000
│   ├── reviews.service.ts       # CRUD + AVG() rating recalculation
│   ├── reviews.controller.ts    # HTTP handlers
│   └── reviews.routes.ts        # Listing public, CRUD requires auth
├── search/
│   ├── search.service.ts        # ILIKE search + multi-filter + autocomplete
│   ├── search.controller.ts     # Query param parsing, limit capping
│   └── search.routes.ts         # All public
└── admin/
    ├── admin.service.ts         # Dashboard stats, product/inventory/user/order ops
    ├── admin.controller.ts      # HTTP handlers
    └── admin.routes.ts          # ALL require ADMIN role
```

### Auth Requirements

| Module | Read | Write |
|--------|------|-------|
| Reviews | ❌ Public | ✅ Authenticated user |
| Search | ❌ Public | N/A |
| Admin | 🔒 ADMIN | 🔒 ADMIN |

---

## 2. Reviews — Rating Aggregation Deep Dive

### The Problem

Every product has a `rating` (e.g., 4.7) and `reviewCount` (e.g., 234) displayed on product cards. When a review is created, updated, or deleted, these numbers must stay accurate.

### Two Approaches

```
Approach 1 — Increment/Decrement (fast but drifts)

  On create: reviewCount++, rating = ((rating * (count-1)) + newRating) / count
  On delete: reviewCount--, rating = ((rating * (count+1)) - oldRating) / count

  Problem: Floating-point errors accumulate over hundreds of reviews.
  After 1000 reviews, rating might be 4.6999999999997 instead of 4.70.

Approach 2 — Recalculate from source (accurate, ours) ✅

  On any change: SELECT AVG(rating), COUNT(*) FROM reviews WHERE product_id = $1
  Then UPDATE products SET rating = avg, review_count = count

  Always accurate. No drift. Cost: one aggregate query per review change.
  Acceptable because review changes are infrequent compared to reads.
```

### The Implementation

```typescript
async function recalculateProductRating(productId: string) {
    // Prisma's aggregate gives us AVG() and COUNT() in one query
    const result = await prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { rating: true },
    });

    await prisma.product.update({
        where: { id: productId },
        data: {
            rating: result._avg.rating ?? 0,      // null if no reviews → 0
            reviewCount: result._count.rating,     // 0 if no reviews
        },
    });
}
```

**What SQL does this generate?**

```sql
-- Step 1: Aggregate
SELECT AVG(rating) as avg_rating, COUNT(rating) as count_rating
FROM reviews
WHERE product_id = 'abc-123';
-- Result: { avg_rating: 4.7, count_rating: 234 }

-- Step 2: Update product
UPDATE products
SET rating = 4.7, review_count = 234
WHERE id = 'abc-123';
```

### When is it called?

```
createReview()  → creates review → recalculateProductRating()
updateReview()  → updates review → recalculateProductRating()
deleteReview()  → deletes review → recalculateProductRating()
```

Every time a review changes, the product's denormalized `rating` and `reviewCount` are refreshed from the source of truth (the reviews table).

### One Review Per User Per Product

```prisma
// In schema.prisma
model Review {
    @@unique([userId, productId])
}
```

This database constraint means:
```
User A reviews Product X → ✅ Created
User A reviews Product X again → ❌ 409 "Already reviewed"
User A reviews Product Y → ✅ Created (different product)
User B reviews Product X → ✅ Created (different user)
```

We check in code BEFORE hitting the constraint to give a better error message:

```typescript
const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId, productId } },
});
if (existing) {
    throw new AppError(409, 'You have already reviewed this product. Use PATCH to update.');
}
```

### Delete: Author vs Admin

```typescript
export async function deleteReview(userId: string, reviewId: string, isAdmin = false) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) throw new AppError(404, 'Review not found.');

    // Authors can delete their own reviews
    // Admins can delete any review (e.g., spam, offensive content)
    if (review.userId !== userId && !isAdmin) {
        throw new AppError(403, 'You can only delete your own reviews.');
    }

    await prisma.review.delete({ where: { id: reviewId } });
    await recalculateProductRating(review.productId);  // Update averages
}
```

---

## 3. Search — Full-Text with Filters

### Search Architecture

```
Client Request:
  GET /api/search?q=wireless&categoryId=abc&minPrice=100&maxPrice=500&sortBy=price_asc&page=1

                        ┌─────────────────────┐
                        │  Parse Query Params  │
                        │  (controller)        │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │  Build WHERE clause  │
                        │  (service)           │
                        │                      │
                        │  WHERE               │
                        │    (name ILIKE '%q%'  │
                        │     OR desc ILIKE '%q%')│
                        │    AND categoryId = ? │
                        │    AND price >= 100   │
                        │    AND price <= 500   │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │  Build ORDER BY      │
                        │                      │
                        │  price ASC           │
                        └──────────┬──────────┘
                                   │
                 ┌─────────────────┼─────────────────┐
                 │                 │                  │
          ┌──────▼──────┐  ┌──────▼──────┐  ┌───────▼──────┐
          │ findMany()  │  │  count()    │  │  Response    │
          │ skip, take  │  │  (total)    │  │  products,   │
          │             │  │             │  │  pagination, │
          └─────────────┘  └─────────────┘  │  filters     │
                                            └──────────────┘
```

### All Available Filters

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `q` | string | `wireless` | Text search in name + description |
| `categoryId` | UUID | `abc-123` | Filter by category |
| `brandId` | UUID | `def-456` | Filter by brand |
| `minPrice` | number | `100` | Minimum price |
| `maxPrice` | number | `500` | Maximum price |
| `isTrending` | boolean | `true` | Only trending products |
| `sortBy` | enum | `price_asc` | Sort order |
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max 50) |

### Sort Modes

```typescript
switch (sortBy) {
    case 'price_asc':  orderBy = { price: 'asc' };   break;
    case 'price_desc': orderBy = { price: 'desc' };  break;
    case 'rating':     orderBy = { rating: 'desc' }; break;
    case 'newest':     orderBy = { createdAt: 'desc' }; break;
    default:
        // 'relevance': trending first, then highest rated
        orderBy = [{ isTrending: 'desc' }, { rating: 'desc' }];
}
```

### ILIKE vs tsvector

```
ILIKE (current — simple, works):
  WHERE name ILIKE '%wireless%'
  ✅ Simple, no setup needed
  ❌ Scans all rows (no index usage)
  ❌ No ranking by relevance
  👉 Fine for < 100K products

tsvector (upgrade path — high-traffic):
  WHERE to_tsvector('english', name || ' ' || description)
        @@ to_tsquery('english', 'wireless')
  ✅ Uses GIN index (milliseconds even on millions of rows)
  ✅ Handles stemming: "running" matches "run"
  ✅ Can rank by relevance with ts_rank()
  ❌ Requires migration to add tsvector column + index

  To upgrade: add a Prisma migration with raw SQL:
    ALTER TABLE products ADD COLUMN search_vector tsvector;
    CREATE INDEX idx_products_search ON products USING gin(search_vector);
    CREATE TRIGGER update_search_vector BEFORE INSERT OR UPDATE ON products
      FOR EACH ROW EXECUTE FUNCTION
      tsvector_update_trigger(search_vector, 'pg_catalog.english', name, description);
```

### Autocomplete Suggestions

```typescript
export async function getSearchSuggestions(query: string, limit = 5) {
    if (!query || query.trim().length < 2) return [];  // Min 2 chars

    const products = await prisma.product.findMany({
        where: { name: { contains: query.trim(), mode: 'insensitive' } },
        select: { id: true, name: true, slug: true, images: true },
        take: limit,
        orderBy: { rating: 'desc' },  // Show best-rated matches first
    });

    return products;
}
```

Returns minimal data (just name, slug, image) for fast dropdown rendering. Sorted by rating so popular products appear first.

---

## 4. Admin Dashboard — Architecture

### Dashboard Stats (7 Metrics in Parallel)

```typescript
const [
    totalUsers,
    totalProducts,
    totalOrders,
    revenueResult,
    pendingOrders,
    lowStockProducts,
    recentOrders,
] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.aggregate({
        where: { status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
        _sum: { total: true },
    }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.product.count({
        where: { inventory: { quantity: { lte: 10 } } },
    }),
    prisma.order.findMany({ take: 5, orderBy: { createdAt: 'desc' }, ... }),
]);
```

**Why `Promise.all`?**

```
Sequential (slow):
  totalUsers    → 15ms
  totalProducts → 12ms
  totalOrders   → 18ms
  revenue       → 25ms
  pending       → 10ms
  lowStock      → 20ms
  recent        → 22ms
  Total: ~122ms

Parallel via Promise.all (fast):
  All 7 queries fired at once
  Total: ~25ms (limited by slowest query)
  4.9x faster ✅
```

### Safe Product Deletion

```typescript
export async function deleteProduct(productId: string) {
    // Check for pending orders containing this product
    const pendingOrderItems = await prisma.orderItem.count({
        where: {
            productId,
            order: { status: { in: ['PENDING', 'PAID'] } },
        },
    });

    if (pendingOrderItems > 0) {
        throw new AppError(400,
            `Cannot delete: ${pendingOrderItems} pending/paid orders contain this product.`
        );
    }

    // Safe to delete: remove all related records first
    await prisma.$transaction([
        prisma.cartItem.deleteMany({ where: { productId } }),
        prisma.wishlistItem.deleteMany({ where: { productId } }),
        prisma.review.deleteMany({ where: { productId } }),
        prisma.inventory.deleteMany({ where: { productId } }),
        prisma.product.delete({ where: { id: productId } }),
    ]);
}
```

**Why can't we just `DELETE products WHERE id = ?`?**

Foreign key constraints would fail:
```
DELETE products WHERE id = 'abc'
→ ERROR: update or delete on table "products" violates foreign key constraint
  on table "cart_items"
```

We must delete child records first (cart items → wishlist items → reviews → inventory → product). The transaction ensures all-or-nothing.

### Bulk Inventory Update

```typescript
export async function bulkUpdateInventory(
    updates: Array<{ productId: string; quantity: number }>
) {
    const results = await prisma.$transaction(
        updates.map((u) =>
            prisma.inventory.update({
                where: { productId: u.productId },
                data: { quantity: u.quantity },
            })
        )
    );
    return results;
}
```

**Use case:** Warehouse receives a shipment of 50 different products. Instead of 50 separate API calls, one call with:

```json
{
    "updates": [
        { "productId": "abc", "quantity": 150 },
        { "productId": "def", "quantity": 200 },
        { "productId": "ghi", "quantity": 75 }
    ]
}
```

All updates happen in a single transaction — if one fails (e.g., invalid productId), none are applied.

### Route-Level Double Middleware

```typescript
router.use(authenticate);       // Must be logged in
router.use(authorize('ADMIN')); // Must be ADMIN role

// All routes below are protected by BOTH middlewares
router.get('/dashboard', controller.getDashboard);
```

This is the **Chain of Responsibility** pattern applied at the router level:

```
Request → authenticate → authorize('ADMIN') → controller
   ↓           ↓                ↓
  401 if     403 if         Actual logic
  no JWT     not ADMIN
```

---

## 5. File-by-File Breakdown

### `reviews.schema.ts`

```typescript
export const createReviewSchema = z.object({
    productId: z.string().uuid('Invalid product ID'),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(2000).trim().optional(),
});
```

- Rating is `int()` — no 4.5 stars, only whole numbers (1-5). Simplifies aggregation.
- Comment max 2000 chars — prevents abuse (someone pasting entire books).
- Comment is optional — some users just want to rate without writing.

### `search.controller.ts` — Limit Capping

```typescript
limit: Math.min(parseInt(req.query.limit as string) || 20, 50),
```

Why `Math.min(..., 50)`? Without capping:
```
GET /api/search?q=a&limit=999999
→ Returns ALL products matching "a"
→ Huge response, slow query, possible OOM
```

With capping: even if user requests 999999, they get at most 50.

### `admin.service.ts` — Revenue Calculation

```typescript
prisma.order.aggregate({
    where: { status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
    _sum: { total: true },
})
```

Only counts orders that were actually paid. PENDING and CANCELLED orders are excluded — they don't represent real revenue.

---

## 6. API Reference

### Reviews

#### `GET /api/reviews/product/:productId` — List reviews (public)

**Query:** `?page=1&limit=10`

**Response (200):**
```json
{
    "success": true,
    "data": {
        "reviews": [
            {
                "id": "review-uuid",
                "rating": 5,
                "comment": "Amazing product!",
                "createdAt": "2026-02-28T...",
                "user": { "id": "user-uuid", "name": "John Doe" }
            }
        ],
        "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
    }
}
```

#### `POST /api/reviews` — Create (auth required)

**Request:** `{ "productId": "uuid", "rating": 5, "comment": "Great!" }`

**Errors:** `404` Product not found, `409` Already reviewed.

#### `GET /api/reviews/mine/:productId` — Current user's review

#### `PATCH /api/reviews/:reviewId` — Update (author only)

#### `DELETE /api/reviews/:reviewId` — Delete (author or admin)

---

### Search

#### `GET /api/search` — Full search

**Query:** `?q=headphones&categoryId=abc&minPrice=100&maxPrice=500&sortBy=price_asc&page=1&limit=20`

**Response (200):**
```json
{
    "success": true,
    "data": {
        "products": [
            {
                "id": "uuid", "name": "Wireless Headphones",
                "slug": "wireless-headphones", "price": "299.99",
                "rating": "4.70", "reviewCount": 234,
                "category": { "id": "uuid", "name": "Electronics" },
                "brand": { "id": "uuid", "name": "Sony" },
                "inventory": { "quantity": 50, "reserved": 2 }
            }
        ],
        "pagination": { "page": 1, "limit": 20, "total": 156, "totalPages": 8 },
        "filters": { "query": "headphones", "sortBy": "price_asc", ... }
    }
}
```

#### `GET /api/search/suggest?q=hea` — Autocomplete

**Response:** `{ "data": [{ "id": "...", "name": "Headphones", "slug": "..." }] }`

---

### Admin

#### `GET /api/admin/dashboard` — Dashboard stats

**Response:**
```json
{
    "data": {
        "totalUsers": 1250,
        "totalProducts": 89,
        "totalOrders": 3456,
        "totalRevenue": "567890.50",
        "pendingOrders": 12,
        "lowStockProducts": 5,
        "recentOrders": [
            { "id": "...", "status": "PENDING", "total": "299.99",
              "user": { "name": "John", "email": "john@..." } }
        ]
    }
}
```

#### `POST /api/admin/products` — Create product

#### `PATCH /api/admin/products/:id` — Update product

#### `DELETE /api/admin/products/:id` — Delete (safe, checks pending orders)

#### `GET /api/admin/inventory/low-stock?threshold=10` — Low stock alerts

#### `PATCH /api/admin/inventory/bulk` — Bulk restock

**Request:** `{ "updates": [{ "productId": "abc", "quantity": 150 }, ...] }`

#### `GET /api/admin/users?page=1` — List users with order/review counts

#### `PATCH /api/admin/users/:id/role` — Change user role

**Request:** `{ "role": "ADMIN" }`

#### `GET /api/admin/orders?status=PENDING&page=1` — All orders with filter

---

## 7. Design Decisions

### Why Denormalize Rating on Product?

```
Normalized (correct but slow):
  Every product card → SELECT AVG(rating) FROM reviews WHERE product_id = ?
  Product listing with 20 items → 20 extra queries
  Search results → N+1 problem

Denormalized (our approach):
  Product card → product.rating (already there, no extra query)
  Trade-off: Must recalculate on review changes
  Review changes are rare (maybe 10/day per product)
  Product reads are constant (thousands/day per product)
  → Optimize for reads ✅
```

### Why Public Search Routes?

Search is the entry point for most e-commerce users. Requiring login to search products would:
1. Lose customers who haven't signed up yet
2. Block SEO crawlers from indexing product pages
3. Add unnecessary friction

### Why Admin Routes Use a Separate Module?

```
Alternative: Add admin endpoints to each module
  /api/products (public) + /api/products/admin-create (admin)
  /api/orders (user) + /api/orders/admin-list (admin)

Our approach: Dedicated /api/admin namespace
  /api/admin/products
  /api/admin/orders
  /api/admin/users
  /api/admin/inventory

Benefits:
  1. Single point of auth: router.use(authorize('ADMIN'))
  2. Clear separation: frontend knows /api/admin/* = admin panel
  3. Easy to rate-limit or add extra logging for admin actions
  4. Potential future: separate admin service/server
```

**Build Status: ✅ TypeScript compiles with zero errors.**

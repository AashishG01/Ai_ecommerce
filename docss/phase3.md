# Phase 3 — Cart & Wishlist

> Complete documentation of the shopping cart and wishlist system: upsert patterns, stock validation, Prisma transactions, and every design decision.

---

## Table of Contents

1. [What Was Built](#1-what-was-built)
2. [Cart — Flow Diagrams](#2-cart--flow-diagrams)
3. [Cart — Algorithm Deep Dive](#3-cart--algorithm-deep-dive)
4. [Wishlist — Flow Diagrams](#4-wishlist--flow-diagrams)
5. [Wishlist — Algorithm Deep Dive](#5-wishlist--algorithm-deep-dive)
6. [File-by-File Breakdown](#6-file-by-file-breakdown)
7. [API Reference](#7-api-reference)
8. [Design Decisions](#8-design-decisions)

---

## 1. What Was Built

### Files Created

```
backend/src/modules/
├── cart/
│   ├── cart.schema.ts          # Zod: productId (UUID), quantity (1-50)
│   ├── cart.service.ts         # Upsert, stock check, subtotal calc
│   ├── cart.controller.ts      # HTTP handlers
│   └── cart.routes.ts          # All routes require auth
└── wishlist/
    ├── wishlist.schema.ts      # Zod: productId (UUID)
    ├── wishlist.service.ts     # Idempotent add, move-to-cart transaction
    ├── wishlist.controller.ts  # HTTP handlers
    └── wishlist.routes.ts      # All routes require auth
```

### Files Modified

| File | Change |
|------|--------|
| `src/index.ts` | Added `cartRoutes` and `wishlistRoutes` imports + registration |

### Endpoint Summary

| Module | Endpoints | Auth Required |
|--------|-----------|---------------|
| Cart | 5 (GET, POST, PATCH, DELETE item, DELETE all) | ✅ All |
| Wishlist | 6 (GET, POST, CHECK, MOVE-TO-CART, DELETE item, DELETE all) | ✅ All |

---

## 2. Cart — Flow Diagrams

### Add to Cart (Upsert Pattern)

```
Client                           Backend                          PostgreSQL
  │                                │                                │
  │  POST /api/cart                │                                │
  │  { productId, quantity: 2 }    │                                │
  │───────────────────────────────►│                                │
  │                                │                                │
  │                     ┌──────────┤                                │
  │                     │ 1. Zod validates:                         │
  │                     │    productId: valid UUID                  │
  │                     │    quantity: 1-50                         │
  │                     └──────────┤                                │
  │                                │                                │
  │                                │  SELECT * FROM products        │
  │                                │  JOIN inventory ON ...         │
  │                                │  WHERE id = $productId         │
  │                                │───────────────────────────────►│
  │                                │  { inventory: { qty: 50,       │
  │                                │    reserved: 5 } }             │
  │                                │◄───────────────────────────────│
  │                                │                                │
  │                     ┌──────────┤                                │
  │                     │ 2. Check stock:                           │
  │                     │    available = 50 - 5 = 45                │
  │                     │    45 >= 2? ✅ Yes                        │
  │                     └──────────┤                                │
  │                                │                                │
  │                                │  INSERT INTO cart_items         │
  │                                │  (user_id, product_id, qty)    │
  │                                │  VALUES ($1, $2, 2)            │
  │                                │  ON CONFLICT (user_id,         │
  │                                │    product_id)                 │
  │                                │  DO UPDATE SET                 │
  │                                │    qty = qty + 2               │
  │                                │───────────────────────────────►│
  │                                │                                │
  │  201 { item with product info }│                                │
  │◄───────────────────────────────│                                │
```

### Get Cart (with Totals)

```
Client                           Backend                          PostgreSQL
  │                                │                                │
  │  GET /api/cart                 │                                │
  │  Authorization: Bearer <token> │                                │
  │───────────────────────────────►│                                │
  │                                │                                │
  │                                │  SELECT cart_items.*,           │
  │                                │    products.name, price,       │
  │                                │    images, inventory.*         │
  │                                │  FROM cart_items                │
  │                                │  JOIN products ON ...          │
  │                                │  JOIN inventory ON ...         │
  │                                │  WHERE user_id = $userId       │
  │                                │  ORDER BY products.name ASC   │
  │                                │───────────────────────────────►│
  │                                │                                │
  │                     ┌──────────┤                                │
  │                     │ Calculate:                                │
  │                     │  subtotal = Σ(price × quantity)           │
  │                     │  itemCount = items.length                 │
  │                     │  totalQuantity = Σ(quantity)              │
  │                     └──────────┤                                │
  │                                │                                │
  │  200 {                         │                                │
  │    items: [...],               │                                │
  │    itemCount: 3,               │                                │
  │    totalQuantity: 7,           │                                │
  │    subtotal: 749.95            │                                │
  │  }                             │                                │
  │◄───────────────────────────────│                                │
```

---

## 3. Cart — Algorithm Deep Dive

### The Upsert Pattern

The core of the cart's add operation is Prisma's `upsert`:

```typescript
const item = await prisma.cartItem.upsert({
    where: {
        userId_productId: { userId, productId },  // composite unique key
    },
    create: {                    // If NOT exists → INSERT
        userId,
        productId,
        quantity,
    },
    update: {                    // If EXISTS → UPDATE
        quantity: { increment: quantity },  // atomic increment
    },
});
```

**What SQL does this generate?**

```sql
INSERT INTO cart_items (user_id, product_id, quantity)
VALUES ($1, $2, $3)
ON CONFLICT (user_id, product_id)
DO UPDATE SET quantity = cart_items.quantity + $3;
```

**Why upsert instead of find-then-insert?**

```typescript
// ❌ BAD: Race condition
const existing = await prisma.cartItem.findUnique({ where: { ... } });
if (existing) {
    await prisma.cartItem.update({ ... });  // Thread B might delete it here!
} else {
    await prisma.cartItem.create({ ... });  // Thread B might create it here → duplicate!
}

// ✅ GOOD: Atomic upsert (single SQL statement)
await prisma.cartItem.upsert({ ... });
// PostgreSQL handles the conflict atomically — no race condition possible
```

### Stock Validation Algorithm

```
Input: productId, requested quantity

Step 1: Fetch product with inventory
  product.inventory.quantity = 50  (total stock)
  product.inventory.reserved = 5   (reserved for pending orders)

Step 2: Calculate available
  available = quantity - reserved = 50 - 5 = 45

Step 3: Compare
  if (available < requested) → 400 "Only X items available"
  if (available >= requested) → proceed with upsert

Note: This is a soft check — NOT a hard reservation.
Hard reservation happens at checkout (Phase 4) with SELECT ... FOR UPDATE.
```

### Subtotal Calculation

```typescript
const subtotal = items.reduce((sum: number, item) => {
    return sum + Number(item.product.price) * item.quantity;
}, 0);

// Round to 2 decimal places (avoid floating-point drift)
return Math.round(subtotal * 100) / 100;
```

**Why `Number(item.product.price)`?**

Prisma returns `Decimal` fields as `Prisma.Decimal` objects (not JavaScript numbers). We must convert with `Number()` before arithmetic.

**Why `Math.round(subtotal * 100) / 100`?**

```
Without rounding:
  29.99 * 3 = 89.97000000000001   ← floating-point error

With rounding:
  Math.round(89.97000000000001 * 100) / 100
  = Math.round(8997.000000000001) / 100
  = 8997 / 100
  = 89.97  ✅
```

> **Important:** This is fine for cart display. For actual payment calculations (Phase 4), we'll use `Decimal` arithmetic to avoid precision loss entirely.

---

## 4. Wishlist — Flow Diagrams

### Idempotent Add

```
First add:
  POST /api/wishlist { productId: "abc" }
  → Creates row → 201 { item }

Second add (same product):
  POST /api/wishlist { productId: "abc" }
  → Finds existing → 201 { same item }  (no error, no duplicate)

Why idempotent?
  User double-clicks "♡" button → no errors
  Network retry sends request twice → no errors
  Frontend state gets confused → no errors
```

### Move to Cart (Transaction)

```
Client                           Backend                         PostgreSQL
  │                                │                               │
  │  POST /wishlist/:id/move-to-cart│                              │
  │───────────────────────────────►│                               │
  │                                │                               │
  │                     ┌──────────┤                               │
  │                     │ 1. Check wishlist item exists            │
  │                     │ 2. Check product has stock               │
  │                     └──────────┤                               │
  │                                │                               │
  │                                │  BEGIN TRANSACTION             │
  │                                │                               │
  │                                │  DELETE FROM wishlist_items    │
  │                                │  WHERE user_id=$1              │
  │                                │  AND product_id=$2             │
  │                                │───────────────────────────────►│
  │                                │                               │
  │                                │  INSERT INTO cart_items        │
  │                                │  ON CONFLICT DO UPDATE         │
  │                                │  SET qty = qty + 1            │
  │                                │───────────────────────────────►│
  │                                │                               │
  │                                │  COMMIT                       │
  │                                │───────────────────────────────►│
  │                                │                               │
  │  200 { message: "Moved" }      │                               │
  │◄───────────────────────────────│                               │
```

---

## 5. Wishlist — Algorithm Deep Dive

### Prisma `$transaction`

```typescript
await prisma.$transaction([
    prisma.wishlistItem.delete({
        where: { userId_productId: { userId, productId } },
    }),
    prisma.cartItem.upsert({
        where: { userId_productId: { userId, productId } },
        create: { userId, productId, quantity: 1 },
        update: { quantity: { increment: 1 } },
    }),
]);
```

**What happens if the cart insert fails?**

```
Without $transaction:
  1. DELETE wishlist item ✅ (removed)
  2. INSERT cart item ❌ (fails — maybe product was deleted)
  Result: Item is GONE from both wishlist and cart! Data lost.

With $transaction:
  1. DELETE wishlist item ✅
  2. INSERT cart item ❌ (fails)
  3. PostgreSQL: ROLLBACK — undo step 1
  Result: Item is still in wishlist. Nothing changed. Safe.
```

**Prisma `$transaction` with an array** wraps all operations in a single PostgreSQL `BEGIN ... COMMIT` block. If ANY operation fails, ALL operations are rolled back.

### Composite Unique Key

```prisma
@@unique([userId, productId])
```

This creates a composite unique index. Prisma auto-generates a compound key name: `userId_productId`.

```typescript
// You can use it in where clauses:
prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: "user-1", productId: "prod-1" } },
})

// This generates:
// SELECT * FROM wishlist_items
// WHERE user_id = 'user-1' AND product_id = 'prod-1'
// Uses the composite unique index → O(1) lookup
```

### `isInWishlist` — Lightweight Check

```typescript
export async function isInWishlist(userId: string, productId: string): Promise<boolean> {
    const item = await prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId, productId } },
    });
    return !!item;
}
```

**Why a separate endpoint?** On a product page, the frontend needs to show ♡ (empty) or ♥ (filled). Instead of fetching the entire wishlist (could be 100+ items), this endpoint checks a single product — one indexed query, minimal data transfer.

---

## 6. File-by-File Breakdown

### `cart.schema.ts`

```typescript
export const addToCartSchema = z.object({
    productId: z.string().uuid('Invalid product ID'),
    quantity: z.number().int()
        .min(1, 'Quantity must be at least 1')
        .max(50, 'Max 50 per item')
        .default(1),
});
```

**Why max 50?** Prevents abuse scenarios:
- User adds 999,999 items → server calculates huge totals
- User creates unreasonable cart → inventory logic struggles
- Real customers rarely need more than 50 of anything

**Why `.default(1)`?** If quantity is not provided in the request body, it defaults to 1. This makes `{ productId: "..." }` a valid request — simpler frontend calls.

### `cart.service.ts` — `cartItemSelect`

```typescript
const cartItemSelect = {
    id: true,
    quantity: true,
    product: {
        select: {
            id: true, name: true, slug: true,
            price: true, originalPrice: true, images: true,
            inventory: { select: { quantity: true, reserved: true } },
        },
    },
};
```

**Why include product + inventory?** The cart page needs:
- Product name, image, price → for display
- Original price → for showing strikethrough price ("was $399.99")
- Inventory quantity/reserved → for "In Stock" / "Only 3 left" labels
- Slug → for "View product" link

All of this in **one query** instead of N+1 queries per cart item.

### `wishlist.service.ts` — Idempotent Add

```typescript
export async function addToWishlist(userId: string, productId: string) {
    // Check if already in wishlist
    const existing = await prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId, productId } },
        select: wishlistSelect,
    });

    if (existing) {
        return existing;  // Return existing — no error, no duplicate
    }

    const item = await prisma.wishlistItem.create({
        data: { userId, productId },
        select: wishlistSelect,
    });

    return item;
}
```

**Why not upsert?** Unlike cart (where adding increments quantity), wishlist items have no quantity — they're either present or not. An upsert would work but would unnecessarily UPDATE the row with the same data. Check-first is cleaner.

### Route-Level Auth (`router.use`)

```typescript
const router = Router();

// Apply authenticate middleware to ALL routes in this router
router.use(authenticate);

router.get('/', controller.getCart);
router.post('/', ...);
```

**`router.use(authenticate)`** applies the middleware to every route registered on this router. This is cleaner than adding `authenticate` to each route individually:

```typescript
// ❌ Repetitive:
router.get('/', authenticate, controller.getCart);
router.post('/', authenticate, controller.addToCart);
router.delete('/', authenticate, controller.clearCart);

// ✅ DRY:
router.use(authenticate);  // Applies to all routes below
router.get('/', controller.getCart);
router.post('/', controller.addToCart);
router.delete('/', controller.clearCart);
```

---

## 7. API Reference

### Cart

#### `GET /api/cart` — Get user's cart

**Response (200):**
```json
{
    "success": true,
    "data": {
        "items": [
            {
                "id": "cart-item-uuid",
                "quantity": 2,
                "product": {
                    "id": "product-uuid",
                    "name": "Wireless Headphones",
                    "slug": "wireless-headphones",
                    "price": "299.99",
                    "originalPrice": "399.99",
                    "images": ["https://..."],
                    "inventory": { "quantity": 50, "reserved": 0 }
                }
            }
        ],
        "itemCount": 1,
        "totalQuantity": 2,
        "subtotal": 599.98
    }
}
```

#### `POST /api/cart` — Add item to cart

**Request:** `{ "productId": "uuid", "quantity": 2 }`
**Response (201):** Returns the cart item with product details.

**Behavior:** If product already in cart, quantity is **incremented** (not replaced).

#### `PATCH /api/cart/:productId` — Update quantity

**Request:** `{ "quantity": 5 }`
**Response (200):** Returns updated cart item.

**Behavior:** Replaces the quantity (not increments). Stock is re-validated.

#### `DELETE /api/cart/:productId` — Remove item

**Response (200):** `{ "success": true, "message": "Item removed from cart." }`

#### `DELETE /api/cart` — Clear cart

**Response (200):** Removes all items. Uses `deleteMany` — single query.

---

### Wishlist

#### `GET /api/wishlist` — Get wishlist

**Response (200):**
```json
{
    "success": true,
    "data": {
        "items": [
            {
                "id": "wishlist-item-uuid",
                "product": {
                    "id": "product-uuid",
                    "name": "Wireless Headphones",
                    "slug": "wireless-headphones",
                    "price": "299.99",
                    "originalPrice": "399.99",
                    "images": ["https://..."],
                    "rating": "4.70",
                    "reviewCount": 234,
                    "isTrending": true,
                    "inventory": { "quantity": 50, "reserved": 0 }
                }
            }
        ],
        "count": 1
    }
}
```

#### `POST /api/wishlist` — Add to wishlist

**Request:** `{ "productId": "uuid" }`
**Behavior:** Idempotent — returns existing item if already wishlisted.

#### `GET /api/wishlist/check/:productId` — Check if wishlisted

**Response:** `{ "success": true, "data": { "isWishlisted": true } }`

#### `POST /api/wishlist/:productId/move-to-cart` — Move to cart

**Behavior:** Removes from wishlist + adds to cart (quantity 1) in a single transaction. If product is already in cart, quantity is incremented.

#### `DELETE /api/wishlist/:productId` — Remove from wishlist

#### `DELETE /api/wishlist` — Clear wishlist

---

## 8. Design Decisions

### Why Server-Side Subtotal?

```
❌ BAD: Client calculates subtotal
  → Client might use stale prices
  → Client might manipulate prices
  → Subtotal on screen ≠ actual charge

✅ GOOD: Server calculates subtotal
  → Always uses current database prices
  → Tamper-proof
  → "What you see is what you pay"
```

### Why PostgreSQL Cart (Not Redis)?

| Feature | PostgreSQL Cart | Redis Cart |
|---------|----------------|------------|
| Persistence | Survives restarts | Lost on restart (unless persisted) |
| Durability | ACID guaranteed | Eventually consistent |
| Joins | Can join with products, inventory | Must fetch product data separately |
| Querying | SQL — complex filters, aggregation | Limited query capability |
| Guest users | ❌ Needs user ID | ✅ Can use session ID |
| Performance | Adequate for our scale | Faster for high-traffic carts |

For logged-in users, PostgreSQL provides ACID reliability and easy joins. Guest cart in Redis will be added when Redis is fully integrated (Phase 9).

### Why Composite Unique Keys?

```sql
-- Without composite unique:
INSERT INTO cart_items (user_id, product_id, quantity) VALUES ('u1', 'p1', 1);
INSERT INTO cart_items (user_id, product_id, quantity) VALUES ('u1', 'p1', 1);
-- Result: TWO rows! User has 2 separate entries for the same product.

-- With composite unique:
CREATE UNIQUE INDEX ON cart_items (user_id, product_id);
INSERT INTO cart_items VALUES ('u1', 'p1', 1);  -- OK
INSERT INTO cart_items VALUES ('u1', 'p1', 1);  -- ERROR: duplicate key
-- Result: ONE row. Can only be modified via UPDATE.
```

This constraint is enforced at the **database level** — even if application code has bugs, duplicates are impossible.

### Cart Route Order: `DELETE /` vs `DELETE /:productId`

```typescript
router.delete('/:productId', controller.removeFromCart);
router.delete('/', controller.clearCart);
```

Express processes these correctly:
- `DELETE /api/cart/abc-123` → matches `/:productId` (abc-123 is the param)
- `DELETE /api/cart` → skips `/:productId` (no param) → matches `/`

**Build Status: ✅ TypeScript compiles with zero errors.**

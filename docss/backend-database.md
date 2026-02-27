# Backend — Database Schema Deep Dive

> Every table, every column, every relation, every constraint — explained with the reasoning behind each decision.

---

## Entity Relationship Diagram

```
┌──────────┐       ┌───────────┐       ┌──────────┐
│  users   │       │ categories│       │  brands  │
│──────────│       │───────────│       │──────────│
│ id (PK)  │       │ id (PK)   │       │ id (PK)  │
│ email ◆  │       │ name ◆    │       │ name ◆   │
│ password │       │ slug ◆    │       │ slug ◆   │
│ name     │       └─────┬─────┘       └────┬─────┘
│ role     │             │                  │
│ timestamps│            │ 1:N              │ 1:N
└──┬───────┘             │                  │
   │                ┌────▼──────────────────▼────┐
   │                │         products           │
   │ 1:N            │───────────────────────────-│
   │                │ id (PK)                    │
   │                │ name, slug ◆, description  │
   │                │ price, originalPrice       │
   │                │ images[], rating           │
   │                │ category_id (FK) ──────────│───→ categories
   │                │ brand_id (FK) ─────────────│───→ brands
   │                └──┬─────┬──────┬─────┬──────┘
   │                   │     │      │     │
   │     ┌─────────────┘     │      │     └──────────────┐
   │     │ 1:1               │ 1:N  │ 1:N               │ 1:N
   │     ▼                   ▼      ▼                    ▼
   │  ┌──────────┐  ┌────────────┐ ┌──────────┐  ┌──────────────┐
   │  │inventory │  │ cart_items  │ │ reviews  │  │wishlist_items│
   │  │──────────│  │────────────│ │──────────│  │──────────────│
   │  │quantity  │  │ user_id(FK)│ │ user_id  │  │  user_id(FK) │
   │  │reserved  │  │product(FK) │ │product_id│  │ product(FK)  │
   │  └──────────┘  │ quantity   │ │ rating   │  └──────────────┘
   │                └────────────┘ │ comment  │
   │                               └──────────┘
   │
   │ 1:N
   ▼
┌──────────────┐         ┌──────────────┐
│   orders     │         │   payments   │
│──────────────│   1:1   │──────────────│
│ id (PK)      │◄────────│ order_id(FK) │
│ user_id (FK) │         │ gateway_id   │
│ address_id   │         │ provider     │
│ status       │         │ status       │
│ total        │         │ amount       │
└──────┬───────┘         └──────────────┘
       │
       │ 1:N
       ▼
┌──────────────┐         ┌──────────────┐
│ order_items  │         │  addresses   │
│──────────────│         │──────────────│
│ order_id(FK) │         │ user_id (FK) │
│product_id(FK)│         │ line1, line2 │
│ quantity     │         │ city, state  │
│ unit_price   │         │ postal_code  │
└──────────────┘         │ country      │
                         │ is_default   │
                         └──────────────┘

◆ = UNIQUE constraint
```

---

## Prisma Syntax Reference

Before diving into tables, here's what each Prisma annotation means:

| Annotation | Meaning | SQL Equivalent |
|-----------|---------|---------------|
| `@id` | Primary key | `PRIMARY KEY` |
| `@default(uuid())` | Auto-generate UUID | `DEFAULT gen_random_uuid()` |
| `@unique` | Unique constraint | `UNIQUE` |
| `@map("name")` | Column name in DB | Column alias |
| `@@map("name")` | Table name in DB | Table alias |
| `@relation(...)` | Foreign key relation | `FOREIGN KEY ... REFERENCES` |
| `@db.Decimal(10,2)` | Native PostgreSQL type | `DECIMAL(10,2)` |
| `@default(now())` | Auto-set to current time | `DEFAULT NOW()` |
| `@updatedAt` | Auto-update on every write | Trigger-based |
| `@@index([col])` | Database index | `CREATE INDEX ...` |
| `@@unique([a, b])` | Composite unique | `UNIQUE(a, b)` |
| `?` after type | Nullable/optional | Column allows `NULL` |

---

## Table 1: `users`

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String
  role         Role     @default(CUSTOMER)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  orders        Order[]
  cartItems     CartItem[]
  reviews       Review[]
  wishlistItems WishlistItem[]
  addresses     Address[]

  @@map("users")
}
```

### Column Breakdown

| Column | Type | Constraints | Why |
|--------|------|------------|-----|
| `id` | UUID | PK, auto-generated | Globally unique, no sequential leaking |
| `email` | String | UNIQUE | Login identifier, prevents duplicate accounts |
| `passwordHash` | String | NOT NULL | Stores bcrypt hash, **never** plain text |
| `name` | String | NOT NULL | Display name for reviews, orders |
| `role` | Enum | DEFAULT CUSTOMER | Role-based access control (RBAC) |
| `createdAt` | DateTime | DEFAULT NOW() | Audit trail — when was account created |
| `updatedAt` | DateTime | AUTO-UPDATE | Audit trail — last profile modification |

### Why `passwordHash` Not `password`?

Naming it `passwordHash` makes intent explicit — this column stores a **bcrypt hash**, not a plaintext password. This also prevents accidental logging:

```typescript
// If column was named "password", a developer might accidentally log it:
logger.info({ user }); // DANGER: logs the password!

// With "passwordHash", it's clear this is sensitive but already hashed
```

### Relations (One-to-Many)

A single user can have:
- Many orders (purchase history)
- Many cart items (current shopping cart)
- Many reviews (product feedback)
- Many wishlist items (saved for later)
- Many addresses (shipping addresses)

**In PostgreSQL**, these relations work via foreign keys on the child tables. The `User` model doesn't store any foreign keys itself — the children reference the user.

---

## Table 2: `products`

```prisma
model Product {
  id            String   @id @default(uuid())
  name          String
  slug          String   @unique
  description   String
  price         Decimal  @db.Decimal(10, 2)
  originalPrice Decimal? @map("original_price") @db.Decimal(10, 2)
  images        String[]
  rating        Decimal  @default(0) @db.Decimal(3, 2)
  reviewCount   Int      @default(0) @map("review_count")
  isTrending    Boolean  @default(false) @map("is_trending")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  categoryId String   @map("category_id")
  category   Category @relation(fields: [categoryId], references: [id])

  brandId String @map("brand_id")
  brand   Brand  @relation(fields: [brandId], references: [id])

  @@index([categoryId])
  @@index([brandId])
  @@index([price])
  @@index([isTrending])
  @@map("products")
}
```

### Column Breakdown

| Column | Type | Why this type |
|--------|------|-------------|
| `slug` | String UNIQUE | URL-safe identifier: `/products/wireless-headphones` |
| `price` | Decimal(10,2) | **NEVER float for money** — `0.1 + 0.2 ≠ 0.3` in float |
| `originalPrice` | Decimal? (nullable) | Only set when product is on sale. `NULL` = no sale |
| `images` | String[] | PostgreSQL native array — stores multiple image URLs |
| `rating` | Decimal(3,2) | Range 0.00–9.99 (e.g., 4.70). Decimal for precision |
| `reviewCount` | Int | Denormalized count (avoids `COUNT(*)` query on every product page) |
| `isTrending` | Boolean | Admin-curated flag for featured products |

### Why `Decimal(10,2)` for Prices?

```
Decimal(10, 2) → up to 10 digits total, 2 after the decimal point
Maximum value: 99,999,999.99 ($99 million — more than enough)

Float problems:
  0.1 + 0.2 = 0.30000000000000004  ← WRONG
  19.99 * 100 = 1998.9999999999998 ← WRONG

Decimal:
  0.1 + 0.2 = 0.30                ← CORRECT
  19.99 * 100 = 1999.00            ← CORRECT
```

This matters when calculating order totals. A float error of $0.01 across millions of transactions adds up to real money.

### Why `String[]` for Images?

PostgreSQL supports native array types. This avoids creating a separate `product_images` junction table for a simple list of URLs.

```sql
-- PostgreSQL stores this efficiently:
INSERT INTO products (images) VALUES (ARRAY['url1.jpg', 'url2.jpg', 'url3.jpg']);
```

### Why Denormalize `reviewCount`?

**Normalized (slow):**
```sql
-- Every product listing page runs this for EACH product:
SELECT COUNT(*) FROM reviews WHERE product_id = $1;
-- With 100 products and 1000 reviews each: 100 × 1000 = 100,000 row scans
```

**Denormalized (fast):**
```sql
-- Just read the pre-computed column:
SELECT review_count FROM products WHERE id = $1;
-- One column read, no counting needed
```

The tradeoff: when a review is added/deleted, we must update `reviewCount`. This is handled in the review service (Phase 5).

### Indexes Explained

```prisma
@@index([categoryId])   // Filter by category: WHERE category_id = '...'
@@index([brandId])      // Filter by brand: WHERE brand_id = '...'
@@index([price])        // Sort by price: ORDER BY price ASC/DESC
@@index([isTrending])   // Filter trending: WHERE is_trending = true
```

**How B-tree indexes work internally:**

```
Without index (sequential scan):
  Read row 1 → check → no
  Read row 2 → check → no
  Read row 3 → check → yes ← found after scanning 3 rows
  ...
  Read row 10,000 → check → no
  Time: O(n) = 10,000 comparisons

With B-tree index:
        [500]
       /     \
    [250]   [750]
    /   \   /   \
  [125] [375] [625] [875]
  ...

  Looking for category_id = 375:
  500 → go left → 250 → go right → 375 → found!
  Time: O(log₂ n) = 14 comparisons for 10,000 rows
```

---

## Table 3–4: `categories` & `brands`

```prisma
model Category {
  id   String @id @default(uuid())
  name String @unique
  slug String @unique
  products Product[]
  @@map("categories")
}
```

Simple lookup tables. Both have:
- `name` UNIQUE — no duplicate categories/brands
- `slug` UNIQUE — URL-safe version ("Home & Living" → "home-living")
- `products` — virtual relation (no column in DB, Prisma resolves it via JOIN)

### Why Separate Tables Instead of a String Column?

```
❌ BAD: Product has column "category": "Electronics"
   Problem: Typos ("Electroncs"), inconsistency ("electronics" vs "Electronics")
   Problem: Can't rename a category without updating every product
   Problem: No category page (no way to list all categories)

✅ GOOD: Category table with FK
   Advantage: Data integrity (can't create invalid category)
   Advantage: Rename once → all products reflect it
   Advantage: Can add category metadata (icon, description) later
```

---

## Table 5: `inventory`

```prisma
model Inventory {
  id        String   @id @default(uuid())
  quantity  Int      @default(0)
  reserved  Int      @default(0)
  updatedAt DateTime @updatedAt @map("updated_at")

  productId String  @unique @map("product_id")
  product   Product @relation(fields: [productId], references: [id])
  @@map("inventory")
}
```

### Why Separate from Products?

1. **Different update frequency** — inventory changes on every order, product details rarely change. Separate tables = no row-level locking conflicts.

2. **The Reservation Pattern:**

```
Available = quantity - reserved

Scenario: 3 items in stock, 2 users checkout simultaneously

User A starts checkout:     quantity=3, reserved=1, available=2 ✅
User B starts checkout:     quantity=3, reserved=2, available=1 ✅
User C starts checkout:     quantity=3, reserved=3, available=0 ❌ "Out of stock"

User A pays successfully:   quantity=2, reserved=0, available=2
User B abandons cart:       quantity=2, reserved=0, available=2 (reserved released)
```

3. **Row-level locking with `SELECT ... FOR UPDATE`:**
```sql
BEGIN;
SELECT * FROM inventory WHERE product_id = $1 FOR UPDATE;
-- This row is now LOCKED — no other transaction can modify it
UPDATE inventory SET reserved = reserved + 1 WHERE product_id = $1;
COMMIT;
```

---

## Table 6–7: `orders` & `order_items`

```prisma
model Order {
  id        String      @id @default(uuid())
  status    OrderStatus @default(PENDING)
  total     Decimal     @db.Decimal(10, 2)
  userId    String      @map("user_id")
  addressId String?     @map("address_id")
  items     OrderItem[]
  payment   Payment?
  @@index([userId])
  @@map("orders")
}

model OrderItem {
  id        String  @id @default(uuid())
  quantity  Int
  unitPrice Decimal @map("unit_price") @db.Decimal(10, 2)
  orderId   String  @map("order_id")
  productId String  @map("product_id")
  @@index([orderId])
  @@map("order_items")
}
```

### Why `unitPrice` on OrderItem?

**Critical design decision:** The `unitPrice` is the price **at the time of purchase**, not the current product price.

```
Monday:   Product costs $99.99, User A buys it → unitPrice = $99.99
Tuesday:  Product price changed to $79.99
Wednesday: User A views order → still shows $99.99 (correct!)
```

If we just referenced the product's current price, historical orders would show wrong amounts.

### Order Status State Machine

```
PENDING → PAID → SHIPPED → DELIVERED
    ↓                         
 CANCELLED (can only cancel before SHIPPED)
```

Valid transitions:
- `PENDING → PAID` (payment confirmed)
- `PENDING → CANCELLED` (user cancels)
- `PAID → SHIPPED` (warehouse dispatches)
- `PAID → CANCELLED` (admin cancels + refund)
- `SHIPPED → DELIVERED` (delivery confirmed)

Invalid transitions (enforced in service logic):
- `DELIVERED → CANCELLED` ❌ (can't cancel after delivery)
- `CANCELLED → PAID` ❌ (can't revive a cancelled order)

---

## Table 8: `payments`

```prisma
model Payment {
  id        String          @id @default(uuid())
  gatewayId String?         @map("gateway_id")
  provider  PaymentProvider
  status    PaymentStatus   @default(PENDING)
  amount    Decimal         @db.Decimal(10, 2)
  orderId   String          @unique @map("order_id")
  @@map("payments")
}
```

### Key Design Decisions

- **`gatewayId`** — Stores Stripe's `pi_xxx` or Razorpay's `pay_xxx` ID. Used for refunds, disputes, and reconciliation.
- **One-to-one with Order** — `@unique` on `orderId` ensures exactly one payment per order.
- **`provider` enum** — STRIPE or RAZORPAY. Enables multi-provider support.
- **Separate `amount`** — The payment amount might differ from order total (partial payments, discounts, taxes applied at payment time).

---

## Table 9: `cart_items`

```prisma
model CartItem {
  id       String @id @default(uuid())
  quantity Int    @default(1)
  userId   String @map("user_id")
  productId String @map("product_id")

  @@unique([userId, productId])
  @@map("cart_items")
}
```

### Composite Unique Constraint

`@@unique([userId, productId])` means a user can only have **one cart entry per product**. Adding the same product again should increase `quantity`, not create a duplicate row.

```sql
-- This constraint prevents:
INSERT INTO cart_items (user_id, product_id, quantity) VALUES ('user1', 'prod1', 1);
INSERT INTO cart_items (user_id, product_id, quantity) VALUES ('user1', 'prod1', 1);
-- ERROR: duplicate key violates unique constraint

-- Correct approach (upsert):
INSERT INTO cart_items (user_id, product_id, quantity)
VALUES ('user1', 'prod1', 1)
ON CONFLICT (user_id, product_id)
DO UPDATE SET quantity = cart_items.quantity + 1;
```

---

## Table 10: `reviews`

```prisma
model Review {
  id        String   @id @default(uuid())
  rating    Int
  comment   String?
  userId    String   @map("user_id")
  productId String   @map("product_id")

  @@unique([userId, productId])
  @@index([productId])
  @@map("reviews")
}
```

### Composite Unique: One Review Per User Per Product

`@@unique([userId, productId])` — A user can only review a product **once**. They can edit their existing review, but can't submit multiple reviews. This prevents review spam.

### Index on `productId`

```prisma
@@index([productId])
```

This index speeds up: "Get all reviews for product X" — a query that runs every time someone views a product page.

---

## Table 11–12: `wishlist_items` & `addresses`

```prisma
model WishlistItem {
  @@unique([userId, productId])  // Can't wishlist same product twice
}

model Address {
  isDefault  Boolean @default(false) @map("is_default")
  @@index([userId])  // Fast lookup: "Get all addresses for user X"
}
```

### Address Design

- **Multiple addresses per user** — home, office, etc.
- **`isDefault` flag** — pre-selects the shipping address at checkout
- **Linked to orders** — `Order.addressId` captures which address was used (for delivery tracking)
- **Not deleted with order** — addresses persist independently of orders

---

## Naming Conventions

| Prisma (Code) | PostgreSQL (Database) | Why |
|-------------|--------------------|-----|
| `User` | `users` | Prisma: singular PascalCase. DB: plural snake_case |
| `categoryId` | `category_id` | Prisma: camelCase. DB: snake_case. `@map()` bridges them |
| `createdAt` | `created_at` | Same convention |
| `OrderItem` | `order_items` | Same convention |

This keeps TypeScript code idiomatic (`user.createdAt`) while keeping SQL conventional (`SELECT created_at FROM users`).

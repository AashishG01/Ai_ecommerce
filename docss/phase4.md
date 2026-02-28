# Phase 4 — Orders & Payment

> Complete documentation of the order lifecycle, transactional inventory locking, payment flow, address management, and every design decision.

---

## Table of Contents

1. [What Was Built](#1-what-was-built)
2. [The Order Lifecycle](#2-the-order-lifecycle)
3. [Order Creation — Deep Dive](#3-order-creation--deep-dive)
4. [Inventory Locking — SELECT FOR UPDATE](#4-inventory-locking--select-for-update)
5. [Payment Flow](#5-payment-flow)
6. [Order Status State Machine](#6-order-status-state-machine)
7. [Address Module](#7-address-module)
8. [File-by-File Breakdown](#8-file-by-file-breakdown)
9. [API Reference](#9-api-reference)
10. [Design Decisions](#10-design-decisions)

---

## 1. What Was Built

### Files Created (11 new files)

```
backend/src/modules/
├── addresses/
│   ├── addresses.schema.ts      # Zod: create + update (.partial())
│   ├── addresses.service.ts     # CRUD, default address management
│   ├── addresses.controller.ts  # HTTP handlers
│   └── addresses.routes.ts      # All routes require auth
├── orders/
│   ├── orders.schema.ts         # Zod: createOrder, updateStatus
│   ├── orders.service.ts        # Transactional creation, status transitions
│   ├── orders.controller.ts     # HTTP handlers
│   └── orders.routes.ts         # Status update: ADMIN only
└── payments/
    ├── payments.service.ts      # Mock Stripe, webhook, simulate
    ├── payments.controller.ts   # HTTP handlers
    └── payments.routes.ts       # Webhook is public (no auth)
```

### Module Complexity Comparison

| Module | Complexity | Why |
|--------|-----------|-----|
| Addresses | ⭐ Low | Simple CRUD, no business logic beyond default management |
| Payments | ⭐⭐ Medium | Webhook handling, status updates, inventory release on failure |
| Orders | ⭐⭐⭐ High | Transactions, row locking, price snapshots, status state machine, inventory operations |

---

## 2. The Order Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMPLETE ORDER LIFECYCLE                    │
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ BROWSE   │───►│ ADD TO   │───►│ CHECKOUT │───►│ CREATE   │  │
│  │ Products │    │ CART     │    │ Address  │    │ ORDER    │  │
│  └──────────┘    └──────────┘    └──────────┘    └────┬─────┘  │
│                                                       │        │
│  ┌────────────────────────────────────────────────────▼─────┐  │
│  │ TRANSACTION (atomic):                                    │  │
│  │  1. Lock inventory rows (FOR UPDATE)                     │  │
│  │  2. Verify stock available                               │  │
│  │  3. Create order + order_items (snapshot prices)         │  │
│  │  4. Create pending payment record                        │  │
│  │  5. Reserve inventory (increment reserved)               │  │
│  │  6. Clear the cart                                       │  │
│  └────────────────────────────────────────────────────┬─────┘  │
│                                                       │        │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───▼──────┐  │
│  │ PENDING  │───►│ INITIATE │───►│ GATEWAY  │───►│ WEBHOOK  │  │
│  │ (order)  │    │ PAYMENT  │    │ PROCESS  │    │ CALLBACK │  │
│  └──────────┘    └──────────┘    └──────────┘    └────┬─────┘  │
│                                                       │        │
│               ┌───────────────────┬───────────────────┘        │
│               ▼                   ▼                            │
│       ┌──────────────┐   ┌───────────────┐                     │
│       │ payment.success│  │ payment.failed │                    │
│       │ → PAID        │  │ → CANCELLED    │                    │
│       └──────┬───────┘   │ → Release inv  │                    │
│              │           └───────────────┘                     │
│              ▼                                                 │
│       ┌──────────┐    ┌──────────┐                             │
│       │ SHIPPED  │───►│ DELIVERED│                              │
│       │          │    │ Finalize │                              │
│       └──────────┘    │ inventory│                              │
│                       └──────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Order Creation — Deep Dive

### The Algorithm (Step by Step)

```typescript
export async function createOrder(userId: string, addressId: string) {
```

**Step 1: Get cart items with product + inventory data**

```typescript
const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: {
        product: {
            include: { inventory: true },
        },
    },
});
```

We need the full product data because:
- `product.price` → for calculating the order total
- `product.name` → for error messages ("Insufficient stock for Headphones")
- `product.inventory` → for stock checking

**Step 2: Validate the cart is not empty**

```typescript
if (cartItems.length === 0) {
    throw new AppError(400, 'Your cart is empty.');
}
```

Without this check, we'd create an order with `total: 0` and no items. The transaction would succeed but produce garbage data.

**Step 3: Validate address belongs to user**

```typescript
const address = await prisma.address.findFirst({
    where: { id: addressId, userId },   // Both conditions!
});
```

Why `findFirst` with both `id` AND `userId`? Without `userId`, a user could pass another user's address ID and ship to their address. This is an **Insecure Direct Object Reference (IDOR)** vulnerability.

**Step 4: The Transaction**

```typescript
const order = await prisma.$transaction(async (tx) => {
    // Everything inside here is ONE atomic database transaction
    // If ANY step fails → ALL changes are rolled back
});
```

---

## 4. Inventory Locking — SELECT FOR UPDATE

### The Problem: Race Conditions

```
Without locking — 2 users buy the last item simultaneously:

Time    Thread A (User 1)              Thread B (User 2)
─────   ────────────────────           ────────────────────
t0      SELECT quantity FROM           SELECT quantity FROM
        inventory → 1 available        inventory → 1 available
t1      ✅ Check: 1 >= 1               ✅ Check: 1 >= 1
t2      UPDATE reserved = reserved + 1 UPDATE reserved = reserved + 1
t3      ✅ Order created               ✅ Order created
                                       ❌ OVERSOLD! Only 1 item exists
                                          but 2 orders were placed!
```

### The Solution: Row-Level Locking

```typescript
// This SQL locks the inventory row for this product
// No other transaction can read or modify it until we COMMIT
const [inventory] = await tx.$queryRaw<Array<{ quantity: number; reserved: number }>>`
    SELECT quantity, reserved FROM inventory
    WHERE product_id = ${item.productId}
    FOR UPDATE
`;
```

**What `FOR UPDATE` does:**

```
Time    Thread A (User 1)              Thread B (User 2)
─────   ────────────────────           ────────────────────
t0      SELECT ... FOR UPDATE          SELECT ... FOR UPDATE
        → Row LOCKED by Thread A       → ⏳ WAITING (blocked!)
t1      Check: 1 >= 1 ✅
t2      UPDATE reserved = reserved + 1
t3      COMMIT → Row UNLOCKED          → Row acquired!
t4                                     SELECT quantity, reserved
                                       → quantity=1, reserved=1
                                       → available = 1 - 1 = 0
                                       ❌ available < 1 → Error!
                                       "Insufficient stock"
                                       ROLLBACK
```

Thread B **waits** until Thread A commits. Then Thread B reads the updated data and correctly sees there's no stock left.

### Why Raw SQL Instead of Prisma?

```typescript
// Prisma does NOT support SELECT ... FOR UPDATE
// This would NOT lock the row:
const inv = await tx.inventory.findUnique({ where: { productId } });

// We MUST use raw SQL for pessimistic locking:
const [inv] = await tx.$queryRaw`SELECT ... FOR UPDATE`;
```

Prisma's query builder doesn't expose PostgreSQL's locking clauses. Raw queries give us direct access to this critical database feature.

### The Reservation Pattern

```
Initial state:     quantity: 50, reserved: 0,  available: 50
After order:       quantity: 50, reserved: 2,  available: 48
After delivery:    quantity: 48, reserved: 0,  available: 48
After cancellation: quantity: 50, reserved: 0, available: 50 (restored)
```

```
available = quantity - reserved

quantity:  Total physical stock in warehouse
reserved:  Items claimed by pending/paid orders (not yet shipped)
available: What new customers can buy
```

Why not just decrement `quantity` immediately?
- If order is cancelled → we need to "add back" stock
- With `reserved`, cancellation just decrements `reserved`
- `quantity` only changes when the item **physically leaves** the warehouse (DELIVERED)

---

## 5. Payment Flow

### Architecture

```
┌──────────┐      ┌──────────┐      ┌──────────────┐
│ Frontend │─────►│ Backend  │─────►│ Stripe/Mock  │
│          │      │ API      │      │ Gateway      │
│          │      │          │◄─────│              │
│          │◄─────│          │      │              │
└──────────┘      └──────────┘      └──────────────┘
                       │ ▲
         Webhook ──────┘ │
         (async)         │
                         │
               ┌─────────┘
               │ Update order
               │ + payment status
```

### Mock Stripe Flow (Current Implementation)

**Step 1: User creates order → payment record created (PENDING)**
```sql
INSERT INTO payments (order_id, provider, status, amount)
VALUES ('order-uuid', 'STRIPE', 'PENDING', 599.98);
```

**Step 2: Frontend initiates payment**

```
POST /api/payments/:orderId/initiate

→ Generates mock gateway ID: "pay_mock_1709071425_a3b8d1"
→ Returns { checkoutUrl: "/mock-payment/pay_mock_..." }
→ In production: returns Stripe Checkout Session URL
```

**Step 3: Payment gateway calls webhook**

```
POST /api/payments/webhook

Stripe sends:
{
    "type": "checkout.session.completed",
    "data": { ... }
}

Our mock version:
{
    "gatewayId": "pay_mock_1709071425_a3b8d1",
    "eventType": "payment.success"
}
```

**Step 4: Webhook handler updates status**

```
payment.success → payment.status = SUCCESS, order.status = PAID
payment.failed  → payment.status = FAILED, order.status = CANCELLED
                  + release reserved inventory (decrement reserved)
```

### Why the Webhook Route Has No Authentication

```typescript
// Webhook — NO authentication
router.post('/webhook', controller.webhook);

// All other routes — authenticated
router.use(authenticate);
router.get('/:orderId', controller.getPayment);
```

The webhook is called by Stripe's servers, not by the user's browser. Stripe doesn't have our JWT. Instead, webhooks are verified by **signature**:

```typescript
// Production Stripe verification:
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
    req.rawBody,          // Raw request body (not parsed JSON)
    sig,                  // Stripe's signature header
    WEBHOOK_ENDPOINT_SECRET  // Our secret (from Stripe dashboard)
);
```

This is more secure than JWT — it proves the request came from Stripe, not from someone who found the webhook URL.

### Development Simulation

For testing without real Stripe:

```
POST /api/payments/:orderId/simulate-success

1. Finds the payment record for this order
2. Calls handlePaymentWebhook(gatewayId, 'payment.success')
3. Payment → SUCCESS, Order → PAID

This endpoint should be REMOVED in production.
```

---

## 6. Order Status State Machine

### Valid Transitions

```
                    ┌──────────────┐
          ┌────────►│     PAID     │────────┐
          │         └──────────────┘        │
          │                │                │
    ┌─────┴──────┐         │         ┌──────▼─────┐
    │  PENDING   │         │         │  CANCELLED │
    │ (created)  │────────►│         │ (terminal) │
    └────────────┘  cancel └─────────┘            │
                           │                      │
                    ┌──────▼─────┐                │
                    │  SHIPPED   │◄───── cancel ──┘
                    └──────┬─────┘         (only from PAID)
                           │
                    ┌──────▼─────┐
                    │ DELIVERED  │
                    │ (terminal) │
                    └────────────┘
```

### Transition Map (Code)

```typescript
const validTransitions: Record<string, string[]> = {
    PENDING:   ['PAID', 'CANCELLED'],
    PAID:      ['SHIPPED', 'CANCELLED'],
    SHIPPED:   ['DELIVERED'],
    DELIVERED: [],     // terminal — cannot change
    CANCELLED: [],     // terminal — cannot change
};
```

### What Happens at Each Transition

| From → To | Action | Inventory Effect |
|-----------|--------|-----------------|
| PENDING → PAID | Payment confirmed | None (already reserved at creation) |
| PENDING → CANCELLED | Payment failed or admin cancel | ↓ Release reserved |
| PAID → SHIPPED | Admin marks as shipped | None |
| PAID → CANCELLED | Admin cancels after payment | ↓ Release reserved |
| SHIPPED → DELIVERED | Admin confirms delivery | ↓ Decrement both quantity AND reserved |

### Inventory Operations on Status Change

**Cancellation (release inventory):**
```typescript
for (const item of order.items) {
    await tx.inventory.update({
        where: { productId: item.productId },
        data: { reserved: { decrement: item.quantity } },  // Give stock back
    });
}
```

**Delivery (finalize inventory):**
```typescript
for (const item of order.items) {
    await tx.inventory.update({
        where: { productId: item.productId },
        data: {
            quantity: { decrement: item.quantity },  // Items physically left
            reserved: { decrement: item.quantity },  // No longer reserved
        },
    });
}
```

---

## 7. Address Module

### Default Address Management

When a user sets a new address as default, all other defaults must be unset:

```typescript
if (input.isDefault) {
    // Unset all existing defaults for this user
    await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
    });
}

// Then create/update with isDefault: true
```

**Why `updateMany`?** Even though logically only one should be default, `updateMany` is defensive — it handles the edge case where data corruption created multiple defaults.

### Address Ownership Check (IDOR Prevention)

```typescript
// ❌ VULNERABLE: Any user can access/modify any address
const address = await prisma.address.findUnique({ where: { id: addressId } });

// ✅ SECURE: Only the owner can access their address
const address = await prisma.address.findFirst({
    where: { id: addressId, userId },  // Must match BOTH
});
```

This pattern is used everywhere: orders, payments, cart, wishlist. Always filter by `userId` in addition to the resource `id`.

### `.partial()` for Update Schemas

```typescript
export const createAddressSchema = z.object({
    line1: z.string().min(1).max(255).trim(),
    city: z.string().min(1).max(100).trim(),
    // ... all required fields
});

export const updateAddressSchema = createAddressSchema.partial();
```

`.partial()` makes ALL fields optional. This means:
- `PATCH /addresses/:id { "city": "Mumbai" }` → only updates city
- `PATCH /addresses/:id { }` → valid request, updates nothing
- No need to send the entire address object for partial updates

---

## 8. File-by-File Breakdown

### `orders.schema.ts` — Status Enum Validation

```typescript
export const updateOrderStatusSchema = z.object({
    status: z.enum(['PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'], {
        errorMap: () => ({
            message: 'Status must be PAID, SHIPPED, DELIVERED, or CANCELLED'
        }),
    }),
});
```

**Why exclude PENDING?** An admin should never manually set an order to PENDING. That status is only set at creation time. Allowing it would bypass the payment flow.

### `orders.service.ts` — Price Snapshot

```typescript
items: {
    create: cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.product.price,  // ← SNAPSHOT
    })),
},
```

**Why store `unitPrice` on `order_items`?**

```
Without snapshot:
  User buys headphones at $299.99
  Admin raises price to $399.99
  User checks order history: "$399.99 × 2 = $799.98"
  But user was charged $599.98 → confusion, support tickets

With snapshot:
  order_items.unitPrice = 299.99 (frozen at time of purchase)
  Products.price = 399.99 (current price, independent)
  Order history always shows what the user actually paid
```

### `orders.routes.ts` — Admin-Only Status Update

```typescript
router.patch(
    '/:orderId/status',
    authorize('ADMIN'),                         // Must be admin
    validate(updateOrderStatusSchema, 'body'),  // Must be valid status
    controller.updateStatus
);
```

Middleware chain: `authenticate → authorize('ADMIN') → validate → controller`

A customer calling this endpoint gets:
```json
{ "success": false, "error": "Access denied. Required role: ADMIN." }
```

### `payments.service.ts` — Webhook Event Handling

```typescript
switch (eventType) {
    case 'payment.success': {
        // Array transaction (all-or-nothing, simpler syntax)
        await prisma.$transaction([
            prisma.payment.update({ data: { status: 'SUCCESS' } }),
            prisma.order.update({ data: { status: 'PAID' } }),
        ]);
        break;
    }

    case 'payment.failed': {
        // Interactive transaction (need sequential logic)
        await prisma.$transaction(async (tx) => {
            await tx.payment.update({ data: { status: 'FAILED' } });
            await tx.order.update({ data: { status: 'CANCELLED' } });

            // Release reserved inventory for each item
            const items = await tx.orderItem.findMany({ ... });
            for (const item of items) {
                await tx.inventory.update({ ... });
            }
        });
    }
}
```

**Two styles of `$transaction`:**

| Style | Syntax | Use When |
|-------|--------|----------|
| **Array** | `prisma.$transaction([query1, query2])` | All queries are independent, run in parallel |
| **Interactive** | `prisma.$transaction(async (tx) => { ... })` | Queries depend on each other (e.g., fetch items, then update each) |

Payment success uses **array** (two independent updates). Payment failure uses **interactive** (need to fetch order items before releasing inventory).

---

## 9. API Reference

### Addresses

#### `GET /api/addresses`

**Response (200):**
```json
{
    "success": true,
    "data": [
        {
            "id": "addr-uuid",
            "line1": "123 Main Street",
            "line2": "Apt 4B",
            "city": "Mumbai",
            "state": "Maharashtra",
            "postalCode": "400001",
            "country": "India",
            "isDefault": true,
            "userId": "user-uuid"
        }
    ]
}
```

#### `POST /api/addresses` — Create
**Request:** `{ "line1": "...", "city": "...", "state": "...", "postalCode": "...", "isDefault": true }`

#### `PATCH /api/addresses/:id` — Update (partial)
**Request:** `{ "city": "Delhi" }` (only fields being changed)

#### `DELETE /api/addresses/:id` — Delete

---

### Orders

#### `POST /api/orders` — Create order from cart

**Request:**
```json
{ "addressId": "addr-uuid" }
```

**Response (201):**
```json
{
    "success": true,
    "message": "Order created successfully.",
    "data": {
        "id": "order-uuid",
        "status": "PENDING",
        "total": "599.98",
        "createdAt": "2026-02-28T...",
        "address": {
            "id": "addr-uuid",
            "line1": "123 Main Street",
            "city": "Mumbai", "state": "Maharashtra",
            "postalCode": "400001", "country": "India"
        },
        "items": [
            {
                "id": "item-uuid",
                "quantity": 2,
                "unitPrice": "299.99",
                "product": {
                    "id": "product-uuid",
                    "name": "Wireless Headphones",
                    "slug": "wireless-headphones",
                    "images": ["https://..."]
                }
            }
        ],
        "payment": {
            "id": "payment-uuid",
            "provider": "STRIPE",
            "status": "PENDING",
            "amount": "599.98",
            "gatewayId": null
        }
    }
}
```

**Errors:**
| Status | Error | When |
|--------|-------|------|
| 400 | Cart is empty | No items in cart |
| 400 | Insufficient stock | Product stock < requested quantity |
| 404 | Address not found | Invalid/other user's addressId |

#### `GET /api/orders` — List orders (paginated)

**Query:** `?page=1&limit=10`
**Response:** `{ orders: [...], pagination: { page, limit, total, totalPages } }`

#### `GET /api/orders/:orderId` — Get order detail

Admins can view any order. Customers can only view their own.

#### `PATCH /api/orders/:orderId/status` — Update status (Admin only)

**Request:** `{ "status": "SHIPPED" }`

---

### Payments

#### `POST /api/payments/:orderId/initiate` — Start payment

**Response:**
```json
{
    "success": true,
    "data": {
        "orderId": "order-uuid",
        "gatewayId": "pay_mock_1709071425_a3b8d1",
        "checkoutUrl": "/mock-payment/pay_mock_..."
    }
}
```

#### `POST /api/payments/webhook` — Payment gateway callback (NO AUTH)

**Request:** `{ "gatewayId": "pay_mock_...", "eventType": "payment.success" }`

#### `POST /api/payments/:orderId/simulate-success` — DEV ONLY

Simulates a successful payment for testing.

---

## 10. Design Decisions

### Why Transaction for Order Creation?

```
Without transaction — partial failure:
  1. Create order ✅
  2. Create order items ✅
  3. Reserve inventory ❌ (DB error)
  4. Clear cart ❌ (never reached)

  Result: Order exists with no inventory reservation.
  Cart still has items. User might order again → oversell.

With transaction — all-or-nothing:
  1. Create order ✅
  2. Create order items ✅
  3. Reserve inventory ❌ (DB error)
  → ROLLBACK: order and items are deleted

  Result: Nothing changed. Cart intact. User can retry.
```

### Why Store Payment as Separate Table?

```
Order 1:1 Payment — why not merge?

1. Payment might have multiple attempts
   (user's card declines, they try another)

2. Payment gateway metadata (gatewayId, provider)
   is conceptually separate from order details

3. Future: support multiple payment providers
   (Stripe, Razorpay, etc.) per order

4. Audit trail: payment status changes independently
   of order status
```

### Why Price Snapshot Over Live Lookup?

```
Live lookup (bad):
  order_items has: productId, quantity
  To show order history: JOIN products → get current price
  Problem: price changes break history

Snapshot (good):
  order_items has: productId, quantity, unitPrice
  unitPrice is frozen at time of purchase
  order total = Σ(unitPrice × quantity)
  Price can change freely without affecting past orders
```

### Why `SELECT FOR UPDATE` Over Optimistic Locking?

| Approach | Mechanism | Trade-off |
|----------|-----------|-----------|
| **Optimistic** | Version column, retry on conflict | Better for low contention, complex retry logic |
| **Pessimistic (ours)** | `FOR UPDATE` row lock | Better for high contention (popular products), simpler code |

E-commerce often has **flash sales** where many users buy the same product simultaneously — pessimistic locking prevents all race conditions without retry logic.

### Why Mock Stripe Instead of Real Integration?

Real Stripe requires:
- Stripe account + API keys
- Public webhook URL (Stripe needs to reach your server)
- Frontend Stripe.js integration
- PCI compliance considerations

The mock gives us:
- Complete order flow testing without external dependencies
- Same API interface — swap in real Stripe later with minimal changes
- Comments in code show exactly where Stripe SDK calls go

**Build Status: ✅ TypeScript compiles with zero errors.**

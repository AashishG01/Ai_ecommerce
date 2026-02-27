# Phase 1 — Foundation & Database (Complete Documentation)

> This document covers **everything** implemented in Phase 1: what was built, why each decision was made, the theory behind each pattern, and how the code works.

---

## Table of Contents

1. [Overview — What Changed](#1-overview)
2. [PostgreSQL + Prisma ORM](#2-postgresql--prisma-orm)
3. [Layered Architecture](#3-layered-architecture)
4. [Security Middleware](#4-security-middleware)
5. [Structured Logging](#5-structured-logging)
6. [Error Handling](#6-error-handling)
7. [Graceful Shutdown](#7-graceful-shutdown)
8. [Product Module (Full Walkthrough)](#8-product-module)
9. [Seed Script](#9-seed-script)
10. [Dockerfiles & Docker Compose](#10-dockerfiles--docker-compose)
11. [Frontend Security Headers](#11-frontend-security-headers)
12. [Environment Configuration](#12-environment-configuration)
13. [Files Summary](#13-files-summary)

---

## 1. Overview

### Before Phase 1

```
backend/src/
├── config/db.ts          ← MongoDB connection (single file)
├── routes/products.ts    ← All route handlers in one file
├── data/products.ts      ← Hardcoded seed data
├── types/index.ts        ← Manual TypeScript interfaces
└── index.ts              ← Bare Express server
```

**Problems:**
- MongoDB was the database — not ideal for e-commerce (transactions, relations, ACID compliance)
- Everything was in one flat structure — no separation of concerns
- No security: no helmet, no rate limiting, regex injection vulnerability
- No logging: just `console.log`
- No error handling: crashes would kill the server
- No Docker: no containerization strategy
- Seed/delete routes were publicly accessible (anyone could wipe the database)

### After Phase 1

```
backend/src/
├── index.ts                           ← Production-ready entry point
├── lib/
│   ├── prisma.ts                      ← Prisma client singleton
│   └── logger.ts                      ← Pino structured logger
├── middleware/
│   ├── errorHandler.ts                ← Global error handler
│   ├── validate.ts                    ← Zod validation factory
│   └── rateLimiter.ts                 ← Rate limiting
├── modules/
│   └── products/
│       ├── products.schema.ts         ← Zod validation schemas
│       ├── products.service.ts        ← Business logic layer
│       ├── products.controller.ts     ← HTTP request handlers
│       └── products.routes.ts         ← Route definitions
└── scripts/
    └── seed.ts                        ← CLI seed script
```

---

## 2. PostgreSQL + Prisma ORM

### Why PostgreSQL over MongoDB?

E-commerce is fundamentally a **relational** domain. Here's why PostgreSQL is the right choice:

| Feature | PostgreSQL | MongoDB |
|---------|-----------|---------|
| **ACID Transactions** | ✅ Full support | ⚠️ Limited (multi-doc since v4) |
| **Relations** | ✅ Foreign keys, JOINs | ❌ Manual references |
| **Data Integrity** | ✅ Constraints, CHECK, UNIQUE | ❌ No schema enforcement |
| **Complex Queries** | ✅ Aggregations, CTEs, Window | ⚠️ Aggregation pipeline |
| **Inventory Safety** | ✅ `SELECT ... FOR UPDATE` | ⚠️ Optimistic locking only |
| **Full-Text Search** | ✅ Built-in `tsvector` | ✅ Atlas Search |
| **Vector Search** | ✅ pgvector extension | ✅ Atlas Vector Search |

**Critical for e-commerce:** When two users try to buy the last item, PostgreSQL's `SELECT ... FOR UPDATE` with transactions prevents overselling. MongoDB can't guarantee this as reliably.

### Why Prisma ORM?

Prisma is a **type-safe** ORM for Node.js/TypeScript. Here's why we chose it:

1. **Auto-generated TypeScript types** — When you define a model in `schema.prisma`, Prisma generates full TypeScript types. No manual `interface Product {}` needed.

2. **Migration system** — `prisma migrate dev` generates SQL migration files, tracks them, and applies them. You get a full history of every schema change.

3. **Query builder** — Instead of writing raw SQL, you write type-safe queries:
   ```typescript
   // This is fully type-checked — no typos possible
   const product = await prisma.product.findUnique({
       where: { slug: 'headphones' },
       include: { category: true, brand: true }
   });
   ```

4. **Prisma Studio** — Visual database browser with `npx prisma studio`

5. **No SQL injection** — All queries are parameterized automatically

### The Schema Explained

**File:** `backend/prisma/schema.prisma`

#### The Generator & Datasource

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- `generator client` tells Prisma to generate a JavaScript/TypeScript client
- `datasource db` configures the PostgreSQL connection from the `DATABASE_URL` environment variable

#### Enums

```prisma
enum Role {
  CUSTOMER
  ADMIN
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
}
```

PostgreSQL supports native enums. This means:
- The database **enforces** valid values — you can't insert `status = "INVALID"`
- Better performance than string columns
- Self-documenting — the schema tells you all possible states

#### The Products Table

```prisma
model Product {
  id            String   @id @default(uuid())
  name          String
  slug          String   @unique
  price         Decimal  @db.Decimal(10, 2)
  ...
  categoryId    String   @map("category_id")
  category      Category @relation(fields: [categoryId], references: [id])

  @@index([categoryId])
  @@index([price])
  @@map("products")
}
```

Key decisions:

- **`@id @default(uuid())`** — UUIDs instead of auto-increment integers. Why?
  - UUIDs are globally unique — safe for distributed systems
  - Can be generated client-side (no DB round-trip needed)
  - Don't leak information (integer IDs reveal how many records exist)

- **`@db.Decimal(10, 2)`** — Decimal type for prices, NOT float. Why?
  - Floats have rounding errors: `0.1 + 0.2 = 0.30000000000000004`
  - Decimal(10, 2) stores exact values: `0.10 + 0.20 = 0.30`
  - **NEVER use float/double for money** — this is a classic production bug

- **`@@map("products")`** — Maps the Prisma model name `Product` to the PostgreSQL table name `products`. Convention: camelCase in code, snake_case in DB.

- **`@@index([categoryId])`** — Database indexes on frequently queried columns. Without indexes, PostgreSQL does a full table scan (reads every row). With indexes, it uses a B-tree to find rows in O(log n).

#### Indexes Explained

```prisma
@@index([categoryId])  // Speeds up: WHERE category_id = '...'
@@index([brandId])     // Speeds up: WHERE brand_id = '...'
@@index([price])       // Speeds up: ORDER BY price ASC/DESC
@@index([isTrending])  // Speeds up: WHERE is_trending = true
```

**How B-tree indexes work:**
```
Without index: Scan all 10,000 rows → O(n)
With index:    B-tree lookup → O(log n) ≈ 14 comparisons for 10,000 rows
```

Rule of thumb: **Index every column you filter or sort by.** But don't over-index — each index adds write overhead.

#### Relationships

```prisma
model Product {
  categoryId String   @map("category_id")
  category   Category @relation(fields: [categoryId], references: [id])
}

model Category {
  products Product[]
}
```

This creates a **foreign key constraint** in PostgreSQL:
```sql
ALTER TABLE products ADD CONSTRAINT fk_category
  FOREIGN KEY (category_id) REFERENCES categories(id);
```

**What does this enforce?**
- You can't create a product with a non-existent category
- You can't delete a category that has products
- The database guarantees referential integrity — no orphaned records

#### Inventory Table Design

```prisma
model Inventory {
  id        String  @id @default(uuid())
  quantity  Int     @default(0)
  reserved  Int     @default(0)
  productId String  @unique @map("product_id")
  product   Product @relation(fields: [productId], references: [id])
}
```

**Why `quantity` AND `reserved`?**

When a customer starts checkout:
1. `reserved += 1` (lock the item)
2. If payment succeeds → `quantity -= 1`, `reserved -= 1`
3. If payment fails → `reserved -= 1` (release the lock)

Available stock = `quantity - reserved`

This prevents two users from buying the last item simultaneously (the "double-spend" problem of e-commerce).

### The Prisma Client Singleton

**File:** `backend/src/lib/prisma.ts`

```typescript
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({ ... });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
```

**Why a singleton?**

In development, tools like `ts-node-dev` restart the server on every file change. Each restart would create a new `PrismaClient`, opening a new database connection pool. After 10 restarts, you'd have 10 connection pools — and PostgreSQL would run out of connections.

The singleton pattern stores the client on `globalThis` (which survives hot-reloads), so only one connection pool exists.

**Why not do this in production?**

In production, the server starts once and doesn't hot-reload. A single `new PrismaClient()` is sufficient. Storing on `globalThis` in production would be unnecessary and could leak memory in edge-function environments.

---

## 3. Layered Architecture

### The Problem with Flat Structure

In the old code, the route file did everything:

```typescript
// OLD: routes/products.ts — One file does routing + validation + DB queries
router.get('/', async (req, res) => {
    const { category } = req.query;
    const filter = {};
    if (category) filter.category = { $regex: new RegExp(`^${category}$`, 'i') }; // Regex injection!
    const products = await collection.find(filter).toArray(); // Direct DB call
    res.json({ success: true, data: products }); // Direct response
});
```

**Problems:**
1. Can't test business logic without an HTTP request
2. Can't reuse logic (e.g., search products from both API and CLI)
3. Mixing concerns makes the file grow uncontrollably
4. Direct DB calls make it hard to add caching or logging later

### The Layered Solution

```
Route → Controller → Service → Database (Prisma)
```

Each layer has a single responsibility:

| Layer | Responsibility | Knows about HTTP? | Knows about DB? |
|-------|---------------|-------------------|-----------------|
| **Route** | URL mapping, middleware | ✅ Yes | ❌ No |
| **Controller** | Parse request, format response | ✅ Yes | ❌ No |
| **Service** | Business logic, orchestration | ❌ No | ✅ Yes |
| **Schema** | Input validation rules | ❌ No | ❌ No |

### Why This Matters

**Testability:** You can test the service layer with plain function calls:
```typescript
// No HTTP setup needed
const result = await listProducts({ page: 1, limit: 10, category: 'electronics' });
expect(result.pagination.total).toBe(4);
```

**Reusability:** The service can be called from:
- API routes (current)
- CLI scripts
- Background jobs
- WebSocket handlers

**Maintainability:** When you need to add caching:
```typescript
// Only the service changes — controller and routes are untouched
export async function getProductBySlug(slug: string) {
    const cached = await redis.get(`product:${slug}`);
    if (cached) return JSON.parse(cached);

    const product = await prisma.product.findUnique({ where: { slug } });
    await redis.set(`product:${slug}`, JSON.stringify(product), 'EX', 3600);
    return product;
}
```

---

## 4. Security Middleware

### Helmet

**File:** Used in `backend/src/index.ts`

```typescript
import helmet from 'helmet';
app.use(helmet());
```

Helmet sets 11 security-related HTTP headers in one line. Here's what each does:

| Header | What It Prevents |
|--------|-----------------|
| `Content-Security-Policy` | XSS attacks (restricts where scripts can load from) |
| `X-Content-Type-Options: nosniff` | MIME-type sniffing attacks |
| `X-Frame-Options: DENY` | Clickjacking (prevents embedding in iframes) |
| `Strict-Transport-Security` | Forces HTTPS connections |
| `X-XSS-Protection` | Legacy XSS filter in older browsers |
| `Referrer-Policy` | Controls what's sent in the Referer header |

**Without Helmet:** Your Express server sends `X-Powered-By: Express`, which tells attackers exactly what framework you're running.

### Rate Limiting

**File:** `backend/src/middleware/rateLimiter.ts`

```typescript
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 100,            // 100 requests per window per IP
    standardHeaders: true,
    legacyHeaders: false,
});
```

**Why rate limiting?**

Without it, a single user or bot can:
1. **DDoS your server** — Send 1 million requests/second
2. **Brute-force passwords** — Try every password combination
3. **Scrape your product data** — Automated data theft
4. **Exhaust your database connections** — Crash your backend

**How it works:**

Rate limiting uses a **sliding window** algorithm:
```
Window: 1 minute (60,000ms)
Max: 100 requests

Timeline:
  T=0s:  Request 1   ✅ (1/100)
  T=1s:  Request 2   ✅ (2/100)
  ...
  T=30s: Request 100  ✅ (100/100)
  T=31s: Request 101  ❌ 429 Too Many Requests
  T=60s: Window resets ✅ (1/100)
```

We created two limiters:
- `apiLimiter` (100/min) — for general API routes
- `authLimiter` (10/min) — stricter for login/signup (prevents brute-force)

### CORS Lockdown

```typescript
app.use(cors({
    origin: [FRONTEND_URL],        // Only allow your frontend
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

**Before (insecure):**
```typescript
// OLD CODE — allowed all origins and all methods
app.use(cors({
    origin: [FRONTEND_URL, 'http://localhost:3000'],
    credentials: true,
}))
```

**What is CORS?**

When your frontend (`http://localhost:3000`) makes a request to your backend (`http://localhost:5000`), the browser blocks it by default because they're different origins. CORS headers tell the browser "it's okay, I authorize this origin."

**Why lock it down?** If you set `origin: '*'`, any website can make API requests to your backend — including malicious sites that steal user data.

### Zod Validation (Input Sanitization)

**File:** `backend/src/middleware/validate.ts`

```typescript
export function validate(schema: AnyZodObject, target: ValidationTarget = 'body') {
    return (req: Request, _res: Response, next: NextFunction) => {
        const parsed = schema.parse(req[target]);
        req[target] = parsed;  // Replace with parsed (clean) data
        next();
    };
}
```

**Why validate inputs?**

In the old code:
```typescript
// OLD CODE — user input goes directly to the database
const { category } = req.query;
filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
```

If a user sends `category=.*`, the regex becomes `/^.*$/i` which matches everything. Worse: certain regex patterns can cause **ReDoS** (Regular Expression Denial of Service) — a crafted input that makes the regex engine run for minutes.

**How Zod fixes this:**

```typescript
// products.schema.ts
export const productQuerySchema = z.object({
    category: z.string().optional(),
    page: z.string().default('1').transform(val => parseInt(val, 10))
         .pipe(z.number().int().positive()),
    limit: z.string().default('20').transform(val => parseInt(val, 10))
         .pipe(z.number().int().min(1).max(100)),
});
```

Zod validates **before** the data reaches your service:
1. Type checking — is `page` a valid number?
2. Constraints — is `limit` between 1 and 100?
3. Transformation — convert string `"20"` to number `20`
4. Rejection — invalid input returns a 400 error, never reaches the database

**Why `z.string().transform().pipe()`?** Query parameters in Express are always strings (`req.query.page = "2"`). Zod's `transform` converts the string to a number, then `pipe` validates the number.

### Regex Injection Fix

The old code had a **critical vulnerability:**

```typescript
// OLD CODE — VULNERABLE
filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
```

If `category = "(.*){10,}"`, this creates a regex that takes exponential time to evaluate (ReDoS attack).

**The fix:** We don't use regex at all anymore. Prisma uses parameterized queries:

```typescript
// NEW CODE — SAFE
where.category = {
    slug: { equals: category, mode: 'insensitive' }
};
```

This generates a SQL query with a parameter placeholder:
```sql
WHERE LOWER(categories.slug) = LOWER($1)
-- $1 is safely escaped by the PostgreSQL driver
```

**No regex. No injection. No ReDoS.**

---

## 5. Structured Logging

**File:** `backend/src/lib/logger.ts`

### Why Not console.log?

`console.log` has these problems in production:

1. **No log levels** — Can't distinguish info from errors
2. **Not structured** — Plain text is hard to parse by log aggregation tools
3. **No timestamps** — When did this error happen?
4. **No context** — Which request caused this error?
5. **Slow** — `console.log` is synchronous (blocks the event loop)

### Why Pino?

Pino is the **fastest** Node.js logger. Benchmarks:

| Logger | Operations/sec |
|--------|---------------|
| Pino | 47,000 |
| Winston | 9,000 |
| Bunyan | 7,000 |
| console.log | 3,000 |

Pino is fast because it:
- Serializes to JSON using `fast-safe-stringify` (no circular reference checks)
- Does NO processing in the main thread
- Offloads formatting to a separate process (`pino-pretty` in dev)

### How It Works

```typescript
const logger = pino({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    ...(isProduction ? {} : {
        transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard' },
        },
    }),
});
```

**In development** (human-readable):
```
[10:23:45] INFO: 🚀 Backend API running on http://localhost:5000 [development]
[10:23:46] DEBUG: GET /api/products → 200 (45ms)
```

**In production** (JSON for log aggregation):
```json
{"level":30,"time":1709071425000,"msg":"Backend API running on http://localhost:5000 [production]"}
{"level":30,"time":1709071426000,"req":{"method":"GET","url":"/api/products"},"res":{"statusCode":200},"responseTime":45}
```

JSON logs can be piped to tools like **Elasticsearch**, **Datadog**, or **CloudWatch** for search, alerts, and dashboards.

### Request Logging with pino-http

```typescript
app.use(pinoHttp({ logger, autoLogging: NODE_ENV === 'production' }));
```

This automatically logs every HTTP request with:
- Method, URL, status code
- Response time in milliseconds
- Request ID (for tracing)

---

## 6. Error Handling

**File:** `backend/src/middleware/errorHandler.ts`

### The Problem

Without a global error handler:
```typescript
app.get('/api/products/:slug', async (req, res) => {
    const product = await prisma.product.findUnique({ where: { slug: req.params.slug } });
    // If Prisma throws (DB connection lost), Express sends:
    // 500 Internal Server Error + full stack trace (leaking file paths!)
});
```

### The Solution: Three-Tier Error Handling

```typescript
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
    // Tier 1: Zod validation errors → 400
    if (err instanceof ZodError) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
        });
        return;
    }

    // Tier 2: Known operational errors → Custom status code
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
    }

    // Tier 3: Unknown errors → 500 (hide details in production)
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
}
```

### Why This Pattern?

**Operational vs Programmer Errors:**

- **Operational errors** (expected): "Product not found", "Invalid input", "Rate limited"
  → Return helpful error message to client

- **Programmer errors** (unexpected): Null reference, DB connection lost
  → Log the full error, return generic message to client (don't leak internals)

The `AppError` class marks operational errors:
```typescript
export class AppError extends Error {
    constructor(public statusCode: number, message: string, public isOperational = true) {
        super(message);
    }
}

// Usage in service:
throw new AppError(404, 'Product not found');
```

**Why hide error details in production?**

A stack trace exposes:
- File system paths (`C:\Users\Hp\Desktop\...`)
- Library versions
- Database connection details
- Internal function names

Attackers use this information to find vulnerabilities.

---

## 7. Graceful Shutdown

**File:** `backend/src/index.ts`

```typescript
async function shutdown(signal: string) {
    logger.info(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
        logger.info('HTTP server closed');
        await prisma.$disconnect();
        logger.info('Database connection closed');
        process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

### What Happens Without Graceful Shutdown?

When you press Ctrl+C or Docker sends `SIGTERM`:

1. **Without:** Server dies instantly → In-flight requests get connection reset → Database connections leak → Data corruption possible
2. **With:** Server stops accepting new requests → Finishes in-flight requests → Closes database pool → Clean exit

### The 10-Second Timeout

```typescript
setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
}, 10_000);
```

**Why?** If a request is stuck (e.g., waiting for an unresponsive external API), `server.close()` will never resolve. The 10-second timeout is a safety net — it kills the process after 10 seconds regardless.

### SIGTERM vs SIGINT

- `SIGTERM` — Sent by Docker/Kubernetes when stopping a container. "Please shut down."
- `SIGINT` — Sent when you press Ctrl+C. "User wants to stop."

Both should trigger the same graceful shutdown sequence.

---

## 8. Product Module (Full Walkthrough)

### Schema (Zod Validation)

**File:** `backend/src/modules/products/products.schema.ts`

```typescript
export const productQuerySchema = z.object({
    page: z.string().optional().default('1')
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().int().positive()),
    limit: z.string().optional().default('20')
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().int().min(1).max(100)),
    // ...
});
```

**The transform + pipe pattern:**

Express query params are always strings: `req.query.page = "2"`. We need numbers.

```
"2" → z.string()     → ✅ valid string
    → .transform()   → parseInt("2") → 2
    → .pipe(number()) → ✅ valid positive integer
```

```
"abc" → z.string()     → ✅ valid string  
      → .transform()   → parseInt("abc") → NaN
      → .pipe(number()) → ❌ FAIL: not a number → 400 error
```

**Why `max(100)` on limit?** Without a max, a client could request `?limit=1000000`, fetching your entire product catalog in one request — slow query + massive response + potential OOM.

### Service (Business Logic)

**File:** `backend/src/modules/products/products.service.ts`

```typescript
export async function listProducts(query: ProductQuery) {
    const where: Prisma.ProductWhereInput = {};

    if (category) {
        where.category = { slug: { equals: category, mode: 'insensitive' } };
    }

    const [products, total] = await Promise.all([
        prisma.product.findMany({ where, select: productSelect, orderBy, skip, take: limit }),
        prisma.product.count({ where }),
    ]);

    return {
        data: products,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
}
```

**Key patterns:**

1. **`Promise.all` for parallel queries** — Fetches products AND total count simultaneously instead of sequentially. Cuts response time in half.

2. **`select` instead of `include`** — Only fetches the columns we need, not the entire row. Less data transferred from DB = faster.

3. **Pagination response format:**
   ```json
   {
       "data": [...],
       "pagination": {
           "page": 1,
           "limit": 20,
           "total": 156,
           "totalPages": 8
       }
   }
   ```
   The client knows: current page, items per page, total items, and total pages. This enables pagination UI.

### Controller (HTTP Layer)

**File:** `backend/src/modules/products/products.controller.ts`

```typescript
export async function listProducts(req: Request, res: Response, next: NextFunction) {
    try {
        const query = req.query as unknown as ProductQuery;
        const result = await productService.listProducts(query);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error); // Forward to global error handler
    }
}
```

**Why `next(error)` instead of `res.status(500).json(...)`?**

By calling `next(error)`, the error flows to the global error handler. This means:
- You write error handling logic **once** (in `errorHandler.ts`), not in every controller
- All errors get the same structured format
- All errors get logged consistently
- Zod errors, AppErrors, and unknown errors are handled differently — automatically

### Routes

**File:** `backend/src/modules/products/products.routes.ts`

```typescript
router.get('/', validate(productQuerySchema, 'query'), controller.listProducts);
router.get('/categories', controller.getCategories);
router.get('/brands', controller.getBrands);
router.get('/reviews/:productId', controller.getProductReviews);
router.get('/:slug', controller.getProductBySlug);
```

**Order matters!** `/categories` and `/brands` MUST come before `/:slug`. Otherwise, Express would match `/categories` as a slug parameter.

**Why no POST/DELETE seed routes?** The old code had `POST /api/products/seed` and `DELETE /api/products/seed` — publicly accessible routes that could wipe the entire database. In the new code, seeding is done via a CLI script (`npm run seed`), which can only be run by someone with server access.

---

## 9. Seed Script

**File:** `backend/src/scripts/seed.ts`

The seed script:
1. Clears all existing data (in the correct order to respect foreign keys)
2. Creates categories and brands
3. Creates products with inventory records

**Deletion order matters:**

```typescript
await prisma.review.deleteMany();      // depends on: user, product
await prisma.orderItem.deleteMany();   // depends on: order, product
await prisma.payment.deleteMany();     // depends on: order
await prisma.order.deleteMany();       // depends on: user, address
await prisma.inventory.deleteMany();   // depends on: product
await prisma.product.deleteMany();     // depends on: category, brand
await prisma.category.deleteMany();    // no dependencies remaining
```

Foreign key constraints prevent deleting a category if products still reference it. So we delete `products` first, then `categories`.

---

## 10. Dockerfiles & Docker Compose

### Multi-Stage Builds (Backend)

**File:** `backend/Dockerfile`

```dockerfile
# Stage 1: Build TypeScript → JavaScript
FROM node:20-alpine AS builder
COPY . .
RUN npm ci && npx prisma generate && npm run build

# Stage 2: Run only the compiled output
FROM node:20-alpine AS runner
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

**Why multi-stage?**

| Stage | Contains | Size |
|-------|----------|------|
| Builder | Source code + TypeScript + dev deps | ~500MB |
| Runner | Compiled JS + prod deps only | ~150MB |

The final production image doesn't have TypeScript, source code, or dev dependencies — it's 70% smaller and has a smaller attack surface.

**Why `node:20-alpine`?** Alpine Linux is ~5MB vs Ubuntu's ~72MB. Smaller base = smaller image = faster deploys = fewer vulnerabilities.

**Why non-root user?**
```dockerfile
RUN adduser --system --uid 1001 appuser
USER appuser
```

If a vulnerability lets an attacker execute code inside your container, they can't modify system files or install packages because they're not running as root.

### Docker Compose

**File:** `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U estorefont -d estorefont_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    depends_on:
      postgres:
        condition: service_healthy
```

**Health checks + depends_on:** The backend won't start until PostgreSQL is confirmed healthy (responding to connections). Without this, the backend might start before PostgreSQL is ready, causing connection errors on first requests.

**Volume persistence:**
```yaml
volumes:
  postgres_data:
```

Without volumes, stopping the container would delete all your database data. Volumes persist data across container restarts.

---

## 11. Frontend Security Headers

**File:** `frontend/next.config.ts`

```typescript
async headers() {
    return [{
        source: '/(.*)',
        headers: [
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
    }];
}
```

| Header | Attack Prevented |
|--------|-----------------|
| `X-Frame-Options: DENY` | **Clickjacking** — attacker embeds your site in an invisible iframe and tricks users into clicking |
| `X-Content-Type-Options: nosniff` | **MIME sniffing** — browser guessing file types instead of trusting Content-Type header |
| `Referrer-Policy` | **Referer leakage** — prevents full URL (with query params) from being sent to third-party sites |
| `Permissions-Policy` | **Feature abuse** — prevents scripts from accessing camera/mic/GPS without your consent |

Also added:
- `poweredByHeader: false` — hides `X-Powered-By: Next.js`
- `output: 'standalone'` — generates a standalone server (needed for Docker)

---

## 12. Environment Configuration

### Env Validation at Startup

```typescript
const requiredEnvVars = ['DATABASE_URL'];
for (const key of requiredEnvVars) {
    if (!process.env[key]) {
        logger.fatal(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
}
```

**Why fail fast?**

Without this, a missing `DATABASE_URL` would only cause an error when the first database query runs — possibly minutes after startup. The error message would be cryptic: "Cannot read property 'connect' of undefined."

By validating at startup, the server immediately tells you exactly what's wrong: `Missing required environment variable: DATABASE_URL`. This saves debugging time in deployment.

### .env.example Files

Each service has a `.env.example` file with all variables documented but no real secrets:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/estorefont_db
```

New developers can `cp .env.example .env` and fill in their values. The `.env` files are in `.gitignore` so secrets never enter version control.

---

## 13. Files Summary

### New Files Created

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | PostgreSQL schema (11 tables) |
| `src/lib/prisma.ts` | Prisma client singleton |
| `src/lib/logger.ts` | Pino structured logger |
| `src/middleware/errorHandler.ts` | Global error handler + AppError |
| `src/middleware/validate.ts` | Zod validation middleware |
| `src/middleware/rateLimiter.ts` | Rate limiting (100/min + 10/min) |
| `src/modules/products/products.schema.ts` | Query validation schemas |
| `src/modules/products/products.service.ts` | Business logic layer |
| `src/modules/products/products.controller.ts` | HTTP request handlers |
| `src/modules/products/products.routes.ts` | Route definitions |
| `src/scripts/seed.ts` | PostgreSQL seed script |
| `backend/Dockerfile` | Multi-stage Node.js Docker image |
| `frontend/Dockerfile` | Multi-stage Next.js Docker image |
| `ai-service/Dockerfile` | Multi-stage Python Docker image |
| `docker-compose.yml` | All services orchestration |
| `.gitignore` | Root gitignore |
| `README.md` | Project documentation |
| `*.env.example` | Environment variable templates |

### Files Deleted

| File | Reason |
|------|--------|
| `src/config/db.ts` | Replaced by Prisma client |
| `src/routes/products.ts` | Moved to modules/products |
| `src/data/products.ts` | Replaced by seed script |
| `src/types/index.ts` | Replaced by Prisma-generated types |

### Files Modified

| File | Changes |
|------|---------|
| `src/index.ts` | Complete rewrite with security middleware |
| `package.json` | Removed MongoDB, added Prisma + security deps |
| `.env` | Changed to PostgreSQL connection |
| `frontend/next.config.ts` | Added security headers + standalone output |

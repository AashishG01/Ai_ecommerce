# EStoreFront Backend — Complete Documentation

> Full technical deep-dive into the backend: architecture, every layer, every route, every algorithm, and the reasoning behind every decision.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Request Lifecycle](#2-request-lifecycle)
3. [Entry Point — index.ts](#3-entry-point)
4. [Middleware Pipeline](#4-middleware-pipeline)
5. [The Layered Architecture Pattern](#5-layered-architecture)
6. [Product Module — Complete Breakdown](#6-product-module)
7. [Database Layer — Prisma + PostgreSQL](#7-database-layer)
8. [Error Handling System](#8-error-handling-system)
9. [Logging System](#9-logging-system)
10. [Security Architecture](#10-security-architecture)
11. [Server Lifecycle Management](#11-server-lifecycle)
12. [API Reference](#12-api-reference)
13. [Data Flow Diagrams](#13-data-flow-diagrams)

---

## 1. High-Level Architecture

### System Context

```
┌─────────────┐     HTTP      ┌──────────────────────────────────────────┐
│   Browser   │ ─────────────→│           Express.js Server              │
│  (Next.js)  │               │                                          │
└─────────────┘               │  ┌──────────────────────────────────┐    │
                              │  │  Middleware Pipeline              │    │
                              │  │  Helmet → CORS → RateLimit →     │    │
                              │  │  JSON Parser → Pino Logger       │    │
                              │  └──────────┬───────────────────────┘    │
                              │             │                            │
                              │  ┌──────────▼───────────────────────┐    │
                              │  │  Router                          │    │
                              │  │  /api/products → Product Module  │    │
                              │  │  /api/health   → Health Check    │    │
                              │  └──────────┬───────────────────────┘    │
                              │             │                            │
                              │  ┌──────────▼───────────────────────┐    │
                              │  │  Module (Route→Controller→Service)│   │
                              │  └──────────┬───────────────────────┘    │
                              │             │                            │
                              │  ┌──────────▼───────────────────────┐    │
                              │  │  Prisma ORM → PostgreSQL         │    │
                              │  └──────────────────────────────────┘    │
                              │                                          │
                              │  ┌──────────────────────────────────┐    │
                              │  │  Global Error Handler (catches all)│  │
                              │  └──────────────────────────────────┘    │
                              └──────────────────────────────────────────┘
```

### Directory Structure

```
backend/
├── prisma/
│   └── schema.prisma              # Database schema (11 tables, relations, indexes)
├── prisma.config.ts               # Prisma configuration (auto-generated)
├── src/
│   ├── index.ts                   # App entry point (server bootstrap)
│   ├── lib/                       # Shared infrastructure
│   │   ├── prisma.ts              # Database client singleton
│   │   └── logger.ts              # Pino structured logger
│   ├── middleware/                 # Express middleware
│   │   ├── errorHandler.ts        # Global error handler + AppError class
│   │   ├── validate.ts            # Zod validation factory
│   │   └── rateLimiter.ts         # Rate limiting configs
│   ├── modules/                   # Feature modules (domain logic)
│   │   └── products/
│   │       ├── products.routes.ts      # URL → handler mapping
│   │       ├── products.controller.ts  # HTTP request/response handling
│   │       ├── products.service.ts     # Business logic + DB queries
│   │       └── products.schema.ts      # Input validation schemas
│   └── scripts/
│       └── seed.ts                # Database seeding script
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env
└── .env.example
```

### Why This Structure?

**Separation by feature (modules), not by type.** Compare:

```
❌ BAD: Grouped by type               ✅ GOOD: Grouped by feature
├── controllers/                      ├── modules/
│   ├── productController.ts          │   ├── products/
│   ├── orderController.ts            │   │   ├── products.routes.ts
│   └── userController.ts             │   │   ├── products.controller.ts
├── services/                         │   │   ├── products.service.ts
│   ├── productService.ts             │   │   └── products.schema.ts
│   ├── orderService.ts               │   ├── orders/
│   └── userService.ts                │   │   ├── orders.routes.ts
├── routes/                           │   │   └── ...
│   ├── productRoutes.ts              │   └── auth/
│   └── ...                           │       └── ...
```

**Why feature-based is better:**
- When working on "products", all 4 files are in one folder — no jumping between directories
- Each module is self-contained — you can delete a module without affecting others
- Scales with team size — one developer per module, no merge conflicts
- Easy to extract into a microservice later — the module is already isolated

---

## 2. Request Lifecycle

When a browser sends `GET /api/products?category=electronics&page=2`, here's exactly what happens:

```
Step 1: HTTP request arrives at Express server
         │
Step 2: ▼ Helmet — adds 11 security headers to response
         │
Step 3: ▼ CORS — checks if origin is allowed (localhost:3000)
         │         ❌ Unknown origin → 403 Forbidden
         │         ✅ Allowed origin → continue
         │
Step 4: ▼ Rate Limiter — checks IP request count
         │         ❌ Over 100/min → 429 Too Many Requests
         │         ✅ Under limit → continue
         │
Step 5: ▼ JSON Parser — parses request body (if any)
         │         ❌ Body > 10KB → 413 Payload Too Large
         │
Step 6: ▼ Pino HTTP Logger — starts timer, assigns request ID
         │
Step 7: ▼ Router — matches URL to handler
         │         /api/products → products.routes.ts
         │
Step 8: ▼ Zod Validate Middleware — validates query params
         │         ❌ Invalid → ZodError → errorHandler → 400
         │         ✅ Valid → transformed & attached to req.query
         │
Step 9: ▼ Controller — extracts validated data from req
         │
Step 10: ▼ Service — builds Prisma query, executes
         │
Step 11: ▼ Prisma — generates SQL, sends to PostgreSQL
         │
Step 12: ▼ PostgreSQL — executes query using indexes
         │         Uses B-tree index on category_id → O(log n)
         │
Step 13: ▼ Response flows back:
         │         PostgreSQL → Prisma → Service → Controller → JSON response
         │
Step 14: ▼ Pino HTTP Logger — logs method, URL, status, duration
         │
Step 15: ▼ Response sent to browser
```

**Total time:** ~20-50ms for a typical query (mostly database time).

---

## 3. Entry Point — index.ts

The entry point is the **bootstrap file**. It wires everything together.

### Initialization Order (IMPORTANT)

```typescript
// 1. Load environment variables FIRST
dotenv.config();

// 2. Validate required env vars BEFORE anything else
const requiredEnvVars = ['DATABASE_URL'];
for (const key of requiredEnvVars) {
    if (!process.env[key]) {
        logger.fatal(`Missing required environment variable: ${key}`);
        process.exit(1);  // Fail fast — don't start a broken server
    }
}

// 3. Create Express app
const app = express();

// 4. Security middleware (MUST be first — before any route)
app.use(helmet());
app.use(cors({ ... }));

// 5. Rate limiting (before routes)
app.use('/api/', apiLimiter);

// 6. Body parsing (before routes that read req.body)
app.use(express.json({ limit: '10kb' }));

// 7. Request logging
app.use(pinoHttp({ ... }));

// 8. Routes
app.use('/api/products', productRoutes);

// 9. Error handler (MUST be last — catches errors from all routes)
app.use(errorHandler);
```

**Why order matters:**
- If `helmet()` comes after routes, some responses won't have security headers
- If `errorHandler` comes before routes, it won't catch route errors
- If `cors()` comes after body parsing, pre-flight requests fail
- Express middleware executes in the **exact order** you call `app.use()`

### Body Size Limit

```typescript
app.use(express.json({ limit: '10kb' }));
```

Without this, an attacker could send a 100MB JSON body, consuming all your server's memory. The `10kb` limit is generous for API requests but prevents abuse.

---

## 4. Middleware Pipeline

### What Is Middleware?

Middleware is a function that sits between the request and your route handler. It can:
- **Modify** the request (add properties, parse body)
- **Modify** the response (add headers)
- **Short-circuit** the chain (reject the request)
- **Pass control** to the next middleware via `next()`

```typescript
// Middleware signature
(req: Request, res: Response, next: NextFunction) => void

// Error middleware signature (4 params — Express detects this automatically)
(err: Error, req: Request, res: Response, next: NextFunction) => void
```

### Our Middleware Stack

```
Request → [Helmet] → [CORS] → [RateLimit] → [JSON] → [Pino] → [Route] → [ErrorHandler] → Response
```

| # | Middleware | What it does | Can reject? |
|---|-----------|-------------|-------------|
| 1 | Helmet | Adds security headers | No |
| 2 | CORS | Validates request origin | Yes → 403 |
| 3 | Rate Limiter | Counts requests per IP | Yes → 429 |
| 4 | JSON Parser | Parses `Content-Type: application/json` | Yes → 413 |
| 5 | Pino HTTP | Logs request + starts timer | No |
| 6 | Zod Validate | Validates route-specific input | Yes → 400 |
| 7 | Error Handler | Catches all thrown errors | N/A (last) |

### The Validate Middleware — Factory Pattern

```typescript
export function validate(schema: AnyZodObject, target: ValidationTarget = 'body') {
    return (req: Request, _res: Response, next: NextFunction) => {
        try {
            const parsed = schema.parse(req[target]);
            req[target] = parsed;  // Replace raw input with validated + transformed data
            next();
        } catch (error) {
            next(error);  // Forward ZodError to error handler
        }
    };
}
```

This is a **factory function** — it returns a new middleware function configured for a specific schema and target.

```typescript
// Usage — each call creates a different middleware:
validate(productQuerySchema, 'query')   // Validates req.query
validate(createOrderSchema, 'body')     // Validates req.body
validate(slugParamSchema, 'params')     // Validates req.params
```

**Why `req[target] = parsed`?** Zod's `.parse()` returns a new object with:
- Types converted (string `"20"` → number `20`)
- Defaults applied (missing `page` → `1`)
- Extra fields stripped (unknown query params removed)

By replacing `req.query` with the parsed result, the controller receives clean, typed data.

---

## 5. The Layered Architecture

### The Four Layers

```
┌─────────────────────────────────────────┐
│  ROUTES LAYER                           │
│  • URL-to-handler mapping               │
│  • Middleware attachment                 │
│  • No logic, just wiring                │
└─────────────┬───────────────────────────┘
              │ calls
┌─────────────▼───────────────────────────┐
│  CONTROLLER LAYER                       │
│  • Extract data from req                │
│  • Call service                         │
│  • Format response (res.json)           │
│  • Forward errors (next(error))         │
│  • Knows: HTTP, Request, Response       │
│  • Does NOT know: Database, SQL         │
└─────────────┬───────────────────────────┘
              │ calls
┌─────────────▼───────────────────────────┐
│  SERVICE LAYER                          │
│  • Business logic                       │
│  • Build queries, filter, paginate      │
│  • Throw AppError for known failures    │
│  • Knows: Database (Prisma)             │
│  • Does NOT know: HTTP, req, res        │
└─────────────┬───────────────────────────┘
              │ calls
┌─────────────▼───────────────────────────┐
│  DATA LAYER (Prisma)                    │
│  • Generates SQL                        │
│  • Manages connection pool              │
│  • Type-safe query builder              │
│  • Handles transactions                 │
└─────────────────────────────────────────┘
```

### Why Separate Controller and Service?

**Controller answers:** "What does the HTTP request want?"
**Service answers:** "How do I fulfill that business requirement?"

Example — the same service function can be called from multiple places:

```typescript
// Called from API route (controller)
const products = await productService.listProducts({ page: 1, limit: 20 });

// Called from CLI script
const products = await productService.listProducts({ page: 1, limit: 100 });

// Called from background job (future)
const products = await productService.listProducts({ trending: true, limit: 5 });
```

The service doesn't know or care about HTTP. It just takes parameters and returns data.

---

## 6. Product Module — Complete Breakdown

### 6.1 Schema Layer — Input Validation

**File:** `products.schema.ts`

Every field in `productQuerySchema` is a validation rule:

```typescript
// Category filter — optional string, passed as-is
category: z.string().optional(),

// Price filter — string → number conversion with positivity check
minPrice: z.string().optional()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .pipe(z.number().positive().optional()),

// Trending — string "true"/"false" → boolean
trending: z.string().optional()
    .transform((val) => val === 'true'),

// Sort — MUST be one of these exact values (enum validation)
sort: z.enum(['price_asc', 'price_desc', 'rating', 'name', 'newest']).optional(),

// Search — max 200 chars (prevents huge query strings)
search: z.string().max(200).optional(),

// Page — defaults to 1, must be positive integer
page: z.string().optional().default('1')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),

// Limit — defaults to 20, capped at 100
limit: z.string().optional().default('20')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100)),
```

**The `z.infer` trick:**

```typescript
export type ProductQuery = z.infer<typeof productQuerySchema>;
// This auto-generates:
// type ProductQuery = {
//     category?: string;
//     brand?: string;
//     minPrice?: number;
//     maxPrice?: number;
//     trending: boolean;
//     sort?: 'price_asc' | 'price_desc' | 'rating' | 'name' | 'newest';
//     search?: string;
//     page: number;
//     limit: number;
// }
```

No manual type definitions needed — the types are derived from the validation schema. **Single source of truth.**

### 6.2 Service Layer — Algorithm Deep Dive

**File:** `products.service.ts`

#### The `productSelect` Constant

```typescript
const productSelect = {
    id: true, name: true, slug: true, description: true,
    price: true, originalPrice: true, images: true,
    rating: true, reviewCount: true, isTrending: true, createdAt: true,
    category: { select: { id: true, name: true, slug: true } },
    brand: { select: { id: true, name: true, slug: true } },
    inventory: { select: { quantity: true, reserved: true } },
} satisfies Prisma.ProductSelect;
```

**Why `select` instead of returning everything?**

```sql
-- Without select (fetches ALL columns including unused ones):
SELECT * FROM products JOIN categories ON ... JOIN brands ON ...

-- With select (fetches only what we need):
SELECT p.id, p.name, p.slug, p.price, c.name as category_name, ...
FROM products p JOIN categories c ON ...
```

Less data transferred = faster queries = smaller JSON responses = less bandwidth.

**The `satisfies` keyword** (TypeScript 4.9+): Validates that the object matches `Prisma.ProductSelect` at compile time, but preserves the literal type (so TypeScript knows exactly which fields are selected).

#### The `listProducts` Algorithm

```
Input: { category?, brand?, minPrice?, maxPrice?, trending?, sort?, search?, page, limit }

Step 1: BUILD WHERE CLAUSE
  ├─ If category provided → WHERE categories.slug = $category (case-insensitive)
  ├─ If brand provided    → WHERE brands.slug = $brand (case-insensitive)
  ├─ If minPrice provided → WHERE price >= $minPrice
  ├─ If maxPrice provided → WHERE price <= $maxPrice
  ├─ If trending = true   → WHERE is_trending = true
  └─ If search provided   → WHERE name ILIKE '%search%' OR description ILIKE '%search%'

Step 2: BUILD ORDER BY
  ├─ price_asc  → ORDER BY price ASC
  ├─ price_desc → ORDER BY price DESC
  ├─ rating     → ORDER BY rating DESC
  ├─ name       → ORDER BY name ASC
  └─ newest     → ORDER BY created_at DESC (default)

Step 3: CALCULATE PAGINATION
  skip = (page - 1) * limit
  Example: page=3, limit=20 → skip=40 (skip first 40 rows, take next 20)

Step 4: EXECUTE TWO QUERIES IN PARALLEL
  Query A: SELECT ... WHERE ... ORDER BY ... OFFSET skip LIMIT limit
  Query B: SELECT COUNT(*) WHERE ...
  (Promise.all runs both simultaneously)

Step 5: RETURN
  {
    data: [products],
    pagination: { page, limit, total, totalPages: ceil(total/limit) }
  }
```

#### The Pagination Algorithm

```
Total products: 156
Limit: 20 per page
Total pages: ceil(156 / 20) = 8

Page 1: OFFSET 0,  LIMIT 20  → products  1-20
Page 2: OFFSET 20, LIMIT 20  → products 21-40
Page 3: OFFSET 40, LIMIT 20  → products 41-60
...
Page 8: OFFSET 140, LIMIT 20 → products 141-156 (only 16 returned)
```

**Why OFFSET-based pagination?**

Pros: Simple, supports jump-to-page
Cons: Slow for large offsets (OFFSET 100000 still scans 100000 rows)

For our product catalog (<10K products), OFFSET works fine. For millions of records, cursor-based pagination would be better (Phase 9).

#### The Search Algorithm

```typescript
if (search) {
    where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
    ];
}
```

This generates:
```sql
WHERE (LOWER(name) LIKE LOWER('%headphones%') OR LOWER(description) LIKE LOWER('%headphones%'))
```

**How `LIKE '%term%'` works:**
- PostgreSQL scans every row and checks if the string contains the term
- Case-insensitive via `LOWER()` function
- Time complexity: O(n) where n = number of products

**In Phase 5**, we'll replace this with PostgreSQL `tsvector` full-text search, which uses GIN indexes for O(log n) search.

#### The `getProductBySlug` Algorithm

```typescript
export async function getProductBySlug(slug: string) {
    const product = await prisma.product.findUnique({
        where: { slug },   // Uses UNIQUE index → O(1) lookup
        select: productSelect,
    });

    if (!product) {
        throw new AppError(404, 'Product not found');
    }

    return product;
}
```

**Why slug instead of ID?**

URLs: `estorefont.com/products/wireless-headphones` (readable) vs `estorefont.com/products/a1b2c3d4-e5f6-...` (ugly)

Slugs are:
- SEO-friendly (Google ranks readable URLs higher)
- Human-readable (users can understand the URL)
- Unique (enforced by database constraint)
- Indexed (O(1) lookup via B-tree on unique constraint)

### 6.3 Controller Layer

```typescript
export async function listProducts(req: Request, res: Response, next: NextFunction) {
    try {
        const query = req.query as unknown as ProductQuery;
        const result = await productService.listProducts(query);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
}
```

Three things happen:
1. **Extract** validated query from request (Zod already transformed it)
2. **Delegate** to service (no business logic in controllers)
3. **Format** response with consistent `{ success: true, ... }` shape

**The `try/catch + next(error)` pattern:** Every controller wraps its logic in try/catch. If anything throws (Prisma error, AppError, etc.), the error is forwarded to the global error handler. The controller never directly sends error responses.

### 6.4 Routes Layer

```typescript
router.get('/', validate(productQuerySchema, 'query'), controller.listProducts);
router.get('/categories', controller.getCategories);
router.get('/brands', controller.getBrands);
router.get('/reviews/:productId', controller.getProductReviews);
router.get('/:slug', controller.getProductBySlug);
```

**Route order matters!** Express matches routes top-to-bottom:

```
GET /categories  → matches '/categories' ✅ (static route, checked first)
GET /headphones  → skips '/categories' ❌, matches '/:slug' ✅
```

If `/:slug` was listed first, `/categories` would be treated as `slug = "categories"`.

---

## 7. Database Layer

### Connection Management

```typescript
// lib/prisma.ts — Singleton pattern
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});
```

**Connection Pool:** Prisma manages a pool of PostgreSQL connections. Default pool size = `num_cpu * 2 + 1`. On a 4-core machine, that's 9 concurrent connections.

**Query Logging:** In development, `['query']` logs every SQL query with timing. Useful for debugging slow queries. Disabled in production for performance.

### How Prisma Generates SQL

```typescript
prisma.product.findMany({
    where: { category: { slug: { equals: 'electronics', mode: 'insensitive' } } },
    orderBy: { price: 'asc' },
    skip: 20,
    take: 10,
})
```

Generates:
```sql
SELECT p."id", p."name", p."slug", p."price", ...
FROM "products" p
LEFT JOIN "categories" c ON p."category_id" = c."id"
WHERE LOWER(c."slug") = LOWER($1)
ORDER BY p."price" ASC
OFFSET $2 LIMIT $3

-- Parameters: $1='electronics', $2=20, $3=10
```

**Parameterized queries** prevent SQL injection — the values are never concatenated into the SQL string.

---

## 8. Error Handling System

### Error Classification

```
All Errors
├── ZodError (validation)        → 400 Bad Request + field details
├── AppError (operational)       → Custom status + user-friendly message
│   ├── 404 Product not found
│   ├── 401 Unauthorized
│   ├── 403 Forbidden
│   └── 409 Conflict
└── Unknown Error (programmer)   → 500 Internal Server Error + log full stack
```

### How Errors Flow

```
Service throws AppError(404, "Product not found")
  → Controller catches in try/catch
    → next(error)
      → Express skips all remaining middleware
        → Reaches errorHandler (4-param middleware)
          → Detects AppError → res.status(404).json({ error: "Product not found" })
```

### The AppError Class

```typescript
export class AppError extends Error {
    constructor(
        public statusCode: number,
        message: string,
        public isOperational = true
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
```

`Object.setPrototypeOf` is needed because TypeScript compiles to ES5 where extending built-in classes (like Error) doesn't properly set the prototype chain. Without it, `instanceof AppError` would return false.

---

## 9. Logging System

### Log Levels (from most to least severe)

```
fatal  → System is unusable (missing env vars, can't start)
error  → Operation failed (unhandled exception, DB connection lost)
warn   → Something unexpected but recoverable
info   → Normal operations (server started, request served)
debug  → Detailed diagnostic info (query params, DB queries)
trace  → Extremely verbose (rarely used in production)
```

Setting `LOG_LEVEL=info` shows info + warn + error + fatal, hiding debug and trace.

### Output Formats

**Development** (pino-pretty transport — human readable):
```
[23:45:12] INFO: 🚀 Backend API running on http://localhost:5000
[23:45:13] INFO: GET /api/products 200 45ms
```

**Production** (raw JSON — machine parseable):
```json
{"level":30,"time":1709071425000,"msg":"GET /api/products 200 45ms"}
```

---

## 10. Security Architecture

### Defense In Depth (Multiple Layers)

```
Layer 1: Helmet         → Prevents browser-based attacks (XSS, clickjacking)
Layer 2: CORS           → Prevents unauthorized origins
Layer 3: Rate Limiting  → Prevents DDoS and brute-force
Layer 4: Body Limit     → Prevents memory exhaustion
Layer 5: Zod Validation → Prevents invalid/malicious input
Layer 6: Prisma Params  → Prevents SQL injection
Layer 7: AppError       → Prevents information leakage
```

If one layer fails, the next catches the attack.

### Rate Limiting Algorithm (Token Bucket)

```
Each IP gets a bucket of 100 tokens (requests).
Every request consumes 1 token.
Tokens refill at a rate of 100 per minute.

IP 192.168.1.1:
  T=0s:   100 tokens remaining → Request OK → 99 tokens
  T=0.5s: 99 tokens remaining  → Request OK → 98 tokens
  ...
  T=30s:  0 tokens remaining   → 429 Too Many Requests
  T=60s:  100 tokens refilled  → Request OK → 99 tokens
```

Response headers tell the client their status:
```
X-RateLimit-Limit: 100          (max requests per window)
X-RateLimit-Remaining: 67       (tokens left)
X-RateLimit-Reset: 1709071485   (when the window resets - Unix timestamp)
```

---

## 11. Server Lifecycle

```
STARTUP:
  1. Load .env
  2. Validate env vars (fail fast if missing)
  3. Wire middleware
  4. Register routes
  5. Start HTTP listener
  6. Log "🚀 Server running..."

RUNNING:
  • Accept requests
  • Process through middleware pipeline
  • Execute handlers
  • Return responses

SHUTDOWN (SIGTERM/SIGINT):
  1. Stop accepting new connections
  2. Wait for in-flight requests to complete
  3. Disconnect Prisma (closes DB connection pool)
  4. Exit with code 0 (success)

FORCED SHUTDOWN (10s timeout):
  • If graceful shutdown hangs → exit with code 1 (failure)
```

---

## 12. API Reference

### `GET /api/health`

Health check endpoint for monitoring/load balancers.

**Response:**
```json
{
    "status": "ok",
    "service": "estorefont-backend",
    "environment": "development",
    "timestamp": "2026-02-27T23:00:00.000Z"
}
```

---

### `GET /api/products`

List products with pagination, filters, search, and sorting.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number (1-indexed) |
| limit | number | 20 | Items per page (1-100) |
| category | string | — | Filter by category slug |
| brand | string | — | Filter by brand slug |
| minPrice | number | — | Minimum price filter |
| maxPrice | number | — | Maximum price filter |
| trending | boolean | false | Only trending products |
| sort | enum | newest | `price_asc`, `price_desc`, `rating`, `name`, `newest` |
| search | string | — | Search in name + description (max 200 chars) |

**Example:** `GET /api/products?category=electronics&sort=price_asc&page=1&limit=10`

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "name": "Wireless Headphones",
            "slug": "wireless-headphones",
            "description": "...",
            "price": "299.99",
            "originalPrice": "399.99",
            "images": ["https://..."],
            "rating": "4.70",
            "reviewCount": 234,
            "isTrending": true,
            "createdAt": "2026-02-27T00:00:00.000Z",
            "category": { "id": "uuid", "name": "Electronics", "slug": "electronics" },
            "brand": { "id": "uuid", "name": "TechPro", "slug": "techpro" },
            "inventory": { "quantity": 50, "reserved": 0 }
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 10,
        "total": 4,
        "totalPages": 1
    }
}
```

---

### `GET /api/products/:slug`

Get a single product by its URL slug.

**Response:** `{ "success": true, "data": { ...product } }`

**Error:** `{ "success": false, "error": "Product not found" }` (404)

---

### `GET /api/products/categories`

List all product categories, sorted alphabetically.

**Response:** `{ "success": true, "data": [{ "id": "...", "name": "Electronics", "slug": "electronics" }] }`

---

### `GET /api/products/brands`

List all brands, sorted alphabetically.

---

### `GET /api/products/reviews/:productId`

Get all reviews for a product, with author info, sorted newest first.

---

## 13. Data Flow Diagrams

### Product Search Flow

```
GET /api/products?search=headphones&category=electronics&sort=price_asc&page=1&limit=10

        ┌─────────────────────────────────────────────┐
        │  Zod Validate Middleware                    │
        │                                             │
        │  Input: { search: "headphones",             │
        │           category: "electronics",          │
        │           sort: "price_asc",                │
        │           page: "1", limit: "10" }          │
        │                                             │
        │  Output: { search: "headphones",            │
        │            category: "electronics",         │
        │            sort: "price_asc",               │
        │            page: 1, limit: 10 }   ← TYPED  │
        └──────────────┬──────────────────────────────┘
                       │
        ┌──────────────▼──────────────────────────────┐
        │  Service — Build WHERE clause               │
        │                                             │
        │  WHERE:                                     │
        │    categories.slug = 'electronics'          │
        │    AND (                                    │
        │      name ILIKE '%headphones%'              │
        │      OR description ILIKE '%headphones%'    │
        │    )                                        │
        │  ORDER BY: price ASC                        │
        │  OFFSET: 0  LIMIT: 10                       │
        └──────────────┬──────────────────────────────┘
                       │
        ┌──────────────▼──────────────────────────────┐
        │  PostgreSQL — Execute with indexes          │
        │                                             │
        │  1. Use B-tree index on category_id         │
        │     to quickly find electronics products    │
        │  2. Sequential scan for ILIKE (text search) │
        │  3. Sort by price using price index         │
        │  4. Return rows 0-9                         │
        └──────────────┬──────────────────────────────┘
                       │
        ┌──────────────▼──────────────────────────────┐
        │  Response                                   │
        │  {                                          │
        │    "success": true,                         │
        │    "data": [...10 products...],             │
        │    "pagination": {                          │
        │      "page": 1, "limit": 10,               │
        │      "total": 4, "totalPages": 1            │
        │    }                                        │
        │  }                                          │
        └─────────────────────────────────────────────┘
```

### Error Flow

```
GET /api/products/nonexistent-product

    Controller → Service calls prisma.product.findUnique()
                        │
                        ▼
                 Result is null
                        │
                        ▼
              throw new AppError(404, "Product not found")
                        │
                        ▼
              Controller catch(error) → next(error)
                        │
                        ▼
              Express skips remaining middleware
                        │
                        ▼
              errorHandler middleware:
                 ├─ Is ZodError? No
                 ├─ Is AppError? Yes!
                 └─ res.status(404).json({ success: false, error: "Product not found" })
```

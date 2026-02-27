# Backend — Design Patterns, Express Internals & Advanced Concepts

> Deep-dive into the software engineering patterns used, how Express works under the hood, Prisma internals, TypeScript advanced features, and Node.js concepts.

---

## 1. Design Patterns Used

### 1.1 Singleton Pattern — `lib/prisma.ts`

**Problem:** Every time `ts-node-dev` hot-reloads, it re-executes the entire file. Each execution creates a new `PrismaClient` with its own connection pool (default: 9 connections). After 10 reloads, you have 90 database connections — PostgreSQL's default limit is 100.

**Solution:** Store the client on `globalThis` (the only object that survives hot-reloads).

```typescript
// Without singleton:
export const prisma = new PrismaClient(); // New instance every hot-reload!

// With singleton:
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**The `??` operator (nullish coalescing):**
```
globalForPrisma.prisma ?? new PrismaClient()
│                        │
│ If prisma exists       │ If prisma is null/undefined
│ → reuse it             │ → create new one
```

**Why only in non-production?** In production, the process starts once and never hot-reloads. A single `new PrismaClient()` is sufficient. Storing on `globalThis` in serverless/edge environments could cause memory leaks.

### 1.2 Factory Pattern — `middleware/validate.ts`

**Problem:** You need different validation middleware for different routes, but all share the same try/catch/next(error) logic.

**Solution:** A factory function that generates middleware configured for a specific schema.

```typescript
// Factory function — returns a NEW middleware function each time
export function validate(schema: AnyZodObject, target: ValidationTarget = 'body') {
    return (req: Request, _res: Response, next: NextFunction) => {
        // This inner function is the actual middleware
        const parsed = schema.parse(req[target]);
        req[target] = parsed;
        next();
    };
}
```

**Usage — the factory creates specialized middleware:**
```typescript
// Each call to validate() creates a different middleware function:
const validateProductQuery = validate(productQuerySchema, 'query');
const validateCreateOrder = validate(createOrderSchema, 'body');
const validateSlugParam = validate(slugSchema, 'params');

// Used in routes:
router.get('/', validateProductQuery, controller.listProducts);
router.post('/orders', validateCreateOrder, controller.createOrder);
```

**Why not just inline the validation?**
```typescript
// Without factory — repetitive code in every route
router.get('/', (req, res, next) => {
    try {
        req.query = productQuerySchema.parse(req.query);
        next();
    } catch (error) { next(error); }
}, controller.listProducts);

router.post('/orders', (req, res, next) => {
    try {
        req.body = createOrderSchema.parse(req.body);
        next();
    } catch (error) { next(error); }
}, controller.createOrder);

// With factory — DRY (Don't Repeat Yourself)
router.get('/', validate(productQuerySchema, 'query'), controller.listProducts);
router.post('/orders', validate(createOrderSchema, 'body'), controller.createOrder);
```

### 1.3 Chain of Responsibility — Express Middleware

Each middleware is a handler in a chain. The request passes through each handler in order. Any handler can:
1. Process and pass to next (`next()`)
2. Terminate the chain (send response)
3. Pass an error (`next(error)`)

```
Request → [Helmet] → [CORS] → [RateLimit] → [JSON] → [Pino] → [Validate] → [Controller]
   │         │          │          │           │         │          │              │
   │       next()     next()    next()       next()    next()    next()       res.json()
   │                              │
   │                     If over limit:
   │                     res.status(429).json(...)
   │                     Chain stops here
```

**How `next()` works internally:**

Express maintains a stack of middleware functions. When you call `next()`, Express pops the next function from the stack and executes it. When you call `next(error)`, Express skips ALL normal middleware and jumps to the first **error middleware** (4-parameter function).

```
Normal chain:             next()    next()    next()
[Helmet] ────────► [CORS] ────────► [Rate] ────────► [Route]

Error chain:              next(err)
[Route] ──── error ──────────────────────────────────► [ErrorHandler]
              │                                              │
              └── Skips everything in between ──────────────┘
```

### 1.4 Repository Pattern (via Prisma)

Although we don't have explicit repository classes, the service layer + Prisma acts as the repository pattern:

```
Traditional:  Controller → Service → Repository → Database
Our approach:  Controller → Service → Prisma Client → PostgreSQL
```

Prisma IS the repository. It provides:
- Type-safe query methods (`findMany`, `findUnique`, `create`, `update`)
- Query building (where, orderBy, select, include)
- Transaction support
- Connection pooling

---

## 2. Express.js Internals

### How Express Routing Actually Works

When you write:
```typescript
app.use('/api/products', productRoutes);
```

Express does NOT do a simple string comparison. Here's the actual algorithm:

**Step 1: Path Matching (Layer Stack)**

Express compiles each route into a regular expression:
```
'/api/products'  → /^\/api\/products\/?(?=\/|$)/i
'/'              → /^\/\/?$/i
'/:slug'         → /^\/([^\/]+?)\/?$/i
'/categories'    → /^\/categories\/?$/i
```

**Step 2: Request Processing**

```
Request: GET /api/products/categories

1. app.use('/api/products', ...) → matches '/api/products' prefix → enter router
2. router.get('/', ...)          → test '/categories' against /^\/\/?$/ → NO MATCH
3. router.get('/categories', ...) → test '/categories' against /^\/categories/ → MATCH!
4. Execute: validate → controller.getCategories
```

### The Express Application Object

```typescript
const app = express();
```

`app` is actually a function:
```typescript
typeof app === 'function'; // true!
// app can be passed to http.createServer():
const server = http.createServer(app);
```

When a request arrives, Node.js calls `app(req, res)`, and Express processes it through the middleware stack.

### `app.listen()` Under the Hood

```typescript
const server = app.listen(5000);
// Is equivalent to:
const server = http.createServer(app);
server.listen(5000);
```

`app.listen()` is just a convenience wrapper. It returns the `http.Server` instance, which we store for graceful shutdown.

### Error Middleware Detection

Express identifies error handlers by **parameter count**:

```typescript
// Normal middleware: 3 params → Express calls with (req, res, next)
app.use((req, res, next) => { ... });

// Error middleware: 4 params → Express calls with (err, req, res, next)
app.use((err, req, res, next) => { ... });
```

JavaScript's `Function.length` property tells Express how many parameters the function expects. This is why you MUST have all 4 parameters, even if you don't use them (prefix with `_`).

---

## 3. Node.js Concepts Used

### Event Loop and Async/Await

Node.js is **single-threaded** but **non-blocking**. Here's what happens when the service queries the database:

```
Thread: ──[Parse Query]──[Send SQL to PostgreSQL]──[IDLE]──[Process Result]──[Send Response]──
                                    │                │
                                    └──── waiting ───┘
                                    During this time,
                                    Node handles OTHER
                                    requests!
```

`async/await` makes asynchronous code look synchronous:

```typescript
// These two are equivalent:

// Promise chains (old style):
prisma.product.findMany({ where })
    .then(products => prisma.product.count({ where })
        .then(total => res.json({ products, total })))
    .catch(err => next(err));

// Async/await (our style):
const products = await prisma.product.findMany({ where });
const total = await prisma.product.count({ where });
res.json({ products, total });
```

### Promise.all — Parallel Execution

```typescript
// Sequential (SLOW): total time = query1 + query2
const products = await prisma.product.findMany({ where }); // 25ms
const total = await prisma.product.count({ where });        // 15ms
// Total: 40ms

// Parallel (FAST): total time = max(query1, query2)
const [products, total] = await Promise.all([
    prisma.product.findMany({ where }), // 25ms ─┐ Both run
    prisma.product.count({ where }),     // 15ms ─┘ simultaneously
]);
// Total: 25ms (40% faster!)
```

**When to use `Promise.all`:** When two async operations are **independent** (neither needs the other's result).

**When NOT to use:** When operations depend on each other:
```typescript
// Can't parallelize — order needs the user's ID first
const user = await prisma.user.findUnique({ where: { email } });
const orders = await prisma.order.findMany({ where: { userId: user.id } });
```

### Process Signals (SIGTERM, SIGINT)

Node.js can listen to operating system signals:

```typescript
process.on('SIGTERM', callback); // Docker/K8s: "Stop gracefully"
process.on('SIGINT', callback);  // Terminal: Ctrl+C
process.on('SIGUSR2', callback); // nodemon: restart signal
```

**Docker's shutdown sequence:**
```
1. Docker sends SIGTERM to PID 1 (your Node process)
2. Your handler runs: stop accepting connections, finish in-flight requests, close DB
3. If process doesn't exit within 10 seconds → Docker sends SIGKILL (forced kill)
```

### `process.exit(0)` vs `process.exit(1)`

```
process.exit(0) → EXIT_SUCCESS → everything went fine
process.exit(1) → EXIT_FAILURE → something went wrong

Docker/CI/CD tools check the exit code:
  exit(0) → Container stopped normally
  exit(1) → Container crashed → restart it / alert the team
```

---

## 4. TypeScript Advanced Features Used

### `satisfies` Keyword (TypeScript 4.9+)

```typescript
const productSelect = {
    id: true,
    name: true,
    category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductSelect;
```

**Without `satisfies`:**
```typescript
// Option A: No type checking — typos silently pass
const productSelect = { id: true, nmae: true }; // "nmae" typo not caught!

// Option B: Type annotation — loses literal types
const productSelect: Prisma.ProductSelect = { id: true, name: true };
// Type is now Prisma.ProductSelect (wide type)
// Prisma can't infer which fields are selected → returns all fields in the type
```

**With `satisfies`:**
```typescript
const productSelect = { id: true, name: true } satisfies Prisma.ProductSelect;
// ✅ Type-checked: typos caught at compile time
// ✅ Literal type preserved: Prisma knows exactly which fields are selected
// ✅ Return type only includes id and name
```

### Generic Type Inference with `z.infer`

```typescript
const schema = z.object({
    page: z.number(),
    limit: z.number(),
    search: z.string().optional(),
});

type Query = z.infer<typeof schema>;
// Automatically becomes:
// type Query = {
//     page: number;
//     limit: number;
//     search?: string | undefined;
// }
```

No manual type definitions needed. The type is **derived** from the validation schema. If you add a field to the schema, the type updates automatically.

### `as unknown as` Double Assertion

```typescript
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
```

**Why two assertions?**

TypeScript prevents unsafe type assertions:
```typescript
globalThis as { prisma?: PrismaClient }; // ERROR: types are too different
```

The **double assertion** pattern:
```
globalThis  →  as unknown  →  as { prisma?: PrismaClient }
│                   │                     │
│ Type: typeof      │ Type: unknown       │ Type: { prisma?: PrismaClient }
│ globalThis        │ (anything goes)     │ (our custom shape)
```

`unknown` is the universe type — everything is assignable to it, and it's assignable to everything. It acts as a "bridge" between incompatible types.

### Underscore Prefix Convention

```typescript
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
```

`_req` and `_next` start with underscore to indicate "this parameter is required but not used." TypeScript's `noUnusedParameters` rule ignores parameters prefixed with `_`.

---

## 5. Prisma Internals

### Connection Pool

Prisma maintains a pool of PostgreSQL connections:

```
Default pool size = num_physical_cpus * 2 + 1

4-core machine:
  Pool size = 4 * 2 + 1 = 9 connections

When a query is made:
  1. Acquire a connection from the pool
  2. Send SQL to PostgreSQL
  3. Receive result
  4. Return connection to pool

If all connections are busy:
  → New queries wait in a queue
  → If wait exceeds connection_timeout (5s default) → error
```

### Query Pipeline

```typescript
prisma.product.findMany({
    where: { category: { slug: 'electronics' } },
    select: { id: true, name: true, price: true },
    orderBy: { price: 'asc' },
    skip: 20,
    take: 10,
})
```

**Step 1: Query Construction (TypeScript → Prisma AST)**
```
{
  model: "Product",
  action: "findMany",
  args: { where: {...}, select: {...}, orderBy: {...}, skip: 20, take: 10 }
}
```

**Step 2: SQL Generation (Prisma AST → SQL)**
```sql
SELECT "products"."id", "products"."name", "products"."price"
FROM "products"
LEFT JOIN "categories" ON "products"."category_id" = "categories"."id"
WHERE LOWER("categories"."slug") = LOWER($1)
ORDER BY "products"."price" ASC
OFFSET $2 LIMIT $3
```

**Step 3: Parameterized Execution**
```
Parameters: $1 = 'electronics', $2 = 20, $3 = 10
→ Sent to PostgreSQL driver (pg)
→ PostgreSQL executes query plan
→ Results returned as rows
```

**Step 4: Result Mapping (SQL rows → TypeScript objects)**
```
SQL row: { id: 'uuid-123', name: 'Headphones', price: '299.99' }
    ↓
TypeScript: { id: 'uuid-123', name: 'Headphones', price: Decimal('299.99') }
```

### Why Prisma Returns `Decimal` as a String in JSON

```typescript
product.price // Type: Prisma.Decimal
JSON.stringify(product.price) // "299.99" (string, not number)
```

This is **intentional**. JavaScript's `Number` type (IEEE 754 double-precision float) can't represent all decimal values precisely. By keeping it as a string in JSON, we preserve exact precision. The frontend should parse it with a decimal library or `parseFloat()` for display.

---

## 6. HTTP Concepts

### Status Codes Used

| Code | Meaning | When We Return It |
|------|---------|------------------|
| `200` | OK | Successful GET/PUT/PATCH request |
| `201` | Created | Successful POST (resource created) |
| `400` | Bad Request | Zod validation failure |
| `401` | Unauthorized | Missing/invalid JWT token (Phase 2) |
| `403` | Forbidden | Valid token but insufficient role (Phase 2) |
| `404` | Not Found | Product/resource doesn't exist |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unhandled exception |

### Request Headers We Care About

| Header | Purpose | Example |
|--------|---------|---------|
| `Content-Type` | What format is the body? | `application/json` |
| `Authorization` | Who is making the request? | `Bearer eyJhbGc...` (Phase 2) |
| `Origin` | Where did the request come from? | `http://localhost:3000` (CORS) |

### Response Headers We Set

| Header | Set By | Purpose |
|--------|--------|---------|
| `X-RateLimit-Limit` | express-rate-limit | Max requests allowed |
| `X-RateLimit-Remaining` | express-rate-limit | Requests remaining in window |
| `X-RateLimit-Reset` | express-rate-limit | When the window resets |
| `Content-Security-Policy` | helmet | XSS prevention |
| `X-Frame-Options` | helmet | Clickjacking prevention |
| `Strict-Transport-Security` | helmet | Force HTTPS |
| `Access-Control-Allow-Origin` | cors | Allowed origins |

### JSON Response Shape Convention

Every API response follows the same shape:

```typescript
// Success:
{
    "success": true,
    "data": { ... } | [...],
    "pagination": { page, limit, total, totalPages }  // only on list endpoints
}

// Error:
{
    "success": false,
    "error": "Human-readable error message",
    "details": [...]  // only on validation errors
}
```

**Why `success` boolean?** The frontend can check `response.data.success` without inspecting HTTP status codes. This is especially useful when error responses include useful data alongside the error.

---

## 7. File-by-File Code Annotation

### `lib/prisma.ts` — Every Line

```typescript
// 1. Import PrismaClient from the auto-generated client
import { PrismaClient } from '@prisma/client';

// 2. Extend globalThis type to include our prisma property
//    (TypeScript doesn't know about custom globalThis properties)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// 3. Either reuse existing client OR create a new one
//    ?? = nullish coalescing (returns right side if left is null/undefined)
export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        // 4. In development: log all SQL queries for debugging
        //    In production: only log errors (performance)
        log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
    });

// 5. In non-production: save client to globalThis
//    So the NEXT hot-reload reuses it instead of creating another
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
```

### `lib/logger.ts` — Every Line

```typescript
import pino from 'pino';

// 1. Check environment once, store in variable (avoid repeated process.env reads)
const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
    // 2. Log level: 'info' in production (skip debug), 'debug' in development
    //    Can be overridden with LOG_LEVEL env var
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),

    // 3. Spread operator: add transport ONLY in development
    //    In production: raw JSON (no pretty printing — machine-parseable)
    ...(isProduction
        ? {} // Production: no transport (raw JSON to stdout)
        : {
              transport: {
                  target: 'pino-pretty', // Development: human-readable format
                  options: {
                      colorize: true,                    // Color-coded log levels
                      translateTime: 'SYS:standard',     // Human-readable timestamps
                      ignore: 'pid,hostname',            // Remove clutter
                  },
              },
          }),
});
```

### `middleware/errorHandler.ts` — Every Line

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';

// 1. Custom error class for KNOWN business errors
//    Extends native Error class with HTTP status code
export class AppError extends Error {
    constructor(
        public statusCode: number,    // HTTP status to return (404, 409, etc.)
        message: string,              // Human-readable error message
        public isOperational = true   // true = expected error, false = bug
    ) {
        super(message);
        // 2. Fix prototype chain — needed because Error is a built-in class
        //    Without this: `error instanceof AppError` returns false
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

// 3. Express detects this is ERROR middleware because it has 4 params
//    Express only calls this when next(error) is called somewhere
export function errorHandler(
    err: Error,
    _req: Request,       // prefixed with _ = unused but required
    res: Response,
    _next: NextFunction  // prefixed with _ = unused but required
): void {

    // 4. TIER 1: Validation errors → 400 Bad Request with field details
    if (err instanceof ZodError) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: err.errors.map((e) => ({
                field: e.path.join('.'),   // e.g., "minPrice", "page"
                message: e.message,        // e.g., "Expected number, received nan"
            })),
        });
        return;
    }

    // 5. TIER 2: Known business errors → custom status code
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
        });
        return;
    }

    // 6. TIER 3: Unknown errors → 500 + log full error
    //    NEVER send stack traces to the client in production
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({
        success: false,
        error:
            process.env.NODE_ENV === 'production'
                ? 'Internal server error'  // Generic (safe)
                : err.message,              // Detailed (dev only)
    });
}
```

### `middleware/rateLimiter.ts` — Every Line

```typescript
import rateLimit from 'express-rate-limit';

// 1. General API limiter — applied to ALL /api/* routes
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000,    // 1-minute sliding window
    max: 100,               // 100 requests per window per IP
    standardHeaders: true,  // Send X-RateLimit-Limit, X-RateLimit-Remaining headers
    legacyHeaders: false,   // Don't send X-RateLimit-* (old format)
    message: {              // Response body when limit exceeded (429)
        success: false,
        error: 'Too many requests, please try again later.',
    },
});

// 2. Auth-specific limiter — stricter, applied to /api/auth/* routes
//    Prevents brute-force password guessing
export const authLimiter = rateLimit({
    windowMs: 60 * 1000,    // 1-minute window
    max: 10,                // Only 10 attempts per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many login attempts, please try again later.',
    },
});
```

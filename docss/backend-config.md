# Backend — Configuration, Dependencies & Infrastructure

> Everything about TypeScript config, npm packages, npm scripts, Dockerfile, Docker Compose, seed script, and environment variables.

---

## 1. TypeScript Configuration — tsconfig.json

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "commonjs",
        "lib": ["ES2020"],
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "baseUrl": "./src",
        "paths": { "@/*": ["./*"] }
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}
```

### Every Option Explained

| Option | Value | What It Does |
|--------|-------|-------------|
| `target` | `ES2020` | Compiles to ES2020 JavaScript. Node 20 supports ES2020 natively, so no need to downlevel features like `??`, `?.`, `Promise.allSettled` |
| `module` | `commonjs` | Output `require()` instead of `import`. Node.js uses CommonJS by default |
| `lib` | `ES2020` | Includes type definitions for ES2020 features (BigInt, Promise.allSettled, etc.) |
| `outDir` | `./dist` | Compiled `.js` files go to `dist/` folder |
| `rootDir` | `./src` | Source files are in `src/`. Preserves folder structure in `dist/` |
| `strict` | `true` | Enables ALL strict checks: `strictNullChecks`, `noImplicitAny`, `strictPropertyInitialization`, etc. |
| `esModuleInterop` | `true` | Allows `import express from 'express'` instead of `import * as express from 'express'` |
| `skipLibCheck` | `true` | Don't type-check `.d.ts` files from `node_modules`. Speeds up compilation significantly |
| `forceConsistentCasingInFileNames` | `true` | `import './Logger'` fails if file is `logger.ts`. Prevents bugs on case-insensitive Windows |
| `resolveJsonModule` | `true` | Allows `import config from './config.json'` with full type inference |
| `declaration` | `true` | Generates `.d.ts` type declaration files alongside `.js` output |
| `declarationMap` | `true` | Generates `.d.ts.map` files for "Go to Definition" in IDEs |
| `sourceMap` | `true` | Generates `.js.map` files. Stack traces show TypeScript line numbers instead of compiled JS |
| `baseUrl` | `./src` | Base directory for module resolution |
| `paths` | `@/*` → `./*` | Path alias: `import { prisma } from '@/lib/prisma'` → resolves to `src/lib/prisma` |

### Why `strict: true`?

Without strict mode, TypeScript allows dangerous patterns:

```typescript
// Without strict:
function getUser(id: string) {
    const user = db.find(id); // user could be undefined
    return user.name;         // ← Runtime crash! No compile error.
}

// With strict (strictNullChecks):
function getUser(id: string) {
    const user = db.find(id); // Type: User | undefined
    return user.name;         // ← COMPILE ERROR: user might be undefined
    // Fix:
    if (!user) throw new AppError(404, 'User not found');
    return user.name;         // ← Now TypeScript knows user is User, not undefined
}
```

### Compilation Pipeline

```
Source:  src/index.ts           → Output: dist/index.js
        src/lib/prisma.ts       →         dist/lib/prisma.js
        src/modules/products/   →         dist/modules/products/
                                          dist/index.d.ts (type declarations)
                                          dist/index.js.map (source maps)
```

---

## 2. Dependencies — package.json

### Production Dependencies

These are installed in the production Docker image and run in production.

| Package | Version | What It Does | Why We Need It |
|---------|---------|-------------|---------------|
| `@prisma/client` | ^6.5.0 | PostgreSQL ORM client | Type-safe database queries, auto-generated from schema |
| `cors` | ^2.8.5 | CORS middleware | Allows frontend (port 3000) to call backend (port 5000) |
| `dotenv` | ^16.5.0 | .env file loader | Reads `DATABASE_URL` etc. from `.env` file into `process.env` |
| `express` | ^4.21.2 | HTTP framework | Routes, middleware, request handling |
| `express-rate-limit` | ^7.5.0 | Rate limiting | Prevents DDoS, brute-force attacks |
| `helmet` | ^8.1.0 | Security headers | Sets 11 security HTTP headers automatically |
| `pino` | ^9.6.0 | JSON logger | Structured logging, 5x faster than Winston |
| `pino-http` | ^10.4.0 | HTTP request logger | Auto-logs every request with method, URL, status, duration |
| `zod` | ^3.24.2 | Schema validation | Type-safe input validation with auto-type inference |

### Dev Dependencies

Only used during development. NOT in the production Docker image.

| Package | Version | What It Does | Why We Need It |
|---------|---------|-------------|---------------|
| `@types/cors` | ^2.8.17 | TypeScript types for cors | Makes `cors()` type-safe |
| `@types/express` | ^5.0.0 | TypeScript types for Express | Types for `Request`, `Response`, `NextFunction` |
| `@types/node` | ^20.17.0 | TypeScript types for Node.js | Types for `process.env`, `setTimeout`, etc. |
| `@types/pino-http` | ^5.8.4 | TypeScript types for pino-http | Makes `pinoHttp()` type-safe |
| `pino-pretty` | ^13.0.0 | Log formatter | Pretty-prints Pino's JSON logs in development |
| `prisma` | ^6.5.0 | Prisma CLI | `prisma migrate`, `prisma generate`, `prisma studio` commands |
| `ts-node` | ^10.9.2 | TypeScript runner | Run `.ts` files directly without compiling (for seed script) |
| `ts-node-dev` | ^2.0.0 | Dev server with hot-reload | Watches for changes → restarts server automatically |
| `typescript` | ^5.7.0 | TypeScript compiler | Compiles `.ts` → `.js` |

### Why `@types/*` packages?

Many npm packages are written in plain JavaScript (no TypeScript). The `@types/*` packages add TypeScript type definitions on top, enabling type checking and IDE autocompletion.

```typescript
// Without @types/express:
app.get('/api/test', (req, res) => {
    req.query.page; // Type: any — no autocomplete, no type checking
});

// With @types/express:
app.get('/api/test', (req: Request, res: Response) => {
    req.query.page; // Type: string | string[] | QueryString.ParsedQs | ...
});
```

---

## 3. NPM Scripts

```json
"scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "seed": "ts-node src/scripts/seed.ts",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate"
}
```

| Script | Command | When to Use |
|--------|---------|------------|
| `npm run dev` | `ts-node-dev --respawn --transpile-only src/index.ts` | **Development** — runs TS directly, auto-restarts on file changes |
| `npm run build` | `tsc` | **Before production** — compiles TS → JS into `dist/` |
| `npm start` | `node dist/index.js` | **Production** — runs compiled JavaScript |
| `npm run seed` | `ts-node src/scripts/seed.ts` | **After DB setup** — populates database with sample data |
| `npm run db:migrate` | `prisma migrate dev` | Creates migration files and applies them (dev only) |
| `npm run db:push` | `prisma db push` | Pushes schema directly to DB without migration files (prototyping) |
| `npm run db:studio` | `prisma studio` | Opens visual DB browser at `localhost:5555` |
| `npm run db:generate` | `prisma generate` | Regenerates Prisma client after schema changes |

### `ts-node-dev` Flags

```
--respawn        → Restart the process when files change (hot-reload)
--transpile-only → Skip type checking for faster startup (tsc does full type checking separately)
```

### `db:migrate` vs `db:push`

```
db:push:    Schema → directly modifies database tables
            ⚠️ Destructive — can drop columns, lose data
            ✅ Fast for prototyping

db:migrate: Schema → generates SQL migration file → applies to database
            ✅ Safe — creates reversible migration history
            ✅ Required for production (tracks every schema change)
```

---

## 4. Dockerfile — Explained Line by Line

```dockerfile
# ─── Stage 1: Build ─────────────────────────────
FROM node:20-alpine AS builder
```

- `node:20-alpine` — Node.js 20 on Alpine Linux (5MB base vs 72MB Ubuntu)
- `AS builder` — Names this stage "builder" for referencing later

```dockerfile
WORKDIR /app
```

- Sets working directory to `/app` inside the container. All subsequent commands run here.

```dockerfile
COPY package.json package-lock.json* ./
RUN npm ci
```

- Copy **only** package files first (not source code)
- `npm ci` — Clean install (faster than `npm install`, uses exact lockfile versions)
- **Docker layer caching:** This layer is cached. If `package.json` doesn't change, Docker skips `npm ci` on rebuild.

```dockerfile
COPY prisma ./prisma
RUN npx prisma generate
```

- Generate Prisma client (needs `schema.prisma` file)

```dockerfile
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
```

- Now copy source code and compile TypeScript → JavaScript

```dockerfile
# ─── Stage 2: Production ────────────────────────
FROM node:20-alpine AS runner
```

- Start a **fresh** image — no build tools, no source code.

```dockerfile
ENV NODE_ENV=production
```

- Tells Express/Pino/Prisma to use production behavior.

```dockerfile
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser
```

- Create a non-root user. If an attacker exploits a vulnerability, they can't modify system files.

```dockerfile
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
```

- Copy **only what's needed** from the builder stage:
  - `dist/` — compiled JavaScript
  - `node_modules/` — production dependencies
  - `prisma/` — schema file (needed by Prisma client at runtime)
  - NO source code, NO TypeScript, NO dev dependencies

```dockerfile
USER appuser
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

- Switch to non-root user
- Document that port 5000 is used (metadata for Docker)
- Start the compiled server

### Image Size Comparison

```
Builder stage:  ~500MB (Node + TypeScript + all deps + source code)
Runner stage:   ~150MB (Node + compiled JS + production deps only)
Savings:        ~70% smaller image
```

---

## 5. Docker Compose — Service Orchestration

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: estorefont
      POSTGRES_PASSWORD: estorefont_dev
      POSTGRES_DB: estorefont_db
    ports:
      - "5432:5432"           # host:container
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U estorefont -d estorefont_db"]
      interval: 5s
      timeout: 5s
      retries: 5
```

**Healthcheck:** Docker runs `pg_isready` every 5 seconds. The `backend` service won't start until PostgreSQL passes health checks (via `depends_on: condition: service_healthy`).

**Volume:** `postgres_data` persists data across container restarts. Without it, stopping the container deletes your entire database.

### Service Dependencies

```yaml
backend:
  depends_on:
    postgres:
      condition: service_healthy    # Wait for PostgreSQL to be ready
```

**Startup order:** PostgreSQL → (healthy) → Backend → Frontend

Without `service_healthy`, Docker only waits for the container to **start**, not for PostgreSQL to accept connections. The backend would crash with "connection refused" errors.

### Network

Docker Compose creates a bridge network. Services refer to each other by service name:
```
Backend → postgres:5432    (not localhost:5432)
Backend → redis:6379       (not localhost:6379)
```

---

## 6. Seed Script — Complete Walkthrough

**File:** `src/scripts/seed.ts`

### What It Does

```
1. Clears existing data (respects foreign key order)
2. Creates 6 categories (Electronics, Apparel, Accessories, Home & Living, Sports, Beauty)
3. Creates 6 brands (TechPro, Niko, UrbanStyle, FitLife, HomeComfort, GlowUp)
4. Creates 12 products with inventory records
```

### Deletion Order (Foreign Key Constraints)

```
reviews      → depends on users + products
wishlistItems → depends on users + products
cartItems    → depends on users + products
orderItems   → depends on orders + products
payments     → depends on orders
orders       → depends on users + addresses
inventory    → depends on products
products     → depends on categories + brands
categories   → no remaining dependencies
brands       → no remaining dependencies
addresses    → depends on users
users        → no remaining dependencies
```

If you try `deleteMany` on categories while products still exist, PostgreSQL throws:
```
ERROR: update or delete on table "categories" violates foreign key constraint
```

### The `Map` Pattern for IDs

```typescript
const categoryMap = new Map<string, string>();
for (const cat of CATEGORIES) {
    const created = await prisma.category.create({ data: cat });
    categoryMap.set(cat.slug, created.id);
}

// Later, when creating products:
const categoryId = categoryMap.get(product.categorySlug)!;
```

Since UUIDs are auto-generated, we don't know category IDs ahead of time. The `Map` stores `slug → id` mappings so products can reference their parent category.

### Nested Create (Product + Inventory)

```typescript
await prisma.product.create({
    data: {
        name: product.name,
        slug: product.slug,
        categoryId,
        brandId,
        inventory: {
            create: {              // ← Prisma nested create
                quantity: product.stock,
                reserved: 0,
            },
        },
    },
});
```

Prisma's nested `create` inserts both the product and its inventory record in a **single transaction**. If either insert fails, both are rolled back.

---

## 7. Environment Variables

### Backend `.env`

| Variable | Example | Required | Purpose |
|----------|---------|----------|---------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | ✅ Yes | PostgreSQL connection string |
| `PORT` | `5000` | No (default: 5000) | HTTP server port |
| `NODE_ENV` | `development` | No (default: development) | Controls logging, error detail, Prisma behavior |
| `FRONTEND_URL` | `http://localhost:3000` | No (default: localhost:3000) | CORS allowed origin |
| `LOG_LEVEL` | `debug` | No (default: debug/info) | Pino log level threshold |

### DATABASE_URL Format

```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME?schema=SCHEMA

postgresql://estorefont:estorefont_dev@localhost:5432/estorefont_db?schema=public
│            │          │               │         │    │               │
│            │          │               │         │    │               └─ PostgreSQL schema
│            │          │               │         │    └─ Database name
│            │          │               │         └─ Port (5432 = default PostgreSQL)
│            │          │               └─ Host
│            │          └─ Password
│            └─ Username
└─ Protocol
```

### Startup Validation

```typescript
const requiredEnvVars = ['DATABASE_URL'];
for (const key of requiredEnvVars) {
    if (!process.env[key]) {
        logger.fatal(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
}
```

**Fail fast principle:** Better to crash immediately with a clear error than to start and fail mysteriously later when the first database query runs.

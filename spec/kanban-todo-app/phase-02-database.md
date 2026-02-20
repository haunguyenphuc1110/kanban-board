# Phase 2 — Database Layer

## 2.1 Neon Connection (`lib/db/index.ts`)

Uses Neon's HTTP driver (`neon()`) which is edge-runtime compatible (no TCP connection required).
The `drizzle()` call wraps it with schema-aware type inference.

```typescript
// lib/db/index.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

**Notes:**
- Import `drizzle` from `"drizzle-orm/neon-http"` — not `"drizzle-orm/neon"` (different driver).
- Pass `{ schema }` to enable relational query API (`db.query.todos.findMany()`).
- This module is server-only. Never import it in client components.

---

## 2.2 Schema (`lib/db/schema.ts`)

### Critical constraint: `user.id` is `text`, NOT `uuid`

Better Auth generates its own IDs using nanoid (a short alphanumeric format like `"a1b2c3d4e5"`).
If you define `user.id` as `uuid`, the Drizzle adapter will fail at runtime with a type mismatch.
Every foreign key that references `user.id` must also be `text`.

### Better Auth Required Tables

Better Auth's Drizzle adapter expects these exact column names. Do not rename them.

```typescript
// lib/db/schema.ts
import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  integer,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";

// ─── Better Auth Tables ───────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),   // ← Required for email/password auth
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### App Enums

```typescript
export const priorityEnum = pgEnum("priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const statusEnum = pgEnum("status", [
  "todo",
  "in_progress",
  "completed",
]);
```

### App Tables

```typescript
export const todos = pgTable("todos", {
  id: uuid("id").defaultRandom().primaryKey(),
  // nullable — guest todos have no userId; assigned on sync
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  priority: priorityEnum("priority").notNull().default("medium"),
  status: statusEnum("status").notNull().default("todo"),
  dueDate: timestamp("due_date"),
  // position within a status column for ordering
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#FFE500"), // hex color for badge
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const todoCategories = pgTable(
  "todo_categories",
  {
    todoId: uuid("todo_id")
      .notNull()
      .references(() => todos.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.todoId, t.categoryId] })]
);
```

**Design decisions:**
- `todos.userId` is nullable to support unauthenticated guest todos. When a guest syncs, the sync
  endpoint upserts with `userId` set. This avoids needing a separate "pending_todos" table.
- `todos.position` is a simple integer for per-column ordering. Reordering updates positions of
  all affected todos in the column via multiple PUT calls (one per todo).
- `categories` is user-scoped — each user manages their own tag taxonomy.
- `todoCategories` is a junction table with a composite primary key, enforcing the many-to-many
  relationship without a surrogate ID column.

---

## 2.3 Drizzle Config (`drizzle.config.ts`)

```typescript
// drizzle.config.ts  (project root)
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

## 2.4 Running Migrations

```bash
# Step 1: Generate SQL migration files from schema
npm run db:generate

# Step 2: Apply migrations to Neon database
npm run db:migrate
```

Migration files are written to `drizzle/migrations/`. Commit these to version control.
Never edit migration files manually — always edit the schema and re-generate.

**Expected tables after migration:**
- `user`, `session`, `account`, `verification` (Better Auth)
- `todos`, `categories`, `todo_categories` (App)
- `priority` enum type, `status` enum type

---

## 2.5 Entity Relationship Diagram

```
user (id: text PK)
 ├─── session (userId → user.id)
 ├─── account (userId → user.id)
 ├─── categories (userId → user.id)
 └─── todos (userId → user.id, nullable)
       └─── todo_categories (todoId → todos.id)
             └─── categories (categoryId → categories.id)
```

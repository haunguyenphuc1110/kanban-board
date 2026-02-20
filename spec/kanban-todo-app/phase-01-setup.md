# Phase 1 — Environment Setup

## 1.1 Package Installation

Run both commands from the project root.

```bash
npm install \
  better-auth \
  drizzle-orm \
  @neondatabase/serverless \
  drizzle-kit \
  @dnd-kit/core \
  @dnd-kit/sortable \
  @dnd-kit/utilities \
  react-big-calendar \
  date-fns \
  zustand \
  lucide-react

npm install -D @types/react-big-calendar
```

**Why these packages:**
- `better-auth` — email/password auth with a Drizzle adapter; no Prisma/NextAuth dependency
- `drizzle-orm` + `@neondatabase/serverless` — type-safe SQL over Neon's HTTP driver (edge-compatible)
- `drizzle-kit` — CLI for schema migration generation and database push
- `@dnd-kit/*` — modular, accessible drag-and-drop; no global CSS dependency unlike react-beautiful-dnd
- `react-big-calendar` + `date-fns` — feature-complete calendar; use date-fns localizer NOT moment
- `zustand` — minimal global state with `persist` middleware for localStorage
- `lucide-react` — tree-shakeable icon set

---

## 1.2 package.json Scripts

Add the following three scripts to `package.json`. These wrap the Drizzle Kit CLI.

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```

- `db:generate` — reads `lib/db/schema.ts`, writes SQL migration files to `drizzle/migrations/`
- `db:migrate` — applies pending migration files against `DATABASE_URL`
- `db:studio` — opens Drizzle Studio (browser DB inspector) at `https://local.drizzle.studio`

---

## 1.3 Environment Variables

Create `.env.local` at the project root. This file must NOT be committed to version control.

```bash
# Generate a secret: openssl rand -base64 32
BETTER_AUTH_SECRET=<your-32-byte-secret>

# Base URL for Better Auth (used server-side)
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# Neon PostgreSQL connection string
# Get this from: Neon console → your project → Connection string
DATABASE_URL=postgresql://<user>:<password>@ep-<name>.neon.tech/<dbname>?sslmode=require
```

**Critical notes:**
- `NEXT_PUBLIC_BETTER_AUTH_URL` uses the `NEXT_PUBLIC_` prefix so it is bundled into the client-side code (needed by `lib/auth-client.ts`).
- `BETTER_AUTH_SECRET` is server-only (no `NEXT_PUBLIC_` prefix). It signs session tokens.
- `DATABASE_URL` is server-only. Never expose it to the browser.
- Always include `?sslmode=require` in the Neon connection string.

---

## 1.4 Neo-Brutalism CSS Theme

The file `app/globals.css` is the single source of truth for all design tokens. **Do not modify it.**
All components must reference these CSS variables — never hardcode color or shadow values.

```css
/* app/globals.css — DO NOT MODIFY */
@import "tailwindcss";

:root {
  /* Color Palette */
  --background: #FFFDF0;   /* warm off-white page background */
  --foreground: #1A1A1A;   /* near-black text and borders */
  --primary:    #FFE500;   /* electric yellow — CTAs, column headers */
  --secondary:  #FF4D4D;   /* hot coral — destructive actions, overdue */
  --accent:     #00D4FF;   /* vivid cyan — links, in-progress column */
  --success:    #AAFF00;   /* lime green — completed column */
  --surface:    #FFFFFF;   /* card and panel backgrounds */

  /* Neo-Brutalism Properties */
  --border-width:  3px;
  --border-color:  #1A1A1A;
  --shadow-offset: 4px;
  --shadow:        4px 4px 0px var(--border-color);
  --shadow-hover:  6px 6px 0px var(--border-color);
  --shadow-active: 0px 0px 0px var(--border-color);
  --radius:        0px;    /* no rounded corners */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary:    var(--primary);
  --color-secondary:  var(--secondary);
  --color-accent:     var(--accent);
  --color-success:    var(--success);
  --color-surface:    var(--surface);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), Arial, Helvetica, sans-serif;
}
```

**Usage in Tailwind classes:**
```
bg-primary        → background: var(--primary)
bg-secondary      → background: var(--secondary)
bg-accent         → background: var(--accent)
bg-success        → background: var(--success)
bg-surface        → background: var(--surface)
text-foreground   → color: var(--foreground)
border-foreground → border-color: var(--foreground)
```

Shadow tokens are used as Tailwind arbitrary values:
```
shadow-[var(--shadow)]        → 4px 4px 0px #1A1A1A
shadow-[var(--shadow-hover)]  → 6px 6px 0px #1A1A1A
shadow-[var(--shadow-active)] → 0px 0px 0px #1A1A1A
```

---

## 1.5 layout.tsx — Metadata Update Only

Update `app/layout.tsx` metadata. Do not change fonts, body classes, or structure.

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: "Kanban Board",
  description: "A Neo-Brutalism Kanban todo app with drag-and-drop, calendar view, and cloud sync.",
};
```

---

## 1.6 Boilerplate Cleanup

Delete the following files — they are Next.js template assets not used by the app:

```bash
rm public/file.svg
rm public/globe.svg
rm public/next.svg
rm public/vercel.svg
rm public/window.svg
```

`app/page.tsx` will be completely replaced in Phase 9.
`README.md` title/description can be updated to reflect the actual app.

---

## 1.7 middleware.ts

Create a minimal middleware at the project root. Its sole purpose is to ensure the Better Auth
session cookie is readable by API routes. **Do not add hard redirects** — the app must work
fully without authentication.

```typescript
// middleware.ts
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

> **Alternative minimal approach** (if the above causes issues):
> Leave `middleware.ts` as an empty pass-through. Better Auth does not require middleware
> to function — `auth.api.getSession()` in route handlers is sufficient for per-request auth.

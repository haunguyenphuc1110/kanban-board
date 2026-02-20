# Phase 3 — Authentication

## 3.1 Better Auth Server Instance (`lib/auth.ts`)

This is the server-side singleton. Import this only in server files (API routes, server components).
Never import it in client components.

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { user, session, account, verification } from "./db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    // Map the Better Auth table names to our Drizzle schema exports.
    // Column names in these tables MUST match what Better Auth expects exactly.
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Skip email verification for simplicity
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
});
```

**Why `requireEmailVerification: false`?**
Email verification requires a transactional email provider (Resend, SendGrid, etc.).
Skipping it lets developers run the app locally without an email service. Enable it in
production if needed — just ensure the `verification` table and a mail adapter are set up.

---

## 3.2 Auth API Catch-All Route (`app/api/auth/[...all]/route.ts`)

Next.js requires a catch-all route to forward all auth requests (sign-in, sign-up, sign-out,
session check, etc.) to Better Auth's request handler.

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// This exports Next.js-compatible GET and POST handlers
export const { GET, POST } = toNextJsHandler(auth);
```

This handles all routes under `/api/auth/**` automatically:
- `POST /api/auth/sign-in/email` — email sign-in
- `POST /api/auth/sign-up/email` — email sign-up
- `POST /api/auth/sign-out` — sign-out (clears session cookie)
- `GET /api/auth/get-session` — check current session

---

## 3.3 Auth Client (`lib/auth-client.ts`)

The browser-side client. Used in client components and hooks.
Import named exports directly — do not use the default export.

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const { signIn, signUp, signOut, useSession } = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
});
```

**Exports and their usage:**

| Export | Type | Usage |
|--------|------|-------|
| `signIn.email({ email, password })` | async function | Sign in with credentials |
| `signUp.email({ email, name, password })` | async function | Register new user |
| `signOut()` | async function | Clear session and redirect |
| `useSession()` | React hook | Access `{ data: session, isPending }` |

**Sign in example:**
```typescript
const result = await signIn.email({
  email: formData.email,
  password: formData.password,
});
// result.data — session if success
// result.error — error message if failure
```

---

## 3.4 Reading the Session in API Routes

All protected API routes check the session server-side. Use `await headers()` from
`"next/headers"` — in Next.js 15+, `headers()` returns a Promise.

```typescript
// Pattern used in every protected API route
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const session = await auth.api.getSession({ headers: await headers() });
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
// session.user.id — the authenticated user's text ID
```

---

## 3.5 Session in Client Components

Use `useSession()` from `lib/auth-client.ts` in any client component:

```typescript
"use client";
import { useSession } from "@/lib/auth-client";

export function UserMenu() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <SignInLink />;
  return <div>{session.user.email}</div>;
}
```

---

## 3.6 Auth + Store Integration

The Zustand store's `isAuthenticated` flag is NOT persisted (excluded via `partialize`).
It must be derived on mount from the Better Auth session. Do this in `app/page.tsx`:

```typescript
// app/page.tsx (excerpt)
"use client";
import { useSession } from "@/lib/auth-client";
import { useTodoStore } from "@/lib/store/todoStore";
import { useEffect } from "react";

export default function Page() {
  const { data: session } = useSession();
  const { setAuthenticated, signInAndSync, persist } = useTodoStore();

  // Step 1: Rehydrate Zustand from localStorage on mount
  useEffect(() => {
    useTodoStore.persist.rehydrate();
  }, []);

  // Step 2: Sync auth state into store whenever session changes
  useEffect(() => {
    const authenticated = !!session?.user;
    setAuthenticated(authenticated);

    // If user is now authenticated AND there are unsynced local todos, sync them
    if (authenticated) {
      const { todos } = useTodoStore.getState();
      const hasLocalTodos = todos.some((t) => t.isLocalOnly);
      if (hasLocalTodos) {
        signInAndSync();
      }
    }
  }, [session, setAuthenticated, signInAndSync]);
}
```

---

## 3.7 Sign-In / Sign-Up Flow (High Level)

```
Sign Up:
  User fills form → signUp.email() → Better Auth creates user + account rows
  → Redirect to "/" → useSession() returns user → store.setAuthenticated(true)

Sign In:
  User fills form → signIn.email() → Better Auth validates credentials
  → Session cookie set → Redirect to "/" → useSession() returns user
  → store.signInAndSync() pushes local todos → fetches cloud state → replaces store

Sign Out:
  User clicks sign out → store.signOutAndKeepLocal() (marks todos as isLocalOnly)
  → signOut() → session cookie cleared → useSession() returns null
  → store.setAuthenticated(false)
```

---

## 3.8 Middleware (`middleware.ts`)

The middleware is intentionally minimal. No hard redirects. The app must work without auth.

```typescript
// middleware.ts
export default function middleware() {
  // Intentionally empty — no redirects
  // Better Auth session is read per-request in API route handlers
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
```

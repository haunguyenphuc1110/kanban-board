// middleware.ts
export default function proxy() {
  // Intentionally empty — no auth redirects
  // Better Auth sessions are read per-request in API route handlers
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};

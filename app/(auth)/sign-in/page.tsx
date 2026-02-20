// app/(auth)/sign-in/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { useTodoStore } from "@/lib/store/todoStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function SignInPage() {
  const router = useRouter();
  const signInAndSync = useTodoStore((s) => s.signInAndSync);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn.email({ email, password });

    if (result.error) {
      setError(result.error.message ?? "Sign in failed. Check your credentials.");
      setLoading(false);
      return;
    }

    // Sync any local-only todos to the cloud, then redirect to the board
    await signInAndSync();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md border-[length:var(--border-width)] border-foreground shadow-[8px_8px_0px_var(--border-color)]">
        {/* Header bar */}
        <div className="bg-primary border-b-[length:var(--border-width)] border-foreground px-6 py-4">
          <h1 className="text-2xl font-black uppercase">Sign In</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface p-6 flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          {error && (
            <p className="text-sm font-bold text-secondary border-[2px] border-secondary bg-secondary/10 px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading}
            className="w-full"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <p className="text-sm text-center text-foreground/70">
            No account?{" "}
            <Link href="/sign-up" className="font-bold underline hover:no-underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

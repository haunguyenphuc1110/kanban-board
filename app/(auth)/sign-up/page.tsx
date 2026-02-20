// app/(auth)/sign-up/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signUp.email({ name, email, password });

    if (result.error) {
      setError(result.error.message ?? "Sign up failed. Please try again.");
      setLoading(false);
      return;
    }

    // Session is set automatically by Better Auth on successful sign-up
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md border-[length:var(--border-width)] border-foreground shadow-[8px_8px_0px_var(--border-color)]">
        {/* Header bar */}
        <div className="bg-success border-b-[length:var(--border-width)] border-foreground px-6 py-4">
          <h1 className="text-2xl font-black uppercase">Create Account</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface p-6 flex flex-col gap-4">
          <Input
            label="Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            autoComplete="name"
          />

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
            placeholder="At least 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
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
            {loading ? "Creating account..." : "Create Account"}
          </Button>

          <p className="text-sm text-center text-foreground/70">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-bold underline hover:no-underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

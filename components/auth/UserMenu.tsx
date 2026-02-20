"use client";

import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { useTodoStore } from "@/lib/store/todoStore";
import { Button } from "@/components/ui/Button";
import { LogOut, User } from "lucide-react";

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const signOutAndKeepLocal = useTodoStore((s) => s.signOutAndKeepLocal);

  if (isPending) {
    return (
      <div className="h-9 w-24 border-[length:var(--border-width)] border-foreground bg-surface animate-pulse" />
    );
  }

  if (!session) {
    return (
      <div className="flex gap-2">
        <Link href="/sign-in">
          <Button variant="ghost" size="sm">Sign In</Button>
        </Link>
        <Link href="/sign-up">
          <Button variant="primary" size="sm">Sign Up</Button>
        </Link>
      </div>
    );
  }

  async function handleSignOut() {
    // Mark all todos as local-only before clearing the session so no data is lost
    signOutAndKeepLocal();
    await signOut();
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 border-[length:var(--border-width)] border-foreground px-3 py-1.5 bg-surface">
        <User size={14} />
        <span className="text-sm font-bold max-w-[160px] truncate">
          {session.user.email}
        </span>
      </div>
      <button
        onClick={handleSignOut}
        className="flex items-center gap-1 text-sm font-bold text-secondary hover:underline"
        title="Sign out"
      >
        <LogOut size={14} />
        Sign Out
      </button>
    </div>
  );
}

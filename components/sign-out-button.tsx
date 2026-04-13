"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { appCopy } from "@/lib/copy";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="group inline-flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-fuchsia-200 hover:shadow-lg"
      aria-label={appCopy.nav.logoutAria}
    >
      <span className="hidden sm:inline">{appCopy.nav.logout}</span>
      <LogOut className="h-4 w-4 text-slate-400 transition-colors duration-200 group-hover:text-fuchsia-600" />
    </button>
  );
}

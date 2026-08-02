import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * The shared frame for every dashboard: a top bar with the app name, who is
 * logged in, and a logout button — then the page's own content below.
 */
export function DashboardShell({ title, children }: { title: string; children?: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-semibold text-slate-900">EventEase</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              {user?.name} · <span className="text-slate-400">{user?.role}</span>
            </span>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {children}
      </main>
    </div>
  );
}

/** A one-line placeholder shown on a dashboard until its features are built. */
export function ComingSoon({ note }: { note: string }) {
  return <p className="mt-3 text-sm text-slate-500">{note}</p>;
}

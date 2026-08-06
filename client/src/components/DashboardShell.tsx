import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * The shared frame for every dashboard: a sticky top bar with the app mark,
 * who is logged in, and a logout button — then the page's own content below.
 */
export function DashboardShell({ title, children }: { title: string; children?: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/75 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm shadow-indigo-500/40">
              E
            </span>
            <span className="text-[15px] font-bold tracking-tight text-slate-900">EventEase</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm sm:inline-flex">
              <span className="font-medium text-slate-900">{user?.name}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                {user?.role?.replace("_", " ")}
              </span>
            </span>
            <button
              onClick={logout}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl animate-rise-in px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Dashboard</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        {children}
      </main>
    </div>
  );
}

/** A one-line placeholder shown on a dashboard until its features are built. */
export function ComingSoon({ note }: { note: string }) {
  return <p className="mt-3 text-sm text-slate-500">{note}</p>;
}

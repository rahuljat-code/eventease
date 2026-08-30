import { useState, type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { ChangePasswordModal } from "./ChangePasswordModal";

/** A sidebar entry that switches the main view to the section with this id. */
export type IconKey =
  | "overview"
  | "users"
  | "doc"
  | "bolt"
  | "medal"
  | "calendar"
  | "download"
  | "clipboard"
  | "building";

export interface NavItem {
  id: string;
  label: string;
  icon: IconKey;
}

const ICONS: Record<IconKey, ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8M18 20a6 6 0 0 0-3.2-5.3" />
    </>
  ),
  doc: (
    <>
      <path d="M5 4a1 1 0 0 1 1-1h8l5 5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" />
      <path d="M14 3v5h5M8.5 13h7M8.5 17h7" />
    </>
  ),
  bolt: <path d="M13 10V3L4 14h7v7l9-11h-7z" />,
  medal: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="M8.5 13L7.5 21l4.5-2.3L16.5 21l-1-8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </>
  ),
  download: <path d="M12 3v12m0 0l4-4m-4 4l-4-4M5 21h14" />,
  clipboard: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4.5V3.5h6v1M9 12.5l2 2 3.5-3.5" />
      <path d="M9 4.5H8a1 1 0 0 0-1 1M15 4.5h1a1 1 0 0 1 1 1" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V6l8-3 8 3v15" />
      <path d="M3 21h18M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 21v-4h4v4" />
    </>
  ),
};

function NavIcon({ icon, active }: { icon: IconKey; active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-[18px] w-[18px] ${active ? "text-indigo-600" : "text-slate-400"}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[icon]}
    </svg>
  );
}

const ROLE_LABEL: Record<string, string> = {
  VOLUNTEER: "Volunteer",
  TEAM_HEAD: "Team Head",
  PRESIDENT: "President",
  FACULTY: "Faculty",
  ADMIN: "Admin",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function initials(name?: string) {
  if (!name) return "?";
  const p = name.trim().split(/\s+/);
  return (p[0][0] + (p[1]?.[0] ?? "")).toUpperCase();
}

/**
 * The shared frame for every dashboard: a fixed sidebar (brand, nav, user card)
 * that switches the main area between views. `sections` maps each nav id to its
 * content; only the active one is shown. `children` (modals/overlays) render on
 * every view.
 */
export function DashboardShell({
  nav = [],
  subtitle,
  sections,
  children,
}: {
  nav?: NavItem[];
  subtitle?: string;
  sections: Record<string, ReactNode>;
  children?: ReactNode;
}) {
  const { user, logout } = useAuth();
  const [active, setActive] = useState(nav[0]?.id ?? "");
  const [changingPassword, setChangingPassword] = useState(false);

  const roleLabel = user ? ROLE_LABEL[user.role] ?? user.role : "";
  const fullName = user?.name ?? "";
  const activeLabel = nav.find((n) => n.id === active)?.label;

  return (
    <div className="min-h-screen lg:flex">
      {/* ---------- Sidebar (desktop) ---------- */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white/70 px-4 py-5 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <img src="/jhc-logo.png" alt="Jai Hind College" className="h-10 w-auto" />
          <div className="leading-tight">
            <p className="text-[15px] font-bold tracking-tight text-slate-900">EventEase</p>
            <p className="text-[11px] font-medium text-slate-400">Jai Hind College</p>
          </div>
        </div>

        <nav className="mt-7 flex-1 space-y-1">
          {nav.map((item) => {
            const on = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  on
                    ? "bg-indigo-50 text-indigo-700 before:absolute before:-left-1 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-indigo-600"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <NavIcon icon={item.icon} active={on} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm shadow-slate-900/[0.03]">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-amber-400 text-xs font-semibold text-white">
              {initials(user?.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">{roleLabel}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setChangingPassword(true)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-[0.98]"
            >
              Password
            </button>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-[0.98]"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>

      {/* ---------- Mobile top bar + tab strip ---------- */}
      <div className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg lg:hidden">
        <header className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <img src="/jhc-logo.png" alt="Jai Hind College" className="h-8 w-auto" />
            <span className="font-bold tracking-tight text-slate-900">EventEase</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChangingPassword(true)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
            >
              Password
            </button>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
            >
              Log out
            </button>
          </div>
        </header>
        <nav className="flex gap-1.5 overflow-x-auto px-4 pb-2.5">
          {nav.map((item) => {
            const on = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  on ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ---------- Main ---------- */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-10">
          <header className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
              {greeting()}, {fullName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {activeLabel ? `${activeLabel} · ${subtitle ?? roleLabel}` : subtitle ?? roleLabel}
            </p>
          </header>

          <div key={active} className="animate-rise-in">
            {sections[active]}
          </div>
        </div>
      </main>

      {children}

      <ChangePasswordModal open={changingPassword} onClose={() => setChangingPassword(false)} />
    </div>
  );
}

/** A one-line placeholder shown on a dashboard until its features are built. */
export function ComingSoon({ note }: { note: string }) {
  return <p className="mt-3 text-sm text-slate-500">{note}</p>;
}

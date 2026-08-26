import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { BrowseEvent } from "../lib/types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLE: Record<string, string> = {
  UPCOMING: "bg-blue-50 text-blue-700",
  ONGOING: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-slate-100 text-slate-500",
};

/**
 * Module 7.3 — the volunteer's "Upcoming Events" view. Browse events across clubs
 * and register (or cancel) participation. Registering is just a one-click toggle.
 */
export function VolunteerEventsSection() {
  const [events, setEvents] = useState<BrowseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/events/browse");
      setEvents(res.data.events);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function toggle(e: BrowseEvent) {
    setBusy(e.id);
    try {
      if (e.registered) await api.delete(`/events/${e.id}/register`);
      else await api.post(`/events/${e.id}/register`);
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Upcoming Events</h2>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : events.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No upcoming events right now. Check back soon.
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03] transition duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.06]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-slate-900">{e.name}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[e.status]}`}>
                    {e.status.toLowerCase()}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  {fmtDate(e.eventDate)}
                  {e.venue ? ` · ${e.venue}` : ""} · {e.club.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {e.registrationCount} registered
                </p>
              </div>

              {e.registered ? (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    ✓ Registered
                  </span>
                  <button
                    onClick={() => toggle(e)}
                    disabled={busy === e.id}
                    className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => toggle(e)} disabled={busy === e.id} className="btn-primary shrink-0">
                  {busy === e.id ? "…" : "Register"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

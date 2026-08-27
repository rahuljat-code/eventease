import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Duty } from "../lib/types";

export function MyDutiesSection() {
  const [duties, setDuties] = useState<Duty[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    api
      .get("/duties/mine")
      .then((res) => setDuties(res.data.duties))
      .catch(() => setDuties([]))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(duty: Duty) {
    setBusyId(duty.id);
    try {
      const res = await api.patch(`/duties/${duty.id}/status`);
      setDuties((list) => list.map((d) => (d.id === duty.id ? res.data.duty : d)));
    } catch {
      /* leave the row as-is on failure */
    } finally {
      setBusyId(null);
    }
  }

  const pending = duties.filter((d) => d.status === "PENDING").length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">My Duties</h2>
        {duties.length > 0 && (
          <div className="rounded-lg bg-amber-50 px-3.5 py-1.5 text-sm">
            <span className="font-semibold text-amber-700">{pending}</span>
            <span className="text-amber-500"> to do</span>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : duties.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No duties assigned yet. Your Team Head assigns these for events.
        </p>
      ) : (
        <div className="space-y-2">
          {duties.map((d) => {
            const done = d.status === "DONE";
            return (
              <div
                key={d.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03] transition duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.06]"
              >
                <div className="min-w-0">
                  <p className={`font-medium ${done ? "text-slate-400 line-through" : "text-slate-900"}`}>
                    {d.title}
                  </p>
                  {d.description && <p className="mt-0.5 text-sm text-slate-500">{d.description}</p>}
                  {d.event && (
                    <p className="mt-1 text-xs text-slate-400">For event: {d.event.name}</p>
                  )}
                </div>
                <button
                  onClick={() => toggle(d)}
                  disabled={busyId === d.id}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
                    done
                      ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  {done ? "Mark undone" : "Mark done"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

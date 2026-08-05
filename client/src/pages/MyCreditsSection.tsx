import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { MyCredit } from "../lib/types";

/** The volunteer's own CC credits: their verified total and the per-event list. */
export function MyCreditsSection() {
  const [awards, setAwards] = useState<MyCredit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/credits/mine")
      .then((res) => {
        setAwards(res.data.awards);
        setTotal(res.data.total);
      })
      .catch(() => setAwards([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">My CC Credits</h2>
        <div className="rounded-lg bg-indigo-50 px-3.5 py-1.5 text-sm">
          <span className="font-semibold text-indigo-700">{total}</span>
          <span className="text-indigo-500"> verified points</span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : awards.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No CC points yet. Your Team Head awards these after an event.
        </p>
      ) : (
        <div className="space-y-2">
          {awards.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
            >
              <p className="font-medium text-slate-900">{a.event.name}</p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">{a.points} pts</span>
                {a.verifiedAt ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    Verified
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                    Awaiting verification
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

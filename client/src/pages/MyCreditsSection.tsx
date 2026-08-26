import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { MyCredit, MyCCActivity } from "../lib/types";

export function MyCreditsSection() {
  const [awards, setAwards] = useState<MyCredit[]>([]);
  const [total, setTotal] = useState(0);
  const [activities, setActivities] = useState<MyCCActivity[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/credits/mine"), api.get("/cc-activities/mine/list")])
      .then(([club, act]) => {
        setAwards(club.data.awards);
        setTotal(club.data.total);
        setActivities(act.data.activities);
        setActivityTotal(act.data.total);
      })
      .catch(() => setAwards([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
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
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No CC points yet. Your Team Head awards these after an event.
        </p>
      ) : (
        <div className="space-y-2">
          {awards.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] transition duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.06] p-4"
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

      {activities.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">CC Activities</h3>
            <div className="rounded-lg bg-violet-50 px-3.5 py-1.5 text-sm">
              <span className="font-semibold text-violet-700">{activityTotal}</span>
              <span className="text-violet-500"> points</span>
            </div>
          </div>
          <div className="space-y-2">
            {activities.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03] transition duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.06]"
              >
                <p className="font-medium text-slate-900">{a.title}</p>
                <span className="text-sm font-medium text-slate-700">{a.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

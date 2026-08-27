import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { LeaderboardData, Badge } from "../lib/types";

const BADGE_STYLE: Record<Exclude<Badge, null>, string> = {
  Gold: "bg-amber-100 text-amber-800 ring-1 ring-amber-300",
  Silver: "bg-slate-100 text-slate-700 ring-1 ring-slate-300",
  Bronze: "bg-orange-100 text-orange-800 ring-1 ring-orange-300",
};

function BadgeChip({ badge }: { badge: Badge }) {
  if (!badge) return <span className="text-slate-300">—</span>;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_STYLE[badge]}`}>
      {badge}
    </span>
  );
}

export function LeaderboardSection() {
  const { user } = useAuth();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/leaderboard")
      .then((res) => setData(res.data))
      .catch(() => setData({ leaderboard: [], me: null }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Leaderboard</h2>
        <p className="text-sm text-slate-500">Ranked by total CC points</p>
      </div>

      {data?.me && (
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
          <div>
            <p className="text-sm text-indigo-600">Your rank</p>
            <p className="text-2xl font-bold text-indigo-800">#{data.me.rank}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">{data.me.points} pts</span>
            <BadgeChip badge={data.me.badge} />
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : !data || data.leaderboard.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No CC points awarded yet. Rankings appear once volunteers earn points.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 text-right font-medium">Points</th>
                <th className="px-4 py-3 text-right font-medium">Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.leaderboard.map((r) => {
                const mine = r.id === user?.id;
                return (
                  <tr key={r.id} className={mine ? "bg-indigo-50/60" : ""}>
                    <td className="px-4 py-3 font-semibold text-slate-500">#{r.rank}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {r.name}
                      {mine && <span className="ml-2 text-xs font-normal text-indigo-500">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.class ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{r.points}</td>
                    <td className="px-4 py-3 text-right">
                      <BadgeChip badge={r.badge} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

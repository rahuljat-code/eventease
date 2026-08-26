import { useEffect, useState } from "react";
import axios from "axios";
import { api } from "../lib/api";
import type { CreditAward } from "../lib/types";


export function CreditVerifySection() {
  const [awards, setAwards] = useState<CreditAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(tab === "history" ? "/credits/club?history=1" : "/credits/club");
      setAwards(res.data.awards);
    } catch {
      setAwards([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [tab]);

  async function verify(a: CreditAward) {
    setBusy(a.id);
    try {
      await api.patch(`/credits/${a.id}/verify`);
      await load();
    } catch (err) {
      alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Failed" : "Failed");
    } finally {
      setBusy(null);
    }
  }
  async function remove(a: CreditAward) {
    if (!confirm(`Remove ${a.points} points awarded to ${a.volunteer.name} for ${a.event.name}?`)) return;
    setBusy(a.id);
    try {
      await api.delete(`/credits/${a.id}`);
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Verify CC Points</h2>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
          {(["pending", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1 font-medium capitalize transition ${
                tab === t ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : awards.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          {tab === "history" ? "You have not verified any credits yet." : "No CC points waiting for verification."}
        </p>
      ) : (
        <div className="space-y-3">
          {awards.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] transition duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.06] p-4"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {a.volunteer.name}
                  {a.volunteer.rollNo && <span className="text-slate-400"> · {a.volunteer.rollNo}</span>}
                  {a.volunteer.class && <span className="text-slate-400"> · {a.volunteer.class.name}</span>}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  <span className="font-medium text-slate-700">{a.points} pts</span> for {a.event.name}
                  {a.awardedBy && ` · awarded by ${a.awardedBy.name}`}
                </p>
              </div>
              {tab === "pending" ? (
                <div className="flex shrink-0 gap-2">
                  <button
                    disabled={busy === a.id}
                    onClick={() => verify(a)}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    Verify
                  </button>
                  <button
                    disabled={busy === a.id}
                    onClick={() => remove(a)}
                    className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  Verified
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

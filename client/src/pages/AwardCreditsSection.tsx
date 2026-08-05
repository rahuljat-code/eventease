import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { api } from "../lib/api";
import type { CreditTeamContext } from "../lib/types";

/**
 * The Team Head's "Award CC Points" section: pick an event, then set the CC
 * points for each volunteer on the team. Points are per (volunteer, event);
 * once the President verifies them they lock.
 */
export function AwardCreditsSection() {
  const [ctx, setCtx] = useState<CreditTeamContext>({ events: [], members: [], awards: [] });
  const [eventId, setEventId] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({}); // volunteerId -> points input
  const [savingId, setSavingId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await api.get("/credits/team");
    setCtx(res.data);
  }
  useEffect(() => {
    load();
  }, []);

  // the award for a given volunteer + the selected event (if any)
  const awardFor = useMemo(() => {
    const map = new Map<number, { id: number; points: number; verifiedAt: string | null }>();
    if (!eventId) return map;
    for (const a of ctx.awards) {
      if (a.eventId === Number(eventId)) map.set(a.volunteerId, a);
    }
    return map;
  }, [ctx.awards, eventId]);

  async function save(volunteerId: number) {
    setMsg("");
    setSavingId(volunteerId);
    try {
      const points = Number(drafts[volunteerId] ?? awardFor.get(volunteerId)?.points ?? 0);
      await api.put("/credits", { volunteerId, eventId: Number(eventId), points });
      await load();
      setDrafts((d) => {
        const n = { ...d };
        delete n[volunteerId];
        return n;
      });
    } catch (err) {
      setMsg(axios.isAxiosError(err) ? err.response?.data?.message ?? "Failed" : "Failed");
    } finally {
      setSavingId(null);
    }
  }

  if (ctx.events.length === 0 && ctx.members.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Award CC Points</h2>

      <div className="mb-4 max-w-sm">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Event</label>
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="" disabled>
            Select an event
          </option>
          {ctx.events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
      </div>

      {msg && <p className="mb-3 text-sm text-red-600">{msg}</p>}

      {!eventId ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Choose an event to award points for it.
        </p>
      ) : ctx.members.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No volunteers on your team yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Volunteer</th>
                <th className="px-4 py-2.5 font-medium">Class</th>
                <th className="px-4 py-2.5 font-medium">Points</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ctx.members.map((m) => {
                const a = awardFor.get(m.id);
                const locked = !!a?.verifiedAt;
                const value = drafts[m.id] ?? (a ? String(a.points) : "");
                return (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {m.name} {m.rollNo && <span className="text-slate-400">· {m.rollNo}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{m.class?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        value={value}
                        disabled={locked}
                        onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
                        placeholder="0"
                        className="w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {locked ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          Verified
                        </span>
                      ) : (
                        <button
                          onClick={() => save(m.id)}
                          disabled={savingId === m.id || value === ""}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {a ? "Update" : "Award"}
                        </button>
                      )}
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

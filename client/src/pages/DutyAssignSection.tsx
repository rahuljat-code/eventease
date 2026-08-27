import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { api } from "../lib/api";
import type { Duty, CreditTeamContext } from "../lib/types";
import { SearchSelect, type Option } from "../components/SearchSelect";

export function DutyAssignSection() {
  const [duties, setDuties] = useState<Duty[]>([]);
  const [events, setEvents] = useState<CreditTeamContext["events"]>([]);
  const [members, setMembers] = useState<CreditTeamContext["members"]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventId, setEventId] = useState<number | "">("");
  const [assignedToId, setAssignedToId] = useState<number | "">("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([api.get("/duties/team"), api.get("/credits/team")])
      .then(([d, ctx]) => {
        setDuties(d.data.duties);
        setEvents(ctx.data.events);
        setMembers(ctx.data.members);
      })
      .catch(() => setDuties([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const memberOptions: Option[] = members.map((m) => ({
    id: m.id,
    label: m.name,
    sub: [m.class?.name, m.rollNo && `Roll ${m.rollNo}`].filter(Boolean).join(" · "),
  }));

  async function assign(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.post("/duties", {
        title,
        description: description || undefined,
        eventId: eventId || undefined,
        assignedToId,
      });
      setDuties((list) => [res.data.duty, ...list]);
      setTitle("");
      setDescription("");
      setEventId("");
      setAssignedToId("");
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Failed" : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await api.delete(`/duties/${id}`);
      setDuties((list) => list.filter((d) => d.id !== id));
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Duties &amp; Tasks</h2>

      <form onSubmit={assign} className="card mb-6 space-y-4 p-5">
        <p className="text-sm font-medium text-slate-700">Assign a new duty</p>
        <div>
          <label className="label">Task title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Manage the registration desk"
            className="input"
          />
        </div>
        <div>
          <label className="label">Details (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any extra instructions"
            className="input"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Event (optional)</label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value ? Number(e.target.value) : "")}
              className="input"
            >
              <option value="">No specific event</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Assign to</label>
            <SearchSelect
              options={memberOptions}
              value={assignedToId}
              onChange={(id) => setAssignedToId(id)}
              placeholder="Pick a team member…"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy || !title || !assignedToId} className="btn-primary">
          {busy ? "Assigning…" : "Assign duty"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : duties.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No duties assigned yet.
        </p>
      ) : (
        <div className="space-y-2">
          {duties.map((d) => (
            <div
              key={d.id}
              className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900">{d.title}</p>
                  {d.status === "DONE" ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      Done
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      Pending
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  {d.assignedTo.name}
                  {d.assignedTo.class?.name ? ` · ${d.assignedTo.class.name}` : ""}
                  {d.event ? ` · ${d.event.name}` : ""}
                </p>
                {d.description && <p className="mt-1 text-sm text-slate-400">{d.description}</p>}
              </div>
              <button
                onClick={() => remove(d.id)}
                className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

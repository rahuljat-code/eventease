import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { api } from "../lib/api";
import type { Team, TeamMember, UserRef } from "../lib/types";
import { Modal } from "../components/Modal";

/**
 * The Teams part of the President dashboard: create teams for their club and
 * assign a head to each. Assigning a head promotes that user to TEAM_HEAD and
 * enrols them in the team (handled server-side in one transaction).
 */
export function TeamsSection() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState<Team | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function load() {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([api.get("/teams"), api.get("/users")]);
      setTeams(t.data.teams);
      setUsers(u.data.users);
    } catch {
      // a president with no club can't list teams — the Events section already
      // shows the "no club" message, so we just stay empty here.
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(team: Team) {
    if (!confirm(`Delete team "${team.name}"? Its members will be un-assigned.`)) return;
    await api.delete(`/teams/${team.id}`);
    load();
  }

  async function removeMember(team: Team, member: TeamMember) {
    if (!confirm(`Remove ${member.name} from ${team.name}?`)) return;
    await api.delete(`/teams/${team.id}/members/${member.id}`);
    load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Teams</h2>
        <button
          onClick={() => setCreating(true)}
          className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          + New team
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : teams.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No teams yet. Create your club's first team.
        </p>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => {
            const count = team._count?.members ?? 0;
            const isOpen = expanded.has(team.id);
            return (
              <div key={team.id} className="rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] transition duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.06]">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-slate-900">{team.name}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {team.head ? `Head: ${team.head.name}` : "No head yet"} ·{" "}
                      <button
                        onClick={() => toggle(team.id)}
                        className="text-slate-500 underline decoration-dotted hover:text-slate-700"
                      >
                        {count} member{count === 1 ? "" : "s"}
                      </button>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setAssigning(team)}
                      className="text-sm font-medium text-indigo-600 hover:underline"
                    >
                      {team.head ? "Change head" : "Assign head"}
                    </button>
                    <button
                      onClick={() => remove(team)}
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 px-4 py-3">
                    {count === 0 ? (
                      <p className="text-sm text-slate-400">No members yet.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {team.members?.map((m) => (
                          <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                            <span className="text-slate-700">
                              {m.name}
                              <span className="ml-2 text-slate-400">
                                {[m.class?.name, m.rollNo && `Roll ${m.rollNo}`, m.uid]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                              {m.id === team.headId && (
                                <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-600">
                                  head
                                </span>
                              )}
                            </span>
                            <button
                              onClick={() => removeMember(team, m)}
                              className="text-xs font-medium text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateTeamModal open={creating} onClose={() => setCreating(false)} onDone={load} />
      <AssignHeadModal
        team={assigning}
        users={users}
        onClose={() => setAssigning(null)}
        onDone={load}
      />
    </div>
  );
}

/* ---------- Create team ---------- */
function CreateTeamModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/teams", { name });
      setName("");
      onDone();
      onClose();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Failed" : "Failed");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New team">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Team name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Events, Decoration…"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Create team
        </button>
      </form>
    </Modal>
  );
}

/* ---------- Assign head ---------- */
function AssignHeadModal({
  team,
  users,
  onClose,
  onDone,
}: {
  team: Team | null;
  users: UserRef[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!team) return;
    setError("");
    try {
      await api.patch(`/teams/${team.id}/head`, { userId: Number(userId) });
      setUserId("");
      onDone();
      onClose();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Failed" : "Failed");
    }
  }

  return (
    <Modal open={team !== null} onClose={onClose} title={`Assign head — ${team?.name ?? ""}`}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-500">
          The chosen user becomes this team's head and is added to the team.
        </p>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">User</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="" disabled>
              Select a user
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email}) · {u.role}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Assign
        </button>
      </form>
    </Modal>
  );
}

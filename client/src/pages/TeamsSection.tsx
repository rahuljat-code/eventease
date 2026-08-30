import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { api } from "../lib/api";
import type { Team, TeamMember, UserRef } from "../lib/types";
import { Modal } from "../components/Modal";
import { SearchSelect } from "../components/SearchSelect";

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
            const leaders = team.members?.filter((m) => m.teamRole) ?? [];
            const leaderLabel =
              leaders.length > 0
                ? leaders
                    .map((l) => `${l.name} (${l.teamRole === "SUBHEAD" ? "Subhead" : "Head"})`)
                    .join(", ")
                : "No leaders yet";
            return (
              <div key={team.id} className="rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] transition duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.06]">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-slate-900">{team.name}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {leaderLabel} ·{" "}
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
                      Manage leaders
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
                              {m.teamRole && (
                                <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-600">
                                  {m.teamRole === "SUBHEAD" ? "subhead" : "head"}
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
      <ManageLeadersModal
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

/* ---------- Manage leaders (multiple heads / subheads) ---------- */
function ManageLeadersModal({
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
  const [teamState, setTeamState] = useState<Team | null>(team);
  const [userId, setUserId] = useState("");
  const [roleChoice, setRoleChoice] = useState<"HEAD" | "SUBHEAD">("HEAD");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTeamState(team);
    setUserId("");
    setRoleChoice("HEAD");
    setError("");
  }, [team]);

  const leaders = teamState?.members?.filter((m) => m.teamRole) ?? [];

  async function add() {
    if (!teamState || !userId) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.post(`/teams/${teamState.id}/leaders`, {
        userId: Number(userId),
        teamRole: roleChoice,
      });
      setTeamState(res.data.team);
      setUserId("");
      onDone();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Failed" : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeLeader(id: number) {
    if (!teamState) return;
    setError("");
    try {
      const res = await api.delete(`/teams/${teamState.id}/leaders/${id}`);
      setTeamState(res.data.team);
      onDone();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Failed" : "Failed");
    }
  }

  return (
    <Modal open={team !== null} onClose={onClose} title={`Manage leaders — ${team?.name ?? ""}`}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          A team can have several heads and subheads; both can approve the team's requests.
        </p>

        {leaders.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {leaders.map((l) => (
              <li key={l.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-slate-700">
                  {l.name}
                  <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-600">
                    {l.teamRole === "SUBHEAD" ? "Subhead" : "Head"}
                  </span>
                </span>
                <button
                  onClick={() => removeLeader(l.id)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="block text-sm font-medium text-slate-700">Add a leader</label>
          <SearchSelect
            options={users.map((u) => ({ id: u.id, label: u.name, sub: `${u.email.split("@")[0]} · ${u.role}` }))}
            value={userId ? Number(userId) : ""}
            onChange={(id) => setUserId(String(id))}
            placeholder="Search for a student…"
          />
          <div className="flex gap-2">
            {(["HEAD", "SUBHEAD"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleChoice(r)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  roleChoice === r
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {r === "HEAD" ? "Head" : "Subhead"}
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={add}
            disabled={busy || !userId}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add leader"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

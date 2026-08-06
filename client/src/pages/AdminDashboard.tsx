import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { api } from "../lib/api";
import type { Club, UserRef } from "../lib/types";
import { DashboardShell } from "../components/DashboardShell";
import { Modal } from "../components/Modal";

export function AdminDashboard() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [users, setUsers] = useState<UserRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // which club's "assign president" dialog is open (null = none)
  const [assigning, setAssigning] = useState<Club | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [c, u] = await Promise.all([api.get("/clubs"), api.get("/users")]);
      setClubs(c.data.clubs);
      setUsers(u.data.users);
    } catch {
      setError("Could not load clubs. Is the server running?");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function deleteClub(club: Club) {
    if (!confirm(`Delete "${club.name}"? Its events will be deleted too.`)) return;
    await api.delete(`/clubs/${club.id}`);
    load();
  }

  return (
    <DashboardShell title="Admin">
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Clubs</h2>
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            + New club
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : clubs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            No clubs yet. Create one to get started.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Club</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium">President</th>
                  <th className="px-4 py-2.5 font-medium">Events</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clubs.map((club) => (
                  <tr key={club.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{club.name}</td>
                    <td className="px-4 py-3 text-slate-600">{club.category ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {club.president ? club.president.name : <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{club._count?.events ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setAssigning(club)}
                        className="mr-3 text-sm font-medium text-indigo-600 hover:underline"
                      >
                        Assign president
                      </button>
                      <button
                        onClick={() => deleteClub(club)}
                        className="text-sm font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateClubModal open={creating} onClose={() => setCreating(false)} onDone={load} />
      <AssignPresidentModal
        club={assigning}
        users={users}
        onClose={() => setAssigning(null)}
        onDone={load}
      />
    </DashboardShell>
  );
}

function CreateClubModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/clubs", { name, category: category || undefined });
      setName("");
      setCategory("");
      onDone();
      onClose();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Failed" : "Failed");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New club">
      <form onSubmit={submit} className="space-y-4">
        <Labelled label="Club name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </Labelled>
        <Labelled label="Category (optional)">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Technical, Cultural…"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </Labelled>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Create club
        </button>
      </form>
    </Modal>
  );
}

function AssignPresidentModal({
  club,
  users,
  onClose,
  onDone,
}: {
  club: Club | null;
  users: UserRef[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!club) return;
    setError("");
    try {
      await api.patch(`/clubs/${club.id}/president`, { userId: Number(userId) });
      setUserId("");
      onDone();
      onClose();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Failed" : "Failed");
    }
  }

  return (
    <Modal open={club !== null} onClose={onClose} title={`Assign president — ${club?.name ?? ""}`}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-500">
          The chosen user becomes the President of this club.
        </p>
        <Labelled label="User">
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
        </Labelled>
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

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { BrowseClub } from "../lib/types";
import { DashboardShell } from "../components/DashboardShell";
import { Modal } from "../components/Modal";
import { MyRequestsSection } from "./MyRequestsSection";
import { MyCreditsSection } from "./MyCreditsSection";

export function VolunteerDashboard() {
  const { user } = useAuth();
  const [picking, setPicking] = useState(false);

  return (
    <DashboardShell title="Volunteer">
      {/* ----- Profile card ----- */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <Info label="Name" value={user?.name} />
          <Info label="UID" value={user?.uid} />
          <Info label="Roll No." value={user?.rollNo} />
          <Info label="Class" value={user?.class?.name} />
          <Info
            label="Team"
            value={user?.team ? `${user.team.club.name} → ${user.team.name}` : "Not on a team yet"}
          />
        </div>
      </div>

      {/* ----- Team section ----- */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">My Team</h2>
          <button
            onClick={() => setPicking(true)}
            className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            {user?.team ? "Change team" : "Join a team"}
          </button>
        </div>
        {user?.team ? (
          <p className="text-sm text-slate-600">
            You are on <span className="font-medium text-slate-900">{user.team.name}</span> in{" "}
            <span className="font-medium text-slate-900">{user.team.club.name}</span>. Your attendance
            requests go to this team's head.
          </p>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            You are not on a team yet. Join one so you can submit attendance requests.
          </p>
        )}
      </div>

      {/* Module 4 — this volunteer's attendance requests */}
      <MyRequestsSection hasTeam={!!user?.team} />

      {/* Module 5 — this volunteer's CC credits */}
      <MyCreditsSection />

      <PickTeamModal open={picking} onClose={() => setPicking(false)} />
    </DashboardShell>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className="font-medium text-slate-900">{value || "—"}</p>
    </div>
  );
}

/* ---------- Pick / change team ---------- */
function PickTeamModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, refreshUser } = useAuth();
  const [clubs, setClubs] = useState<BrowseClub[]>([]);
  const [clubId, setClubId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setClubId("");
    setTeamId("");
    api
      .get("/clubs/browse")
      .then((res) => setClubs(res.data.clubs))
      .catch(() => setError("Could not load teams. Is the server running?"));
  }, [open]);

  const selectedClub = clubs.find((c) => String(c.id) === clubId);

  async function join(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.patch("/users/me/team", { teamId: Number(teamId) });
      await refreshUser();
      onClose();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Failed" : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    setError("");
    try {
      await api.patch("/users/me/team", { teamId: null });
      await refreshUser();
      onClose();
    } catch {
      setError("Failed to leave the team");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Choose your team">
      <form onSubmit={join} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Club</label>
          <select
            value={clubId}
            onChange={(e) => {
              setClubId(e.target.value);
              setTeamId("");
            }}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="" disabled>
              Select a club
            </option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Team</label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            required
            disabled={!selectedClub}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="" disabled>
              {selectedClub ? "Select a team" : "Choose a club first"}
            </option>
            {selectedClub?.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.head ? ` (head: ${t.head.name})` : ""}
              </option>
            ))}
          </select>
          {selectedClub && selectedClub.teams.length === 0 && (
            <p className="mt-1.5 text-xs text-slate-400">This club has no teams yet.</p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy || !teamId}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Join this team"}
        </button>

        {user?.team && (
          <button
            type="button"
            onClick={leave}
            disabled={busy}
            className="w-full rounded-lg border border-red-200 bg-white py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Leave my current team
          </button>
        )}
      </form>
    </Modal>
  );
}

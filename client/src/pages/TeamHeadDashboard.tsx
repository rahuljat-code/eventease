import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Team } from "../lib/types";
import { DashboardShell, type NavItem } from "../components/DashboardShell";
import { OverviewSection } from "../components/OverviewSection";
import { RequestReviewList } from "../components/RequestReviewList";
import { AwardCreditsSection } from "./AwardCreditsSection";

const NAV: NavItem[] = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "team", label: "My Team", icon: "users" },
  { id: "requests", label: "Requests", icon: "doc" },
  { id: "award", label: "Award CC", icon: "medal" },
];

export function TeamHeadDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/teams/my")
      .then((res) => setTeams(res.data.teams))
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, []);

  const teamView = (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">My Team</h2>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : teams.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          You are not leading a team yet.
        </p>
      ) : (
        <div className="space-y-6">
          {teams.map((team) => {
            const count = team._count?.members ?? 0;
            return (
              <div key={team.id} className="rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] transition duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.06]">
                <div className="border-b border-slate-100 p-4">
                  <p className="font-medium text-slate-900">{team.name}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {team.club?.name} · {count} member{count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="px-4 py-3">
                  {count === 0 ? (
                    <p className="text-sm text-slate-400">No members have joined yet.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {team.members?.map((m) => (
                        <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                          <span className="text-slate-700">{m.name}</span>
                          <span className="text-slate-400">
                            {[m.class?.name, m.rollNo && `Roll ${m.rollNo}`, m.uid]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <DashboardShell
      nav={NAV}
      sections={{
        overview: <OverviewSection />,
        team: teamView,
        requests: (
          <RequestReviewList
            title="Pending Attendance Requests"
            listUrl="/attendance/team"
            actionUrl={(id) => `/attendance/${id}/head`}
            approveLabel="Approve"
            emptyText="No requests waiting for your approval."
          />
        ),
        award: <AwardCreditsSection />,
      }}
    />
  );
}

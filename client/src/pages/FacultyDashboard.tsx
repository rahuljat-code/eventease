import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { ClassRef } from "../lib/types";
import { DashboardShell, type NavItem } from "../components/DashboardShell";
import { OverviewSection } from "../components/OverviewSection";
import { CCActivitiesSection } from "./CCActivitiesSection";

type ReportKind = "attendance" | "credits" | "cc-activities";

const NAV: NavItem[] = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "reports", label: "Reports", icon: "download" },
  { id: "activities", label: "CC Activities", icon: "clipboard" },
];

export function FacultyDashboard() {
  const [classes, setClasses] = useState<ClassRef[]>([]);
  const [classId, setClassId] = useState("");
  const [busy, setBusy] = useState<ReportKind | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/classes")
      .then((res) => setClasses(res.data.classes))
      .catch(() => setError("Could not load classes. Is the server running?"));
  }, []);

  async function download(kind: ReportKind) {
    if (!classId) return;
    setBusy(kind);
    setError("");
    try {
      const res = await api.get(`/reports/${kind}?classId=${classId}`, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data as Blob);
      const cd = res.headers["content-disposition"] as string | undefined;
      const match = cd ? /filename="?([^"]+)"?/.exec(cd) : null;
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = match ? match[1] : `${kind}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setError("Could not generate the sheet. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const selectedName = classes.find((c) => String(c.id) === classId)?.name;

  const reportsView = (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Download reports</h2>
      <div className="max-w-md">
        <label className="label">Class</label>
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input">
          <option value="" disabled>
            Select a class
          </option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <ReportCard
          icon={
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
          }
          title="Attendance Sheet"
          description="A column per subject with each student's approved on-duty lectures, and a total."
          disabled={!classId}
          busy={busy === "attendance"}
          onClick={() => download("attendance")}
        />
        <ReportCard
          icon={
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          }
          title="CC Points Sheet"
          description="One row per student with their total verified club CC points."
          disabled={!classId}
          busy={busy === "credits"}
          onClick={() => download("credits")}
        />
        <ReportCard
          icon={
            <>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 9h18M9 4v16" />
            </>
          }
          title="CC Activities Sheet"
          description="A column per CC activity (its title) with the points each student earned, and a total."
          disabled={!classId}
          busy={busy === "cc-activities"}
          onClick={() => download("cc-activities")}
        />
      </div>

      <p className="mt-6 text-sm text-slate-500">
        {classId
          ? `Sheets will be generated for ${selectedName}. Opens in Excel or Google Sheets.`
          : "Choose a class above to enable the downloads."}
      </p>
    </div>
  );

  return (
    <DashboardShell
      nav={NAV}
      sections={{
        overview: <OverviewSection />,
        reports: reportsView,
        activities: <CCActivitiesSection />,
      }}
    />
  );
}

function ReportCard({
  icon,
  title,
  description,
  disabled,
  busy,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <div className="card flex flex-col p-5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {icon}
        </svg>
      </span>
      <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-500">{description}</p>
      <button
        onClick={onClick}
        disabled={disabled || busy}
        className="btn-primary mt-4 w-full"
      >
        {busy ? "Preparing…" : "Download CSV"}
      </button>
    </div>
  );
}

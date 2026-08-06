import { useEffect, useState } from "react";
import axios from "axios";
import { api } from "../lib/api";
import type { AttendanceRequest } from "../lib/types";

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

export function RequestReviewList({
  title,
  listUrl,
  actionUrl,
  approveLabel,
  emptyText,
}: {
  title: string;
  listUrl: string;
  actionUrl: (id: number) => string;
  approveLabel: string;
  emptyText: string;
}) {
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  // "pending" = the queue to act on; "history" = what I have already decided
  const [tab, setTab] = useState<"pending" | "history">("pending");

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(tab === "history" ? `${listUrl}?history=1` : listUrl);
      setRequests(res.data.requests);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [listUrl, tab]);

  async function act(req: AttendanceRequest, action: "APPROVE" | "REJECT") {
    let remark: string | undefined;
    if (action === "REJECT") {
      // A rejection must say why — so the volunteer knows what to fix.
      const input = prompt(`Why are you rejecting ${req.volunteer.name}'s request?`);
      if (input === null) return; // cancelled
      if (input.trim() === "") {
        alert("A reason is required to reject a request.");
        return;
      }
      remark = input.trim();
    }
    setBusy(req.id);
    try {
      await api.patch(actionUrl(req.id), { action, remark });
      await load();
    } catch (err) {
      alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Something went wrong" : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
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
      ) : requests.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          {tab === "history" ? "You have not decided any requests yet." : emptyText}
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {r.volunteer.name}
                    <span className="ml-2 text-sm font-normal text-slate-400">
                      {[r.volunteer.class?.name, r.volunteer.rollNo && `Roll ${r.volunteer.rollNo}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Missed <span className="font-medium">{r.subject.name}</span> ({r.subject.code}) on{" "}
                    {fmtDate(r.lectureDate)}, {r.lectureTime} — {r.teacherName}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    On duty for <span className="font-medium text-slate-700">{r.event.name}</span>
                  </p>
                  {r.reason && <p className="mt-1 text-sm italic text-slate-500">“{r.reason}”</p>}
                  {r.headRemark && (
                    <p className="mt-1 text-xs text-slate-400">
                      Team Head: “{r.headRemark}”
                      {r.headActionBy ? ` — ${r.headActionBy.name}` : ""}
                    </p>
                  )}
                </div>

                {tab === "pending" ? (
                  <div className="flex shrink-0 gap-2">
                    <button
                      disabled={busy === r.id}
                      onClick={() => act(r, "APPROVE")}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {approveLabel}
                    </button>
                    <button
                      disabled={busy === r.id}
                      onClick={() => act(r, "REJECT")}
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      r.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700"
                        : r.status === "REJECTED"
                          ? "bg-red-50 text-red-700"
                          : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {r.status === "PENDING_PRESIDENT" ? "Sent to president" : r.status.toLowerCase()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

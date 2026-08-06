import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { api } from "../lib/api";
import type { AttendanceOptions, AttendanceRequest, RequestStatus } from "../lib/types";
import { Modal } from "../components/Modal";
import { fmtDate } from "../components/RequestReviewList";

const STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING_TEAM_HEAD: "Waiting for team head",
  PENDING_PRESIDENT: "Waiting for president",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const STATUS_STYLE: Record<RequestStatus, string> = {
  PENDING_TEAM_HEAD: "bg-amber-50 text-amber-700",
  PENDING_PRESIDENT: "bg-blue-50 text-blue-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
};

/** The volunteer's own attendance requests, and the form to raise one. */
export function MyRequestsSection({ hasTeam }: { hasTeam: boolean }) {
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceRequest | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/attendance/mine");
      setRequests(res.data.requests);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function withdraw(r: AttendanceRequest) {
    if (!confirm(`Withdraw your request for ${r.subject.name} on ${fmtDate(r.lectureDate)}?`)) return;
    await api.delete(`/attendance/${r.id}`);
    load();
  }

  return (
    <div className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">My Attendance Requests</h2>
        <button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          disabled={!hasTeam}
          title={hasTeam ? "" : "Join a team first"}
          className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          + New request
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          {hasTeam
            ? "No requests yet. Raise one for a lecture you missed while on duty."
            : "Join a team first — your requests go to your team head."}
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">
                    {r.subject.name} <span className="text-slate-400">({r.subject.code})</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {fmtDate(r.lectureDate)}, {r.lectureTime} — {r.teacherName}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">On duty for {r.event.name}</p>
                  {r.headRemark && (
                    <p className="mt-1 text-xs text-slate-500">Team Head: “{r.headRemark}”</p>
                  )}
                  {r.presidentRemark && (
                    <p className="mt-1 text-xs text-slate-500">President: “{r.presidentRemark}”</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[r.status]}`}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                  {r.status === "REJECTED" && (
                    <button
                      onClick={() => {
                        setEditing(r);
                        setFormOpen(true);
                      }}
                      className="text-xs font-medium text-indigo-600 hover:underline"
                    >
                      Edit &amp; resubmit
                    </button>
                  )}
                  {r.status === "PENDING_TEAM_HEAD" && (
                    <button
                      onClick={() => withdraw(r)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <RequestModal
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onDone={load}
      />
    </div>
  );
}

function RequestModal({
  open,
  editing,
  onClose,
  onDone,
}: {
  open: boolean;
  editing: AttendanceRequest | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [options, setOptions] = useState<AttendanceOptions>({ events: [], subjects: [] });
  const [eventId, setEventId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [lectureDate, setLectureDate] = useState("");
  const [lectureTime, setLectureTime] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    api
      .get("/attendance/options")
      .then((res) => setOptions(res.data))
      .catch(() =>
        setError("Could not load your club's events. Have you joined a team?")
      );

    if (editing) {
      setEventId(String(editing.event.id));
      setSubjectId(String(editing.subject.id));
      setLectureDate(editing.lectureDate.slice(0, 10));
      setLectureTime(editing.lectureTime);
      setTeacherName(editing.teacherName);
      setReason(editing.reason ?? "");
    } else {
      setEventId("");
      setSubjectId("");
      setLectureDate("");
      setLectureTime("");
      setTeacherName("");
      setReason("");
    }
  }, [open, editing]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body = {
      eventId: Number(eventId),
      subjectId: Number(subjectId),
      lectureDate: new Date(lectureDate).toISOString(),
      lectureTime,
      teacherName,
      reason: reason || undefined,
    };
    try {
      if (editing) await api.patch(`/attendance/${editing.id}`, body);
      else await api.post("/attendance", body);
      onDone();
      onClose();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Failed" : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit & resubmit request" : "New attendance request"}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Event you were on duty for">
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} required className={INPUT}>
            <option value="" disabled>
              Select an event
            </option>
            {options.events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Subject of the missed lecture">
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required className={INPUT}>
            <option value="" disabled>
              Select a subject
            </option>
            {options.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Lecture date">
          <input
            type="date"
            value={lectureDate}
            onChange={(e) => setLectureDate(e.target.value)}
            required
            className={INPUT}
          />
        </Field>

        <Field label="Lecture timing">
          <input
            value={lectureTime}
            onChange={(e) => setLectureTime(e.target.value)}
            required
            placeholder="09:00 - 10:00"
            className={INPUT}
          />
        </Field>

        <Field label="Teacher">
          <input
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            required
            className={INPUT}
          />
        </Field>

        <Field label="Reason (optional)">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Assigned to the registration desk"
            className={INPUT}
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Saving…" : editing ? "Resubmit" : "Submit request"}
        </button>
      </form>
    </Modal>
  );
}

const INPUT =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

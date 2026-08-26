import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { api } from "../lib/api";
import type { CCActivityListItem, CCActivityDetail, CCRosterStudent, ClassRef } from "../lib/types";
import { Modal } from "../components/Modal";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

export function CCActivitiesSection() {
  const [activities, setActivities] = useState<CCActivityListItem[]>([]);
  const [classes, setClasses] = useState<ClassRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([api.get("/cc-activities"), api.get("/classes")]);
      setActivities(a.data.activities);
      setClasses(c.data.classes);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(a: CCActivityListItem) {
    if (!confirm(`Delete "${a.title}"? Its attendance will be removed too.`)) return;
    await api.delete(`/cc-activities/${a.id}`);
    load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">CC Activities</h2>
        <button onClick={() => setCreating(true)} className="btn-primary">
          + New activity
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : activities.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No CC activities yet. Create one, then mark students present to award CC points.
        </p>
      ) : (
        <div className="space-y-3">
          {activities.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03] transition duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.06]"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{a.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {a.class.name} · {fmtDate(a.activityDate)} · {a.points} pt{a.points === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                  {a.presentCount}/{a.studentCount} present
                </span>
                <button
                  onClick={() => setMarkingId(a.id)}
                  className="text-sm font-medium text-indigo-600 hover:underline"
                >
                  Mark attendance
                </button>
                <button onClick={() => remove(a)} className="text-sm font-medium text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateActivityModal
        open={creating}
        classes={classes}
        onClose={() => setCreating(false)}
        onDone={load}
      />
      <RosterModal activityId={markingId} onClose={() => setMarkingId(null)} onDone={load} />
    </div>
  );
}

function CreateActivityModal({
  open,
  classes,
  onClose,
  onDone,
}: {
  open: boolean;
  classes: ClassRef[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [points, setPoints] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setClassId("");
      setActivityDate("");
      setPoints("");
      setError("");
    }
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/cc-activities", {
        title,
        classId: Number(classId),
        activityDate: new Date(activityDate).toISOString(),
        points: Number(points),
      });
      onDone();
      onClose();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Failed" : "Failed");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New CC activity">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Activity title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Blood Donation Camp" className="input" />
        </div>
        <div>
          <label className="label">Class</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} required className="input">
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} required className="input" />
          </div>
          <div>
            <label className="label">CC points</label>
            <input type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} required placeholder="5" className="input" />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary w-full">
          Create activity
        </button>
      </form>
    </Modal>
  );
}

function RosterModal({
  activityId,
  onClose,
  onDone,
}: {
  activityId: number | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [detail, setDetail] = useState<CCActivityDetail | null>(null);
  const [present, setPresent] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (activityId === null) {
      setDetail(null);
      return;
    }
    api.get(`/cc-activities/${activityId}`).then((res) => {
      const d: CCActivityDetail = res.data;
      setDetail(d);
      setPresent(new Set(d.roster.filter((r) => r.present).map((r) => r.id)));
    });
  }, [activityId]);

  function toggle(id: number) {
    setPresent((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function save() {
    if (!detail) return;
    setBusy(true);
    try {
      await api.patch(`/cc-activities/${detail.activity.id}/attendance`, {
        presentStudentIds: [...present],
      });
      onDone();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const roster: CCRosterStudent[] = detail?.roster ?? [];

  return (
    <Modal open={activityId !== null} onClose={onClose} title={detail ? detail.activity.title : "Loading…"}>
      {!detail ? (
        <p className="text-sm text-slate-500">Loading roster…</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">
            {detail.activity.class.name} · {detail.activity.points} pt
            {detail.activity.points === 1 ? "" : "s"} each · {present.size} present
          </p>

          {roster.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              This class has no students yet.
            </p>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
              {roster.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={present.has(s.id)}
                    onChange={() => toggle(s.id)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-800">{s.name}</span>
                  {s.rollNo && <span className="text-xs text-slate-400">Roll {s.rollNo}</span>}
                </label>
              ))}
            </div>
          )}

          <button onClick={save} disabled={busy} className="btn-primary mt-4 w-full">
            {busy ? "Saving…" : "Save attendance"}
          </button>
        </>
      )}
    </Modal>
  );
}

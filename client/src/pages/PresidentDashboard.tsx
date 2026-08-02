import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { api } from "../lib/api";
import type { EventItem, EventStatus } from "../lib/types";
import { DashboardShell } from "../components/DashboardShell";
import { Modal } from "../components/Modal";
import { TeamsSection } from "./TeamsSection";
import { RequestReviewList } from "../components/RequestReviewList";

const STATUSES: EventStatus[] = ["UPCOMING", "ONGOING", "COMPLETED"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PresidentDashboard() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [noClub, setNoClub] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/events");
      setEvents(res.data.events);
      setNoClub(false);
    } catch {
      setNoClub(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function changeStatus(ev: EventItem, status: EventStatus) {
    await api.patch(`/events/${ev.id}`, { status });
    load();
  }
  async function remove(ev: EventItem) {
    if (!confirm(`Delete "${ev.name}"?`)) return;
    await api.delete(`/events/${ev.id}`);
    load();
  }

  return (
    <DashboardShell title="President">
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Events</h2>
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            + New event
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            No events yet. Create your club's first event.
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{ev.name}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {fmtDate(ev.eventDate)}
                    {ev.venue ? ` · ${ev.venue}` : ""}
                    {ev.club ? ` · ${ev.club.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={ev.status}
                    onChange={(e) => changeStatus(ev, e.target.value as EventStatus)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setEditing(ev)}
                    className="text-sm font-medium text-indigo-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(ev)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {noClub && (
          <p className="mt-4 text-sm text-slate-500">
            You are not assigned to a club yet. Ask the Admin to assign you as a club president.
          </p>
        )}
      </div>

      {/* Module 3 — teams for this president's club */}
      {!noClub && <TeamsSection />}

      {/* Module 4 — second-level verification: requests the heads have approved */}
      {!noClub && (
        <RequestReviewList
          title="Requests to Verify"
          listUrl="/attendance/club"
          actionUrl={(id) => `/attendance/${id}/president`}
          approveLabel="Verify"
          emptyText="No requests waiting for your verification."
        />
      )}

      <EventModal open={creating} onClose={() => setCreating(false)} onDone={load} />
      <EventModal
        open={editing !== null}
        event={editing ?? undefined}
        onClose={() => setEditing(null)}
        onDone={load}
      />
    </DashboardShell>
  );
}

function EventModal({
  open,
  event,
  onClose,
  onDone,
}: {
  open: boolean;
  event?: EventItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const isEdit = !!event;
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (event) {
      setName(event.name);
      setEventDate(new Date(event.eventDate).toISOString().slice(0, 16));
      setVenue(event.venue ?? "");
    } else {
      setName("");
      setEventDate("");
      setVenue("");
    }
    setError("");
  }, [event, open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const body = { name, eventDate: new Date(eventDate).toISOString(), venue: venue || undefined };
    try {
      if (isEdit) await api.patch(`/events/${event!.id}`, body);
      else await api.post("/events", body);
      onDone();
      onClose();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Failed" : "Failed");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit event" : "New event"}>
      <form onSubmit={submit} className="space-y-4">
        <Labelled label="Event name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </Labelled>
        <Labelled label="Date & time">
          <input
            type="datetime-local"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </Labelled>
        <Labelled label="Venue (optional)">
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </Labelled>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {isEdit ? "Save changes" : "Create event"}
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

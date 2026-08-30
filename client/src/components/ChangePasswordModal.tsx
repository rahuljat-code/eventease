import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { api } from "../lib/api";
import { Modal } from "./Modal";

/** Lets any signed-in user change their own password. Available from the sidebar. */
export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setError("");
      setDone(false);
      setBusy(false);
    }
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (next !== confirm) {
      setError("The new passwords do not match");
      return;
    }
    if (next.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      await api.post("/auth/change-password", { currentPassword: current, newPassword: next });
      setDone(true);
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Failed" : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

  return (
    <Modal open={open} onClose={onClose} title="Change password">
      {done ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
            Your password has been changed. Use the new password next time you sign in.
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Current password</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">New password</label>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm new password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={inputCls} />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Change password"}
          </button>
        </form>
      )}
    </Modal>
  );
}

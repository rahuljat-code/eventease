import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, dashboardPath } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      // Everyone signs in with a short username — a student's UID (e.g. 24bit044)
      // or a staff role name (admin, president, faculty…). A full email is still
      // accepted for anyone who self-registered with their own address.
      const id = username.trim();
      const email = id.includes("@") ? id : `${id.toLowerCase()}@eventease.local`;
      const user = await login(email, password);
      navigate(dashboardPath(user.role), { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Something went wrong");
      } else {
        setError("Something went wrong");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-rise-in">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/jhc-logo.png" alt="Jai Hind College" className="h-20 w-auto" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in with your username (your UID).</p>
        </div>

        <div className="card p-7 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Username" type="text" value={username} onChange={setUsername} placeholder="e.g. 24bit044" />
            <Field label="Password" type="password" value={password} onChange={setPassword} />

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          No account?{" "}
          <Link to="/register" className="font-semibold text-indigo-600 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        placeholder={placeholder}
        className="input"
      />
    </div>
  );
}

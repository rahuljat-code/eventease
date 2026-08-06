import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, dashboardPath } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
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
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-lg shadow-indigo-500/40">
            E
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your EventEase account.</p>
        </div>

        <div className="card p-7 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email" type="email" value={email} onChange={setEmail} />
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
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="input"
      />
    </div>
  );
}

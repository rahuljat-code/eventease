import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api";
import { useAuth, dashboardPath } from "../context/AuthContext";
import type { ClassRef } from "../lib/types";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [uid, setUid] = useState("");
  const [classId, setClassId] = useState("");

  const [classes, setClasses] = useState<ClassRef[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get("/classes")
      .then((res) => setClasses(res.data.classes))
      .catch(() => setError("Could not load classes. Is the server running?"));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await register({
        name,
        email,
        password,
        rollNo,
        uid,
        classId: Number(classId),
      });
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
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">You'll be registered as a volunteer.</p>
        </div>

        <div className="card p-7 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Full name" value={name} onChange={setName} />
            <Field label="Email" type="email" value={email} onChange={setEmail} />
            <Field label="Password" type="password" value={password} onChange={setPassword} />
            <Field label="Roll number" value={rollNo} onChange={setRollNo} />
            <Field label="UID" value={uid} onChange={setUid} />

            <div>
              <label className="label">Class</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                required
                className="input"
              >
                <option value="" disabled>
                  Select your class
                </option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Creating account…" : "Register"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
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

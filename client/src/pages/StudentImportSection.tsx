import { useEffect, useRef, useState, type ChangeEvent } from "react";
import axios from "axios";
import { api } from "../lib/api";
import type { ClassRef, StudentImportResult } from "../lib/types";

interface ParsedStudent {
  rollNo: string;
  uid: string;
  name: string;
}

/**
 * Splits CSV text into rows of fields, honouring quoted fields (so a name that
 * contains a comma survives). Plain TypeScript — no CSV library — mirroring the
 * hand-written CSV building the Module 6 report uses.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully blank lines.
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

/** Reads the header row and pulls out the Roll No / UID / Name columns. */
function extractStudents(text: string): { students: ParsedStudent[]; error?: string } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { students: [], error: "The file has no student rows." };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const rollIdx = header.findIndex((h) => h.includes("roll"));
  const uidIdx = header.findIndex((h) => h.includes("uid") || h === "id");
  const nameIdx = header.findIndex((h) => h.includes("name"));

  if (rollIdx === -1 || uidIdx === -1 || nameIdx === -1) {
    return {
      students: [],
      error: "Couldn't find the Roll No, UID and Name columns. The first row must name them as headers.",
    };
  }

  const students = rows
    .slice(1)
    .map((r) => ({
      rollNo: (r[rollIdx] ?? "").trim(),
      uid: (r[uidIdx] ?? "").trim(),
      name: (r[nameIdx] ?? "").trim(),
    }))
    .filter((s) => s.uid && s.name && s.rollNo);

  if (students.length === 0)
    return { students: [], error: "No valid rows found — each student needs a roll no, UID and name." };
  return { students };
}

export function StudentImportSection() {
  const [classes, setClasses] = useState<ClassRef[]>([]);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<ParsedStudent[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<StudentImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get("/classes")
      .then((res) => setClasses(res.data.classes))
      .catch(() => setError("Could not load classes. Is the server running?"));
  }, []);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setResult(null);
    setError("");
    setStudents([]);
    setFileName("");
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const { students, error } = extractStudents(String(reader.result ?? ""));
      if (error) setError(error);
      else setStudents(students);
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(file);
  }

  async function upload() {
    if (!classId || students.length === 0) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post("/users/import-students", { classId: Number(classId), students });
      setResult(res.data);
      setStudents([]);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Upload failed" : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Import Students</h2>
      <p className="mb-5 text-sm text-slate-500">
        Upload a class list as a <span className="font-medium text-slate-700">CSV</span> file (in Excel:
        File → Save As → CSV). The first row must have <span className="font-medium text-slate-700">Roll
        No</span>, <span className="font-medium text-slate-700">UID</span> and{" "}
        <span className="font-medium text-slate-700">Name</span> columns. Each student can then sign in with
        their UID and the password <span className="font-mono text-slate-700">student123</span>.
      </p>

      <div className="card space-y-4 p-5">
        <div>
          <label className="label">Class</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input">
            <option value="" disabled>
              Select the class this sheet is for
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">CSV file</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {fileName && !error && students.length > 0 && (
            <p className="mt-2 text-sm text-emerald-600">
              {fileName} — found <span className="font-semibold">{students.length}</span> student
              {students.length === 1 ? "" : "s"}.
            </p>
          )}
        </div>

        {students.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Roll</th>
                  <th className="px-3 py-2 font-medium">UID</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.slice(0, 5).map((s, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 text-slate-600">{s.rollNo}</td>
                    <td className="px-3 py-1.5 text-slate-600">{s.uid}</td>
                    <td className="px-3 py-1.5 text-slate-800">{s.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {students.length > 5 && (
              <p className="bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
                …and {students.length - 5} more
              </p>
            )}
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {result && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Imported <span className="font-semibold">{result.created}</span> new student
            {result.created === 1 ? "" : "s"}.
            {result.skipped > 0 && ` ${result.skipped} already existed and ${result.skipped === 1 ? "was" : "were"} skipped.`}
          </p>
        )}

        <button onClick={upload} disabled={busy || !classId || students.length === 0} className="btn-primary">
          {busy ? "Importing…" : `Import ${students.length || ""} student${students.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}

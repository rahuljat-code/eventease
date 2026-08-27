import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { CertificateData } from "../lib/types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export function CertificateSection() {
  const [data, setData] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/certificate/mine")
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!data)
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        Could not load your certificate.
      </p>
    );

  const lines = [
    ...data.clubCredits.map((c) => ({ name: c.name, points: c.points, kind: "Club CC" })),
    ...data.activities.map((a) => ({ name: a.name, points: a.points, kind: "Activity" })),
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h2 className="text-lg font-semibold text-slate-900">Participation Certificate</h2>
        <button onClick={() => window.print()} className="btn-primary">
          Print / Save as PDF
        </button>
      </div>

      <div
        id="certificate-print"
        className="mx-auto max-w-3xl rounded-2xl border-4 border-double border-[#1e3a8a]/40 bg-white p-10 text-center shadow-sm"
      >
        <img src="/jhc-logo.png" alt="Jai Hind College" className="mx-auto h-16 w-auto" />
        <p className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-400">Jai Hind College</p>
        <h1 className="mt-3 font-serif text-3xl font-bold text-[#1e3a8a]">
          Certificate of Co-Curricular Participation
        </h1>
        <p className="mt-6 text-sm text-slate-500">This is to certify that</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{data.student.name}</p>
        <p className="mt-1 text-sm text-slate-500">
          {[data.student.class, data.student.rollNo && `Roll No. ${data.student.rollNo}`, data.student.uid]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-slate-600">
          has actively participated in the co-curricular activities and events listed below, earning a total
          of <span className="font-semibold text-[#1e3a8a]">{data.totalCC} CC points</span> through the
          EventEase participation and credit system.
        </p>

        {lines.length > 0 && (
          <div className="mx-auto mt-6 max-w-xl text-left">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td className="py-2 text-slate-700">{l.name}</td>
                    <td className="py-2 text-right text-slate-400">{l.kind}</td>
                    <td className="py-2 pl-4 text-right font-medium text-slate-700">{l.points} pts</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-200">
                  <td className="py-2 font-semibold text-slate-900" colSpan={2}>
                    Total CC Points
                  </td>
                  <td className="py-2 pl-4 text-right font-bold text-[#1e3a8a]">{data.totalCC} pts</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-10 flex items-end justify-between text-left text-xs text-slate-500">
          <div>
            <p className="font-mono text-slate-700">{data.certificateId}</p>
            <p>Issued {fmtDate(data.issuedAt)}</p>
          </div>
          <div className="text-center">
            <div className="mb-1 h-10 w-40 border-b border-slate-300" />
            <p>Authorised Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}

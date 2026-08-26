import { useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import type { Overview, OverviewChart, OverviewMetric, MetricTone } from "../lib/types";

const TONE: Record<MetricTone, { solid: string; bg: string; ink: string }> = {
  amber: { solid: "#f59e0b", bg: "bg-amber-50", ink: "text-amber-600" },
  blue: { solid: "#3b82f6", bg: "bg-blue-50", ink: "text-blue-600" },
  emerald: { solid: "#10b981", bg: "bg-emerald-50", ink: "text-emerald-600" },
  red: { solid: "#ef4444", bg: "bg-red-50", ink: "text-red-600" },
  indigo: { solid: "#2563eb", bg: "bg-indigo-50", ink: "text-indigo-600" },
  violet: { solid: "#8b5cf6", bg: "bg-violet-50", ink: "text-violet-600" },
  slate: { solid: "#64748b", bg: "bg-slate-100", ink: "text-slate-600" },
};

// A small icon per tone, so each stat card reads at a glance.
const ICON: Record<MetricTone, ReactNode> = {
  indigo: <path d="M13 10V3L4 14h7v7l9-11h-7z" />,
  amber: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  emerald: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </>
  ),
  blue: <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.6a1 1 0 0 1 .7.3l5.4 5.4a1 1 0 0 1 .3.7V19a2 2 0 0 1-2 2z" />,
  violet: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  slate: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </>
  ),
  red: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6m0-6l-6 6" />
    </>
  ),
};

export function OverviewSection() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/analytics/overview")
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[84px] animate-pulse rounded-2xl border border-slate-200/70 bg-slate-100/60" />
        ))}
      </div>
    );
  }

  if (!data || (data.metrics.length === 0 && data.charts.length === 0)) return null;

  return (
    <section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {data.metrics.map((m) => (
          <StatCard key={m.label} metric={m} />
        ))}
      </div>

      {data.charts.length > 0 && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {data.charts.map((c) => (c.kind === "donut" ? <DonutChart key={c.title} chart={c} /> : <BarChart key={c.title} chart={c} />))}
        </div>
      )}
    </section>
  );
}

function StatCard({ metric }: { metric: OverviewMetric }) {
  const t = TONE[metric.tone];
  return (
    <div className="flex items-start justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03] transition duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.06]">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{metric.label}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-slate-900">{metric.value}</p>
        {metric.hint && <p className="mt-0.5 truncate text-xs text-slate-400">{metric.hint}</p>}
      </div>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${t.bg} ${t.ink}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {ICON[metric.tone]}
        </svg>
      </span>
    </div>
  );
}

function DonutChart({ chart }: { chart: OverviewChart }) {
  const total = chart.series.reduce((sum, s) => sum + s.value, 0);

  let acc = 0;
  const stops = chart.series
    .filter((s) => s.value > 0)
    .map((s) => {
      const start = (acc / total) * 360;
      acc += s.value;
      const end = (acc / total) * 360;
      return `${TONE[s.tone ?? "indigo"].solid} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.03] transition duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.06]">
      <h3 className="text-sm font-semibold text-slate-900">{chart.title}</h3>

      {total === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No data yet.</p>
      ) : (
        <div className="mt-4 flex items-center gap-5">
          <div className="relative h-28 w-28 shrink-0">
            <div className="h-full w-full rounded-full" style={{ background: `conic-gradient(${stops})` }} />
            <div className="absolute inset-[24%] grid place-items-center rounded-full bg-white">
              <div className="text-center leading-none">
                <div className="text-xl font-bold tabular-nums text-slate-900">{total}</div>
                <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">total</div>
              </div>
            </div>
          </div>
          <ul className="flex-1 space-y-2">
            {chart.series.map((s) => (
              <li key={s.label} className="flex items-center gap-2.5 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: TONE[s.tone ?? "indigo"].solid }} />
                <span className="flex-1 truncate text-slate-600">{s.label}</span>
                <span className="font-semibold tabular-nums text-slate-900">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BarChart({ chart }: { chart: OverviewChart }) {
  const max = Math.max(1, ...chart.series.map((s) => s.value));
  const total = chart.series.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.03] transition duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.06]">
      <h3 className="text-sm font-semibold text-slate-900">{chart.title}</h3>

      {total === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No data yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {chart.series.map((s) => {
            const pct = s.value === 0 ? 0 : Math.max(6, Math.round((s.value / max) * 100));
            return (
              <div key={s.label} className="flex items-center gap-3" title={`${s.label}: ${s.value}`}>
                <span className="w-24 shrink-0 truncate text-sm text-slate-600 sm:w-32">{s.label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${pct}%`, backgroundColor: TONE[s.tone ?? "indigo"].solid }}
                  />
                </div>
                <span className="w-7 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-900">{s.value}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

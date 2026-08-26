import { useEffect, useMemo, useRef, useState } from "react";

export interface Option {
  id: number;
  label: string;
  sub?: string;
}

/**
 * A searchable single-select. Click to open a panel with a search box and a
 * filtered list — so picking one person out of hundreds is typing, not scrolling.
 */
export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
}: {
  options: Option[];
  value: number | "";
  onChange: (id: number) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s
      ? options.filter(
          (o) => o.label.toLowerCase().includes(s) || (o.sub?.toLowerCase().includes(s) ?? false)
        )
      : options;
    return list.slice(0, 60);
  }, [q, options]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex w-full items-center justify-between gap-2 text-left"
      >
        <span className={`truncate ${selected ? "text-slate-900" : "text-slate-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10">
          <div className="border-b border-slate-100 p-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type a name or UID…"
              className="input py-2"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">No matches</li>
            ) : (
              filtered.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.id);
                      setOpen(false);
                      setQ("");
                    }}
                    className={`flex w-full flex-col items-start px-3 py-2 text-left transition hover:bg-slate-50 ${
                      o.id === value ? "bg-indigo-50" : ""
                    }`}
                  >
                    <span className="text-sm text-slate-800">{o.label}</span>
                    {o.sub && <span className="text-xs text-slate-400">{o.sub}</span>}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

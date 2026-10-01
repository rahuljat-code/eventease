import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  // Rendered through a portal to <body> so the fixed overlay is positioned
  // relative to the viewport, not to any transformed/animated ancestor
  // (otherwise the popup drifts to the top instead of centring).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col animate-scale-in rounded-2xl border border-slate-200/70 bg-white shadow-modal">
        <div className="flex shrink-0 items-center justify-between px-6 pb-4 pt-6">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

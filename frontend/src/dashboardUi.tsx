import type { ReactNode } from "react";

// Presentation-only helpers for the dashboard. Thresholds only choose a colour and wording;
// they never change the underlying figures, which still come from the existing calculations in App.tsx.

export type Tone = "good" | "warn" | "bad" | "info" | "violet" | "neutral";

export const onTimeTone = (percent: number, sample: number): { tone: Tone; label: string } => {
  if (sample === 0) return { tone: "neutral", label: "Not enough data yet" };
  if (sample < 3) return { tone: "neutral", label: "Early data" };
  if (percent >= 90) return { tone: "good", label: "On track" };
  if (percent >= 70) return { tone: "warn", label: "Needs attention" };
  return { tone: "bad", label: "Poor" };
};

export const overdueTone = (count: number): { tone: Tone; label: string } => {
  if (count === 0) return { tone: "good", label: "All clear" };
  if (count <= 2) return { tone: "warn", label: "Some overdue" };
  return { tone: "bad", label: "Action needed" };
};

export const utilisationTone = (percent: number, hours: number): { tone: Tone; label: string } => {
  if (hours <= 0) return { tone: "neutral", label: "No queued work" };
  if (percent > 100) return { tone: "bad", label: "Over capacity" };
  if (percent > 85) return { tone: "warn", label: "Nearly full" };
  return { tone: "good", label: "Healthy" };
};

export const jobStatusTone = (status: string): Tone => {
  switch (status) {
    case "Quote Draft":
    case "Estimate Template":
      return "neutral";
    case "Quote Sent":
      return "violet";
    case "Quote Approved":
      return "info";
    case "Pending":
      return "warn";
    case "In Progress":
      return "info";
    case "Completed":
    case "Invoiced":
      return "good";
    case "Cancelled":
      return "bad";
    default:
      return "neutral";
  }
};

export function StatusChip({ status }: { status: string }) {
  return <span className={`mf-chip mf-tone mf-tone--${jobStatusTone(status)}`}>{status}</span>;
}

export function KpiCard({ label, value, note, tone, chip }: { label: string; value: ReactNode; note: ReactNode; tone: Tone; chip?: string }) {
  return (
    <div className={`mf-kpi mf-tone mf-tone--${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="mf-kpi__label text-slate-300">{label}</p>
        {chip ? <span className="mf-chip">{chip}</span> : null}
      </div>
      <p className="mf-kpi__value">{value}</p>
      <p className="mf-kpi__note text-slate-300">{note}</p>
    </div>
  );
}

export function UtilisationRow({ name, hours, percent }: { name: string; hours: number; percent: number }) {
  const { tone, label } = utilisationTone(percent, hours);
  return (
    <div className={`mf-tone mf-tone--${tone}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-white">{name}</span>
        <span className="text-sm text-slate-300">
          <span className="font-semibold" style={{ color: "var(--tone)" }}>{percent.toFixed(1)}%</span> utilised • {hours.toFixed(1)} h queued
        </span>
      </div>
      <div
        className="mf-meter mt-2"
        role="progressbar"
        aria-label={`${name} utilisation`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, Math.round(percent))}
        aria-valuetext={`${percent.toFixed(1)}% - ${label}`}
      >
        <span style={{ width: `${Math.min(100, Math.max(percent > 0 ? 2 : 0, percent))}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

export function SummaryCard({ label, value, note, tone }: { label: string; value: ReactNode; note: string; tone: Tone }) {
  return (
    <div className={`mf-kpi mf-tone mf-tone--${tone}`}>
      <h3 className="mf-kpi__label text-slate-200">{label}</h3>
      <p className="mf-kpi__value">{value}</p>
      <p className="mf-kpi__note text-slate-300">{note}</p>
    </div>
  );
}

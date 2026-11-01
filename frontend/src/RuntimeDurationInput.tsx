import { useEffect, useRef, useState } from "react";

// Calendar approximations used to convert between the stored total hours and the Y/M/D/H inputs.
const HOURS_PER_DAY = 24;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

type Fields = { years: string; months: string; days: string; hours: string };

export const hoursToParts = (totalHours: number) => {
  let remaining = Math.max(0, Math.round(totalHours * 100) / 100);
  const hoursPerYear = DAYS_PER_YEAR * HOURS_PER_DAY;
  const hoursPerMonth = DAYS_PER_MONTH * HOURS_PER_DAY;
  const years = Math.floor(remaining / hoursPerYear);
  remaining -= years * hoursPerYear;
  const months = Math.floor(remaining / hoursPerMonth);
  remaining -= months * hoursPerMonth;
  const days = Math.floor(remaining / HOURS_PER_DAY);
  remaining -= days * HOURS_PER_DAY;
  return { years, months, days, hours: Math.round(remaining * 100) / 100 };
};

export const formatHoursAsDuration = (totalHours: number) => {
  const parts = hoursToParts(Number(totalHours) || 0);
  const text = ([["y", parts.years], ["mo", parts.months], ["d", parts.days], ["h", parts.hours]] as const)
    .filter(([, amount]) => amount > 0)
    .map(([unit, amount]) => `${amount}${unit}`)
    .join(" ");
  return text || "0h";
};

const split = (value: string): Fields => {
  const total = Number(value);
  if (!value.trim() || !Number.isFinite(total) || total <= 0) return { years: "", months: "", days: "", hours: "" };
  const parts = hoursToParts(total);
  return { years: String(parts.years), months: String(parts.months), days: String(parts.days), hours: String(parts.hours) };
};

const toNumber = (text: string) => (text.trim() === "" ? 0 : Number(text));

const toTotalHours = (fields: Fields) => {
  const amounts = [fields.years, fields.months, fields.days, fields.hours].map(toNumber);
  if (amounts.some((amount) => !Number.isFinite(amount) || amount < 0)) return null;
  const [years, months, days, hours] = amounts;
  return Math.round(((years * DAYS_PER_YEAR + months * DAYS_PER_MONTH + days) * HOURS_PER_DAY + hours) * 100) / 100;
};

interface RuntimeDurationInputProps {
  /** Total hours as a string (the form state format). */
  value: string;
  label?: string;
  onChange: (totalHours: string) => void;
  inputClassName: string;
}

export default function RuntimeDurationInput({ value, label = "Replacement runtime", onChange, inputClassName }: RuntimeDurationInputProps) {
  const [fields, setFields] = useState(() => split(value));
  const lastEmitted = useRef(value);

  // Re-sync only when the parent changes the value (edit/reset), not from our own edits.
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setFields(split(value));
    }
  }, [value]);

  const update = (next: Fields) => {
    setFields(next);
    const total = toTotalHours(next);
    // Invalid input emits NaN-producing text so the form's Number() check can reject it.
    const emitted = total === null ? "invalid" : String(total);
    lastEmitted.current = emitted;
    onChange(emitted);
  };

  const total = toTotalHours(fields);
  const entries: Array<[keyof Fields, string]> = [["years", "Years"], ["months", "Months"], ["days", "Days"], ["hours", "Hours"]];

  return (
    <div className="block text-sm text-slate-300">
      <span className="mb-2 block">{label}</span>
      <div className="grid grid-cols-4 gap-2">
        {entries.map(([key, title]) => (
          <label key={key} className="block text-xs text-slate-400">
            {title}
            <input
              value={fields[key]}
              inputMode="decimal"
              placeholder="0"
              aria-label={`${label} ${title.toLowerCase()}`}
              onChange={(e) => update({ ...fields, [key]: e.target.value })}
              className={inputClassName}
            />
          </label>
        ))}
      </div>
      <p className={`mt-1 text-xs ${total === null ? "text-red-400" : "text-slate-400"}`}>
        {total === null ? "Enter non-negative numbers." : `Total: ${total} hours (year = ${DAYS_PER_YEAR} days, month = ${DAYS_PER_MONTH} days)`}
      </p>
    </div>
  );
}

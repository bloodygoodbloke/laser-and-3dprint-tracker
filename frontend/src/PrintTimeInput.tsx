import { useEffect, useRef, useState } from "react";
import { describePrintTimeInput, minutesToHoursAndMinutes, validatePrintTimeInput } from "./printTime";

// Emitted to the parent while the Hours/Minutes inputs are invalid, so submit-time validation rejects it.
export const INVALID_PRINT_TIME = "invalid";

const split = (value: string) => {
  const total = Number(value);
  if (!value.trim() || !Number.isFinite(total)) return { hours: "", minutes: "" };
  const parts = minutesToHoursAndMinutes(total);
  return { hours: String(parts.hours), minutes: String(parts.minutes) };
};

interface PrintTimeInputProps {
  /** Total minutes as a string (the form state format). */
  value: string;
  label?: string;
  onChange: (totalMinutes: string) => void;
  inputClassName: string;
}

export default function PrintTimeInput({ value, label = "Print time", onChange, inputClassName }: PrintTimeInputProps) {
  const [fields, setFields] = useState(() => split(value));
  const lastEmitted = useRef(value);

  // Re-sync only when the parent changes the value (pre-fill, import, reset), not from our own edits.
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setFields(split(value));
    }
  }, [value]);

  const update = (next: { hours: string; minutes: string }) => {
    setFields(next);
    const result = validatePrintTimeInput(next.hours, next.minutes);
    const emitted = result.valid ? String(result.totalMinutes) : INVALID_PRINT_TIME;
    lastEmitted.current = emitted;
    onChange(emitted);
  };

  const validation = validatePrintTimeInput(fields.hours, fields.minutes);

  return (
    <div className="block text-sm text-slate-300">
      <span className="mb-2 block">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-slate-400">
          Hours
          <input
            value={fields.hours}
            inputMode="decimal"
            placeholder="0"
            aria-label={`${label} hours`}
            onChange={(e) => update({ ...fields, hours: e.target.value })}
            className={inputClassName}
          />
        </label>
        <label className="block text-xs text-slate-400">
          Minutes
          <input
            value={fields.minutes}
            inputMode="numeric"
            placeholder="0"
            aria-label={`${label} minutes`}
            onChange={(e) => update({ ...fields, minutes: e.target.value })}
            className={inputClassName}
          />
        </label>
      </div>
      <p className={`mt-1 text-xs ${validation.valid ? "text-slate-400" : "text-red-400"}`}>
        {describePrintTimeInput(fields.hours, fields.minutes)}
      </p>
    </div>
  );
}

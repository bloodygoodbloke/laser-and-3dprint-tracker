import { useEffect, useRef, useState } from "react";

export interface JobComboboxOption {
  value: string;
  label: string;
}

interface JobComboboxProps {
  label: string;
  value: string;
  options: JobComboboxOption[];
  onChange: (value: string) => void;
  onType?: (value: string) => void;
  addLabel: string;
  onAdd?: (value: string) => void;
}

export default function JobCombobox({ label, value, options, onChange, onType, addLabel, onAdd }: JobComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const trimmed = query.trim();
  const filtered = options.filter((option) => option.label.toLowerCase().includes(trimmed.toLowerCase()));
  const exact = options.some((option) => option.label.toLowerCase() === trimmed.toLowerCase() || option.value.toLowerCase() === trimmed.toLowerCase());
  const selectedLabel = options.find((option) => option.value === value)?.label || value;

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery("");
  };

  const addTypedValue = () => {
    if (!trimmed) return;
    if (onAdd) onAdd(trimmed);
    else choose(trimmed);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative" ref={rootRef}>
      <label className="mb-2 block text-sm text-slate-300">{label}</label>
      <input
        value={open ? query : selectedLabel}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(event) => { setQuery(event.target.value); onType?.(event.target.value); setOpen(true); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "Enter" && open) {
            event.preventDefault();
            if (!trimmed && filtered[0]) choose(filtered[0].value);
            else if (exact) choose(options.find((option) => option.label.toLowerCase() === trimmed.toLowerCase() || option.value.toLowerCase() === trimmed.toLowerCase())?.value || trimmed);
            else addTypedValue();
          }
        }}
        placeholder={`Search or type ${label.toLowerCase()}…`}
        aria-label={label}
        aria-expanded={open}
        aria-autocomplete="list"
        role="combobox"
        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"
      />
      {open ? (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2 shadow-lg">
          <ul role="listbox" className="max-h-52 overflow-auto">
            {filtered.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => choose(option.value)}
                  className={`w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-slate-800 ${option.value === value ? "font-semibold text-cyan-300" : "text-slate-200"}`}
                >
                  {option.label}
                </button>
              </li>
            ))}
            {trimmed && !exact ? (
              <li>
                <button type="button" onClick={addTypedValue} className="w-full rounded-lg px-3 py-1.5 text-left text-sm font-semibold text-cyan-300 hover:bg-slate-800">
                  + Add {addLabel} “{trimmed}”
                </button>
              </li>
            ) : null}
            {!filtered.length && !trimmed ? <li className="px-3 py-1.5 text-sm text-slate-400">No {addLabel}s yet.</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

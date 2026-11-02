import { useEffect, useRef, useState } from "react";

interface NumberInputProps {
  value: number;
  onValue: (value: number) => void;
  step?: string;
  min?: string;
  className?: string;
  "aria-label"?: string;
}

// Keeps the typed text separate from the stored number so partial entries such as "0." or "0.1" are not rewritten
// while typing, and an explicit 0 is shown as "0" instead of an empty box.
export function NumberInput({ value, onValue, step, min, className, "aria-label": ariaLabel }: NumberInputProps) {
  const [text, setText] = useState(String(value));
  const lastValue = useRef(value);

  useEffect(() => {
    if (value !== lastValue.current && Number(text) !== value) setText(String(value));
    lastValue.current = value;
  }, [value, text]);

  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      aria-label={ariaLabel}
      className={className}
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        if (next.trim() === "") {
          onValue(0);
          return;
        }
        const parsed = Number(next);
        if (Number.isFinite(parsed)) onValue(parsed);
      }}
      onBlur={() => {
        if (text.trim() === "" || !Number.isFinite(Number(text))) setText("0");
      }}
    />
  );
}

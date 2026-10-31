// Central print time utilities. Print time is always stored as an integer number of minutes.
// The frontend re-exports this file (frontend/src/printTime.ts) so there is a single implementation.

export const PRINT_TIME_FORMAT_HINT = "Use minutes (252), hours (4.2h) or both (4h 12m).";
export const MAX_MINUTES_PART = 59;

const NUM = "(\\d+(?:\\.\\d+)?)";
const HOURS_UNIT = "(?:hours?|hrs?|h)(?![a-z])";
const MINUTES_UNIT = "(?:minutes?|mins?|m)(?![a-z])";
const HOURS_PART = `${NUM}\\s*${HOURS_UNIT}`;
const MINUTES_PART = `${NUM}\\s*${MINUTES_UNIT}`;
const COMPOUND = new RegExp(`^(?:${HOURS_PART})?\\s*(?:${MINUTES_PART})?$`);
const PLAIN_NUMBER = new RegExp(`^${NUM}$`);

export interface PrintTimeValidation {
  valid: boolean;
  errors: string[];
  totalMinutes: number;
}

const toTotalMinutes = (hours: number, minutes: number) => Math.round(hours * 60 + minutes);

/** Parses one form field. Blank means 0; returns null when it is not a non-negative decimal number. */
const parseNonNegative = (raw: string | number | null | undefined): number | null => {
  const text = String(raw ?? "").trim();
  if (!text) return 0;
  if (!/^\d*\.?\d+$|^\d+\.$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
};

/** Validates Hours (decimal, >= 0) and Minutes (0-59) inputs and calculates the total minutes. */
export function validatePrintTimeInput(
  hours: string | number | null | undefined,
  minutes: string | number | null | undefined,
): PrintTimeValidation {
  const errors: string[] = [];
  const hoursText = String(hours ?? "").trim();
  const minutesText = String(minutes ?? "").trim();
  const parsedHours = parseNonNegative(hours);
  const parsedMinutes = parseNonNegative(minutes);

  if (parsedHours === null) {
    errors.push(hoursText.startsWith("-") ? "Hours cannot be negative." : "Hours must be a number such as 4 or 4.2.");
  }
  if (parsedMinutes === null) {
    errors.push(minutesText.startsWith("-") ? "Minutes cannot be negative." : "Minutes must be a number from 0 to 59.");
  } else if (parsedMinutes > MAX_MINUTES_PART) {
    errors.push("Minutes must be between 0 and 59.");
  }

  if (errors.length) return { valid: false, errors, totalMinutes: 0 };
  return { valid: true, errors, totalMinutes: toTotalMinutes(parsedHours ?? 0, parsedMinutes ?? 0) };
}

/** Converts validated Hours + Minutes into total whole minutes. Throws when invalid. */
export function hoursAndMinutesToTotalMinutes(
  hours: string | number | null | undefined,
  minutes: string | number | null | undefined,
): number {
  const result = validatePrintTimeInput(hours, minutes);
  if (!result.valid) throw new Error(result.errors.join(" "));
  return result.totalMinutes;
}

/** Splits total minutes into whole hours and remaining minutes (252 -> 4h 12m) for pre-filling forms. */
export function minutesToHoursAndMinutes(totalMinutes: number): { hours: number; minutes: number } {
  const total = Math.max(0, Math.round(Number(totalMinutes) || 0));
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

/** Formats minutes as "1h 30m", "4h", "45m" or "0m". */
export function formatMinutesAsPrintTime(minutes: number): string {
  const { hours, minutes: mins } = minutesToHoursAndMinutes(minutes);
  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

/** Live helper text, e.g. "1.5 hours = 1h 30m (90 mins)". Returns the first error when invalid. */
export function describePrintTimeInput(
  hours: string | number | null | undefined,
  minutes: string | number | null | undefined,
): string {
  const result = validatePrintTimeInput(hours, minutes);
  if (!result.valid) return result.errors[0];
  const h = parseNonNegative(hours) ?? 0;
  const m = parseNonNegative(minutes) ?? 0;
  const parts = [];
  if (h || !m) parts.push(`${h} ${h === 1 ? "hour" : "hours"}`);
  if (m) parts.push(`${m} ${m === 1 ? "min" : "mins"}`);
  return `${parts.join(" + ")} = ${formatMinutesAsPrintTime(result.totalMinutes)} (${result.totalMinutes} mins)`;
}

/**
 * Parses text such as "252", "252m", "4h", "4.2 h", "1.5h", "2 h 30 m" or "4h 12m" into total minutes.
 * Throws on invalid input. Blank text is 0.
 */
export function parsePrintTimeToMinutes(input: string): number {
  const text = String(input ?? "").trim().toLowerCase();
  if (!text) return 0;

  const plain = text.match(PLAIN_NUMBER);
  if (plain) return Math.round(Number(plain[1]));

  const match = text.match(COMPOUND);
  if (!match || (match[1] === undefined && match[2] === undefined)) {
    throw new Error(`Invalid print time "${input}". ${PRINT_TIME_FORMAT_HINT}`);
  }
  return toTotalMinutes(Number(match[1] ?? 0), Number(match[2] ?? 0));
}

/** Finds the first duration inside free text (e.g. scraped page text). Returns 0 when none is found. */
export function extractDurationMinutes(text: string): number {
  const source = String(text ?? "");
  const hourMatch = source.match(new RegExp(`${HOURS_PART}`, "i"));
  const minuteMatch = source.match(new RegExp(`${MINUTES_PART}`, "i"));
  return toTotalMinutes(hourMatch ? Number(hourMatch[1]) : 0, minuteMatch ? Number(minuteMatch[1]) : 0);
}

/** Server-side normalisation: accepts numbers, numeric strings or duration text; returns a non-negative integer. */
export function normalizeStoredMinutes(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) throw new Error("Print time must be a non-negative number of minutes.");
    return Math.round(value);
  }
  if (typeof value === "string" && value.trim().startsWith("-")) {
    throw new Error("Print time must be a non-negative number of minutes.");
  }
  return parsePrintTimeToMinutes(String(value));
}

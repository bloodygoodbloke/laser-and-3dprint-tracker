const NUM = "(\\d+(?:\\.\\d+)?)";
const HOURS_PART = `${NUM}\\s*(?:hours?|hrs?|h)`;
const MINUTES_PART = `${NUM}\\s*(?:minutes?|mins?|m)`;
const COMPOUND = new RegExp(`^(?:${HOURS_PART})?\\s*(?:${MINUTES_PART})?$`);
const PLAIN_MINUTES = new RegExp(`^${NUM}$`);

export const PRINT_TIME_FORMAT_HINT = "Use minutes (252), hours (4.2h) or both (4h 12m).";

/** Parses "252", "252m", "4h", "4.2h" or "4h 12m" into whole minutes. Throws on invalid input. */
export function parsePrintTimeToMinutes(input: string): number {
  const text = String(input ?? "").trim().toLowerCase();
  if (!text) return 0;

  const plain = text.match(PLAIN_MINUTES);
  if (plain) return Math.round(Number(plain[1]));

  const match = text.match(COMPOUND);
  if (!match || (match[1] === undefined && match[2] === undefined)) {
    throw new Error(`Invalid print time "${input}". ${PRINT_TIME_FORMAT_HINT}`);
  }
  return Math.round(Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0));
}

/** Formats minutes as "4h 12m", "4h", "45m" or "0m". */
export function formatMinutesAsPrintTime(minutes: number): string {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

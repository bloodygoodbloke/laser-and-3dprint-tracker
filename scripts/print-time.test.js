/*
 * Unit tests for the central print time utilities (backend/src/printTime.ts).
 * Run: node --test scripts/print-time.test.js  (Node 22.18+/24 can import the .ts file directly)
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const load = () => import(pathToFileURL(path.resolve(__dirname, "..", "backend", "src", "printTime.ts")).href);

test("hours + minutes convert to total minutes", async () => {
  const { hoursAndMinutesToTotalMinutes: toMinutes } = await load();
  assert.equal(toMinutes(1, 30), 90);
  assert.equal(toMinutes("1.5", ""), 90);
  assert.equal(toMinutes("1.5", "15"), 105);
  assert.equal(toMinutes("4.2", "0"), 252);
  assert.equal(toMinutes("0.5", ""), 30);
  assert.equal(toMinutes("", "45"), 45);
  assert.equal(toMinutes("", ""), 0);
  assert.equal(toMinutes("4.", ""), 240);
  assert.equal(toMinutes("0.3333", ""), 20);
  assert.ok(Number.isInteger(toMinutes("1.2345", "7")));
});

test("validation rejects negatives, non-numbers and minutes outside 0-59", async () => {
  const { validatePrintTimeInput: validate } = await load();
  assert.equal(validate("1", "59").valid, true);
  assert.equal(validate("0", "0").valid, true);
  assert.deepEqual(validate("-1", "0").errors, ["Hours cannot be negative."]);
  assert.deepEqual(validate("1", "-5").errors, ["Minutes cannot be negative."]);
  assert.deepEqual(validate("1", "60").errors, ["Minutes must be between 0 and 59."]);
  assert.equal(validate("abc", "0").valid, false);
  assert.equal(validate("1", "x").valid, false);
  assert.equal(validate("1e3", "0").valid, false);
  assert.equal(validate("-1", "75").errors.length, 2);
  assert.equal(validate("abc", "0").totalMinutes, 0);
});

test("hoursAndMinutesToTotalMinutes throws on invalid input", async () => {
  const { hoursAndMinutesToTotalMinutes } = await load();
  assert.throws(() => hoursAndMinutesToTotalMinutes("-1", "0"), /negative/);
  assert.throws(() => hoursAndMinutesToTotalMinutes("1", "60"), /0 and 59/);
});

test("minutes format as friendly durations", async () => {
  const { formatMinutesAsPrintTime: format, minutesToHoursAndMinutes: split } = await load();
  assert.equal(format(90), "1h 30m");
  assert.equal(format(252), "4h 12m");
  assert.equal(format(240), "4h");
  assert.equal(format(45), "45m");
  assert.equal(format(0), "0m");
  assert.equal(format(-5), "0m");
  assert.equal(format(Number.NaN), "0m");
  assert.deepEqual(split(252), { hours: 4, minutes: 12 });
  assert.deepEqual(split(45), { hours: 0, minutes: 45 });
});

test("helper text describes the calculated duration", async () => {
  const { describePrintTimeInput: describe } = await load();
  assert.equal(describe("1.5", ""), "1.5 hours = 1h 30m (90 mins)");
  assert.equal(describe("1", ""), "1 hour = 1h (60 mins)");
  assert.equal(describe("1.5", "15"), "1.5 hours + 15 mins = 1h 45m (105 mins)");
  assert.equal(describe("", "45"), "45 mins = 45m (45 mins)");
  assert.equal(describe("", ""), "0 hours = 0m (0 mins)");
  assert.equal(describe("-1", ""), "Hours cannot be negative.");
});

test("text and import values are converted to minutes", async () => {
  const { parsePrintTimeToMinutes: parse, extractDurationMinutes: extract } = await load();
  for (const [input, expected] of [
    ["252", 252], ["252m", 252], ["4h", 240], ["4.2h", 252], ["4.2 h", 252], ["1.5 h", 90],
    ["45 m", 45], ["2 h 30 m", 150], ["4h 12m", 252], ["2 hours 30 minutes", 150], ["", 0],
  ]) {
    assert.equal(parse(input), expected, input);
  }
  assert.throws(() => parse("abc"), /Invalid print time/);
  assert.throws(() => parse("4x"), /Invalid print time/);
  assert.throws(() => parse("-5"), /Invalid print time/);

  assert.equal(extract("Estimated print time: 4.2 h"), 252);
  assert.equal(extract("Print time 2 h 30 m, 35 g"), 150);
  assert.equal(extract("about 45 min"), 45);
  assert.equal(extract("1.5 hours"), 90);
  assert.equal(extract("0.4 mm nozzle"), 0);
  assert.equal(extract("no time here"), 0);
});

test("server normalisation stores non-negative integers", async () => {
  const { normalizeStoredMinutes: normalize } = await load();
  assert.equal(normalize(252), 252);
  assert.equal(normalize(251.6), 252);
  assert.equal(normalize("252"), 252);
  assert.equal(normalize("4h 12m"), 252);
  assert.equal(normalize(undefined), 0);
  assert.equal(normalize(""), 0);
  assert.throws(() => normalize(-1), /non-negative/);
  assert.throws(() => normalize("-1"), /non-negative/);
  assert.throws(() => normalize(Number.NaN), /non-negative/);
  assert.throws(() => normalize("junk"), /Invalid print time/);
});

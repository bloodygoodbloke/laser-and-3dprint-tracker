const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const backlogPath = path.join(root, 'docs', 'backlog.md');
const implementationLogPath = path.join(root, 'docs', 'implementation-log.md');

const BACKLOG_STATUSES = new Set(['Planned', 'In Progress', 'On Hold']);
const BACKLOG_REVIEW_STATUSES = new Set(['-', 'Human Review', 'Reviewed', 'Auto Reviewed']);
const COMPLETED_STATUSES = new Set(['Implemented', 'Completed Bug Fix']);
const ACTIONED_ON_ALLOWED = /^(Historic|\d{4}-\d{2}-\d{2})$/;

function readFileOrDie(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing required file: ${path.relative(root, filePath)}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function parseRows(markdown, sourceName) {
  const rows = [];
  const lines = markdown.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('| CHG-')) {
      continue;
    }

    const cells = trimmed
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);

    const expectedCells = sourceName === 'backlog' ? 9 : 7;
    if (cells.length !== expectedCells) {
      console.error(`[${sourceName}] Invalid row format: ${trimmed}`);
      process.exit(1);
    }

    let id;
    let type;
    let priority;
    let status;
    let title;
    let details;
    let reviewStatus = '-';
    let reviewReason = '-';
    let actionedOn;

    if (sourceName === 'backlog') {
      [id, type, priority, status, title, details, reviewStatus, reviewReason, actionedOn] = cells;
    } else {
      [id, type, priority, status, title, actionedOn, details] = cells;
    }

    // Ignore template/example rows in markdown docs.
    if (id === 'CHG-XXX') {
      continue;
    }

    rows.push({ id, type, priority, status, reviewStatus, reviewReason, title, actionedOn, details, raw: trimmed });
  }

  return rows;
}

function ensureUniqueIds(rows, sourceName) {
  const seen = new Set();
  for (const row of rows) {
    if (!/^CHG-\d{3}$/.test(row.id)) {
      console.error(`[${sourceName}] Invalid ID format: ${row.id}. Expected CHG-XXX.`);
      process.exit(1);
    }
    if (seen.has(row.id)) {
      console.error(`[${sourceName}] Duplicate ID detected: ${row.id}`);
      process.exit(1);
    }
    seen.add(row.id);
  }
  return seen;
}

function validateBacklog(rows) {
  for (const row of rows) {
    if (!BACKLOG_STATUSES.has(row.status)) {
      console.error(`[backlog] ${row.id} has invalid status '${row.status}'. Allowed: Planned, In Progress, On Hold.`);
      process.exit(1);
    }
    if (!BACKLOG_REVIEW_STATUSES.has(row.reviewStatus)) {
      console.error(`[backlog] ${row.id} has invalid review status '${row.reviewStatus}'. Allowed: -, Human Review, Reviewed, Auto Reviewed.`);
      process.exit(1);
    }
    if (row.reviewStatus === 'Human Review' && row.status !== 'On Hold') {
      console.error(`[backlog] ${row.id} is Human Review and must be On Hold.`);
      process.exit(1);
    }
    if ((row.reviewStatus === 'Reviewed' || row.reviewStatus === 'Auto Reviewed') && row.status === 'On Hold') {
      console.error(`[backlog] ${row.id} is reviewed and should not remain On Hold.`);
      process.exit(1);
    }
    if (!row.reviewReason || row.reviewReason.trim() === '') {
      console.error(`[backlog] ${row.id} has an empty review reason.`);
      process.exit(1);
    }
    if (!row.title || row.title === '-') {
      console.error(`[backlog] ${row.id} has an empty title.`);
      process.exit(1);
    }
    if (!row.details || row.details === '-') {
      console.error(`[backlog] ${row.id} has empty details.`);
      process.exit(1);
    }
  }
}

function validateImplementationLog(rows) {
  for (const row of rows) {
    if (!COMPLETED_STATUSES.has(row.status)) {
      console.error(`[implementation-log] ${row.id} has invalid status '${row.status}'. Allowed: Implemented, Completed Bug Fix.`);
      process.exit(1);
    }
    if (!ACTIONED_ON_ALLOWED.test(row.actionedOn)) {
      console.error(`[implementation-log] ${row.id} has invalid Actioned On '${row.actionedOn}'. Use YYYY-MM-DD or Historic.`);
      process.exit(1);
    }
  }
}

function validateNoCrossFileDuplicates(backlogIds, implementationIds) {
  for (const id of backlogIds) {
    if (implementationIds.has(id)) {
      console.error(`ID ${id} exists in both docs/backlog.md and docs/implementation-log.md.`);
      process.exit(1);
    }
  }
}

function main() {
  const backlog = readFileOrDie(backlogPath);
  const implementationLog = readFileOrDie(implementationLogPath);

  const backlogRows = parseRows(backlog, 'backlog');
  const implementationRows = parseRows(implementationLog, 'implementation-log');

  validateBacklog(backlogRows);
  validateImplementationLog(implementationRows);

  const backlogIds = ensureUniqueIds(backlogRows, 'backlog');
  const implementationIds = ensureUniqueIds(implementationRows, 'implementation-log');
  validateNoCrossFileDuplicates(backlogIds, implementationIds);

  console.log(
    `Tracker consistency check passed (${backlogRows.length} backlog items, ${implementationRows.length} completed items).`
  );
}

main();

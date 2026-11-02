import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import api from "./api";
import {
  CHANGELOG_URL,
  DEFAULT_ISSUES_REPOSITORY,
  FEATURE_STATUS_LABELS,
  PRIORITIES,
  QUICK_START_STEPS,
  REQUEST_TYPES,
  WHATS_NEW,
  type FeatureStatus,
  type HelpPriority,
  type HelpRequestType,
} from "./helpContent";
import type { IssueReportStatus } from "./types";
import { fetchHealth, formatBuildDate, formatDeploymentInfo, formatUptime, frontendVersion, type HealthInfo, type VersionInfo } from "./version";

interface HelpPageProps {
  versionInfo: VersionInfo | null;
  versionError: string;
}

const FORM_ID = "help-support-form";

const StatusBadge = ({ status }: { status: FeatureStatus }) => {
  const { icon, label, tone } = FEATURE_STATUS_LABELS[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-xs font-semibold ${tone}`}>
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
};

interface AccordionProps {
  id: string;
  title: string;
  open: boolean;
  onToggle: (id: string, open: boolean) => void;
  badge?: ReactNode;
  children: ReactNode;
}

const Accordion = ({ id, title, open, onToggle, badge, children }: AccordionProps) => (
  <details
    id={id}
    open={open}
    onToggle={(event) => onToggle(id, event.currentTarget.open)}
    className="scroll-mt-4 rounded-2xl border border-slate-800 bg-slate-950"
  >
    <summary className="mf-summary flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3">
      <span className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-white">{title}</h3>
        {badge}
      </span>
      <span aria-hidden="true" className="mf-chevron text-slate-400">▾</span>
    </summary>
    <div className="space-y-3 border-t border-slate-800 px-4 pb-4 pt-3 text-sm leading-relaxed text-slate-300">{children}</div>
  </details>
);

const COMMON_TASKS: { label: string; target: string; requestType?: HelpRequestType }[] = [
  { label: "Create a Job", target: "help-creating-job" },
  { label: "Import from MakerWorld", target: "help-model-imports" },
  { label: "Calculate Costs", target: "help-calculating-costs" },
  { label: "Convert Quote to Job", target: "help-quote-workflow" },
  { label: "Create an Invoice", target: "help-invoices-backup" },
  { label: "Backup Data", target: "help-invoices-backup" },
  { label: "Customise Branding", target: "help-theme" },
  { label: "View Reports", target: "help-reporting" },
  { label: "Raise a Bug", target: FORM_ID, requestType: "Bug" },
  { label: "Request a Feature", target: FORM_ID, requestType: "Feature Request" },
];

const SECTION_IDS = [
  "help-creating-job",
  "help-calculating-costs",
  "help-quote-workflow",
  "help-equipment-billing",
  "help-theme",
  "help-business-customers",
  "help-invoices-backup",
  "help-reporting",
  "help-model-imports",
  "help-bambu",
  "help-troubleshooting",
  "help-release-notes",
];

const emptyForm = { requestType: "Feature Request" as HelpRequestType, priority: "P3 Low" as HelpPriority, title: "", details: "" };

export default function HelpPage({ versionInfo, versionError }: HelpPageProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [createdIssue, setCreatedIssue] = useState<{ number: number; url: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issueStatus, setIssueStatus] = useState<IssueReportStatus | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [diagnosticsVisible, setDiagnosticsVisible] = useState(false);
  const [diagnosticsClicks, setDiagnosticsClicks] = useState(0);
  const [apiHealth, setApiHealth] = useState<{ ok: boolean; detail: string; latencyMs: number; uptime: HealthInfo["uptime"] | null } | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const isDevelopment = versionInfo?.environment === "Development";
  const githubRepository = issueStatus?.repository || DEFAULT_ISSUES_REPOSITORY;
  const githubUnavailable = issueStatus?.configured === false;
  const selectedType = REQUEST_TYPES.find((type) => type.value === form.requestType) ?? REQUEST_TYPES[1];
  const selectedPriority = PRIORITIES.find((priority) => priority.value === form.priority) ?? PRIORITIES[3];

  useEffect(() => {
    // An unreachable status check is not shown as an error: GitHub is simply treated as an optional channel.
    api.getIssueReportStatus().then(setIssueStatus).catch(() => setIssueStatus(null));
  }, []);

  useEffect(() => {
    if (!diagnosticsVisible) return;
    const startedAt = performance.now();
    fetchHealth()
      .then((health) => setApiHealth({ ok: health.status === "ok", detail: health.status, latencyMs: Math.round(performance.now() - startedAt), uptime: health.uptime }))
      .catch((error) => setApiHealth({ ok: false, detail: error instanceof Error ? error.message : "Unreachable", latencyMs: Math.round(performance.now() - startedAt), uptime: null }));
  }, [diagnosticsVisible]);

  const handleToggle = (id: string, open: boolean) => {
    setOpenIds((current) => {
      if (current.has(id) === open) return current;
      const next = new Set(current);
      if (open) next.add(id); else next.delete(id);
      return next;
    });
  };

  const goTo = (target: string, requestType?: HelpRequestType) => {
    if (requestType) setForm((current) => ({ ...current, requestType }));
    if (SECTION_IDS.includes(target)) setOpenIds((current) => new Set(current).add(target));
    window.requestAnimationFrame(() => {
      const element = document.getElementById(target);
      if (!element) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      element.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      if (target === FORM_ID) titleInputRef.current?.focus({ preventScroll: true });
      else element.querySelector("summary")?.focus({ preventScroll: true });
    });
  };

  const copySupportInfo = async () => {
    if (!versionInfo) return;
    try {
      await navigator.clipboard.writeText(formatDeploymentInfo(versionInfo));
      setCopyMessage("Support information copied to clipboard.");
    } catch {
      setCopyMessage("Copy failed. Select the details and copy them manually.");
    }
  };

  // Hidden developer panel: click the "Support & Version Information" heading 5 times to toggle it.
  const handleHeadingClick = () => {
    const next = diagnosticsClicks + 1;
    if (next >= 5) {
      setDiagnosticsVisible((visible) => !visible);
      setDiagnosticsClicks(0);
    } else {
      setDiagnosticsClicks(next);
    }
  };

  const githubIssueUrl = () => {
    const details = form.details.trim().slice(0, 4000);
    const support = versionInfo ? `\n\n---\nVersion: ${versionInfo.version}\nBuild: ${versionInfo.buildNumber}\nEnvironment: ${versionInfo.environment}` : "";
    const params = new URLSearchParams();
    if (form.title.trim()) params.set("title", `[${selectedType.label}] ${form.title.trim()}`);
    if (details) params.set("body", `${details}${support}`);
    const query = params.toString();
    return `https://github.com/${githubRepository}/issues/new${query ? `?${query}` : ""}`;
  };

  const submitRequest = async (event: FormEvent) => {
    event.preventDefault();
    const title = form.title.trim();
    const details = form.details.trim();
    if (!title || !details || isSubmitting || githubUnavailable) return;

    setIsSubmitting(true);
    setCreatedIssue(null);
    setMessage("");
    try {
      const created = await api.createIssue({ requestType: form.requestType, priority: form.priority, title, details, browser: navigator.userAgent });
      setCreatedIssue(created);
      setForm(emptyForm);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your request could not be sent from MakerFlow.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const supportRows: [string, string][] = versionInfo
    ? [["Version", versionInfo.version], ["Build", versionInfo.buildNumber], ["Environment", versionInfo.environment], ["Commit", versionInfo.gitCommit && versionInfo.gitCommit !== "unknown" ? versionInfo.gitCommit : "Not available"]]
    : [];

  const allOpen = openIds.size === SECTION_IDS.length;

  return (
    <section className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6" aria-labelledby="help-title">
      <header className="mf-hero rounded-2xl p-5 sm:p-6">
        <h2 id="help-title" className="text-2xl font-bold text-white sm:text-3xl">MakerFlow User Guide</h2>
        <p className="mt-2 text-base text-slate-300">Everything you need to estimate, track and invoice workshop jobs.</p>
      </header>

      <div className="rounded-2xl border border-cyan-700/40 bg-cyan-500/10 p-4 sm:p-5">
        <h3 className="text-lg font-semibold text-white">Quick Start</h3>
        <ol className="mt-3 grid gap-3 text-sm text-slate-300 md:grid-cols-2 xl:grid-cols-5">
          {QUICK_START_STEPS.map((step, index) => (
            <li key={step} className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
              <span aria-hidden="true" className="mf-step flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-2xl border border-cyan-700/40 bg-slate-950 p-4 sm:p-5">
        <h3 className="text-lg font-semibold text-white">Need help?</h3>
        <p className="mt-1 text-sm text-slate-300">Tell us what went wrong or what you would like to see. We review every request.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="mf-btn" onClick={() => goTo(FORM_ID, "Bug")}>Report a Bug</button>
          <button type="button" className="mf-btn" onClick={() => goTo(FORM_ID, "Feature Request")}>Request a Feature</button>
          <a className="mf-btn mf-btn--outline" href={CHANGELOG_URL} target="_blank" rel="noopener noreferrer">View Release Notes<span className="sr-only"> (opens in a new tab)</span></a>
          <button type="button" className="mf-btn mf-btn--outline" onClick={() => void copySupportInfo()} disabled={!versionInfo}>Copy Support Information</button>
        </div>
        {copyMessage ? <p role="status" className="mt-2 text-sm text-slate-300">{copyMessage}</p> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <nav aria-labelledby="help-common-tasks" className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5">
          <h3 id="help-common-tasks" className="text-lg font-semibold text-white">Common Tasks</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {COMMON_TASKS.map((task) => (
              <li key={task.label}>
                <a
                  href={`#${task.target}`}
                  onClick={(event) => { event.preventDefault(); goTo(task.target, task.requestType); }}
                  className="mf-task flex items-center justify-between gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-cyan-300"
                >
                  {task.label}<span aria-hidden="true">→</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5">
          <h3 className="text-lg font-semibold text-white">What's New{versionInfo ? ` in v${versionInfo.version}` : ""}</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {WHATS_NEW.map((item) => (
              <li key={item.text} className="flex flex-wrap items-center gap-2">
                <span>{item.text}</span>
                {item.status ? <StatusBadge status={item.status} /> : null}
              </li>
            ))}
          </ul>
          <button type="button" className="mt-3 text-sm font-semibold text-cyan-300 underline" onClick={() => goTo("help-release-notes")}>Full release notes</button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">Guides</h3>
          <button
            type="button"
            className="mf-btn mf-btn--outline mf-btn--sm"
            onClick={() => setOpenIds(allOpen ? new Set() : new Set(SECTION_IDS))}
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        </div>

        <Accordion id="help-creating-job" title="Creating a Job" open={openIds.has("help-creating-job")} onToggle={handleToggle}>
          <div>
            <h4 className="font-semibold text-white">Start a job</h4>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>Go to <strong>Jobs &gt; Add job</strong>.</li>
              <li>Enter the basics: job name, customer, equipment, estimated print time and material use.</li>
              <li>Save. New entries start as <strong>Quote Draft</strong>, and costs are calculated when you save.</li>
            </ol>
            <p className="mt-2">Each job receives an automatic job number. If the customer is new, you can add their contact details when prompted.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white">Fill in the name from a model link</h4>
            <p className="mt-1">Paste a supported 3D model page into <strong>Model URL</strong> and choose <strong>Fill job name</strong> to try to read its title from 3Drop, Printables (Prusa), MakerWorld, Thingiverse or Cults3D. The link is saved with the job. If a site blocks title lookup or the link is a search/listing page, type the model name yourself and keep the URL.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white">More detail when you need it</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Optional pricing and production details and saved estimates are available on the form.</li>
              <li>Open <strong>Edit job</strong> for the full set of production, payment, QA, rework and failure fields.</li>
              <li>After saving edits, choose <strong>Refresh costs</strong> to update the estimate.</li>
            </ul>
          </div>
        </Accordion>

        <Accordion id="help-calculating-costs" title="Calculating Costs" open={openIds.has("help-calculating-costs")} onToggle={handleToggle}>
          <p>Saving a new job calculates its price automatically. After editing an existing job, choose <strong>Refresh costs</strong> to recalculate.</p>
          <div>
            <h4 className="font-semibold text-white">What goes into the price</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Material usage</li>
              <li>Machine runtime electricity and depreciation (machine cost / runtime hours)</li>
              <li>Labour time and your workshop costs as an hourly rate</li>
              <li>Guardrails from Billing Rules: minimum charge, rush fee % and waste factor %</li>
              <li>Optional per-job setup fee and delivery charge</li>
            </ul>
          </div>
          <p>Job cards show the internal breakdown; invoices show customer-facing totals.</p>
        </Accordion>

        <Accordion id="help-quote-workflow" title="Quote to Job Workflow" open={openIds.has("help-quote-workflow")} onToggle={handleToggle}>
          <p>Open a quote in Jobs and use the quick actions to move it along:</p>
          <p className="flex flex-wrap items-center gap-2 font-semibold text-white"><span>Quote Draft</span><span aria-hidden="true">→</span><span>Quote Sent</span><span aria-hidden="true">→</span><span>Quote Approved</span><span aria-hidden="true">→</span><span>Pending (Convert to job)</span><span aria-hidden="true">→</span><span>Completed</span></p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Use <strong>Convert to job</strong> to set an approved quote to Pending and begin production.</li>
            <li>When a job is changed to Completed, MakerFlow refreshes costs and opens invoice mode automatically.</li>
          </ul>
        </Accordion>

        <Accordion id="help-equipment-billing" title="Equipment and Billing Rules" open={openIds.has("help-equipment-billing")} onToggle={handleToggle}>
          <div>
            <h4 className="font-semibold text-white">Equipment</h4>
            <p className="mt-1">Manage equipment profiles in <strong>Equipment</strong>: add, edit or remove wattage, depreciation and replacement runtime.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white">Billing</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Markups, electricity rate your PerKw rate form your supplier</li>
              <li>Labour rate which is what you class as your hourly rate </li>
              <li> Workshop hourly costs if you have costs for your workshop such as rent.</li>
              <li>Pricing guardrails: minimum charge, rush fee % and waste factor %</li>
              <li>Invoice finance settings: VAT, suggested deposit % and payment terms (days)</li>
            </ul>
            <p className="mt-2">Setup fee and delivery charge are job-level fields in the job forms and cards. Billing and personalisation sections are collapsible for easier navigation.</p>
          </div>
        </Accordion>

        <Accordion id="help-theme" title="Site Theme Customisation" open={openIds.has("help-theme")} onToggle={handleToggle}>
          <div>
            <h4 className="font-semibold text-white">MakerFlow default colours</h4>
            <p className="mt-1">The app starts with the MakerFlow light branding and Inter as the primary UI font.</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Background: white</li>
              <li>Text: Charcoal <code>#1C1C1E</code></li>
              <li>Inputs: Soft Grey <code>#E5E5E7</code></li>
              <li>Buttons: Primary Blue <code>#3A7DFF</code>, with Dark Blue <code>#1D63E7</code> for hover states</li>
              <li>Supporting highlights: Light Blue <code>#5DA8FF</code></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white">Change the theme</h4>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>In <strong>Admin</strong>, open <strong>Site theme colours</strong> and customise the background, text, inputs and accent buttons.</li>
              <li>Or pick a preset: MakerFlow (restores the defaults), Light, Dark, High Contrast, Forest, Night Shift or Paper Invoice.</li>
              <li>Click <strong>Save site theme</strong> to keep your choices.</li>
            </ol>
          </div>
        </Accordion>

        <Accordion id="help-business-customers" title="Business and Customers" open={openIds.has("help-business-customers")} onToggle={handleToggle}>
          <ul className="list-disc space-y-1 pl-5">
            <li>Set your workshop name, logo, address, email, phone and website in <strong>Billing</strong>.</li>
            <li>MakerFlow branding stays separate: the MakerFlow logo at the top-left returns to the Dashboard, while your business name and logo stay at the top-right. Clicking your business logo opens Billing.</li>
            <li>Manage customer records in <strong>Customers</strong> and reuse those details in invoices.</li>
          </ul>
        </Accordion>

        <Accordion id="help-invoices-backup" title="Invoices and Backup" open={openIds.has("help-invoices-backup")} onToggle={handleToggle}>
          <div>
            <h4 className="font-semibold text-white">Invoices</h4>
            <p className="mt-1">Open a job card and choose <strong>Create invoice</strong> for print/PDF output.</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>The invoice panel includes Refresh costs, Print / Save PDF and Close invoice.</li>
              <li>Invoices keep your workshop's business name, logo and contact details, with a "Made with MakerFlow" footer.</li>
              <li>Totals include SubTotal, VAT, Suggested deposit, Deposit paid, Grand total and Balance due, and show payment terms when configured.</li>
              <li>Delivery (when checked on a job) is included in the Production costs subtotal.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white">Backup and restore</h4>
            <p className="mt-1">In Admin tools, use the single <strong>Backup and restore</strong> card to select Workshop, Customers, Suppliers and Billing sections for one JSON backup.</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Workshop jobs, materials and equipment are grouped to preserve their relationships.</li>
              <li>Restoring a selected backup replaces only its included sections.</li>
              <li>Older full and individual JSON backups plus jobs/materials CSV backups remain supported.</li>
              <li>A full backup restore replaces all current app data.</li>
            </ul>
          </div>
        </Accordion>

        <Accordion id="help-reporting" title="Reporting" open={openIds.has("help-reporting")} onToggle={handleToggle}>
          <ul className="list-disc space-y-1 pl-5">
            <li>Use <strong>Reports</strong> to filter production jobs by date range, status, equipment and customer.</li>
            <li>The page shows summary metrics: jobs, revenue, base cost and margin.</li>
            <li>Margin reporting views are included by machine, material and customer.</li>
            <li>Export the filtered report rows as CSV.</li>
          </ul>
        </Accordion>

        <Accordion id="help-model-imports" title="Model Imports" open={openIds.has("help-model-imports")} onToggle={handleToggle} badge={<StatusBadge status="available" />}>
          <p>In Jobs &gt; Add job, paste the model page into Model URL. Choose Fill job name (or Import for MakerWorld links) and MakerFlow reads the model details for you. The original link is saved with the job.</p>
          <div>
            <h4 className="font-semibold text-white">Model previews</h4>
            <p className="mt-1">MakerFlow attempts to display model previews directly from the source website. Images are embedded from the original site and are not permanently stored in MakerFlow, helping keep storage requirements low while keeping previews up to date. MakerFlow only remembers a small thumbnail link and checks it again about once a week.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white">Supported sources</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li><strong>MakerWorld</strong>: title, print time, filament weight, type and colour, creator and preview image from the first print profile. Adjust the settings afterwards if you print differently.</li>
              <li><strong>3Drop, Printables (Prusa), Thingiverse and Cults3D</strong>: model title and preview image when the site allows it.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white">Why some sites do not show an image</h4>
            <p className="mt-1">Title and image lookup depend on each site allowing MakerFlow to read its page. A site may block the request, the link may be a search or category page, or the page may not publish a preview image.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white">If an image cannot be loaded</h4>
            <p className="mt-1">The job card shows a "No image" placeholder with a link to the model page, and everything else keeps working. Enter the job name yourself and use the source link to view the model.</p>
          </div>
        </Accordion>

        <Accordion id="help-bambu" title="Bambu Telemetry Integration" open={openIds.has("help-bambu")} onToggle={handleToggle} badge={<StatusBadge status="alpha" />}>
          <p>A local telemetry connector for tracking your Bambu printer status is coming soon. The feature is in alpha testing and will be available when the application is deployed locally.</p>
          <p className="flex flex-wrap items-center gap-2"><span>Other printer integrations and model sources:</span><StatusBadge status="soon" /></p>
        </Accordion>

        <Accordion id="help-troubleshooting" title="Troubleshooting" open={openIds.has("help-troubleshooting")} onToggle={handleToggle}>
          {isDevelopment ? (
            <>
              <p>Development environment checks:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Use Node.js 26.13 LTS and npm for local development. The app uses Prisma 7 with SQLite.</li>
                <li>For one-command local startup, run <code>bash start-local.sh</code> from the repository root. It supplies a default SQLite database URL (<code>file:./dev.db</code>) for Prisma.</li>
                <li>If running services manually, check that the frontend (<code>127.0.0.1:5173</code>) and backend (<code>localhost:4000</code>) are both running, then verify backend health at <code>/api/health</code>.</li>
                <li>Restart both dev servers if either side is down.</li>
              </ul>
            </>
          ) : (
            <p>If MakerFlow is not responding, contact your administrator or raise a bug report.</p>
          )}
        </Accordion>

        <Accordion id="help-release-notes" title="Release Notes" open={openIds.has("help-release-notes")} onToggle={handleToggle}>
          <p>Review project updates and release notes in the changelog: <a className="text-cyan-300 underline" href="https://github.com/bloodygoodbloke/laser-and-3dprint-tracker/blob/main/docs/CHANGELOG.md" target="_blank" rel="noopener noreferrer">CHANGELOG.md</a>.</p>
        </Accordion>
      </div>

      <form id={FORM_ID} onSubmit={submitRequest} className="scroll-mt-4 rounded-2xl border border-cyan-700/40 bg-slate-950 p-4 sm:p-6" aria-labelledby="help-form-title">
        <h3 id="help-form-title" className="text-xl font-semibold text-white">Need Help? Send us a request</h3>
        <p className="mt-1 text-sm text-slate-300">Choose what you need, add a few details and we will take it from there. MakerFlow attaches your version, build and environment automatically.</p>

        <div className="mt-5 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-5">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-white">What do you need?</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {REQUEST_TYPES.map((type) => (
                  <label key={type.value} className="mf-choice flex cursor-pointer items-start justify-between gap-2 p-3 text-sm">
                    <input type="radio" name="help-request-type" className="sr-only" checked={form.requestType === type.value} onChange={() => setForm((current) => ({ ...current, requestType: type.value }))} />
                    <span>
                      <span className="block font-semibold text-white">{type.label}</span>
                      <span className="block text-slate-400">{type.hint}</span>
                    </span>
                    {form.requestType === type.value ? <span aria-hidden="true" className="font-bold text-cyan-300">✓</span> : null}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-white">How urgent is it?</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PRIORITIES.map((priority) => (
                  <label key={priority.value} className="mf-choice flex cursor-pointer items-center justify-center p-2 text-sm font-semibold text-white">
                    <input type="radio" name="help-priority" className="sr-only" checked={form.priority === priority.value} onChange={() => setForm((current) => ({ ...current, priority: priority.value }))} />
                    {priority.label}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-400">{selectedPriority.label}: {selectedPriority.hint}</p>
            </fieldset>

            <label className="block text-sm text-slate-300">
              <span className="mb-1 block font-semibold text-white">Short title</span>
              <input
                ref={titleInputRef}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"
                placeholder="Example: Invoice line-item audit history"
                maxLength={200}
                required
              />
            </label>

            <label className="block text-sm text-slate-300">
              <span className="mb-1 block font-semibold text-white">Details</span>
              <textarea
                value={form.details}
                onChange={(event) => setForm((current) => ({ ...current, details: event.target.value }))}
                className="min-h-[130px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"
                placeholder={selectedType.placeholder}
                maxLength={10000}
                required
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              {githubUnavailable ? (
                <a className="mf-btn" href={githubIssueUrl()} target="_blank" rel="noopener noreferrer">Continue on GitHub<span className="sr-only"> (opens in a new tab)</span></a>
              ) : (
                <>
                  <button type="submit" disabled={isSubmitting} className="mf-btn">{isSubmitting ? "Sending..." : "Send request"}</button>
                  <a className="mf-btn mf-btn--outline" href={githubIssueUrl()} target="_blank" rel="noopener noreferrer">Open in GitHub Issues<span className="sr-only"> (opens in a new tab)</span></a>
                </>
              )}
            </div>

            {githubUnavailable ? (
              <p className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
                Requests for this workspace are tracked on GitHub. Choose Continue on GitHub and your details will be pre-filled for you to review and submit.
              </p>
            ) : null}
            {message ? (
              <div role="alert" className="rounded-xl border border-amber-700/50 bg-slate-900/70 p-3 text-sm text-amber-300">
                <p>{message}</p>
                <p className="mt-1 text-slate-300">You can still raise it on GitHub instead: <a className="font-semibold text-cyan-300 underline" href={githubIssueUrl()} target="_blank" rel="noopener noreferrer">open GitHub Issues</a>.</p>
              </div>
            ) : null}
            {createdIssue ? (
              <div className="rounded-xl border border-emerald-700/50 bg-slate-900/70 p-3 text-sm text-emerald-300" role="status">
                <p>Thanks, your request was sent. Reference: <span className="font-semibold">#{createdIssue.number}</span></p>
                <p className="mt-1 break-all"><a className="underline" href={createdIssue.url} target="_blank" rel="noopener noreferrer">Track it on GitHub</a></p>
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
              <h4 className="font-semibold text-white">What happens next?</h4>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Your request is logged in GitHub Issues with your version, build and environment attached.</li>
                <li>It is reviewed and prioritised. Critical and High items are looked at first.</li>
                <li>You can follow progress on the issue, and completed work appears in the Release Notes.</li>
              </ol>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
              <h4 className="font-semibold text-white">Support information</h4>
              {versionInfo ? (
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  {supportRows.map(([label, value]) => (
                    <div key={label} className="contents"><dt className="text-slate-400">{label}</dt><dd className="break-all font-mono text-xs">{value}</dd></div>
                  ))}
                </dl>
              ) : (
                <p className="mt-2 text-slate-400">{versionError || "Loading version information..."}</p>
              )}
              <button type="button" className="mf-btn mf-btn--outline mf-btn--sm mt-3" onClick={() => void copySupportInfo()} disabled={!versionInfo}>Copy Support Information</button>
              {copyMessage ? <p role="status" className="mt-2 text-xs text-slate-300">{copyMessage}</p> : null}
            </div>
          </aside>
        </div>
      </form>

      <details className="rounded-2xl border border-slate-800 bg-slate-950" id="about-makerflow">
        <summary className="mf-summary flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <h3 className="select-none font-semibold text-white" onClick={handleHeadingClick}>Support &amp; Version Information</h3>
          <span aria-hidden="true" className="mf-chevron text-slate-400">▾</span>
        </summary>
        <div className="border-t border-slate-800 px-4 pb-4 pt-3 text-sm text-slate-300">
          <h4 className="text-xs uppercase tracking-[0.25em] text-slate-400">Deployment Information</h4>
          {versionInfo ? (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
              <dt className="text-slate-400">Version</dt><dd>{versionInfo.version}</dd>
              <dt className="text-slate-400">Build Number</dt><dd>{versionInfo.buildNumber}</dd>
              <dt className="text-slate-400">Git Commit</dt><dd className="break-all">{versionInfo.gitCommit}</dd>
              <dt className="text-slate-400">Branch</dt><dd>{versionInfo.gitBranch}</dd>
              <dt className="text-slate-400">Built</dt><dd>{formatBuildDate(versionInfo.buildDate)}</dd>
              <dt className="text-slate-400">Environment</dt><dd>{versionInfo.environment}</dd>
            </dl>
          ) : (
            <p className="mt-2 text-xs text-slate-400">{versionError || "Loading version information..."}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" className="mf-btn mf-btn--outline mf-btn--sm" onClick={() => void copySupportInfo()} disabled={!versionInfo}>Copy Support Information</button>
            {copyMessage ? <span role="status" className="text-xs text-slate-300">{copyMessage}</span> : null}
          </div>
          {diagnosticsVisible ? (
            <div className="mt-4 rounded-xl border border-amber-700/50 bg-slate-900 p-3">
              <h4 className="text-sm font-semibold text-amber-300">Developer diagnostics</h4>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
                <dt className="text-slate-400">API connectivity</dt>
                <dd className={apiHealth ? (apiHealth.ok ? "text-emerald-400" : "text-red-400") : ""}>{apiHealth ? `${apiHealth.ok ? "OK" : "FAILED"} (${apiHealth.detail}, ${apiHealth.latencyMs} ms)` : "Checking..."}</dd>
                <dt className="text-slate-400">Application uptime</dt><dd>{apiHealth?.uptime != null ? formatUptime(apiHealth.uptime) : "n/a"}</dd>
                <dt className="text-slate-400">Frontend bundle</dt>
                <dd className={versionInfo && versionInfo.version !== frontendVersion ? "text-amber-400" : ""}>{frontendVersion}{versionInfo && versionInfo.version !== frontendVersion ? " (differs from server, refresh the page)" : ""}</dd>
                <dt className="text-slate-400">Browser</dt><dd className="break-all">{navigator.userAgent}</dd>
                <dt className="text-slate-400">Metadata</dt>
                <dd><pre className="whitespace-pre-wrap break-all">{versionInfo ? JSON.stringify(versionInfo, null, 2) : "Not loaded"}</pre></dd>
              </dl>
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}

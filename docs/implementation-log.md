# Implementation Delivery Log

Tracks implemented features and completed bug fixes from day-to-day execution work.

Last updated: 2026-07-15

| ID | Type | Priority | Status | Title | Actioned On | Details |
|---|---|---|---|---|---|---|
| CHG-001 | Feature | P1 High | Implemented | Jobs tab add/edit/expand workflows | Historic | Added jobs tab with create flow, inline edit support, and expandable cards. |
| CHG-002 | Feature | P1 High | Implemented | Invoice create/print flow from job context | Historic | Added invoice mode under expanded job cards with print/PDF path. |
| CHG-003 | Feature | P1 High | Implemented | Multi-material jobs | Historic | Added per-job multi-material usage entries with cost integration. |
| CHG-004 | Feature | P2 Medium | Implemented | Material colour support and starter materials | Historic | Added color field and seeded default material set. |
| CHG-005 | Feature | P1 High | Implemented | Central billing settings | Historic | Added centralized billing configuration for electricity/labour/overhead. |
| CHG-006 | Feature | P1 High | Implemented | Runtime/labour time split | Historic | Split machine runtime and labour time in cost model and forms. |
| CHG-007 | Feature | P1 High | Implemented | Depreciation in costing | Historic | Added depreciation settings and runtime depreciation charging. |
| CHG-008 | Feature | P2 Medium | Implemented | Grouped materials view | Historic | Grouped materials by type with fast copy/edit actions. |
| CHG-009 | Feature | P2 Medium | Implemented | kg purchase to g usage conversion | Historic | Material forms now convert buy-in-kg to use-in-g automatically. |
| CHG-010 | Feature | P1 High | Implemented | Backup/export/import tooling | Historic | Added jobs/materials CSV plus full snapshot export/restore. |
| CHG-011 | Feature | P1 High | Implemented | Billing rules redesign | Historic | Reorganized billing UI into Electricity/Materials/Labour sections. |
| CHG-012 | Feature | P1 High | Implemented | Per-material-type markups | Historic | Added material type markup controls and pricing integration. |
| CHG-013 | Feature | P1 High | Implemented | Per-machine depreciation runtime fields | Historic | Added machine-level depreciation and replacement runtime settings. |
| CHG-014 | Feature | P2 Medium | Implemented | Dedicated Machines tab | Historic | Added machine profile management (add/edit/remove). |
| CHG-015 | Feature | P2 Medium | Implemented | Jobs use managed machine profiles | Historic | Job machine selectors now use billing machine profiles. |
| CHG-016 | Feature | P1 High | Implemented | Workshop hourly cost model | Historic | Introduced workshop hourly rate charging model. |
| CHG-017 | Feature | P2 Medium | Implemented | Percentage-only markup simplification | Historic | Removed fixed markups and defaulted percentage behavior. |
| CHG-018 | Feature | P2 Medium | Implemented | Job file upload endpoint | Historic | Added backend endpoint for job file path upload. |
| CHG-019 | Feature | P2 Medium | Implemented | Dashboard pending/low-stock summaries | Historic | Added dashboard summary cards for pending jobs and low stock. |
| CHG-020 | Documentation | P2 Medium | Implemented | In-app help refresh | Historic | Help content updated to reflect current workflows and tooling. |
| CHG-021 | Feature | P3 Low | Implemented | App rename to Fabrication Workshop Tracker | Historic | Updated app-facing labels/title and related UI naming. |
| CHG-022 | Feature | P2 Medium | Implemented | Delete-job action | Historic | Added delete action in expanded job card controls. |
| CHG-023 | Feature | P2 Medium | Implemented | Edit form under selected expanded card | Historic | Edit UI now opens directly under the chosen job card. |
| CHG-024 | Feature | P2 Medium | Implemented | Materials CSV import in admin | Historic | Added materials CSV import and paired import/export controls. |
| CHG-025 | Feature | P2 Medium | Implemented | Business personalization settings | Historic | Added business name/logo/address and used these in invoices. |
| CHG-026 | Feature | P2 Medium | Implemented | CRM Lite customer management | Historic | Added customer records and per-customer order history views. |
| CHG-027 | Feature | P1 High | Implemented | Quote to job workflow | 2026-06-29 | Added quote statuses, approval flow, convert-to-job actions, and completion auto-invoice opening. |
| CHG-028 | Feature | P1 High | Implemented | Pricing guardrails | 2026-06-29 | Added minimum charge, setup fee, rush fee percent, and waste factor controls. |
| CHG-029 | Feature | P1 High | Implemented | Invoice finance completeness | 2026-06-29 | Added VAT/deposit/payment status/terms support in UI and model. |
| CHG-030 | Bug | P1 Critical | Completed Bug Fix | Billing numeric fields clear behavior | Historic | Fixed clearable numeric editing without forced zero while typing. |
| CHG-031 | Bug | P1 High | Completed Bug Fix | Machine depreciation lookup mismatch | Historic | Fixed depreciation lookup when machine names differ by case/spacing. |
| CHG-032 | Bug | P1 High | Completed Bug Fix | Jobs edit placement | Historic | Ensured edit form renders under selected expanded job card. |
| CHG-033 | Bug | P2 Medium | Completed Bug Fix | Help guide changelog link | Historic | Added explicit changelog reference from Help guide. |
| CHG-034 | Bug | P1 High | Completed Bug Fix | Invoice print/PDF flow | Historic | Fixed print flow via dedicated print view window. |
| CHG-035 | Bug | P2 Medium | Completed Bug Fix | Explicit close invoice action | Historic | Added dedicated close invoice action in invoice mode. |
| CHG-036 | Bug | P2 Medium | Completed Bug Fix | Customer capture popup on job create | Historic | Added popup to create CRM customer when unknown name entered. |
| CHG-037 | Bug | P1 High | Completed Bug Fix | Material markup combination logic | Historic | Fixed combined global + material-type markup behavior. |
| CHG-038 | Bug | P3 Low | Completed Bug Fix | Invoice materials label simplification | Historic | Removed extra consumed-materials wording. |
| CHG-039 | Bug | P3 Low | Completed Bug Fix | Invoice production description cleanup | Historic | Removed machine-runtime/electricity/depreciation/workshop sentence line. |
| CHG-040 | Bug | P3 Low | Completed Bug Fix | Invoice labour label minutes | Historic | Added runtime minutes in labour label. |
| CHG-041 | Bug | P2 Medium | Completed Bug Fix | Close edit panel on save | 2026-06-29 | Edit panel now closes when Save job is clicked. |
| CHG-042 | Bug | P3 Low | Completed Bug Fix | Jobs lozenge placement/count | 2026-06-29 | Moved jobs lozenge beside tabs and removed materials count. |
| CHG-043 | Feature Request | P2 Medium | Implemented | Show base cost + profit on job card | 2026-07-14 | Added explicit internal profit visibility on job cards and cost breakdown alongside base and customer totals. |
| CHG-044 | Feature Request | P2 Medium | Implemented | Move billing to dedicated area | 2026-07-14 | Added a dedicated Billing tab and moved billing/personalization workflows out of Admin backup tools. |
| CHG-045 | Feature Request | P3 Low | Implemented | Expandable billing/personalization boxes | 2026-07-14 | Made Billing and Business personalization sections collapsible, including collapsible billing rule subsections. |
| CHG-046 | Feature | P1 High | Implemented | Jobs filters/search + status badge controls | 2026-07-14 | Added Jobs search plus status and machine filters, and added stronger status workflow actions from expanded job cards. |
| CHG-047 | Feature | P1 High | Implemented | File preview in job detail | 2026-07-14 | Added job file upload controls for SVG/STL and inline preview rendering in expanded job details. |
| CHG-048 | Feature | P1 High | Implemented | Harden full Docker runtime workflow | 2026-07-14 | Hardened compose runtime with health checks, backend-first startup dependency, dev command overrides, and upload volume handling. |
| CHG-049 | Feature | P2 Medium | Implemented | Machine queue and schedule | 2026-07-14 | Added queue position and due-date scheduling on jobs, plus queue panel risk indicators (On track/Watch/At risk/Overdue). |
| CHG-050 | Feature | P2 Medium | Implemented | QA checklist and rework cost tracking | 2026-07-14 | Added per-job QA checklist, QA pass/fail, rework notes and rework cost with linked costing impact in calculations. |
| CHG-051 | Feature | P2 Medium | Implemented | Supplier management and purchase history | 2026-07-14 | Added supplier records and purchase history workflows with backend APIs and frontend Suppliers tab. |
| CHG-052 | Feature | P2 Medium | Implemented | Job scheduling/calendar view | 2026-07-15 | Added a 14-day schedule calendar with due-date workload visibility and machine-level projected completion timestamps based on queue order/runtime. |
| CHG-053 | Feature | P3 Low | Implemented | Margin reporting | 2026-07-15 | Added dashboard margin reporting grouped by machine, material type, and customer using calculated customer charge versus base totals. |
| CHG-054 | Feature | P3 Low | Implemented | Delivery/utilization dashboards | 2026-07-15 | Added delivery and utilization KPIs including on-time delivery rate, overdue open jobs, queued runtime, and per-machine weekly utilization estimates. |
| CHG-083 | Feature | P3 Low | Implemented | New reporting page | 2026-07-15 | Added a dedicated Reports tab with date-range and dimension filters, summary metrics, detailed rows, and CSV export of filtered report data. |
| CHG-064 | Integration | Integrations | Implemented | MakerWorld metadata import | 2026-07-15 | Added MakerWorld URL ingestion endpoint and metadata extraction for model title/description/preview/tags plus estimated runtime and grams hints. |
| CHG-065 | Integration | Integrations | Implemented | MakerWorld job autofill | 2026-07-15 | Added MakerWorld-driven Add Job autofill to pre-populate name, machine/runtime/labour defaults, source notes, and suggested material usage. |
| CHG-066 | Integration | Integrations | Implemented | MakerWorld print profile import | 2026-07-15 | Added MakerWorld print profile import for layer/nozzle/bed/speed/infill estimation with direct costing-time/material hint updates in Add Job. |
| CHG-084 | Bug | P2 Medium | Completed Bug Fix | Negative rework cost manual correction support | 2026-07-15 | Enabled negative rework cost values in job create/edit workflows so manual price correction deltas can be applied directly to calculated totals. |
| CHG-085 | Documentation | P2 Medium | Implemented | Code-quality cadence and guardrail automation | 2026-07-15 | Added quality-audit cadence checks for every third minor release checkpoint, updated release gates, and cleaned quality findings (accessibility label warning and minor cost-calculation cleanup). |
| CHG-067 | Integration | Integrations | Implemented | Bambu local API live status | 2026-07-15 | Added telemetry ingestion for live Bambu status snapshots including nozzle/bed/chamber temperatures, progress, and AMS slot summaries. |
| CHG-068 | Integration | Integrations | Implemented | Bambu event-driven status updates | 2026-07-15 | Added Bambu event ingestion pipeline with automatic linked-job status updates on start/finish/fail/cancel telemetry events. |
| CHG-069 | Integration | Integrations | Implemented | Bambu auto runtime/material logging | 2026-07-15 | Added runtime/material usage logs from telemetry events and linked job runtime/material tracking updates. |
| CHG-070 | Integration | Integrations | Implemented | AMS spool auto-deduction | 2026-07-15 | Added AMS spool inventory model plus event/status-driven spool remaining deduction updates. |
| CHG-071 | Integration | Integrations | Implemented | Live Bambu dashboard | 2026-07-15 | Added dedicated frontend Bambu tab showing live statuses, event stream, spools, failures, maintenance, and simulation controls. |
| CHG-072 | Integration | Integrations | Implemented | Predictive maintenance engine | 2026-07-15 | Added maintenance prediction model and risk scoring based on runtime-hour accumulation and recent failure frequency. |
| CHG-073 | Integration | Integrations | Implemented | Auto-failure logging from Bambu | 2026-07-15 | Added automatic failure log creation for Bambu error states and failed telemetry events. |

## New Entry Template

| ID | Type | Priority | Status | Title | Actioned On | Details |
|---|---|---|---|---|---|---|
| CHG-XXX | Feature/Bug/Integration/Automation/Documentation/Feature Request | P1 Critical/P1 High/P2 Medium/P3 Low/Integrations | Implemented/Completed Bug Fix | Short title | YYYY-MM-DD or Historic | Clear summary of what changed. |

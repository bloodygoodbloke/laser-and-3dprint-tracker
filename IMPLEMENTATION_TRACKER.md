# Implementation Tracker  
Tracks all implemented, in-progress, and planned features for the Fabrication Workshop Tracker.

Last updated: 2026-06-27

---

# Next 3 Tasks (Active Work Queue)
These follow the MAX_ACTIVE_TASKS = 3 rule.

- [ ] BUG: in edit job close the dit window when save job is clicked
- [ ] BUG: move the jobs and materials lozenge besite the tabs lost and remove the materials count.
- [ ] Quote → Job workflow (quote status, approval, convert to job, auto-generate invoice on completion).

---

# How to Use
- Mark items complete as features are finished and verified.
- Add date notes under each item when major changes land.
- Keep this file updated with every feature pass so roadmap and delivery stay aligned.
- Prioritize bug fixes before Next 3 Tasks, feature requests, or other planned items.
- Prefix all bug entries with `BUG:`.

---

# Copilot Run Commands
Use these commands in Copilot Chat when you want tracker automation.

## Command: Rebalance + Process Next 3
Copy/paste this exactly:

"Use IMPLEMENTATION_TRACKER.md as the source of truth. Rebalance and process Next 3 now.

Rules:
1) Read open tasks from Next 3 Tasks, Bug Fixes (Priority 1), and Planned Next (Priority Features Tier 1).
2) Normalize all bug entries to start with BUG:.
3) Build Next 3 using Execution Limits:
	- If open BUG count across Next 3 + Bug Fixes is 3 or more, Next 3 must be the first 3 open BUG items.
	- If open BUG count is less than 3, include all open BUG items first, then fill remaining slots from top of Tier 1.
4) Any non-bug items removed from Next 3 must be moved back to the TOP of Tier 1 in original relative order.
5) Keep Next 3 at exactly 3 open items.
6) Update Last updated date.
7) Then process Next 3 in order (1 to 3), one at a time, following Automatic Documentation Rules after each completed item.
8) When done, update tracker sections (Implemented, Completed Bug Fixes, In Progress, Next 3, Tier 1) to reflect final state.
9) Run relevant builds/tests and report results."

## Command: Rebalance Only (No Implementation)
Copy/paste this exactly:

"Use IMPLEMENTATION_TRACKER.md as the source of truth. Rebalance Next 3 only.

Rules:
1) Read open tasks from Next 3 Tasks, Bug Fixes (Priority 1), and Planned Next (Priority Features Tier 1).
2) Normalize all bug entries to start with BUG:.
3) Build Next 3 using Execution Limits:
	- If open BUG count across Next 3 + Bug Fixes is 3 or more, Next 3 must be the first 3 open BUG items.
	- If open BUG count is less than 3, include all open BUG items first, then fill remaining slots from top of Tier 1.
4) Any non-bug items removed from Next 3 must be moved back to the TOP of Tier 1 in original relative order.
5) Keep Next 3 at exactly 3 open items.
6) Update Last updated date.
7) the order of updates should be Bugs, feature requests, tier 1 then the rest; only update IMPLEMENTATION_TRACKER.md and summarize the new Next 3."

---

# Execution Limits (Hard Rules)
- `MAX_ACTIVE_TASKS = 3`
- `MAX_ACTIVE_BUGS_BATCH = 3`
- Never have more than 3 tasks in progress at one time.
- If Bug Fixes contains more than 3 open bugs, only the first 3 bugs are worked as the active batch.
- Process all open BUG items first.
- If total open BUG items across Bug Fixes and Next 3 Tasks is 3 or more, Next 3 Tasks must be bug-only.
- If total open BUG items is less than 3, fill remaining Next 3 slots with highest-priority non-bug planned work.
- Next 3 Tasks must always contain exactly 3 items.

---

# Automatic Documentation Rules (Always On)
For every implemented item:
- Update CHANGELOG.md (Unreleased) with user-visible and technical changes.
- Update README.md when functionality, workflow, naming, or setup behavior changes.
- Update in-app Help content when UI flows, forms, billing logic, or operational steps change.
- Update this tracker: move completed items to Implemented, adjust priorities, refresh Last updated date.

---

# Implemented
- [x] Jobs tab with add flow, edit flow, and expandable job cards.
- [x] Invoice creation and print/PDF flow from job context.
- [x] Multi-material jobs with usage-based costing.
- [x] Material colour support and seeded starter materials.
- [x] Central billing settings with electricity, labour, overhead controls.
- [x] Machine runtime and labour time split in job costing.
- [x] Depreciation support in billing and runtime costing model.
- [x] Materials tab grouped by material type with quick edit/copy.
- [x] Materials form supports buying in kg and using in grams (automatic conversion).
- [x] Backup/export/import tools for jobs, materials, and full data snapshots.
- [x] Billing rules redesign into clear sections (Electricity, Materials, Labour).
- [x] Per-material-type markup controls in billing rules.
- [x] Per-machine depreciation and replacement runtime fields in billing rules.
- [x] Dedicated Machines tab with add/edit/remove machine profile workflows.
- [x] Job machine selectors now use managed machine profiles from billing settings.
- [x] Workshop-cost model introduced with workshop hourly rate.
- [x] Markups simplified to percentage-only pricing with 25% default.
- [x] Backend file upload endpoint for job file paths.
- [x] Dashboard summaries for pending jobs and low-stock materials.
- [x] In-app Help guide updated with current job, billing, invoice, backup, and health-check guidance.
- [x] Renamed app-facing UI labels/title to `Fabrication Workshop Tracker`.
- [x] Added delete-job action in Jobs tab expanded card actions.
- [x] Jobs tab edit form now opens directly under the selected expanded job card.
- [x] Admin tools now include materials CSV import and paired export/import controls.
- [x] Business personalization settings (business name, logo URL, address) added to Billing Rules and used in invoice output.
- [x] CRM Lite customer management added with customer records and order history view.

---

# Completed Bug Fixes
- [x] BUG: Fixed entry-field formatting so numeric billing inputs can be cleared without forcing `0`.
- [x] BUG: Fixed machine depreciation lookup in cost calculation.
- [x] BUG: Fixed Jobs edit placement so editing opens under the selected expanded job card.
- [x] BUG: Added changelog link information in Help guide.
- [x] BUG: Fixed invoice Print / Save PDF action using a dedicated print view window.
- [x] BUG: Added explicit Close invoice action in invoice mode.
- [x] BUG: Added customer capture popup during job creation to create CRM Lite customer records.
- [x] BUG: Updated material charge calculation so global material markup and material-type markup combine without implicit default type markup.
- [x] BUG: Invoice now uses a single Materials label without extra consumed-materials description text.
- [x] BUG: Invoice removed the machine-runtime/electricity/depreciation/workshop description text line.
- [x] BUG: Invoice Labour line now includes runtime minutes directly in the Labour label.

---

# In Progress
- [ ] No active in-progress items.

---

# Bug Fixes (Priority 1)
- [ ] BUG: in edit job close the dit window when save job is clicked
- [ ] BUG: move the jobs and materials lozenge besite the tabs lost and remove the materials count. 




---

# Feature Requests
- [ ] add in the base cost without any markup into the job card and a total profit. this cant be seen by the customer but allow us to track the cost of the jobs.
- [ ] move billing to its own area with the billing rules included in there. 
- [ ] make billing rules and business personalisation expandable boxes. 

---

# Planned Next (Priority Features)
These are the next major features after the Next 3 Tasks.

## Tier 1 (High Priority – Core Business Value)
- [ ] Quote → Job workflow (quote status, approval, convert to job, auto-generate invoice on completion).
- [ ] Pricing guardrails (minimum charge, setup fee, rush fee, waste factor).
- [ ] Invoice finance completeness (VAT, deposits, payment status, terms).
- [ ] Jobs list filters/search and stronger status-badge workflow controls.
- [ ] File preview support in job detail (SVG/STL viewer).
- [ ] Confirm and harden full Dockerized runtime workflow.

## Tier 2 (Medium Priority – Operational Efficiency)
- [ ] Machine queue and schedule with due-date risk indicators.
- [ ] QA checklist and rework tracking with cost impact.
- [ ] Supplier management and purchase history for materials.
- [ ] Job scheduling/calendar view with estimated completion times.

## Tier 3 (Lower Priority – Insights & Analytics)
- [ ] Margin reporting by machine, material type, and customer.
- [ ] On-time delivery and utilization dashboards.
- [ ] Audit log for billing and invoice edits.
- [ ] Machine use tracking (print hours, laser hours, maintenance intervals, consumables).
- [ ] Reports page (monthly totals, profit vs cost, material usage).
- [ ] Proper time tracking (setup, post-processing, actual manufacture time).
- [ ] Failure tracking (reason, wasted material, cost of failure).

---

# Planned Next (Integrations)

## Energy & Cost Integrations
- [ ] Update electricity costs from API (Octopus Go) with GUI-configurable tariff.
- [ ] Energy-aware scheduling using Octopus Go off-peak windows.

## Payment & Finance Integrations
- [ ] SumUp API integration: create payment links, attach to invoices.
- [ ] SumUp API integration: pull sales, outstanding payments, reconcile transactions.

## MakerWorld Integrations
- [ ] MakerWorld metadata integration (model preview, tags, estimated print time, estimated grams).
- [ ] MakerWorld auto-fill job creation from model URL.
- [ ] MakerWorld print profile import for cost estimation.

## Machine Integrations (Bambu, LightBurn, Creality)
- [ ] Bambu Lab local API integration for live machine status (temps, progress, chamber, AMS).
- [ ] Auto-update job status based on Bambu printer events (start, finish, fail).
- [ ] Auto-log actual print time and material usage from Bambu AMS.
- [ ] Auto-deduct filament usage from AMS spool readings.
- [ ] Machine dashboard showing live Bambu data and queued jobs.
- [ ] Predictive maintenance engine using Bambu machine hours and error logs.
- [ ] Auto-failure logging when Bambu reports an error state.
- [ ] LightBurn file parser (LBRN/LBRN2) for layers, power, speed, passes, runtime.
- [ ] LightBurn G-code parser for runtime estimation and material mapping.
- [ ] Auto-generate laser job cost from LightBurn file analysis.
- [ ] Creality Falcon job estimator (power, speed, passes, material type).
- [ ] Creality Cloud metadata integration for model info and print estimates.

## Cross-System Automation
- [ ] Auto-generate job costing using combined data from MakerWorld + LightBurn + Bambu.
- [ ] Auto-update job progress and completion timestamps from machine telemetry.
- [ ] Auto-tag jobs with material type, machine type, and complexity based on imported file metadata.
- [ ] Multi-machine load balancer to assign jobs to the best available printer or laser.


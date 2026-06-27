# Implementation Tracker

This file tracks what is already implemented and what is planned next.

Last updated: 2026-06-27

## Next 3 Tasks
- [ ] Fix entry-field formatting where numeric inputs cannot be cleared because `0` persists.
- [ ] Rename the app/project to a more fitting name and update visible labels accordingly.
- [ ] Within jobs be able to delete a job from the list.


## How to Use
- Mark items complete as features are finished and verified.
- Add date notes under each item when a major change lands.
- Keep this file updated with every feature pass so roadmap and delivery stay aligned.

## Automatic Documentation Rules (Always On)
For every item implemented from this tracker, complete the following in the same pass:
- Update CHANGELOG.md (Unreleased) with user-visible and technical changes.
- Update README.md when functionality, workflow, naming, or setup behavior changes.
- Update in-app Help content when UI flows, forms, billing logic, or operational steps change.
- Update this tracker: move completed items to Implemented, adjust priorities, and refresh Last updated date.

These rules are the default definition of done for all tracker-driven work and should be applied automatically every time.

## Implemented
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
- [x] Workshop-cost model introduced with workshop hourly rate (replacing overhead billing flow).
- [x] Markups simplified to percentage-only pricing with 25% default behavior.
- [x] Backend file upload endpoint for job file paths (`POST /api/jobs/:id/upload`).
- [x] Dashboard summaries for pending jobs and low-stock materials.
- [x] In-app Help guide updated with current job, billing, invoice, backup, and health-check guidance.

## In Progress
- [ ] No active in-progress items.

## Feature Requests
- [ ] Add business personalization settings (business name, logo, address) and populate them in invoices.

## Planned Next (Priority)
- [ ] customer database with name address, email and contact number which feeds into invoice.
- [ ] import of materials csv in admin
- [ ] Quote to job workflow (quote status, approval, convert to job).
- [ ] Pricing guardrails (minimum charge, setup fee, rush fee, waste factor).
- [ ] Invoice finance completeness (tax/VAT, deposits, payment status, terms).
- [ ] File preview support in job detail (SVG/STL viewer and related file types).
- [ ] Jobs list filters/search and stronger status-badge workflow controls.
- [ ] Reports page (monthly totals, profit vs cost, material usage).
- [ ] Confirm and harden full Dockerized runtime workflow for backend/frontend/database in day-to-day use.

## Planned Next (Operations)
- [ ] Machine queue and schedule with due-date risk indicators.
- [ ] QA checklist and rework tracking with cost impact.
- [ ] Supplier management and purchase history for materials.

## Planned Next (Insights)
- [ ] Margin reporting by machine, material type, and customer.
- [ ] On-time delivery and utilization dashboards.
- [ ] Audit log for billing and invoice edits.

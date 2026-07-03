# Implementation Tracker (Table Format)
Tracks implemented, in-progress, and planned work for the Fabrication Workshop Tracker in a single table.

Last updated: 2026-06-29

## Status Values
- Planned
- In Progress
- Implemented
- Completed Bug Fix

## Priority Values
- P1 Critical
- P1 High
- P2 Medium
- P3 Low
- Integrations

## Change Log Table
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
| CHG-043 | Feature Request | P2 Medium | Planned | Show base cost + profit on job card | - | Add internal-only base-cost and profit visibility without exposing to customer invoice. |
| CHG-044 | Feature Request | P2 Medium | Planned | Move billing to dedicated area | - | Separate billing area containing billing rules in clearer navigation. |
| CHG-045 | Feature Request | P3 Low | Planned | Expandable billing/personalization boxes | - | Make billing rules and business personalization collapsible sections. |
| CHG-046 | Feature | P1 High | Planned | Jobs filters/search + status badge controls | - | Add list filtering, search, and stronger status badge workflow actions. |
| CHG-047 | Feature | P1 High | Planned | File preview in job detail | - | Add SVG/STL preview support directly in job detail panels. |
| CHG-048 | Feature | P1 High | Planned | Harden full Docker runtime workflow | - | Validate and harden complete Dockerized dev/runtime setup. |
| CHG-049 | Feature | P2 Medium | Planned | Machine queue and schedule | - | Queue planning with due-date risk indicators. |
| CHG-050 | Feature | P2 Medium | Planned | QA checklist and rework cost tracking | - | Add QA/rework tracking with cost impact linkage. |
| CHG-051 | Feature | P2 Medium | Planned | Supplier management and purchase history | - | Add supplier records and material purchase history workflow. |
| CHG-052 | Feature | P2 Medium | Planned | Job scheduling/calendar view | - | Add calendar scheduling with estimated completion projections. |
| CHG-053 | Feature | P3 Low | Planned | Margin reporting | - | Margin reports by machine, material type, and customer. |
| CHG-054 | Feature | P3 Low | Planned | Delivery/utilization dashboards | - | Add on-time delivery and utilization dashboard metrics. |
| CHG-055 | Feature | P3 Low | Planned | Billing/invoice audit log | - | Track and report edits to billing and invoice values. |
| CHG-056 | Feature | P3 Low | Planned | Machine-use telemetry tracker | - | Track machine hours, maintenance intervals, and consumables. |
| CHG-057 | Feature | P3 Low | Planned | Reports page | - | Monthly totals, profit-vs-cost, and material usage reporting. |
| CHG-058 | Feature | P3 Low | Planned | Proper time tracking | - | Track setup, post-processing, and actual manufacture time. |
| CHG-059 | Feature | P3 Low | Planned | Failure tracking | - | Capture failure reason, waste, and failure cost. |
| CHG-060 | Integration | Integrations | Planned | Octopus Go tariff API updates | - | Pull electricity prices from API with GUI-configurable tariff. |
| CHG-061 | Integration | Integrations | Planned | Energy-aware scheduling | - | Schedule jobs into off-peak windows from tariff data. |
| CHG-062 | Integration | Integrations | Planned | SumUp payment links | - | Create payment links from invoice records. |
| CHG-063 | Integration | Integrations | Planned | SumUp reconciliation | - | Pull sales/outstanding and reconcile invoice transactions. |
| CHG-064 | Integration | Integrations | Planned | MakerWorld metadata import | - | Import model preview/tags/estimated time/grams. |
| CHG-065 | Integration | Integrations | Planned | MakerWorld job autofill | - | Auto-populate job creation from MakerWorld URL. |
| CHG-066 | Integration | Integrations | Planned | MakerWorld print profile import | - | Import print profiles for costing estimation. |
| CHG-067 | Integration | Integrations | Planned | Bambu local API live status | - | Show live temps/progress/chamber/AMS status. |
| CHG-068 | Integration | Integrations | Planned | Bambu event-driven status updates | - | Auto-update job status on start/finish/fail events. |
| CHG-069 | Integration | Integrations | Planned | Bambu auto runtime/material logging | - | Auto-log actual runtime and material usage from AMS data. |
| CHG-070 | Integration | Integrations | Planned | AMS spool auto-deduction | - | Deduct filament usage based on spool readings. |
| CHG-071 | Integration | Integrations | Planned | Live Bambu dashboard | - | Build machine dashboard for live Bambu + queued jobs. |
| CHG-072 | Integration | Integrations | Planned | Predictive maintenance engine | - | Predict maintenance based on machine hours/error logs. |
| CHG-073 | Integration | Integrations | Planned | Auto-failure logging from Bambu | - | Auto-create failure entries on machine error state. |
| CHG-074 | Integration | Integrations | Planned | LightBurn file parser | - | Parse LBRN/LBRN2 for layers/power/speed/passes/runtime. |
| CHG-075 | Integration | Integrations | Planned | LightBurn G-code parser | - | Parse laser G-code for runtime/material mapping. |
| CHG-076 | Integration | Integrations | Planned | Laser cost auto-generation | - | Generate laser job cost from LightBurn analysis. |
| CHG-077 | Integration | Integrations | Planned | Creality Falcon estimator | - | Estimate job by power/speed/passes/material type. |
| CHG-078 | Integration | Integrations | Planned | Creality Cloud metadata integration | - | Import model info and print estimates from Creality Cloud. |
| CHG-079 | Automation | Integrations | Planned | Cross-source cost auto-generation | - | Combine MakerWorld + LightBurn + Bambu data for costing. |
| CHG-080 | Automation | Integrations | Planned | Telemetry progress automation | - | Auto-update progress/completion timestamps from telemetry. |
| CHG-081 | Automation | Integrations | Planned | Metadata auto-tagging | - | Auto-tag machine/material/complexity from imported metadata. |
| CHG-082 | Automation | Integrations | Planned | Multi-machine load balancer | - | Auto-assign jobs to best available machine. |

## New Entry Template
Copy this row and add it to the Change Log Table.

| ID | Type | Priority | Status | Title | Actioned On | Details |
|---|---|---|---|---|---|---|
| CHG-XXX | Feature/Bug/Integration/Automation/Documentation/Feature Request | P1 Critical/P1 High/P2 Medium/P3 Low/Integrations | Planned/In Progress/Implemented/Completed Bug Fix | Short title | YYYY-MM-DD or - | Clear summary of what changed or what will be done. |

## Next 3 (Current Active Queue)
- CHG-046
- CHG-047
- CHG-048

## Notes
- Update Actioned On when status changes to Implemented or Completed Bug Fix.
- Keep IDs stable; do not reuse IDs after completion or cancellation.

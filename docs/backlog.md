# Backlog

Tracks planned and in-progress implementation work.

Last updated: 2026-07-24

## Next 3
- CHG-087
- CHG-055
- CHG-058

## How To Use This Backlog
1. Add new requests to the backlog table with status `Planned` and the next `CHG-XXX` ID.
2. Promote top-priority items into `Next 3` and set them to `In Progress`.
3. Keep `Human Review` items as `On Hold` until a person confirms scope and risk.
4. When work is completed, remove the row from this file and log it in `docs/implementation-log.md` and `docs/CHANGELOG.md`.

### Copilot Prompt Commands
- `process CHG-0XX`
- `process CHG-0XX and move to implementation log when complete`
- `rebalance and process next 3`
- `review backlog for missing review status and add review reasons`
- `sort backlog by bug fixes first, then priority, then id`
- `set Reviewed items to Planned or In Progress by queue placement`
- `move Human Review items to On Hold with a concrete reason`
- `update changelog and help page notes for this backlog change`
- `run tracker consistency check and fix any schema mismatches`

## Backlog Table
| ID | Type | Priority | Status | Title | Details | Review Status | Review Reason | Target Date |
|---|---|---|---|---|---|---|---|---|
| CHG-087 | Feature Request | P1 High | In Progress | job estimates | Id like to have a feature where i can put in the information or bring in from makerworld to do a job estimate without actually having to fill in customer details, id like to save the job per the model and have a sort of catalogue that i can reference for quick pricing. [Source: Help page intake] | Reviewed | Implementable with existing MakerWorld metadata/autofill pipeline and internal job data model extensions. | - |
| CHG-055 | Feature | P3 Low | In Progress | Billing/invoice audit log | Track and report edits to billing and invoice values. | Reviewed | Implementable using append-only audit records on existing billing and invoice update workflows. | - |
| CHG-058 | Feature | P3 Low | In Progress | Proper time tracking | Track setup, post-processing, and actual manufacture time. | Reviewed | Implementable by extending existing runtime/labour model with setup/post-processing segments. | - |
| CHG-059 | Feature | P3 Low | Planned | Failure tracking | Capture failure reason, waste, and failure cost. | Reviewed | Implementable with current job and telemetry structures plus failure taxonomy fields. | - |
| CHG-060 | Integration | Integrations | On Hold | Octopus Go tariff API updates | Pull electricity prices from API with GUI-configurable tariff. | Human Review | External API behavior, tariff mapping, and fallback rules require owner validation. | - |
| CHG-061 | Integration | Integrations | On Hold | Energy-aware scheduling | Schedule jobs into off-peak windows from tariff data. | Human Review | Scheduling constraints and exceptions can impact delivery commitments. | - |
| CHG-062 | Integration | Integrations | On Hold | SumUp payment links | Create payment links from invoice records. | Human Review | Payment-link generation touches customer billing and requires compliance checks. | - |
| CHG-063 | Integration | Integrations | On Hold | SumUp reconciliation | Pull sales/outstanding and reconcile invoice transactions. | Human Review | Reconciliation logic impacts finance reporting and must be accuracy-reviewed. | - |
| CHG-074 | Integration | Integrations | On Hold | LightBurn file parser | Parse LBRN/LBRN2 for layers/power/speed/passes/runtime. | Human Review | Parser correctness directly affects runtime/material estimates and costing. | - |
| CHG-075 | Integration | Integrations | On Hold | LightBurn G-code parser | Parse laser G-code for runtime/material mapping. | Human Review | G-code interpretation rules require machine-domain validation before automation. | - |
| CHG-076 | Integration | Integrations | On Hold | Laser cost auto-generation | Generate laser job cost from LightBurn analysis. | Human Review | Auto-costing formulas need business approval to avoid pricing errors. | - |
| CHG-077 | Integration | Integrations | On Hold | Creality Falcon estimator | Estimate job by power/speed/passes/material type. | Human Review | Estimator calibration requires empirical tuning and human verification. | - |
| CHG-078 | Integration | Integrations | On Hold | Creality Cloud metadata integration | Import model info and print estimates from Creality Cloud. | Human Review | Third-party metadata reliability and mapping rules require manual oversight. | - |
| CHG-079 | Automation | Integrations | On Hold | Cross-source cost auto-generation | Combine MakerWorld + LightBurn + Bambu data for costing. | Human Review | Multi-source merge logic can introduce hidden pricing assumptions. | - |
| CHG-080 | Automation | Integrations | On Hold | Telemetry progress automation | Auto-update progress/completion timestamps from telemetry. | Human Review | Automated status transitions can affect invoicing and workflow controls. | - |
| CHG-081 | Automation | Integrations | On Hold | Metadata auto-tagging | Auto-tag machine/material/complexity from imported metadata. | Human Review | Auto-tagging quality thresholds and override rules need policy decisions. | - |
| CHG-082 | Automation | Integrations | On Hold | Multi-machine load balancer | Auto-assign jobs to best available machine. | Human Review | Assignment strategy can conflict with operator constraints and due-date priorities. | - |

## New Entry Template

| ID | Type | Priority | Status | Title | Details | Review Status | Review Reason | Target Date |
|---|---|---|---|---|---|---|---|---|
| CHG-XXX | Feature/Bug/Integration/Automation/Documentation/Feature Request | P1 Critical/P1 High/P2 Medium/P3 Low/Integrations | Planned/In Progress/On Hold | Short title | Clear summary of what will be done. | Human Review/Reviewed/- | Short triage reasoning or - | YYYY-MM-DD or - |

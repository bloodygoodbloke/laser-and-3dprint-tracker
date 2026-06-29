# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- Fixed invoice print/PDF action by rendering a dedicated print view window before invoking browser print.
- Added an explicit Close invoice action in the invoice panel so users can exit invoice mode without changing tabs.
- Added customer-capture popup during job creation when a new customer name is entered, allowing immediate CRM Lite record creation.
- Updated material-type markup defaults so customer material charge is calculated as global material markup plus only configured material-type markup (no implicit extra default type markup).
- Updated in-app Help content for the job customer popup and invoice action flow.
- Updated invoice opening behavior so Create invoice now opens directly under the selected expanded job card (matching Edit job placement).
- Simplified invoice line copy by removing extra Materials and Production-cost description text and moving labour minutes into the Labour line label.

## [0.4.0] - 2026-06-27
- Added `IMPLEMENTATION_TRACKER.md` to track implemented, in-progress, and planned work.
- Added `Last updated` and `Next 3 Tasks` sections to keep immediate priorities visible.
- Updated `README.md` with a direct link to the implementation tracker.
- Redesigned Billing Rules UI into clear Electricity, Materials, Labour (plus Overhead) sections.
- Added per-material-type markup controls in Billing Rules and wired them into persisted settings.
- Added per-machine depreciation cost and replacement runtime inputs in Billing Rules and wired them into runtime costing.
- Renamed overhead billing to workshop costs and switched workshop charging to a base hourly rate model.
- Added `workshopHourlyRate` to billing settings with migration `20260627013000_add_workshop_hourly_rate`.
- Simplified markups to percentage-only calculations (removed fixed amount markups in UI and cost engine).
- Set default markup behavior to 25% for material, electricity, and material-type pricing rules.
- Removed default depreciation fallback inputs from runtime profiles while keeping per-machine depreciation and replacement runtime fields.
- Added a dedicated Machines tab with add/edit/remove workflows for machine profiles and billing runtime settings.
- Wired job machine selectors to use managed machine profiles, seeded from existing default machine definitions and saved billing settings.
- Updated README feature list to reflect Machines tab, workshop-cost billing language, and Admin backup tooling.
- Added local run/health/restart guidance to README for faster recovery when frontend or backend services are not responding.
- Added direct clickable local run links in README for app UI and API health endpoints.
- Updated app naming in the UI/browser title to `Fabrication Workshop Tracker`.
- Added delete-job action from expanded job cards in the Jobs tab.
- Fixed billing numeric input behavior so fields can be cleared while editing instead of forcing `0` immediately.
- Improved machine-profile lookup in cost calculation so depreciation settings still apply when saved machine names differ by casing/spacing.
- Updated Jobs tab edit flow so the edit form renders directly under the expanded job card instead of in the side panel.
- Added materials CSV import in Admin tools and grouped import/export controls by data type (jobs, materials, full backup).
- Added business personalization settings (business name, logo URL, address) in Billing Rules and surfaced them in invoice output.
- Added CRM Lite customer management with customer records (name, address, email, phone, notes) and per-customer order history.
- Added backend customers API and backup/restore support for customer records in full snapshot workflows.
- Fixed Help guide bug by adding a direct changelog reference link.
- Updated invoice totals layout to use `SubTotal`, `Delivery`, and `VAT`, with Grand total calculated from all three.
- Added configurable invoice add-ons in Billing Rules for delivery amount and VAT percent.
- Updated job card breakdown to show separated internal cost lines for materials, electricity, depreciation, workshop, labour, and customer total.
- Moved Business personalization out of Billing Rules into a dedicated Admin section.
- Removed duplicate Add Material form from Admin and kept material create/edit flows in the Materials tab.
- Updated app header to prefix title with business name, render business logo in the top-right, and moved jobs/materials status lozenge to Dashboard.
- Added business contact fields (email, phone, website) to business settings and surfaced address/email/phone/website in both app footer and invoice footer.
- Expanded business personalization to include name, logo, address, email, phone, and website, and applied those details across header branding, invoice identity/footer, and app footer contact display.
- Updated README and in-app Help content to reflect rename, job deletion workflow, and numeric input behavior.
- Cleaned changelog release ordering by normalizing the initial release heading to `0.1.0` and placing `0.1.1` before it.
- Updated in-app Help guide content to reflect current job creation, machine profile management, workshop-cost billing, invoice flow, backup options, and service health troubleshooting.

## [0.3.0] - 2026-06-26
- Added separate job timing fields for machine runtime and labour time so jobs can reflect different effort profiles.
- Added depreciation billing inputs (`depreciationCost`, `depreciationHours`) and integrated depreciation into machine runtime cost calculations.
- Updated cost calculation logic so machine runtime cost includes electricity plus depreciation while labour remains a separate timed charge.
- Added dedicated add-job flow inside Jobs tab, with in-tab create form and clearer edit workflow.
- Made each job card expandable to quickly view details and jump into editing/cost actions.
- Moved invoice access into the job detail flow and refined invoice layout for customer-facing output.
- Simplified job material usage input to material + quantity in grams; unit/cost are now derived from selected material data.
- Added grouped materials view by material type with quick copy and quick edit actions.
- Added machine label correction from `30918 CNC/Laser` to `3018 CNC/Laser` and reordered machine defaults to prioritize BambuLab and Creality entries.
- Added schema migration for runtime/depreciation fields and updated backup restore handling for new job timing fields.

Files changed in this release:
- `backend/prisma/schema.prisma` — added depreciation settings and split job runtime/labour fields.
- `backend/prisma/migrations/20260626233500_runtime_and_depreciation/migration.sql` — migration for new runtime/depreciation columns.
- `backend/src/routes/jobs.ts` — separated runtime/labour cost inputs and applied depreciation in runtime cost.
- `backend/src/routes/admin.ts` — backup import/restore support for new job timing fields.
- `frontend/src/App.tsx` — jobs/materials UX updates, invoice placement/layout changes, and new runtime/labour/depreciation UI.
- `frontend/src/api.ts` and `frontend/src/types.ts` — updated typing and CSV handling for new runtime/labour model.
- `README.md` and `CHANGELOG.md` — documentation updates.

## [0.2.0] - 2026-06-26
- Added central billing settings for percentage and fixed-value markup adjustments.
- Added job-based invoice preview and print/PDF-ready output for customer charges.
- Extended the frontend with a Billing view for pricing rules and invoice preview.
- Documented the release-check workflow so future version bumps require a matching changelog entry.

Files changed in this release:
- `backend/prisma/schema.prisma` — added billing settings and customer charge support.
- `backend/src/routes/billing.ts` — new billing settings API route.
- `backend/src/routes/jobs.ts` — job cost calculation now includes customer charge output.
- `frontend/src/App.tsx` — added billing and invoice UI.
- `frontend/src/api.ts` and `frontend/src/types.ts` — frontend support for billing settings.
- `README.md` and `CHANGELOG.md` — documentation and release-process updates.

## [0.1.1] - 2026-06-26 21:43:52Z
- Backend: added `JobCost` Prisma model and persisted cost calculations.
- Backend: added `POST /api/jobs/:id/calculate-cost` to compute and store job costs (3D & laser examples).
- Backend: added `POST /api/jobs/:id/upload` to update a job's `filePath`.
- Added `.env.example` with cost calculation defaults.

Files changed in this release:
- `backend/prisma/schema.prisma` — added `JobCost` model.
- `backend/src/routes/jobs.ts` — added upload and calculate-cost endpoints.
- `.env.example` — example environment variables for rates.

## [0.1.0] - 2026-06-26 21:34:24Z
- Added initial changelog and versioning starting at 0.1.
- Updated `README.md` with industry context, benefits, and tech stack information.

Files changed in this release:
- `README.md` — expanded project description and industry information.
- `CHANGELOG.md` — this file.

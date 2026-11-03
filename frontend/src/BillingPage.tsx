import type { Dispatch, FormEvent, SetStateAction } from "react";
import api from "./api";
import { NumberInput } from "./NumberInput";
import type { BillingAuditLog, BillingSettings } from "./types";

interface BillingPageProps {
  workspaceId: string;
  billingSettings: BillingSettings;
  setBillingSettings: Dispatch<SetStateAction<BillingSettings>>;
  billingMaterialTypes: string[];
  savingBilling: boolean;
  billingSaveMessage: string;
  saveBilling: (event: FormEvent) => Promise<void>;
  updateBilling: (field: keyof BillingSettings, value: number) => void;
  updateMaterialTypeMarkup: (materialType: string, value: number) => void;
  billingAuditLogs: BillingAuditLog[];
  setBillingAuditLogs: Dispatch<SetStateAction<BillingAuditLog[]>>;
}

export default function BillingPage({
  workspaceId,
  billingSettings,
  setBillingSettings,
  billingMaterialTypes,
  savingBilling,
  billingSaveMessage,
  saveBilling,
  updateBilling,
  updateMaterialTypeMarkup,
  billingAuditLogs,
  setBillingAuditLogs,
}: BillingPageProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Billing and personalization</h2>
            <p className="mt-2 text-sm text-slate-400">Configure business identity and billing rules in one dedicated area.</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">Workspace ID: <span className="select-all font-mono text-slate-200">{workspaceId}</span> (quote this ID when contacting support)</p>
        {billingSaveMessage ? <p className="mt-3 text-sm text-cyan-300">{billingSaveMessage}</p> : null}

        <details open className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <summary className="cursor-pointer list-none text-lg font-semibold text-white">Business personalization</summary>
          <p className="mt-2 text-sm text-slate-400">Your business name and logo appear on customer invoices. MakerFlow stays separate as the software brand.</p>
          <div className="mt-4 flex items-center justify-end">
            <button type="button" onClick={() => saveBilling({ preventDefault: () => undefined } as FormEvent)} className="rounded-full border border-cyan-700 px-4 py-2 text-sm text-cyan-300">
              {savingBilling ? "Saving..." : "Save business details"}
            </button>
          </div>
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-4 text-sm text-slate-300">
              <span className="w-56 shrink-0">Business name</span>
              <input value={billingSettings.businessName || ""} onChange={(e) => setBillingSettings((current) => ({ ...current, businessName: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" placeholder="Your business name" />
            </label>
            <label className="flex items-center gap-4 text-sm text-slate-300">
              <span className="w-56 shrink-0">Business logo URL</span>
              <input value={billingSettings.businessLogoUrl || ""} onChange={(e) => setBillingSettings((current) => ({ ...current, businessLogoUrl: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" placeholder="https://..." />
            </label>
            <label className="flex items-center gap-4 text-sm text-slate-300">
              <span className="w-56 shrink-0">Business address</span>
              <input value={billingSettings.businessAddress || ""} onChange={(e) => setBillingSettings((current) => ({ ...current, businessAddress: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" placeholder="Address shown on invoice" />
            </label>
            <label className="flex items-center gap-4 text-sm text-slate-300">
              <span className="w-56 shrink-0">Business email</span>
              <input value={billingSettings.businessEmail || ""} onChange={(e) => setBillingSettings((current) => ({ ...current, businessEmail: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" placeholder="hello@business.com" />
            </label>
            <label className="flex items-center gap-4 text-sm text-slate-300">
              <span className="w-56 shrink-0">Business phone</span>
              <input value={billingSettings.businessPhone || ""} onChange={(e) => setBillingSettings((current) => ({ ...current, businessPhone: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" placeholder="+44 ..." />
            </label>
            <label className="flex items-center gap-4 text-sm text-slate-300">
              <span className="w-56 shrink-0">Business website</span>
              <input value={billingSettings.businessWebsite || ""} onChange={(e) => setBillingSettings((current) => ({ ...current, businessWebsite: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" placeholder="https://..." />
            </label>
          </div>
        </details>

        <details open className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <summary className="cursor-pointer list-none text-lg font-semibold text-white">Billing rules</summary>
          <div className="mt-4 flex items-center justify-end">
            <button type="button" onClick={() => saveBilling({ preventDefault: () => undefined } as FormEvent)} className="rounded-full border border-cyan-700 px-4 py-2 text-sm text-cyan-300">
              {savingBilling ? "Saving..." : "Save rules"}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="mt-4 text-xl font-semibold">Billing rules</h2>
              <p className="mt-2 text-sm text-slate-400">Industry-style setup with dedicated Electricity, Materials, and Labour sections.</p>
            </div>
          </div>
          <form onSubmit={saveBilling} className="mt-6 space-y-6">
            <details open className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <summary className="cursor-pointer list-none text-lg font-semibold text-white">Electricity</summary>
              <div className="mb-4">
                <p className="mt-1 text-sm text-slate-400">Set base energy pricing rules used by runtime cost calculations.</p>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-56 shrink-0">Electricity cost / kWh</span>
                  <NumberInput step="0.01" min="0" value={billingSettings.electricityCostPerKwh} onValue={(v) => updateBilling("electricityCostPerKwh", v)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-56 shrink-0">Electricity markup %</span>
                  <NumberInput step="0.01" min="0" value={billingSettings.electricityMarkupPercent} onValue={(v) => updateBilling("electricityMarkupPercent", v)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-56 shrink-0">Depreciation markup %</span>
                  <NumberInput step="0.01" min="0" value={billingSettings.depreciationMarkupPercent} onValue={(v) => updateBilling("depreciationMarkupPercent", v)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                </label>
              </div>
            </details>

            <details open className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <summary className="cursor-pointer list-none text-lg font-semibold text-white">Materials</summary>
              <div className="mb-4">
                <p className="mt-1 text-sm text-slate-400">Set global markup and optional per-material-type pricing rules.</p>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-56 shrink-0">Global material markup %</span>
                  <NumberInput step="0.01" min="0" value={billingSettings.materialMarkupPercent} onValue={(v) => updateBilling("materialMarkupPercent", v)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                </label>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
                <div className="grid grid-cols-[1.4fr_1fr] bg-slate-900 px-4 py-3 text-sm font-medium text-slate-300">
                  <span>Material type</span>
                  <span>Markup %</span>
                </div>
                <div className="divide-y divide-slate-800 bg-slate-900/70">
                  {billingMaterialTypes.map((materialType) => (
                    <div key={materialType} className="grid grid-cols-[1.4fr_1fr] items-center gap-3 px-4 py-3 text-sm">
                      <div className="font-medium text-white">{materialType}</div>
                      <NumberInput step="0.01" min="0" aria-label={`Markup percent for ${materialType}`} value={billingSettings.materialTypeMarkups?.[materialType]?.percent ?? 0} onValue={(v) => updateMaterialTypeMarkup(materialType, v)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                    </div>
                  ))}
                </div>
              </div>
            </details>

            <details open className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <summary className="cursor-pointer list-none text-lg font-semibold text-white">Labour</summary>
              <div className="mb-4">
                <p className="mt-1 text-sm text-slate-400">Set the base labour hourly rate to be used in billing time.</p>
              </div>
              <label className="flex items-center gap-4 text-sm text-slate-300">
                <span className="w-56 shrink-0">Labour rate / hour</span>
                <NumberInput step="0.01" min="0" value={billingSettings.labourRate} onValue={(v) => updateBilling("labourRate", v)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
              </label>
            </details>

            <details open className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <summary className="cursor-pointer list-none text-lg font-semibold text-white">Workshop costs</summary>
              <div className="mb-4">
                <p className="mt-1 text-sm text-slate-400">Set a base workshop hourly rate that is included in customer billing.</p>
              </div>
              <label className="flex items-center gap-4 text-sm text-slate-300">
                <span className="w-56 shrink-0">Workshop costs as an hourly rate</span>
                <NumberInput step="0.01" min="0" value={billingSettings.workshopHourlyRate} onValue={(v) => updateBilling("workshopHourlyRate", v)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
              </label>
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
                Workshop costs are calculated from machine runtime hours multiplied by this hourly rate.
              </div>
            </details>

            <details open className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <summary className="cursor-pointer list-none text-lg font-semibold text-white">Pricing guardrails</summary>
              <div className="mb-4">
                <p className="mt-1 text-sm text-slate-400">Apply minimum charge, rush multiplier, and waste factor controls.</p>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-56 shrink-0">Minimum charge (£)</span>
                  <NumberInput step="0.01" min="0" value={billingSettings.minimumCharge} onValue={(v) => updateBilling("minimumCharge", v)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-56 shrink-0">Rush fee %</span>
                  <NumberInput step="0.01" min="0" value={billingSettings.rushFeePercent} onValue={(v) => updateBilling("rushFeePercent", v)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-56 shrink-0">Waste factor %</span>
                  <NumberInput step="0.01" min="0" value={billingSettings.wasteFactorPercent} onValue={(v) => updateBilling("wasteFactorPercent", v)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                </label>
              </div>
            </details>

            <details open className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <summary className="cursor-pointer list-none text-lg font-semibold text-white">Invoice add-ons</summary>
              <div className="mb-4">
                <p className="mt-1 text-sm text-slate-400">Set VAT, deposits, and payment terms shown in invoice totals.</p>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-56 shrink-0">VAT %</span>
                  <NumberInput step="0.01" min="0" value={billingSettings.vatPercent} onValue={(v) => updateBilling("vatPercent", v)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-56 shrink-0">Suggested deposit %</span>
                  <NumberInput step="0.01" min="0" value={billingSettings.depositPercent} onValue={(v) => updateBilling("depositPercent", v)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-56 shrink-0">Payment terms (days)</span>
                  <NumberInput step="1" min="0" value={billingSettings.paymentTermsDays} onValue={(v) => updateBilling("paymentTermsDays", v)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                </label>
              </div>
            </details>
          </form>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Billing and invoice audit log</h3>
              <button
                type="button"
                onClick={() => api.getBillingAuditLogs(100).then(setBillingAuditLogs).catch(() => undefined)}
                className="rounded-full border border-cyan-700 px-3 py-1 text-xs text-cyan-300"
              >
                Refresh log
              </button>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              {billingAuditLogs.slice(0, 15).map((entry) => (
                <div key={entry.id} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                  <p className="font-medium text-white">{entry.summary || `${entry.entityType} ${entry.action}`}</p>
                  <p className="text-slate-400">{new Date(entry.createdAt).toLocaleString()} • {entry.entityType}</p>
                </div>
              ))}
              {!billingAuditLogs.length ? <p className="text-slate-500">No audit entries yet.</p> : null}
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}

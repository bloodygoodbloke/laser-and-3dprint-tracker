import type { BillingSettings, Customer, Job } from "./types";
import type { InvoiceChargeBreakdown } from "./invoicing";
import { formatMinutesAsPrintTime } from "./printTime";
import { formatCurrency, formatDate } from "./format";

interface JobInvoiceProps {
  selectedJob: Job;
  selectedCustomerProfile: Customer | null;
  billingSettings: BillingSettings;
  businessDisplayName: string;
  getInvoiceChargeBreakdown: (job: Job) => InvoiceChargeBreakdown;
  calculateJobCost: (job: Job) => Promise<void> | void;
  printInvoice: (job: Job) => void;
  closeInvoice: () => void;
}

export default function JobInvoice({
  selectedJob,
  selectedCustomerProfile,
  billingSettings,
  businessDisplayName,
  getInvoiceChargeBreakdown,
  calculateJobCost,
  printInvoice,
  closeInvoice,
}: JobInvoiceProps) {
  return (
    <div className="mt-4 space-y-5 rounded-2xl border border-cyan-700/40 bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Invoice</p>
          <h3 className="mt-2 text-xl font-semibold">{selectedJob.name}</h3>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => calculateJobCost(selectedJob)} className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300">Refresh costs</button>
          <button type="button" onClick={() => printInvoice(selectedJob)} className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300">Print / Save PDF</button>
          <button type="button" onClick={closeInvoice} className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">Close invoice</button>
        </div>
      </div>

      {selectedJob.cost ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">Invoice</p>
              <h5 className="mt-2 text-xl font-semibold text-white">{selectedJob.name}</h5>
              <p className="mt-1 text-sm text-slate-400">{selectedJob.customer || "Walk-in customer"}</p>
              {businessDisplayName ? <p className="mt-3 text-sm text-slate-400">From: <span className="text-slate-200">{businessDisplayName}</span></p> : null}
              {billingSettings.businessAddress ? <p className="text-sm text-slate-400">{billingSettings.businessAddress}</p> : null}
            </div>
            <div className="text-sm text-slate-400">
              {billingSettings.businessLogoUrl ? <img src={billingSettings.businessLogoUrl} alt="Business logo" className="mb-2 ml-auto h-12 w-12 rounded-full object-cover" /> : null}
              <p className="font-medium text-white">#{selectedJob.jobNumber || "TBC"}</p>
              <p>Issued {formatDate(new Date())}</p>
              <p>{Number(billingSettings.paymentTermsDays || 0) > 0 ? `Due in ${Number(billingSettings.paymentTermsDays || 0)} days` : "Due on receipt"}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Bill to</p>
              <p className="mt-2 font-medium text-white">{selectedJob.customer || "Walk-in customer"}</p>
              {selectedCustomerProfile?.address ? <p className="text-sm text-slate-400">{selectedCustomerProfile.address}</p> : null}
              {selectedCustomerProfile?.email ? <p className="text-sm text-slate-400">{selectedCustomerProfile.email}</p> : null}
              {selectedCustomerProfile?.phone ? <p className="text-sm text-slate-400">{selectedCustomerProfile.phone}</p> : null}
              <p className="text-sm text-slate-400">{selectedJob.machineType}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Job summary</p>
              <p className="mt-2 font-medium text-white">{selectedJob.status}</p>
              <p className="text-sm text-slate-400">Runtime {formatMinutesAsPrintTime(Number(selectedJob.machineRunTimeMinutes ?? selectedJob.estTimeMinutes ?? 0))} • Setup {selectedJob.setupTimeMinutes ?? 0} mins • Labour and processing {Number(selectedJob.labourTimeMinutes ?? selectedJob.estTimeMinutes) + Number(selectedJob.postProcessingMinutes ?? 0)} mins • {selectedJob.itemCount ?? 1} item{Number(selectedJob.itemCount ?? 1) === 1 ? "" : "s"}</p>
              <p className="text-sm text-slate-400">Payment {selectedJob.paymentStatus || "Unpaid"}</p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
            <div className="grid grid-cols-[2fr_1fr] bg-slate-950/90 px-4 py-3 text-sm font-medium text-slate-300">
              <span>Description</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="divide-y divide-slate-800 bg-slate-950/50">
              <div className="grid grid-cols-[2fr_1fr] px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-white">Materials</p>
                </div>
                <span className="text-right font-medium text-white">{formatCurrency(getInvoiceChargeBreakdown(selectedJob).materialCharge)}</span>
              </div>
              <div className="grid grid-cols-[2fr_1fr] px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-white">Production costs subtotal</p>
                </div>
                <span className="text-right font-medium text-white">{formatCurrency(getInvoiceChargeBreakdown(selectedJob).productionCharge)}</span>
              </div>
              <div className="grid grid-cols-[2fr_1fr] px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-white">Labour and processing ({Number(selectedJob.labourTimeMinutes ?? selectedJob.estTimeMinutes) + Number(selectedJob.postProcessingMinutes ?? 0)} mins)</p>
                </div>
                <span className="text-right font-medium text-white">{formatCurrency(getInvoiceChargeBreakdown(selectedJob).labourCharge)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-xs space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm">
              {(() => {
                const chargeBreakdown = getInvoiceChargeBreakdown(selectedJob);
                const subTotal = Number(chargeBreakdown.customerCharge || 0);
                const vatAmount = subTotal * (Number(billingSettings.vatPercent || 0) / 100);
                const grandTotal = subTotal + vatAmount;
                const suggestedDepositAmount = grandTotal * (Math.max(0, Number(billingSettings.depositPercent || 0)) / 100);
                const depositPaidAmount = Number(selectedJob.depositPaidAmount || 0);
                const balanceDue = Math.max(0, grandTotal - depositPaidAmount);

                return (
                  <>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>SubTotal</span>
                      <span>{formatCurrency(subTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>VAT ({Number(billingSettings.vatPercent || 0).toFixed(0)}%)</span>
                      <span>{formatCurrency(vatAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Suggested deposit ({Number(billingSettings.depositPercent || 0).toFixed(0)}%)</span>
                      <span>{formatCurrency(suggestedDepositAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Deposit paid</span>
                      <span>{formatCurrency(depositPaidAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-base font-semibold text-white">
                      <span>Grand total</span>
                      <span>{formatCurrency(grandTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-base font-semibold text-cyan-200">
                      <span>Balance due</span>
                      <span>{formatCurrency(balanceDue)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {(billingSettings.businessAddress || billingSettings.businessEmail || billingSettings.businessPhone || billingSettings.businessWebsite) ? (
            <div className="mt-5 border-t border-slate-800 pt-3 text-xs text-slate-400">
              <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
                {billingSettings.businessAddress ? <span>{billingSettings.businessAddress}</span> : null}
                {billingSettings.businessEmail ? <span>{billingSettings.businessEmail}</span> : null}
                {billingSettings.businessPhone ? <span>{billingSettings.businessPhone}</span> : null}
                {billingSettings.businessWebsite ? (
                  <a className="text-cyan-300 underline" href={billingSettings.businessWebsite} target="_blank" rel="noreferrer">
                    {billingSettings.businessWebsite}
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
          <p className="mt-5 border-t border-slate-800 pt-3 text-center text-xs text-slate-500">Made with MakerFlow</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
          No cost has been calculated for this job yet. Use Refresh costs to generate the invoice totals.
        </div>
      )}
    </div>
  );
}

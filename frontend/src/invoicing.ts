import type { BillingSettings, Customer, Job } from "./types";
import { formatCurrency, formatDate, formatNumber } from "./format";

export interface RuntimeBreakdown {
  machineRunTimeMinutes: number;
  materialWeightGrams: number;
  depreciationCost: number;
  electricityCost: number;
  workshopCost: number;
}

export interface InvoiceChargeBreakdown {
  materialCharge: number;
  electricityCharge: number;
  depreciationCharge: number;
  labourCharge: number;
  overheadCharge: number;
  setupFeeAmount: number;
  rushFeeAmount: number;
  deliveryCharge: number;
  qaReworkCharge: number;
  minimumChargeApplied: number;
  productionCharge: number;
  customerCharge: number;
}

export interface InvoicePrintContext {
  billingSettings: BillingSettings;
  businessDisplayName: string;
  selectedCustomerProfile: Customer | null;
}

export const computeRuntimeBreakdown = (job: Job, billingSettings: BillingSettings): RuntimeBreakdown => {
  const machineRunTimeMinutes = Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0);
  const materialWeightGrams = (job.materials || []).reduce((sum, entry) => sum + Number(entry.usageQuantity || 0), 0);
  const machineSettings = billingSettings.machineElectricitySettings || {};
  const normalizeMachineName = (value: string) => value.trim().toLowerCase();
  const normalizedMachineName = normalizeMachineName(String(job.machineType || ""));
  const selectedMachineEntry = Object.entries(machineSettings).find(([savedName]) => normalizeMachineName(savedName) === normalizedMachineName);
  const selectedMachine = machineSettings[job.machineType] || selectedMachineEntry?.[1] || {};
  const machineDepreciationCost = Number(selectedMachine?.depreciationCost ?? billingSettings.depreciationCost ?? 0);
  const machineReplacementRunHours = Number(selectedMachine?.replacementRunHours ?? billingSettings.depreciationHours ?? 0);
  const depreciationCost = machineReplacementRunHours > 0
    ? (machineRunTimeMinutes / 60) * (machineDepreciationCost / machineReplacementRunHours)
    : 0;
  const electricityCost = Math.max(0, Number(job.cost?.electricityCost ?? 0) - depreciationCost);

  return {
    machineRunTimeMinutes,
    materialWeightGrams,
    depreciationCost,
    electricityCost,
    workshopCost: Number(job.cost?.overheadCost ?? 0),
  };
};
const getMaterialTypeMarkupPercent = (materialType: string, billingSettings: BillingSettings) => {
  const normalizedMaterialType = String(materialType || "Other").trim().toLowerCase();
  const matchedEntry = Object.entries(billingSettings.materialTypeMarkups || {}).find(([typeName]) => typeName.trim().toLowerCase() === normalizedMaterialType);
  const percent = Number(matchedEntry?.[1]?.percent ?? 0);
  return Number.isFinite(percent) && percent > 0 ? percent : 0;
};
export const computeInvoiceChargeBreakdown = (job: Job, billingSettings: BillingSettings): InvoiceChargeBreakdown => {
  const wasteFactorMultiplier = 1 + (Math.max(0, Number(billingSettings.wasteFactorPercent || 0)) / 100);
  const baseMaterialCost = Number(job.cost?.materialCost ?? 0);
  const runtimeBreakdown = computeRuntimeBreakdown(job, billingSettings);
  const baseElectricityCost = Number(runtimeBreakdown.electricityCost ?? 0);
  const baseDepreciationCost = Number(runtimeBreakdown.depreciationCost ?? 0);
  const baseLabourCost = Number(job.cost?.labourCost ?? 0);
  const baseOverheadCost = Number(job.cost?.overheadCost ?? 0);
  const materialMarkupPercent = Number(billingSettings.materialMarkupPercent || 0);
  const electricityMarkupPercent = Number(billingSettings.electricityMarkupPercent || 0);
  const depreciationMarkupPercent = Number(billingSettings.depreciationMarkupPercent || 0);

  const materialTypeMarkupCharge = (job.materials || []).reduce((sum, entry) => {
    const lineBase = (Number(entry.usageQuantity || 0) * Number(entry.usageUnitCost || 0)) * wasteFactorMultiplier;
    const materialType = entry.material?.type || "Other";
    const typeMarkupPercent = getMaterialTypeMarkupPercent(materialType, billingSettings);
    return sum + (lineBase * (typeMarkupPercent / 100));
  }, 0);

  const materialCharge = baseMaterialCost + materialTypeMarkupCharge + (baseMaterialCost * (materialMarkupPercent / 100));
  const electricityCharge = baseElectricityCost + (baseElectricityCost * (electricityMarkupPercent / 100));
  const depreciationCharge = baseDepreciationCost + (baseDepreciationCost * (depreciationMarkupPercent / 100));
  const labourCharge = baseLabourCost;
  const overheadCharge = baseOverheadCost;
  const preGuardrailCustomerCharge = materialCharge + electricityCharge + depreciationCharge + labourCharge + overheadCharge;
  const setupFeeAmount = Math.max(0, Number(job.setupFee || 0));
  const rushFeeAmount = job.isRush
    ? (preGuardrailCustomerCharge + setupFeeAmount) * (Math.max(0, Number(billingSettings.rushFeePercent || 0)) / 100)
    : 0;
  const deliveryCharge = Math.max(0, Number(job.deliveryCharge || 0));
  const qaReworkCharge = Math.max(0, Number(job.reworkCost || 0));
  const customerSubtotalBeforeMinimum = preGuardrailCustomerCharge + setupFeeAmount + rushFeeAmount + deliveryCharge + qaReworkCharge;
  const minimumChargeApplied = Math.max(0, Math.max(0, Number(billingSettings.minimumCharge || 0)) - customerSubtotalBeforeMinimum);
  const productionCharge = electricityCharge + depreciationCharge + overheadCharge + setupFeeAmount + rushFeeAmount + deliveryCharge + qaReworkCharge + minimumChargeApplied;
  const customerCharge = customerSubtotalBeforeMinimum + minimumChargeApplied;

  return {
    materialCharge,
    electricityCharge,
    depreciationCharge,
    labourCharge,
    overheadCharge,
    setupFeeAmount,
    rushFeeAmount,
    deliveryCharge,
    qaReworkCharge,
    minimumChargeApplied,
    productionCharge,
    customerCharge,
  };
};
export const openInvoicePrintWindow = (job: Job, context: InvoicePrintContext) => {
  const { billingSettings, businessDisplayName, selectedCustomerProfile } = context;
  const printWindow = window.open("", "_blank", "width=980,height=700");
  if (!printWindow) {
    window.alert("Could not open print window. Please allow pop-ups and try again.");
    return;
  }

  const safe = (value: string) => value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const customerName = job.customer || "Walk-in customer";
  const jobRuntime = Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0);
  const labourRuntime = Number(job.labourTimeMinutes ?? job.estTimeMinutes ?? 0);
  const chargeBreakdown = computeInvoiceChargeBreakdown(job, billingSettings);
  const materialAmount = chargeBreakdown.materialCharge;
  const productionAmount = chargeBreakdown.productionCharge;
  const labourAmount = chargeBreakdown.labourCharge;
  const subTotal = chargeBreakdown.customerCharge;
  const vatPercent = Number(billingSettings.vatPercent || 0);
  const vatAmount = subTotal * (vatPercent / 100);
  const grandTotal = subTotal + vatAmount;
  const suggestedDepositAmount = grandTotal * (Math.max(0, Number(billingSettings.depositPercent || 0)) / 100);
  const depositPaidAmount = Number(job.depositPaidAmount || 0);
  const balanceDue = Math.max(0, grandTotal - depositPaidAmount);
  const paymentTermsDays = Number(billingSettings.paymentTermsDays || 0);
  const dueLabel = paymentTermsDays > 0 ? `Due in ${paymentTermsDays} days` : "Due on receipt";

  const printMarkup = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${safe(job.jobNumber || "TBC")}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; margin: 24px; color: #0f172a; }
    h1, h2, h3, p { margin: 0; }
    .muted { color: #475569; }
    .row { display: flex; justify-content: space-between; gap: 12px; }
    .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; }
    .table { border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; margin-top: 16px; }
    .thead, .trow { display: grid; grid-template-columns: 2fr 1fr; }
    .thead { background: #f8fafc; font-weight: 600; }
    .thead div, .trow div { padding: 10px 12px; }
    .trow { border-top: 1px solid #e2e8f0; }
    .totals { margin-top: 16px; margin-left: auto; width: 280px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; }
    .totals .row { margin-bottom: 8px; }
    .totals .row:last-child { margin-bottom: 0; font-weight: 700; border-top: 1px solid #cbd5e1; padding-top: 8px; }
    .footer { margin-top: 16px; font-size: 12px; color: #475569; display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
    .makerflow-footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 8px; text-align: center; color: #64748b; font-size: 10px; }
  </style>
</head>
<body>
  <div class="row">
    <div>
      <p class="muted" style="letter-spacing:0.08em; text-transform:uppercase; font-size:12px;">Invoice</p>
      <h2 style="margin-top:6px;">${safe(job.name)}</h2>
      <p class="muted" style="margin-top:4px;">${safe(customerName)}</p>
      ${businessDisplayName ? `<p class="muted" style="margin-top:12px;">From: <strong style="color:#0f172a;">${safe(businessDisplayName)}</strong></p>` : ""}
      ${billingSettings.businessAddress ? `<p class="muted">${safe(billingSettings.businessAddress)}</p>` : ""}
    </div>
    <div style="text-align:right;">
      ${billingSettings.businessLogoUrl ? `<img src="${safe(billingSettings.businessLogoUrl)}" alt="${safe(businessDisplayName || "Business logo")}" style="max-width:72px;max-height:72px;object-fit:contain;margin-bottom:8px;" />` : ""}
      <p><strong>#${safe(job.jobNumber || "TBC")}</strong></p>
      <p class="muted">Issued ${safe(formatDate(new Date()))}</p>
      <p class="muted">${safe(dueLabel)}</p>
    </div>
  </div>

  <div style="margin-top:14px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
    <div class="card">
      <p class="muted" style="font-size:12px; letter-spacing:0.08em; text-transform:uppercase;">Bill to</p>
      <p style="margin-top:8px;"><strong>${safe(customerName)}</strong></p>
      ${selectedCustomerProfile?.address ? `<p class="muted">${safe(selectedCustomerProfile.address)}</p>` : ""}
      ${selectedCustomerProfile?.email ? `<p class="muted">${safe(selectedCustomerProfile.email)}</p>` : ""}
      ${selectedCustomerProfile?.phone ? `<p class="muted">${safe(selectedCustomerProfile.phone)}</p>` : ""}
    </div>
    <div class="card">
      <p class="muted" style="font-size:12px; letter-spacing:0.08em; text-transform:uppercase;">Job summary</p>
      <p style="margin-top:8px;"><strong>${safe(job.status || "Pending")}</strong></p>
      <p class="muted">Runtime ${safe(String(jobRuntime))} mins • Labour ${safe(String(labourRuntime))} mins</p>
    </div>
  </div>

  <div class="table">
    <div class="thead"><div>Description</div><div style="text-align:right;">Amount</div></div>
    <div class="trow"><div><strong>Materials</strong></div><div style="text-align:right;"><strong>${safe(formatCurrency(materialAmount))}</strong></div></div>
    <div class="trow"><div><strong>Production costs subtotal</strong></div><div style="text-align:right;"><strong>${safe(formatCurrency(productionAmount))}</strong></div></div>
    <div class="trow"><div><strong>Labour (${safe(String(labourRuntime))} mins)</strong></div><div style="text-align:right;"><strong>${safe(formatCurrency(labourAmount))}</strong></div></div>
  </div>

  <div class="totals">
    <div class="row"><span class="muted">SubTotal</span><span class="muted">${safe(formatCurrency(subTotal))}</span></div>
    <div class="row"><span class="muted">VAT (${safe(formatNumber(vatPercent, 0))}%)</span><span class="muted">${safe(formatCurrency(vatAmount))}</span></div>
    <div class="row"><span class="muted">Suggested deposit (${safe(formatNumber(Number(billingSettings.depositPercent || 0), 0))}%)</span><span class="muted">${safe(formatCurrency(suggestedDepositAmount))}</span></div>
    <div class="row"><span class="muted">Deposit paid</span><span class="muted">${safe(formatCurrency(depositPaidAmount))}</span></div>
    <div class="row"><span>Grand total</span><span>${safe(formatCurrency(grandTotal))}</span></div>
    <div class="row"><span>Balance due</span><span>${safe(formatCurrency(balanceDue))}</span></div>
  </div>

  ${(billingSettings.businessAddress || billingSettings.businessEmail || billingSettings.businessPhone || billingSettings.businessWebsite) ? `<div class="footer">
    ${billingSettings.businessAddress ? `<span>${safe(billingSettings.businessAddress)}</span>` : ""}
    ${billingSettings.businessEmail ? `<span>${safe(billingSettings.businessEmail)}</span>` : ""}
    ${billingSettings.businessPhone ? `<span>${safe(billingSettings.businessPhone)}</span>` : ""}
    ${billingSettings.businessWebsite ? `<span>${safe(billingSettings.businessWebsite)}</span>` : ""}
  </div>` : ""}
  <div class="makerflow-footer">Made with MakerFlow</div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(printMarkup);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

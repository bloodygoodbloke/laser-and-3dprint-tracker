import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import JobFilePreview from "./JobFilePreview";
import JobInvoice from "./JobInvoice";
import type { InvoiceChargeBreakdown, RuntimeBreakdown } from "./invoicing";
import PrintTimeInput from "./PrintTimeInput";
import { formatMinutesAsPrintTime } from "./printTime";
import type { BillingSettings, Customer, Job, Material } from "./types";

interface JobForm {
  name: string;
  customer: string;
  sourceUrl: string;
  machineType: string;
  machineRunTimeMinutes: string;
  setupTimeMinutes: string;
  postProcessingMinutes: string;
  labourTimeMinutes: string;
  dueDate: string;
  queuePosition: string;
  qaChecklistText: string;
  qaPassed: boolean;
  reworkCost: string;
  reworkNotes: string;
  failureReason: string;
  failureWasteGrams: string;
  failureCost: string;
  isRush: boolean;
  setupFee: string;
  deliveryCharge: string;
  paymentStatus: string;
  depositPaidAmount: string;
  status: string;
}

interface MaterialEntry {
  materialId: string;
  usageQuantity: string;
}

type JobEditorMode = "none" | "edit" | "create" | "invoice";

interface ModelPreview {
  sourceUrl: string;
  imageUrl: string | null;
  loading: boolean;
}

interface JobCardProps {
  job: Job;
  expandedJobId: string | null;
  setExpandedJobId: Dispatch<SetStateAction<string | null>>;
  selectedJobId: string | null;
  setSelectedJobId: Dispatch<SetStateAction<string | null>>;
  jobEditorMode: JobEditorMode;
  setJobEditorMode: (mode: JobEditorMode) => void;
  selectedJob: Job | null;
  selectedJobForm: JobForm;
  setSelectedJobForm: Dispatch<SetStateAction<JobForm>>;
  selectedCustomerProfile: Customer | null;
  billingSettings: BillingSettings;
  businessDisplayName: string;
  machineOptions: string[];
  materials: Material[];
  selectedJobMaterialEntries: MaterialEntry[];
  addSelectedJobMaterialEntry: () => void;
  updateSelectedJobMaterialEntry: (index: number, field: "materialId" | "usageQuantity", value: string) => void;
  removeSelectedJobMaterialEntry: (index: number) => void;
  jobStatusOptions: string[];
  paymentStatusOptions: string[];
  formatCurrency: (value?: number | null) => string;
  getBaseCostTotal: (job: Job) => number;
  getProfitTotal: (job: Job) => number;
  getInvoiceChargeBreakdown: (job: Job) => InvoiceChargeBreakdown;
  calculateRuntimeBreakdown: (job: Job) => RuntimeBreakdown;
  getCostButtonLabel: (job: Job) => string;
  calculateJobCost: (job: Job) => Promise<void>;
  getWorkflowActions: (job: Job) => Array<{ label: string; status: string; tone: string }>;
  updateJobStatusQuick: (job: Job, status: string) => Promise<void>;
  saveSelectedJob: (event: FormEvent) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  printInvoice: (job: Job) => void;
  uploadJobFile: (job: Job, event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  uploadingJobId: string | null;
  jobFileMessage: Record<string, string>;
  modelPreviewByJob: Record<string, ModelPreview>;
  setModelPreviewByJob: Dispatch<SetStateAction<Record<string, ModelPreview>>>;
  getPreviewType: (filePath?: string | null) => "svg" | "stl" | "image" | "none";
}

export default function JobCard({
  job,
  expandedJobId,
  setExpandedJobId,
  selectedJobId,
  setSelectedJobId,
  jobEditorMode,
  setJobEditorMode,
  selectedJob,
  selectedJobForm,
  setSelectedJobForm,
  selectedCustomerProfile,
  billingSettings,
  businessDisplayName,
  machineOptions,
  materials,
  selectedJobMaterialEntries,
  addSelectedJobMaterialEntry,
  updateSelectedJobMaterialEntry,
  removeSelectedJobMaterialEntry,
  jobStatusOptions,
  paymentStatusOptions,
  formatCurrency,
  getBaseCostTotal,
  getProfitTotal,
  getInvoiceChargeBreakdown,
  calculateRuntimeBreakdown,
  getCostButtonLabel,
  calculateJobCost,
  getWorkflowActions,
  updateJobStatusQuick,
  saveSelectedJob,
  deleteJob,
  printInvoice,
  uploadJobFile,
  uploadingJobId,
  jobFileMessage,
  modelPreviewByJob,
  setModelPreviewByJob,
  getPreviewType,
}: JobCardProps) {
  return (
    <div className={`w-full rounded-2xl border ${expandedJobId === job.id ? "border-cyan-500 bg-cyan-500/10" : "border-slate-800 bg-slate-950"}`}>
      <button
        type="button"
        onClick={() => {
          setExpandedJobId((current) => current === job.id ? null : job.id);
          setSelectedJobId(job.id);
        }}
        className="w-full p-4 text-left"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{job.name}</p>
            <p className="text-sm text-slate-400">{job.jobNumber || "No job number"} • {job.customer || "No customer"} • {job.machineType}</p>
          </div>
          <div className="text-right text-sm text-slate-400">
            <p>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${job.status === "Completed" || job.status === "Invoiced" ? "bg-emerald-600/20 text-emerald-300" : job.status === "In Progress" ? "bg-sky-600/20 text-sky-300" : "bg-slate-700 text-slate-200"}`}>
                {job.status}
              </span>
            </p>
            <p>{job.cost ? `Base (no markups) ${formatCurrency(getBaseCostTotal(job))}` : "No cost yet"}</p>
            {job.cost ? <p>{`Customer (with markups) ${formatCurrency(getInvoiceChargeBreakdown(job).customerCharge)}`}</p> : null}
            {job.cost ? <p>{`Profit ${formatCurrency(getProfitTotal(job))}`}</p> : null}
          </div>
        </div>
      </button>

      {expandedJobId === job.id ? (
        <div className="border-t border-slate-800 px-4 pb-4 pt-3">
          <div className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
            <p><span className="text-slate-500">Job:</span> {job.name}</p>
            <p><span className="text-slate-500">Customer:</span> {job.customer || "No customer"}</p>
            <p><span className="text-slate-500">Model URL:</span> {job.sourceUrl ? <a className="text-cyan-300 underline" href={job.sourceUrl} target="_blank" rel="noreferrer">{job.sourceUrl}</a> : "None"}</p>
            <p><span className="text-slate-500">Equipment:</span> {job.machineType}</p>
            <p><span className="text-slate-500">Equipment runtime:</span> {formatMinutesAsPrintTime(Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0))}</p>
            <p><span className="text-slate-500">Setup time:</span> {job.setupTimeMinutes ?? 0} mins</p>
            <p><span className="text-slate-500">Post-processing:</span> {job.postProcessingMinutes ?? 0} mins</p>
            <p><span className="text-slate-500">Labour time:</span> {job.labourTimeMinutes ?? job.estTimeMinutes} mins</p>
            <p><span className="text-slate-500">Status:</span> {job.status}</p>
            <p><span className="text-slate-500">Queue position:</span> {job.queuePosition ?? 0}</p>
            <p><span className="text-slate-500">Due date:</span> {job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "Not set"}</p>
            <p><span className="text-slate-500">Payment:</span> {job.paymentStatus || "Unpaid"}</p>
            <p><span className="text-slate-500">Rush:</span> {job.isRush ? "Yes" : "No"}</p>
            <p><span className="text-slate-500">Setup fee:</span> {formatCurrency(Number(job.setupFee || 0))}</p>
            <p><span className="text-slate-500">Delivery charge:</span> {formatCurrency(Number(job.deliveryCharge || 0))}</p>
            <p><span className="text-slate-500">Deposit paid:</span> {formatCurrency(Number(job.depositPaidAmount || 0))}</p>
            <p><span className="text-slate-500">Materials:</span> {job.materials?.length || 0}</p>
            <p><span className="text-slate-500">QA passed:</span> {job.qaPassed ? "Yes" : "No"}</p>
            <p><span className="text-slate-500">Rework cost:</span> {formatCurrency(Number(job.reworkCost || 0))}</p>
            <p><span className="text-slate-500">Failure reason:</span> {job.failureReason || "None"}</p>
            <p><span className="text-slate-500">Failure waste:</span> {Number(job.failureWasteGrams || 0)} g</p>
            <p><span className="text-slate-500">Failure cost:</span> {formatCurrency(Number(job.failureCost || 0))}</p>
            <p className="md:col-span-2"><span className="text-slate-500">QA checklist:</span> {(job.qaChecklist || []).length ? (job.qaChecklist || []).join(", ") : "No checklist items"}</p>
            <p className="md:col-span-2"><span className="text-slate-500">Rework notes:</span> {job.reworkNotes || "None"}</p>
            <p className="md:col-span-2"><span className="text-slate-500">File:</span> {job.filePath || "No file uploaded"}</p>
          </div>

          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Job file preview</p>
              <label className="cursor-pointer rounded-full border border-cyan-700 px-3 py-1 text-xs text-cyan-300">
                <span>{uploadingJobId === job.id ? "Uploading..." : "Upload SVG/STL/image"}</span>
                <input
                  type="file"
                  accept=".svg,.stl,.png,.jpg,.jpeg,.webp,.gif"
                  disabled={uploadingJobId === job.id}
                  className="hidden"
                  onChange={(event) => uploadJobFile(job, event)}
                />
              </label>
            </div>
            {jobFileMessage[job.id] ? <p className="mt-2 text-xs text-cyan-300">{jobFileMessage[job.id]}</p> : null}
            {job.sourceUrl ? (
              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Model image from source</p>
                {modelPreviewByJob[job.id]?.sourceUrl === job.sourceUrl && modelPreviewByJob[job.id]?.loading ? (
                  <p className="mt-2 text-sm text-slate-400">Looking for a source image...</p>
                ) : modelPreviewByJob[job.id]?.sourceUrl === job.sourceUrl && modelPreviewByJob[job.id]?.imageUrl ? (
                  <div className="mt-2">
                    <a href={modelPreviewByJob[job.id].imageUrl || undefined} target="_blank" rel="noreferrer" referrerPolicy="no-referrer" aria-label={`Open source image for ${job.name}`}>
                      <img
                        src={modelPreviewByJob[job.id].imageUrl || undefined}
                        loading="lazy"
                        alt={`${job.name} model image from source`}
                        referrerPolicy="no-referrer"
                        onError={() => setModelPreviewByJob((current) => ({ ...current, [job.id]: { sourceUrl: job.sourceUrl || "", imageUrl: null, loading: false } }))}
                        className="max-h-72 w-full rounded-lg bg-white object-contain"
                      />
                    </a>
                    <a className="mt-2 inline-block text-xs text-cyan-300 underline" href={job.sourceUrl} target="_blank" rel="noreferrer" referrerPolicy="no-referrer">View model page</a>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-700 text-xs text-slate-400">No image</div>
                    <div className="text-sm text-slate-400">
                      <p>No source image is available for this model.</p>
                      <a className="text-xs text-cyan-300 underline" href={job.sourceUrl} target="_blank" rel="noreferrer" referrerPolicy="no-referrer">View model page</a>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            {job.filePath ? (
              <JobFilePreview filePath={job.filePath} jobName={job.name} previewType={getPreviewType(job.filePath)} />
            ) : (
              <p className="mt-3 text-sm text-slate-400">Upload an SVG, STL or image file to preview it here.</p>
            )}
          </div>
          {job.cost ? (
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-400">Cost breakdown</p>
              <div className="space-y-1 text-sm">
                {(() => {
                  const runtimeBreakdown = calculateRuntimeBreakdown(job);
                  const runtimeOnly = formatMinutesAsPrintTime(runtimeBreakdown.machineRunTimeMinutes);
                  const electricityMarkupMultiplier = 1 + (Number(billingSettings.electricityMarkupPercent || 0) / 100);
                  const depreciationMarkupMultiplier = 1 + (Number(billingSettings.depreciationMarkupPercent || 0) / 100);
                  const electricityWithMarkup = runtimeBreakdown.electricityCost * electricityMarkupMultiplier;
                  const depreciationWithMarkup = runtimeBreakdown.depreciationCost * depreciationMarkupMultiplier;
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Materials ({runtimeBreakdown.materialWeightGrams.toFixed(0)} g)</span>
                        <span className="font-medium text-white">{formatCurrency(getInvoiceChargeBreakdown(job).materialCharge)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Electricity ({runtimeOnly})</span>
                        <span className="font-medium text-white">{formatCurrency(electricityWithMarkup)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Depreciation ({runtimeOnly})</span>
                        <span className="font-medium text-white">{formatCurrency(depreciationWithMarkup)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Workshop ({runtimeOnly})</span>
                        <span className="font-medium text-white">{formatCurrency(runtimeBreakdown.workshopCost)}</span>
                      </div>
                    </>
                  );
                })()}
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Labour ({job.labourTimeMinutes ?? job.estTimeMinutes} mins)</span>
                  <span className="font-medium text-white">{formatCurrency(job.cost.labourCost)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2">
                  <span className="text-slate-300">Base total (no markups)</span>
                  <span className="font-semibold text-white">{formatCurrency(getBaseCostTotal(job))}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2">
                  <span className="text-slate-300">Customer total (with markups)</span>
                  <span className="font-semibold text-white">{formatCurrency(getInvoiceChargeBreakdown(job).customerCharge)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2">
                  <span className="text-slate-300">Profit (internal)</span>
                  <span className="font-semibold text-white">{formatCurrency(getProfitTotal(job))}</span>
                </div>
              </div>
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {getWorkflowActions(job).map((action) => (
              <button
                key={`${job.id}-${action.status}`}
                type="button"
                onClick={() => updateJobStatusQuick(job, action.status)}
                className="mf-btn"
              >
                {action.label}
              </button>
            ))}
            {(job.status === "Quote Draft" || job.status === "Quote Sent") ? (
              <button type="button" onClick={() => updateJobStatusQuick(job, "Quote Approved")} className="mf-btn">Approve quote</button>
            ) : null}
            {job.status === "Quote Draft" ? (
              <button type="button" onClick={() => updateJobStatusQuick(job, "Quote Sent")} className="mf-btn">Send quote</button>
            ) : null}
            {job.status === "Quote Approved" ? (
              <button type="button" onClick={() => updateJobStatusQuick(job, "Pending")} className="mf-btn">Convert to job</button>
            ) : null}
            {job.status !== "Estimate Template" ? (
              <button type="button" onClick={() => updateJobStatusQuick(job, "Estimate Template")} className="mf-btn">Save as estimate template</button>
            ) : (
              <button type="button" onClick={() => updateJobStatusQuick(job, "Pending")} className="mf-btn">Convert estimate to pending</button>
            )}
            <button
              type="button"
              onClick={() => {
                setExpandedJobId(job.id);
                setSelectedJobId(job.id);
                setJobEditorMode("edit");
              }}
              className="mf-btn"
            >
              Edit job
            </button>
            <button
              type="button"
              onClick={() => {
                setExpandedJobId(job.id);
                setSelectedJobId(job.id);
                setJobEditorMode("invoice");
              }}
              className="mf-btn"
            >
              Create invoice
            </button>
            <button type="button" onClick={() => calculateJobCost(job)} className="mf-btn">{getCostButtonLabel(job)}</button>
            <button type="button" onClick={() => deleteJob(job.id)} className="mf-btn mf-btn--danger">Delete job</button>
          </div>

          {jobEditorMode === "edit" && selectedJobId === job.id && selectedJob ? (
            <form onSubmit={saveSelectedJob} className="mt-4 space-y-4 rounded-2xl border border-cyan-700/40 bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Edit job</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{selectedJob.name}</h3>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => selectedJob && calculateJobCost(selectedJob)} className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300">{selectedJob ? getCostButtonLabel(selectedJob) : "Calculate cost"}</button>
                  <button type="button" onClick={() => setJobEditorMode("none")} className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">Cancel</button>
                  <button type="submit" className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300">Save job</button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Job name</span>
                  <input value={selectedJobForm.name} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, name: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" required />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Customer</span>
                  <input value={selectedJobForm.customer} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, customer: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Model URL</span>
                  <input value={selectedJobForm.sourceUrl} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, sourceUrl: e.target.value })} placeholder="Paste a model page link" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Equipment</span>
                  <select value={selectedJobForm.machineType} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, machineType: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                    {machineOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Status</span>
                  <select value={selectedJobForm.status} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, status: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                    {jobStatusOptions.map((statusOption) => (
                      <option key={statusOption} value={statusOption}>{statusOption}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <PrintTimeInput value={selectedJobForm.machineRunTimeMinutes} onChange={(minutes) => setSelectedJobForm({ ...selectedJobForm, machineRunTimeMinutes: minutes })} inputClassName="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Setup time (mins)</span>
                  <input value={selectedJobForm.setupTimeMinutes} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, setupTimeMinutes: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Post-processing (mins)</span>
                  <input value={selectedJobForm.postProcessingMinutes} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, postProcessingMinutes: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Labour time (mins)</span>
                  <input value={selectedJobForm.labourTimeMinutes} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, labourTimeMinutes: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Queue position</span>
                  <input type="number" min="0" value={selectedJobForm.queuePosition} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, queuePosition: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Due date</span>
                  <input type="date" value={selectedJobForm.dueDate} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, dueDate: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Payment status</span>
                  <select value={selectedJobForm.paymentStatus} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, paymentStatus: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                    {paymentStatusOptions.map((paymentStatusOption) => (
                      <option key={paymentStatusOption} value={paymentStatusOption}>{paymentStatusOption}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Deposit paid (£)</span>
                  <input type="number" step="0.01" value={selectedJobForm.depositPaidAmount} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, depositPaidAmount: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Rework cost (£)</span>
                  <input type="number" step="0.01" value={selectedJobForm.reworkCost} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, reworkCost: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                  <p className="mt-1 text-xs text-slate-500">Use a negative value (for example -5.00) to apply a manual pricing correction.</p>
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Failure waste (g)</span>
                  <input type="number" step="0.01" value={selectedJobForm.failureWasteGrams} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, failureWasteGrams: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Failure cost (£)</span>
                  <input type="number" step="0.01" value={selectedJobForm.failureCost} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, failureCost: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">QA passed</span>
                  <select value={selectedJobForm.qaPassed ? "yes" : "no"} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, qaPassed: e.target.value === "yes" })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-300 md:col-span-2">
                  <span className="mb-2 block">QA checklist (one item per line)</span>
                  <textarea value={selectedJobForm.qaChecklistText} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, qaChecklistText: e.target.value })} rows={3} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="block text-sm text-slate-300 md:col-span-2">
                  <span className="mb-2 block">Rework notes</span>
                  <textarea value={selectedJobForm.reworkNotes} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, reworkNotes: e.target.value })} rows={2} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="block text-sm text-slate-300 md:col-span-2">
                  <span className="mb-2 block">Failure reason</span>
                  <input value={selectedJobForm.failureReason} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, failureReason: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
              </div>

              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={selectedJobForm.isRush}
                  onChange={(e) => setSelectedJobForm({ ...selectedJobForm, isRush: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                />
                Apply rush fee for this job
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Setup fee for this job (£)</span>
                  <input type="number" min="0" step="0.01" value={selectedJobForm.setupFee} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, setupFee: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Delivery charge for this job (£)</span>
                  <input type="number" min="0" step="0.01" value={selectedJobForm.deliveryCharge} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, deliveryCharge: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Materials used</h4>
                  <button type="button" onClick={addSelectedJobMaterialEntry} className="rounded-full border border-cyan-700 px-3 py-1 text-xs text-cyan-300">Add material</button>
                </div>
                <div className="space-y-3">
                  {selectedJobMaterialEntries.map((entry, index) => (
                    <div key={`${entry.materialId}-${index}`} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 md:grid-cols-[1.6fr_1fr_auto]">
                      <label className="text-sm text-slate-300">
                        <span className="mb-2 block">Material</span>
                        <select value={entry.materialId} onChange={(e) => updateSelectedJobMaterialEntry(index, "materialId", e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                          {materials.map((material) => (
                            <option key={material.id} value={material.id}>{material.name} {material.color ? `• ${material.color}` : ""}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm text-slate-300">
                        <span className="mb-2 block">Quantity (g)</span>
                        <input type="number" min="0" step="0.01" value={entry.usageQuantity} onChange={(e) => updateSelectedJobMaterialEntry(index, "usageQuantity", e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                      </label>
                      <button type="button" onClick={() => removeSelectedJobMaterialEntry(index)} className="self-end rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          ) : null}

          {jobEditorMode === "invoice" && selectedJobId === job.id && selectedJob ? (
            <JobInvoice
              selectedJob={selectedJob}
              selectedCustomerProfile={selectedCustomerProfile}
              billingSettings={billingSettings}
              businessDisplayName={businessDisplayName}
              formatCurrency={formatCurrency}
              getInvoiceChargeBreakdown={getInvoiceChargeBreakdown}
              calculateJobCost={calculateJobCost}
              printInvoice={printInvoice}
              closeInvoice={() => setJobEditorMode("none")}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

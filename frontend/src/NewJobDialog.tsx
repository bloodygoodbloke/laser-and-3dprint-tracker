import type { Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import PrintTimeInput from "./PrintTimeInput";
import { formatMinutesAsPrintTime } from "./printTime";
import type { EstimateTemplate, Material } from "./types";

interface NewJobForm {
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

interface NewJobMaterialEntry {
  materialId: string;
  usageQuantity: string;
}

interface NewJobDialogProps {
  jobEditorMode: "none" | "edit" | "create" | "invoice";
  setJobEditorMode: (mode: "none" | "edit" | "create" | "invoice") => void;
  addJobFormRef: RefObject<HTMLFormElement | null>;
  createJobFromJobsTab: (event: FormEvent) => Promise<void>;
  saveCurrentEstimateTemplate: () => Promise<void>;
  setMakerWorldMessage: (message: string) => void;
  savedEstimateTemplates: EstimateTemplate[];
  applySavedEstimateTemplate: (template: EstimateTemplate) => Promise<void>;
  deleteEstimateTemplate: (templateId: string) => Promise<void>;
  newJobForm: NewJobForm;
  setNewJobForm: Dispatch<SetStateAction<NewJobForm>>;
  machineOptions: string[];
  setMakerWorldUrl: (value: string) => void;
  setModelUrlMessage: (value: string) => void;
  isLookingUpModelName: boolean;
  lookupModelTitle: () => Promise<void>;
  modelUrlMessage: string;
  makerWorldImportPreview: string | null;
  addNewJobMaterialEntry: () => void;
  newJobMaterialEntries: NewJobMaterialEntry[];
  materials: Material[];
  updateNewJobMaterialEntry: (index: number, field: "materialId" | "usageQuantity", value: string) => void;
  removeNewJobMaterialEntry: (index: number) => void;
  jobStatusOptions: string[];
  paymentStatusOptions: string[];
}

export default function NewJobDialog({
  jobEditorMode,
  setJobEditorMode,
  addJobFormRef,
  createJobFromJobsTab,
  saveCurrentEstimateTemplate,
  setMakerWorldMessage,
  savedEstimateTemplates,
  applySavedEstimateTemplate,
  deleteEstimateTemplate,
  newJobForm,
  setNewJobForm,
  machineOptions,
  setMakerWorldUrl,
  setModelUrlMessage,
  isLookingUpModelName,
  lookupModelTitle,
  modelUrlMessage,
  makerWorldImportPreview,
  addNewJobMaterialEntry,
  newJobMaterialEntries,
  materials,
  updateNewJobMaterialEntry,
  removeNewJobMaterialEntry,
  jobStatusOptions,
  paymentStatusOptions,
}: NewJobDialogProps) {
  return (
    <div
      className={jobEditorMode === "create" ? "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 no-print sm:p-6" : "hidden"}
      style={{ overflowY: "auto", overscrollBehavior: "contain" }}
      onClick={() => setJobEditorMode("none")}
    >
      {jobEditorMode === "create" && (
        <form
          ref={addJobFormRef}
          onSubmit={createJobFromJobsTab}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-job-dialog-title"
          className="w-full max-w-5xl rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl sm:p-6"
          style={{ maxHeight: "92vh", overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">New quote</p>
              <h3 id="add-job-dialog-title" className="mt-2 text-xl font-semibold">Start with the basics</h3>
              <p className="mt-1 text-sm text-slate-400">Add the key details for a quick price. You can fill in production tracking later.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setJobEditorMode("none")} className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">Cancel</button>
              <button type="submit" className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300">Save &amp; calculate price</button>
            </div>
          </div>

          <details className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-white">Use a saved estimate</summary>
            <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white">Estimate catalogue</h4>
                <p className="mt-1 text-xs text-slate-400">Save model-based templates for quick pricing without customer details.</p>
              </div>
              <button
                type="button"
                onClick={() => saveCurrentEstimateTemplate().catch((error) => setMakerWorldMessage(error instanceof Error ? error.message : "Failed to save estimate template"))}
                className="rounded-xl border border-cyan-700 px-3 py-2 text-xs text-cyan-300"
              >
                Save current as template
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {savedEstimateTemplates.slice(0, 8).map((template) => (
                <div key={template.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs">
                  <div>
                    <p className="font-medium text-white">{template.name}</p>
                    <p className="text-slate-400">{template.machineType} • Runtime {formatMinutesAsPrintTime(Number(template.machineRunTimeMinutes || 0))} • Labour {template.labourTimeMinutes}m</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => applySavedEstimateTemplate(template).catch(() => undefined)} className="rounded-full border border-cyan-700 px-3 py-1 text-cyan-300">Use</button>
                    <button type="button" onClick={() => deleteEstimateTemplate(template.id).catch(() => undefined)} className="mf-btn mf-btn--sm mf-btn--danger">Delete</button>
                  </div>
                </div>
              ))}
              {!savedEstimateTemplates.length ? <p className="text-xs text-slate-500">No saved templates yet.</p> : null}
            </div>
          </div>
            </div>
          </details>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block">Job name</span>
              <input value={newJobForm.name} onChange={(e) => setNewJobForm({ ...newJobForm, name: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" required />
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block">Customer (optional)</span>
              <input value={newJobForm.customer} onChange={(e) => setNewJobForm({ ...newJobForm, customer: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block">Equipment</span>
              <select value={newJobForm.machineType} onChange={(e) => setNewJobForm({ ...newJobForm, machineType: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                {machineOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PrintTimeInput value={newJobForm.machineRunTimeMinutes} onChange={(minutes) => setNewJobForm({ ...newJobForm, machineRunTimeMinutes: minutes })} inputClassName="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
            <PrintTimeInput label="Labour time" value={newJobForm.labourTimeMinutes} onChange={(minutes) => setNewJobForm({ ...newJobForm, labourTimeMinutes: minutes })} inputClassName="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Model URL (optional)</span>
                <input value={newJobForm.sourceUrl} onChange={(e) => { setNewJobForm({ ...newJobForm, sourceUrl: e.target.value }); setMakerWorldUrl(e.target.value); setModelUrlMessage(""); }} placeholder="Paste a 3D model page link" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
              </label>
              <button type="button" disabled={!newJobForm.sourceUrl.trim() || isLookingUpModelName} onClick={() => lookupModelTitle().catch(() => undefined)} className="rounded-xl border border-cyan-700 px-4 py-2 text-sm text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">
                {isLookingUpModelName ? "Reading model page..." : "Fill job name"}
              </button>
              <p className="text-xs text-slate-500 sm:col-span-2">Try a link from 3Drop, Printables (Prusa), MakerWorld, Thingiverse or Cults3D. You can also enter the job name yourself.</p>
              {modelUrlMessage ? <p className="text-xs text-cyan-300 sm:col-span-2" role="status">{modelUrlMessage}</p> : null}
              {makerWorldImportPreview ? <img src={makerWorldImportPreview} alt="MakerWorld model preview" className="h-24 w-24 rounded-xl object-cover sm:col-span-2" /> : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white">Materials for this job</h4>
                <p className="mt-1 text-xs text-slate-400">Enter the estimated amount for a more useful price. Remove the row if no tracked material applies.</p>
              </div>
              <button type="button" onClick={addNewJobMaterialEntry} className="rounded-full border border-cyan-700 px-3 py-1 text-xs text-cyan-300">Add material</button>
            </div>
            <div className="space-y-3">
              {newJobMaterialEntries.map((entry, index) => (
                <div key={`${entry.materialId}-${index}`} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 md:grid-cols-[1.6fr_1fr_auto]">
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Material</span>
                    <select value={entry.materialId} onChange={(e) => updateNewJobMaterialEntry(index, "materialId", e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                      {materials.map((material) => (
                        <option key={material.id} value={material.id}>{material.name} {material.color ? `• ${material.color}` : ""}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="mb-2 block">Estimated amount (g)</span>
                    <input type="number" min="0" step="0.01" placeholder="e.g. 85" value={entry.usageQuantity} onChange={(e) => updateNewJobMaterialEntry(index, "usageQuantity", e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                  </label>
                  <button type="button" onClick={() => removeNewJobMaterialEntry(index)} className="self-end rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">Remove</button>
                </div>
              ))}
            </div>
          </div>

          <details className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-white">Optional pricing and production details</summary>
            <div className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block">Quote / job status</span>
              <select value={newJobForm.status} onChange={(e) => setNewJobForm({ ...newJobForm, status: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                {jobStatusOptions.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>{statusOption}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block">Payment status</span>
              <select value={newJobForm.paymentStatus} onChange={(e) => setNewJobForm({ ...newJobForm, paymentStatus: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                {paymentStatusOptions.map((paymentStatusOption) => (
                  <option key={paymentStatusOption} value={paymentStatusOption}>{paymentStatusOption}</option>
                ))}
              </select>
            </label>
            <PrintTimeInput label="Setup time" value={newJobForm.setupTimeMinutes} onChange={(minutes) => setNewJobForm({ ...newJobForm, setupTimeMinutes: minutes })} inputClassName="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
            <PrintTimeInput label="Post-processing" value={newJobForm.postProcessingMinutes} onChange={(minutes) => setNewJobForm({ ...newJobForm, postProcessingMinutes: minutes })} inputClassName="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block">Deposit paid (£)</span>
              <input type="number" step="0.01" value={newJobForm.depositPaidAmount} onChange={(e) => setNewJobForm({ ...newJobForm, depositPaidAmount: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block">Queue position</span>
              <input type="number" min="0" value={newJobForm.queuePosition} onChange={(e) => setNewJobForm({ ...newJobForm, queuePosition: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block">Due date</span>
              <input type="date" value={newJobForm.dueDate} onChange={(e) => setNewJobForm({ ...newJobForm, dueDate: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block">Rework cost (£)</span>
              <input type="number" step="0.01" value={newJobForm.reworkCost} onChange={(e) => setNewJobForm({ ...newJobForm, reworkCost: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
              <p className="mt-1 text-xs text-slate-500">Use a negative value (for example -5.00) to apply a manual pricing correction.</p>
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block">Failure waste (g)</span>
              <input type="number" step="0.01" value={newJobForm.failureWasteGrams} onChange={(e) => setNewJobForm({ ...newJobForm, failureWasteGrams: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block">Failure cost (£)</span>
              <input type="number" step="0.01" value={newJobForm.failureCost} onChange={(e) => setNewJobForm({ ...newJobForm, failureCost: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block">QA passed</span>
              <select value={newJobForm.qaPassed ? "yes" : "no"} onChange={(e) => setNewJobForm({ ...newJobForm, qaPassed: e.target.value === "yes" })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-slate-300 md:col-span-2">
              <span className="mb-2 block">QA checklist (one item per line)</span>
              <textarea value={newJobForm.qaChecklistText} onChange={(e) => setNewJobForm({ ...newJobForm, qaChecklistText: e.target.value })} rows={3} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
            </label>
            <label className="block text-sm text-slate-300 md:col-span-2">
              <span className="mb-2 block">Rework notes</span>
              <textarea value={newJobForm.reworkNotes} onChange={(e) => setNewJobForm({ ...newJobForm, reworkNotes: e.target.value })} rows={2} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
            </label>
            <label className="block text-sm text-slate-300 md:col-span-2">
              <span className="mb-2 block">Failure reason</span>
              <input value={newJobForm.failureReason} onChange={(e) => setNewJobForm({ ...newJobForm, failureReason: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
            </label>
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={newJobForm.isRush}
              onChange={(e) => setNewJobForm({ ...newJobForm, isRush: e.target.checked })}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900"
            />
            Apply rush fee for this job
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block">Setup fee for this job (£)</span>
              <input type="number" min="0" step="0.01" value={newJobForm.setupFee} onChange={(e) => setNewJobForm({ ...newJobForm, setupFee: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block">Delivery charge for this job (£)</span>
              <input type="number" min="0" step="0.01" value={newJobForm.deliveryCharge} onChange={(e) => setNewJobForm({ ...newJobForm, deliveryCharge: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
            </label>
          </div>
            </div>
          </details>

          <div className="flex justify-end">
            <button type="submit" className="rounded-full border border-cyan-700 px-4 py-2 text-sm text-cyan-300">Save &amp; calculate price</button>
          </div>
        </form>
      )}
    </div>
  );
}

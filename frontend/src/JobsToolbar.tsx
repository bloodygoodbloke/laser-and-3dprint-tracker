import type { Job } from "./types";
import { formatMinutesAsPrintTime } from "./printTime";
import { formatDate } from "./format";

interface JobsToolbarProps {
  openNewJobEditor: () => void;
  jobSearchTerm: string;
  setJobSearchTerm: (value: string) => void;
  jobStatusFilter: string;
  setJobStatusFilter: (value: string) => void;
  statusOptions: readonly string[];
  jobMachineFilter: string;
  setJobMachineFilter: (value: string) => void;
  machineOptions: string[];
  filteredJobs: Job[];
  jobs: Job[];
  estimateTemplates: Job[];
  applyEstimateTemplate: (template: Job) => void;
  queuedJobs: Job[];
  getDueRiskLabel: (job: Job) => string;
}

export default function JobsToolbar({
  openNewJobEditor,
  jobSearchTerm,
  setJobSearchTerm,
  jobStatusFilter,
  setJobStatusFilter,
  statusOptions,
  jobMachineFilter,
  setJobMachineFilter,
  machineOptions,
  filteredJobs,
  jobs,
  estimateTemplates,
  applyEstimateTemplate,
  queuedJobs,
  getDueRiskLabel,
}: JobsToolbarProps) {
  return (
    <>
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold">Jobs</h2>
        <p className="mt-2 text-sm text-slate-400">Click a job card to expand details, then choose Edit job or Create invoice.</p>
      </div>
      <button type="button" onClick={openNewJobEditor} className="rounded-full border border-cyan-700 px-4 py-2 text-sm text-cyan-300">Price a job</button>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
      <label className="block text-sm text-slate-300">
        <span className="mb-2 block">Search production jobs</span>
        <input
          value={jobSearchTerm}
          onChange={(e) => setJobSearchTerm(e.target.value)}
          placeholder="Search by name, customer, or job number"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
        />
      </label>
      <label className="block text-sm text-slate-300">
        <span className="mb-2 block">Status filter</span>
        <select value={jobStatusFilter} onChange={(e) => setJobStatusFilter(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
          {statusOptions.map((statusOption) => (
            <option key={statusOption} value={statusOption}>{statusOption}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm text-slate-300">
        <span className="mb-2 block">Equipment filter</span>
        <select value={jobMachineFilter} onChange={(e) => setJobMachineFilter(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
          <option value="All">All</option>
          {machineOptions.filter((machineName) => machineName !== "Other").map((machineName) => (
            <option key={machineName} value={machineName}>{machineName}</option>
          ))}
        </select>
      </label>
      <div className="self-end rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
        {filteredJobs.length} of {jobs.length} shown
      </div>
    </div>
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Estimate catalogue</h3>
        <span className="text-xs text-slate-400">{estimateTemplates.length} saved templates</span>
      </div>
      <p className="mb-3 text-xs text-slate-400">Set any job to status <strong>Estimate Template</strong> to save it in your reusable pricing catalogue.</p>
      <div className="space-y-2">
        {estimateTemplates.slice(0, 8).map((job) => (
          <div key={`estimate-template-${job.id}`} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm">
            <div>
              <p className="font-medium text-white">{job.name}</p>
              <p className="text-slate-400">{job.machineType} • Runtime {formatMinutesAsPrintTime(Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0))} • Labour {job.labourTimeMinutes ?? job.estTimeMinutes ?? 0} mins</p>
            </div>
            <button
              type="button"
              onClick={() => applyEstimateTemplate(job)}
              className="rounded-full border border-cyan-700 px-3 py-1 text-xs text-cyan-300"
            >
              Use template
            </button>
          </div>
        ))}
        {!estimateTemplates.length ? <p className="text-sm text-slate-400">No estimate templates yet. Open a job and set status to Estimate Template.</p> : null}
      </div>
    </div>
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Production schedule</h3>
        <span className="text-xs text-slate-400">{queuedJobs.length} active queue items</span>
      </div>
      <div className="space-y-2">
        {queuedJobs.map((job) => {
          const dueRisk = getDueRiskLabel(job);
          const riskTone = dueRisk === "Overdue"
            ? "bg-rose-600/20 text-rose-300"
            : dueRisk === "At risk"
              ? "bg-amber-600/20 text-amber-300"
              : dueRisk === "Watch"
                ? "bg-yellow-600/20 text-yellow-300"
                : "bg-emerald-600/20 text-emerald-300";

          return (
            <div key={`queue-${job.id}`} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-white">#{job.queuePosition || 0} • {job.name}</p>
                <p className="text-slate-400">{job.machineType} • Due {job.dueDate ? formatDate(job.dueDate) : "Not set"}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs ${riskTone}`}>{dueRisk}</span>
            </div>
          );
        })}
        {!queuedJobs.length ? <p className="text-sm text-slate-400">No pending or in-progress queue items yet.</p> : null}
      </div>
    </div>
    </>
  );
}

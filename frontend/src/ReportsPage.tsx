import type { Job } from "./types";
import { formatCurrency } from "./format";

interface ReportSummary {
  jobsCount: number;
  jobsWithCostCount: number;
  revenue: number;
  base: number;
  margin: number;
  runtimeMinutes: number;
  labourMinutes: number;
  marginPercent: number;
}

interface MarginByMachineOrCustomer {
  label: string;
  margin: number;
  marginPercent: number;
}

interface MarginByMaterialType {
  label: string;
  allocatedMargin: number;
  marginPercent: number;
}

interface ReportsPageProps {
  reportStartDate: string;
  setReportStartDate: (value: string) => void;
  reportEndDate: string;
  setReportEndDate: (value: string) => void;
  reportStatusFilter: string;
  setReportStatusFilter: (value: string) => void;
  statusOptions: readonly string[];
  reportMachineFilter: string;
  setReportMachineFilter: (value: string) => void;
  machineOptions: string[];
  reportCustomerFilter: string;
  setReportCustomerFilter: (value: string) => void;
  reportCustomers: string[];
  reportSummary: ReportSummary;
  marginByMachine: MarginByMachineOrCustomer[];
  marginByMaterialType: MarginByMaterialType[];
  marginByCustomer: MarginByMachineOrCustomer[];
  reportJobs: Job[];
  exportReportCsv: () => void;
  getBaseCostTotal: (job: Job) => number;
  getCustomerCharge: (job: Job) => number;
}

export default function ReportsPage({
  reportStartDate,
  setReportStartDate,
  reportEndDate,
  setReportEndDate,
  reportStatusFilter,
  setReportStatusFilter,
  statusOptions,
  reportMachineFilter,
  setReportMachineFilter,
  machineOptions,
  reportCustomerFilter,
  setReportCustomerFilter,
  reportCustomers,
  reportSummary,
  marginByMachine,
  marginByMaterialType,
  marginByCustomer,
  reportJobs,
  exportReportCsv,
  getBaseCostTotal,
  getCustomerCharge,
}: ReportsPageProps) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Reporting page</h2>
          <p className="mt-2 text-sm text-slate-400">Filter production jobs by date range, status, equipment, and customer, then export report-ready data.</p>
        </div>
        <button type="button" onClick={exportReportCsv} className="rounded-full border border-cyan-700 px-4 py-2 text-sm text-cyan-300">Export CSV</button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="flex items-center gap-4 text-sm text-slate-300">
          <span className="w-40 shrink-0">Start date</span>
          <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
        </label>
        <label className="flex items-center gap-4 text-sm text-slate-300">
          <span className="w-40 shrink-0">End date</span>
          <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
        </label>
        <label className="flex items-center gap-4 text-sm text-slate-300">
          <span className="w-40 shrink-0">Status</span>
          <select value={reportStatusFilter} onChange={(e) => setReportStatusFilter(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
            {statusOptions.map((statusOption) => (
              <option key={`report-status-${statusOption}`} value={statusOption}>{statusOption}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-4 text-sm text-slate-300">
          <span className="w-40 shrink-0">Machine</span>
          <select value={reportMachineFilter} onChange={(e) => setReportMachineFilter(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
            <option value="All">All</option>
            {machineOptions.map((option) => (
              <option key={`report-machine-${option}`} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-4 text-sm text-slate-300 lg:col-span-2">
          <span className="w-40 shrink-0">Customer</span>
          <select value={reportCustomerFilter} onChange={(e) => setReportCustomerFilter(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
            <option value="All">All customers</option>
            {reportCustomers.map((customerName) => (
              <option key={`report-customer-${customerName}`} value={customerName}>{customerName}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Jobs in scope</p>
          <p className="mt-2 text-2xl font-semibold text-white">{reportSummary.jobsCount}</p>
          <p className="text-xs text-slate-400">{reportSummary.jobsWithCostCount} costed jobs</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Revenue</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(reportSummary.revenue)}</p>
          <p className="text-xs text-slate-400">Customer-charge total</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Base cost</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(reportSummary.base)}</p>
          <p className="text-xs text-slate-400">Internal production base</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Margin</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(reportSummary.margin)}</p>
          <p className="text-xs text-slate-400">{reportSummary.marginPercent.toFixed(1)}% margin rate</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <h3 className="text-sm font-semibold text-white">Margin reporting</h3>
        <p className="mt-1 text-xs text-slate-400">Internal margin analysis based on calculated customer charge and base total.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h4 className="text-sm font-semibold text-white">By machine</h4>
            <div className="mt-2 space-y-2 text-xs">
              {marginByMachine.slice(0, 6).map((row) => (
                <div key={`machine-margin-report-${row.label}`} className="flex items-center justify-between">
                  <span className="text-slate-300">{row.label}</span>
                  <span className="text-slate-200">{formatCurrency(row.margin)} ({row.marginPercent.toFixed(1)}%)</span>
                </div>
              ))}
              {!marginByMachine.length ? <p className="text-slate-500">No costed jobs yet.</p> : null}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h4 className="text-sm font-semibold text-white">By material type</h4>
            <div className="mt-2 space-y-2 text-xs">
              {marginByMaterialType.slice(0, 6).map((row) => (
                <div key={`material-margin-report-${row.label}`} className="flex items-center justify-between">
                  <span className="text-slate-300">{row.label}</span>
                  <span className="text-slate-200">{formatCurrency(row.allocatedMargin)} ({row.marginPercent.toFixed(1)}%)</span>
                </div>
              ))}
              {!marginByMaterialType.length ? <p className="text-slate-500">No material margin data yet.</p> : null}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h4 className="text-sm font-semibold text-white">By customer</h4>
            <div className="mt-2 space-y-2 text-xs">
              {marginByCustomer.slice(0, 6).map((row) => (
                <div key={`customer-margin-report-${row.label}`} className="flex items-center justify-between">
                  <span className="text-slate-300">{row.label}</span>
                  <span className="text-slate-200">{formatCurrency(row.margin)} ({row.marginPercent.toFixed(1)}%)</span>
                </div>
              ))}
              {!marginByCustomer.length ? <p className="text-slate-500">No customer margin data yet.</p> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Report rows</h3>
          <span className="text-xs text-slate-400">Runtime {(reportSummary.runtimeMinutes / 60).toFixed(1)} h • Labour {(reportSummary.labourMinutes / 60).toFixed(1)} h</span>
        </div>
        <div className="space-y-2">
          {reportJobs.map((job) => {
            const baseCost = Number(getBaseCostTotal(job) || 0);
            const customerCharge = Number(getCustomerCharge(job) || 0);
            const margin = customerCharge - baseCost;
            return (
              <div key={`report-row-${job.id}`} className="grid gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr]">
                <span className="text-slate-200">{job.name} • {job.jobNumber || "No job number"}</span>
                <span className="text-slate-400">{job.customer || "Walk-in"}</span>
                <span className="text-slate-400">{job.machineType}</span>
                <span className="text-slate-400">{job.status}</span>
                <span className="text-slate-300">{formatCurrency(customerCharge)}</span>
                <span className={`${margin >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatCurrency(margin)}</span>
              </div>
            );
          })}
          {!reportJobs.length ? <p className="text-sm text-slate-400">No jobs match the selected report filters.</p> : null}
        </div>
      </div>
    </section>
  );
}

import type { Job } from "./types";
import { KpiCard, StatusChip, SummaryCard, UtilisationRow, onTimeTone, overdueTone, utilisationTone } from "./dashboardUi";
import { formatCurrency, formatDate } from "./format";

interface DeliveryAndUtilization {
  dueEligibleCount: number;
  onTimeCount: number;
  onTimePercent: number;
  overdueOpen: number;
  machineCount: number;
  scheduledHours: number;
  utilizationPercent: number;
  utilizationByMachine: { machineType: string; hours: number; utilizationPercent: number }[];
}

interface MachineQueueProjection {
  machineType: string;
  projectedJobs: { job: Job; projectedCompletion: Date }[];
  totalMinutes: number;
}

interface ScheduleCalendarDay {
  date: Date;
  dueCount: number;
  projectedCount: number;
  totalRuntimeMinutes: number;
}

interface DashboardPageProps {
  deliveryAndUtilization: DeliveryAndUtilization;
  workshopDailyCapacityHours: number;
  scheduleHorizonDays: number;
  onPriceJob: () => void;
  onAddCustomer: () => void;
  onEditJob: (jobId: string) => void;
  pendingJobs: Job[];
  jobs: Job[];
  jobsWaitingPayment: number;
  jobsWaitingDispatch: number;
  recentJobs: Job[];
  getInvoiceChargeBreakdown: (job: Job) => { customerCharge: number };
  calculateJobCost: (job: Job) => Promise<void>;
  getCostButtonLabel: (job: Job) => string;
  machineQueueProjections: MachineQueueProjection[];
  scheduleCalendarDays: ScheduleCalendarDay[];
}

export default function DashboardPage({
  deliveryAndUtilization,
  workshopDailyCapacityHours,
  scheduleHorizonDays,
  onPriceJob,
  onAddCustomer,
  onEditJob,
  pendingJobs,
  jobs,
  jobsWaitingPayment,
  jobsWaitingDispatch,
  recentJobs,
  getInvoiceChargeBreakdown,
  calculateJobCost,
  getCostButtonLabel,
  machineQueueProjections,
  scheduleCalendarDays,
}: DashboardPageProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-3 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Workshop operations</h2>
          {(() => {
            const d = deliveryAndUtilization;
            const onTime = onTimeTone(d.onTimePercent, d.dueEligibleCount);
            const overdue = overdueTone(d.overdueOpen);
            const util = utilisationTone(d.utilizationPercent, d.scheduledHours);
            return (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label="On-time delivery"
                  tone={onTime.tone}
                  chip={onTime.label}
                  value={d.dueEligibleCount === 0 ? "—" : `${d.onTimePercent.toFixed(1)}%`}
                  note={d.dueEligibleCount === 0 ? "Awaiting more completed jobs with due dates" : `${d.onTimeCount} of ${d.dueEligibleCount} completed due ${d.dueEligibleCount === 1 ? "job" : "jobs"}${d.dueEligibleCount < 3 ? " • early data" : ""}`}
                />
                <KpiCard
                  label="Overdue open jobs"
                  tone={overdue.tone}
                  chip={overdue.label}
                  value={d.overdueOpen}
                  note={d.overdueOpen === 0 ? "No overdue jobs" : "Pending or in-progress past due date"}
                />
                <KpiCard
                  label="Queued runtime"
                  tone={d.scheduledHours > 0 ? "info" : "neutral"}
                  value={`${d.scheduledHours.toFixed(1)} h`}
                  note={d.scheduledHours > 0 ? `Across ${d.machineCount} equipment queues` : "Nothing queued yet"}
                />
                <KpiCard
                  label="Weekly utilisation"
                  tone={util.tone}
                  chip={util.label}
                  value={`${d.utilizationPercent.toFixed(1)}%`}
                  note={`vs ${workshopDailyCapacityHours}h/day capacity assumption`}
                />
              </div>
            );
          })()}
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <h3 className="text-sm font-semibold text-white">Equipment utilisation <span className="font-normal text-slate-400">(next 7-day queue model)</span></h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {deliveryAndUtilization.utilizationByMachine.map((row) => (
                <UtilisationRow key={`utilization-${row.machineType}`} name={row.machineType} hours={row.hours} percent={row.utilizationPercent} />
              ))}
            </div>
            {!deliveryAndUtilization.utilizationByMachine.length ? <p className="mt-2 text-sm text-slate-400">No queued equipment yet. Queue a job to see utilisation here.</p> : null}
          </div>
        </section>

        <section className="lg:col-span-3 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Production Jobs</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onPriceJob}
                className="mf-btn"
              >
                Price a job
              </button>
              <button type="button" onClick={onAddCustomer} className="mf-btn mf-btn--outline">Add customer</button>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Pending production jobs" tone="info" value={pendingJobs.length} note={pendingJobs.length === 0 ? "No pending jobs" : "Ready to produce"} />
            <SummaryCard label="Total production jobs" tone="neutral" value={jobs.length} note="All jobs in MakerFlow" />
            <SummaryCard label="Waiting for payment" tone={jobsWaitingPayment === 0 ? "good" : "warn"} value={jobsWaitingPayment} note={jobsWaitingPayment === 0 ? "No action required" : "Pending jobs not yet paid"} />
            <SummaryCard label="Waiting for dispatch" tone={jobsWaitingDispatch === 0 ? "good" : "violet"} value={jobsWaitingDispatch} note={jobsWaitingDispatch === 0 ? "No action required" : "Paid and ready to dispatch"} />
          </div>
        </section>

        <section className="lg:col-span-3 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Recent production jobs</h2>
          <div className="mt-4 space-y-3">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{job.name}</p>
                    <StatusChip status={job.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{job.jobNumber || "No job number"} • {job.machineType}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Minimum price</p>
                    <p className="text-lg font-semibold text-white">{job.cost ? formatCurrency(getInvoiceChargeBreakdown(job).customerCharge) : "Not costed"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditJob(job.id)}
                    className="mf-btn mf-btn--outline mf-btn--sm"
                  >
                    Edit job
                  </button>
                  <button type="button" onClick={() => calculateJobCost(job)} className="mf-btn mf-btn--sm">{getCostButtonLabel(job)}</button>
                </div>
              </div>
            ))}
            {recentJobs.length === 0 ? <p className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">No jobs yet. Use "Price a job" to create your first one.</p> : null}
          </div>
        </section>

        <section className="lg:col-span-3 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Scheduling calendar (next {scheduleHorizonDays} days)</h2>
              <p className="mt-2 text-sm text-slate-400">Calendar view combines due dates with projected completion based on machine queue order and runtime.</p>
            </div>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{machineQueueProjections.length} machine queues</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {scheduleCalendarDays.map((day) => (
              <div key={day.date.toISOString()} className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <p className="text-sm font-medium text-white">{formatDate(day.date, { weekday: "short", month: "short", day: "numeric" })}</p>
                <p className="mt-1 text-xs text-slate-400">Due jobs: {day.dueCount}</p>
                <p className="text-xs text-slate-400">Projected completions: {day.projectedCount}</p>
                <p className="text-xs text-slate-400">Queued runtime due: {(day.totalRuntimeMinutes / 60).toFixed(1)} h</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {machineQueueProjections.map((group) => (
              <div key={group.machineType} className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-white">{group.machineType}</span>
                  <span className="text-slate-400">Projected queue runtime {(group.totalMinutes / 60).toFixed(1)} h</span>
                </div>
                <div className="mt-2 space-y-1">
                  {group.projectedJobs.slice(0, 3).map(({ job, projectedCompletion }) => (
                    <p key={`${group.machineType}-${job.id}`} className="text-xs text-slate-400">{job.name}: completes ~ {projectedCompletion.toLocaleString()}</p>
                  ))}
                  {!group.projectedJobs.length ? <p className="text-xs text-slate-500">No queued jobs.</p> : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-3 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        </section>
      </div>
    </div>
  );
}

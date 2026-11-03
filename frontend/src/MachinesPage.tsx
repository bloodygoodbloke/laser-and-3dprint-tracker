import type { Dispatch, FormEvent, SetStateAction } from "react";
import RuntimeDurationInput, { formatHoursAsDuration } from "./RuntimeDurationInput";
import { calculateMachineLifecycle } from "./machineLifecycle";
import type { Job, MachineElectricitySetting } from "./types";

interface MachineForm {
  name: string;
  wattage: string;
  purchaseDate: string;
  depreciationCost: string;
  replacementRunHours: string;
  manualRunHours: string;
}

interface MachinesPageProps {
  openAddMachineForm: () => void;
  showMachineEditor: boolean;
  editingMachineName: string | null;
  closeMachineForm: () => void;
  saveMachine: (event: FormEvent) => Promise<void>;
  machineForm: MachineForm;
  setMachineForm: Dispatch<SetStateAction<MachineForm>>;
  machineProfiles: [string, MachineElectricitySetting][];
  jobs: Job[];
  formatCurrency: (value?: number | null) => string;
  startEditingMachine: (machineName: string) => void;
  removeMachine: (machineName: string) => Promise<void>;
  machineMessage: string;
}

export default function MachinesPage({
  openAddMachineForm,
  showMachineEditor,
  editingMachineName,
  closeMachineForm,
  saveMachine,
  machineForm,
  setMachineForm,
  machineProfiles,
  jobs,
  formatCurrency,
  startEditingMachine,
  removeMachine,
  machineMessage,
}: MachinesPageProps) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Equipment</h2>
          <p className="mt-2 text-sm text-slate-400">Manage the equipment used in production jobs and cost calculations.</p>
        </div>
        <button type="button" onClick={openAddMachineForm} className="rounded-full border border-cyan-700 px-4 py-2 text-sm text-cyan-300">Add equipment</button>
      </div>

      {showMachineEditor ? (
        <div className="mt-6 rounded-2xl border border-cyan-700/40 bg-slate-950 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">{editingMachineName ? "Edit equipment" : "Add equipment"}</h3>
              <p className="mt-1 text-sm text-slate-400">Set name and machine billing profile details.</p>
            </div>
            <button type="button" onClick={closeMachineForm} className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">Close</button>
          </div>

          <form onSubmit={saveMachine} className="space-y-3">
            <label className="flex items-center gap-4 text-sm text-slate-300">
              <span className="w-56 shrink-0">Equipment name</span>
              <input value={machineForm.name} onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" required />
            </label>
            <label className="flex items-center gap-4 text-sm text-slate-300">
              <span className="w-56 shrink-0">Wattage (W)</span>
              <input type="number" step="0.1" value={machineForm.wattage} onChange={(e) => setMachineForm({ ...machineForm, wattage: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
            </label>
            <label className="flex items-center gap-4 text-sm text-slate-300">
              <span className="w-56 shrink-0">Purchase date</span>
              <input type="date" value={machineForm.purchaseDate} onChange={(e) => setMachineForm({ ...machineForm, purchaseDate: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
            </label>
            <label className="flex items-center gap-4 text-sm text-slate-300">
              <span className="w-56 shrink-0">Purchase cost</span>
              <input type="number" step="0.01" value={machineForm.depreciationCost} onChange={(e) => setMachineForm({ ...machineForm, depreciationCost: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
            </label>
            <RuntimeDurationInput value={machineForm.replacementRunHours} onChange={(hours) => setMachineForm({ ...machineForm, replacementRunHours: hours })} inputClassName="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
            <RuntimeDurationInput label="Runtime outside tracker (added to jobs logged here)" value={machineForm.manualRunHours} onChange={(hours) => setMachineForm({ ...machineForm, manualRunHours: hours })} inputClassName="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />

            <div className="flex justify-end gap-3">
              <button type="button" onClick={closeMachineForm} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button>
              <button className="rounded-full border border-cyan-700 px-4 py-2 text-sm text-cyan-300">{editingMachineName ? "Save equipment" : "Add equipment"}</button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {machineProfiles.map(([machineName, machineSetting]) => (
          <div key={machineName} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-white">{machineName}</p>
                <p className="text-sm text-slate-400">{machineSetting.wattage ?? 0}W • Purchase cost {formatCurrency(machineSetting.depreciationCost ?? 0)} • Replacement runtime {formatHoursAsDuration(Number(machineSetting.replacementRunHours ?? 0))}</p>
                {(() => {
                  const lifecycle = calculateMachineLifecycle(machineName, machineSetting.purchaseDate, Number(machineSetting.replacementRunHours ?? 0), jobs, Number(machineSetting.manualRunHours ?? 0));
                  return (
                    <p className="text-sm text-slate-500">
                      Purchased {machineSetting.purchaseDate || "not set"} • Run so far {formatHoursAsDuration(lifecycle.usedHours)} • Remaining {formatHoursAsDuration(lifecycle.remainingHours)} • Est. replacement{" "}
                      {lifecycle.replacementDate ? lifecycle.replacementDate.toLocaleDateString() : machineSetting.purchaseDate ? "n/a (no runtime logged yet)" : "set a purchase date"}
                    </p>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => startEditingMachine(machineName)} className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300">Edit</button>
                <button type="button" onClick={() => removeMachine(machineName)} className="rounded-full border border-rose-700 px-3 py-1 text-sm text-rose-300">Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <h3 className="text-lg font-semibold text-white">Bambu telemetry (Equipment integration)</h3>
        <div className="mt-3 rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-4">
          <p className="font-medium text-cyan-200">Coming soon: a local telemetry connector to track the status of your Bambu printer.</p>
          <p className="mt-2 text-sm text-slate-300">This feature is in alpha testing and will be available when the application is deployed locally.</p>
        </div>
      </section>

      {machineMessage ? <p className="mt-4 text-sm text-cyan-300">{machineMessage}</p> : null}
    </section>
  );
}

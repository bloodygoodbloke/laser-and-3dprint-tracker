import type { Job } from "./types";

const COMPLETED_STATUSES = new Set(["Completed", "Invoiced"]);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface MachineLifecycle {
  usedHours: number;
  remainingHours: number;
  hoursPerDay: number | null;
  replacementDate: Date | null;
}

export const calculateMachineLifecycle = (
  machineName: string,
  purchaseDate: string | undefined,
  replacementRunHours: number,
  jobs: Job[],
  manualRunHours = 0,
  now: Date = new Date(),
): MachineLifecycle => {
  const purchase = purchaseDate ? new Date(purchaseDate) : null;
  const hasPurchase = !!purchase && !Number.isNaN(purchase.getTime());
  const key = machineName.trim().toLowerCase();

  const usedMinutes = jobs
    .filter((job) => COMPLETED_STATUSES.has(job.status) && job.machineType?.trim().toLowerCase() === key)
    .filter((job) => !hasPurchase || !job.createdAt || new Date(job.createdAt) >= purchase!)
    .reduce((sum, job) => sum + Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0), 0);

  const usedHours = usedMinutes / 60 + Math.max(0, manualRunHours);
  const remainingHours = Math.max(0, replacementRunHours - usedHours);
  if (!hasPurchase || replacementRunHours <= 0) {
    return { usedHours, remainingHours, hoursPerDay: null, replacementDate: null };
  }

  const daysSincePurchase = Math.max(1, (now.getTime() - purchase!.getTime()) / MS_PER_DAY);
  const hoursPerDay = usedHours / daysSincePurchase;
  if (remainingHours === 0) return { usedHours, remainingHours, hoursPerDay, replacementDate: now };
  if (hoursPerDay <= 0) return { usedHours, remainingHours, hoursPerDay, replacementDate: null };

  return {
    usedHours,
    remainingHours,
    hoursPerDay,
    replacementDate: new Date(now.getTime() + (remainingHours / hoursPerDay) * MS_PER_DAY),
  };
};

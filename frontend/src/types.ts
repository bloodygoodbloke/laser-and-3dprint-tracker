export interface Material {
  id: string;
  name: string;
  type: string;
  unit: string;
  color?: string;
  costPerUnit: number;
  stockLevel: number;
  reorderThreshold: number;
  jobs?: JobMaterial[];
}

export interface JobMaterial {
  id?: string;
  jobId?: string;
  materialId: string;
  material?: Material;
  usageQuantity: number;
  usageUnit: string;
  usageUnitCost: number;
}

export interface MachineElectricitySetting {
  name: string;
  wattage: number;
  depreciationCost?: number;
  replacementRunHours?: number;
}

export interface MaterialTypeMarkupSetting {
  percent: number;
}

export interface BillingSettings {
  id?: string;
  materialMarkupPercent: number;
  materialMarkupAmount: number;
  electricityMarkupPercent: number;
  electricityMarkupAmount: number;
  labourMarkupPercent: number;
  labourMarkupAmount: number;
  overheadMarkupPercent: number;
  overheadMarkupAmount: number;
  materialTypeMarkups?: Record<string, MaterialTypeMarkupSetting>;
  electricityCostPerKwh: number;
  depreciationCost: number;
  depreciationHours: number;
  labourRate: number;
  workshopHourlyRate: number;
  overheadPercent: number;
  machineElectricitySettings: Record<string, MachineElectricitySetting>;
}

export interface JobCost {
  id: string;
  jobId: string;
  materialCost: number;
  electricityCost: number;
  labourCost: number;
  overheadCost: number;
  totalCost: number;
  customerCharge: number;
}

export interface Job {
  id: string;
  jobNumber?: string;
  name: string;
  customer?: string | null;
  filePath?: string | null;
  machineType: string;
  estTimeMinutes: number;
  machineRunTimeMinutes?: number;
  labourTimeMinutes?: number;
  status: string;
  materials?: JobMaterial[];
  cost?: JobCost | null;
}

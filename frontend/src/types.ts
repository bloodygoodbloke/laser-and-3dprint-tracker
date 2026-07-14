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
  businessName?: string;
  businessLogoUrl?: string;
  businessAddress?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessWebsite?: string;
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
  depreciationMarkupPercent: number;
  labourRate: number;
  workshopHourlyRate: number;
  minimumCharge: number;
  setupFee: number;
  rushFeePercent: number;
  wasteFactorPercent: number;
  deliveryAmount: number;
  vatPercent: number;
  depositPercent: number;
  paymentTermsDays: number;
  overheadPercent: number;
  machineElectricitySettings: Record<string, MachineElectricitySetting>;
}

export interface Customer {
  id: string;
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
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
  dueDate?: string | null;
  queuePosition?: number;
  qaChecklist?: string[];
  qaPassed?: boolean;
  reworkCost?: number;
  reworkNotes?: string;
  isRush?: boolean;
  paymentStatus?: string;
  depositPaidAmount?: number;
  status: string;
  materials?: JobMaterial[];
  cost?: JobCost | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  purchases?: MaterialPurchase[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MaterialPurchase {
  id: string;
  supplierId: string;
  materialName: string;
  quantityKg: number;
  totalCost: number;
  purchasedAt: string;
  notes?: string;
  createdAt?: string;
}

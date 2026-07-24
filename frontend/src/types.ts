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
  adminBackgroundColor?: string;
  adminTextColor?: string;
  siteInputColor?: string;
  siteAccentColor?: string;
  siteAccentTextColor?: string;
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
  sourceUrl?: string;
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

export interface BambuDevice {
  id: string;
  name: string;
  serial: string;
  ipAddress?: string;
  isOnline: boolean;
  lastSeenAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BambuMachineStatus {
  id: string;
  deviceId: string;
  jobId?: string | null;
  nozzleTempC: number;
  bedTempC: number;
  chamberTempC: number;
  progressPct: number;
  amsSummary?: string;
  errorCode?: string;
  errorMessage?: string;
  reportedAt?: string;
  device?: BambuDevice;
  job?: Job;
}

export interface BambuEvent {
  id: string;
  deviceId: string;
  jobId?: string | null;
  eventType: string;
  payload?: string;
  createdAt?: string;
  device?: BambuDevice;
  job?: Job;
}

export interface BambuSpoolInventory {
  id: string;
  deviceId: string;
  slotName: string;
  materialName: string;
  color?: string;
  remainingGrams: number;
  updatedAt?: string;
  device?: BambuDevice;
}

export interface BambuMaintenancePrediction {
  id: string;
  deviceId: string;
  component: string;
  currentHours: number;
  intervalHours: number;
  predictedDueHours: number;
  riskLevel: string;
  updatedAt?: string;
  device?: BambuDevice;
}

export interface BambuFailureLog {
  id: string;
  deviceId: string;
  jobId?: string | null;
  errorCode?: string;
  message: string;
  severity: string;
  isResolved: boolean;
  createdAt?: string;
  resolvedAt?: string | null;
  device?: BambuDevice;
  job?: Job;
}

export interface BambuDashboardPayload {
  devices: BambuDevice[];
  latestStatuses: BambuMachineStatus[];
  openFailures: BambuFailureLog[];
  maintenance: BambuMaintenancePrediction[];
  events: BambuEvent[];
  spools: BambuSpoolInventory[];
}

export interface MakerWorldMetadata {
  url: string;
  title: string;
  description: string;
  previewImageUrl: string;
  tags: string[];
  estimatedMinutes: number;
  estimatedMaterialGrams: number;
}

export interface MakerWorldJobDraft {
  name: string;
  machineType: string;
  machineRunTimeMinutes: number;
  labourTimeMinutes: number;
  status: string;
  notes: string;
  sourceUrl: string;
  suggestedMaterialGrams: number;
  tags: string[];
  previewImageUrl: string;
}

export interface MakerWorldPrintProfile {
  profileName: string;
  layerHeightMm: number;
  nozzleTempC: number;
  bedTempC: number;
  speedMmPerSec: number;
  infillPercent: number;
  estimatedMinutes: number;
  estimatedMaterialGrams: number;
}

export interface BacklogIntakeRequest {
  requestType: "Bug" | "Feature Request";
  priority: "P1 Critical" | "P1 High" | "P2 Medium" | "P3 Low" | "Integrations";
  title: string;
  details: string;
}

export interface HelpIntakeRequestRecord {
  id: string;
  submittedAt: string;
  source: "help-form";
  requestType: "Bug" | "Feature Request";
  priority: "P1 Critical" | "P1 High" | "P2 Medium" | "P3 Low" | "Integrations";
  title: string;
  details: string;
}

export interface OwnerSessionStatus {
  isOwner: boolean;
  ownerLogin: string | null;
  ownerEmail?: string | null;
  ownerProvider?: "github" | "microsoft";
  authConfigured: boolean;
  providers?: {
    github: boolean;
    microsoft: boolean;
  };
  expiresAt?: string;
}

export interface OwnerAuthProviderDiagnostics {
  enabled: boolean;
  ownerIdentityConfigured: boolean;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  callbackUrl: string;
}

export interface OwnerAuthDiagnostics {
  authConfigured: boolean;
  redirectBaseConfigured: boolean;
  providers: {
    github: OwnerAuthProviderDiagnostics;
    microsoft: OwnerAuthProviderDiagnostics;
  };
}

export interface BacklogIntakeResponse {
  id: string;
  type: "Bug" | "Feature Request";
  priority: string;
  status: "Planned" | "On Hold";
  reviewStatus: "Human Review" | "Reviewed" | "Auto Reviewed";
  reviewReason: string;
  reviewRecommendation: "Auto Candidate" | "Human Review Required";
  triageReason: string;
  title: string;
  details: string;
}

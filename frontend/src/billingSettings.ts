import type { BillingSettings } from "./types";

export const DEFAULT_ADMIN_BACKGROUND_COLOR = "#FFFFFF";
export const DEFAULT_ADMIN_TEXT_COLOR = "#1C1C1E";
export const DEFAULT_SITE_INPUT_COLOR = "#E5E5E7";
export const DEFAULT_SITE_ACCENT_COLOR = "#3A7DFF";
export const DEFAULT_SITE_ACCENT_TEXT_COLOR = "#1C1C1E";
export const BILLING_LOCAL_STORAGE_KEY = "billing-settings-local-backup-v1";

export const defaultMachineNames = [
  "BambuLab P2S Printer",
  "Creality Falcon A1 Pro Laser",
  "Anycubic SLA Printer",
  "Neje Laser",
  "3018 CNC/Laser",
  "Other",
];

const getDefaultMachineRuntimeSettings = () => Object.fromEntries(
  defaultMachineNames
    .filter((name) => name !== "Other")
    .map((name) => [name, { name, wattage: 0, depreciationCost: 0, replacementRunHours: 0 }]),
);

export const blankBillingSettings = (): BillingSettings => ({
  businessName: "",
  businessLogoUrl: "",
  businessAddress: "",
  businessEmail: "",
  businessPhone: "",
  businessWebsite: "",
  adminBackgroundColor: DEFAULT_ADMIN_BACKGROUND_COLOR,
  adminTextColor: DEFAULT_ADMIN_TEXT_COLOR,
  siteInputColor: DEFAULT_SITE_INPUT_COLOR,
  siteAccentColor: DEFAULT_SITE_ACCENT_COLOR,
  siteAccentTextColor: DEFAULT_SITE_ACCENT_TEXT_COLOR,
  materialMarkupPercent: 25,
  materialMarkupAmount: 0,
  materialTypeMarkups: {},
  electricityMarkupPercent: 25,
  electricityMarkupAmount: 0,
  labourMarkupPercent: 0,
  labourMarkupAmount: 0,
  overheadMarkupPercent: 0,
  overheadMarkupAmount: 0,
  electricityCostPerKwh: 0.2,
  depreciationCost: 0,
  depreciationHours: 0,
  depreciationMarkupPercent: 0,
  labourRate: 20,
  workshopHourlyRate: 0,
  minimumCharge: 0,
  setupFee: 0,
  rushFeePercent: 0,
  wasteFactorPercent: 0,
  deliveryAmount: 0,
  vatPercent: 0,
  depositPercent: 0,
  paymentTermsDays: 0,
  overheadPercent: 0.15,
  machineElectricitySettings: getDefaultMachineRuntimeSettings(),
});

export const normalizeHexColor = (value: unknown, fallback: string) => {
  const candidate = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(candidate)) {
    return candidate.toLowerCase();
  }
  return fallback;
};

const normalizeMarkupPercent = (value: unknown) => {
  const parsed = Number(value);
  return value !== null && value !== undefined && value !== "" && Number.isFinite(parsed) && parsed >= 0 ? parsed : 25;
};

const normalizeOptionalMarkupPercent = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const normalizeBillingSettingsForUi = (settings: Partial<BillingSettings>): BillingSettings => ({
  ...blankBillingSettings(),
  ...settings,
  materialMarkupPercent: normalizeMarkupPercent(settings.materialMarkupPercent),
  materialMarkupAmount: Number(settings.materialMarkupAmount ?? 0),
  electricityMarkupPercent: normalizeMarkupPercent(settings.electricityMarkupPercent),
  electricityMarkupAmount: Number(settings.electricityMarkupAmount ?? 0),
  labourMarkupPercent: Number(settings.labourMarkupPercent ?? 0),
  labourMarkupAmount: Number(settings.labourMarkupAmount ?? 0),
  overheadMarkupPercent: Number(settings.overheadMarkupPercent ?? 0),
  overheadMarkupAmount: Number(settings.overheadMarkupAmount ?? 0),
  electricityCostPerKwh: Number(settings.electricityCostPerKwh ?? 0.2),
  depreciationCost: Number(settings.depreciationCost ?? 0),
  depreciationHours: Number(settings.depreciationHours ?? 0),
  depreciationMarkupPercent: Number(settings.depreciationMarkupPercent ?? 0),
  labourRate: Number(settings.labourRate ?? 20),
  workshopHourlyRate: Number(settings.workshopHourlyRate ?? 0),
  minimumCharge: Number(settings.minimumCharge ?? 0),
  setupFee: Number(settings.setupFee ?? 0),
  rushFeePercent: Number(settings.rushFeePercent ?? 0),
  wasteFactorPercent: Number(settings.wasteFactorPercent ?? 0),
  deliveryAmount: Number(settings.deliveryAmount ?? 0),
  vatPercent: Number(settings.vatPercent ?? 0),
  depositPercent: Number(settings.depositPercent ?? 0),
  paymentTermsDays: Number(settings.paymentTermsDays ?? 0),
  businessName: String(settings.businessName ?? ""),
  businessLogoUrl: String(settings.businessLogoUrl ?? ""),
  businessAddress: String(settings.businessAddress ?? ""),
  businessEmail: String(settings.businessEmail ?? ""),
  businessPhone: String(settings.businessPhone ?? ""),
  businessWebsite: String(settings.businessWebsite ?? ""),
  adminBackgroundColor: normalizeHexColor(settings.adminBackgroundColor, DEFAULT_ADMIN_BACKGROUND_COLOR),
  adminTextColor: normalizeHexColor(settings.adminTextColor, DEFAULT_ADMIN_TEXT_COLOR),
  siteInputColor: normalizeHexColor(settings.siteInputColor, DEFAULT_SITE_INPUT_COLOR),
  siteAccentColor: normalizeHexColor(settings.siteAccentColor, DEFAULT_SITE_ACCENT_COLOR),
  siteAccentTextColor: normalizeHexColor(settings.siteAccentTextColor, DEFAULT_SITE_ACCENT_TEXT_COLOR),
  overheadPercent: Number(settings.overheadPercent ?? 0.15),
  materialTypeMarkups: Object.fromEntries(
    Object.entries(settings.materialTypeMarkups || {}).map(([materialType, rule]) => [
      materialType,
      { percent: normalizeOptionalMarkupPercent(rule?.percent) },
    ]),
  ),
  machineElectricitySettings: {
    ...getDefaultMachineRuntimeSettings(),
    ...Object.fromEntries(
      Object.entries(settings.machineElectricitySettings || {}).map(([machineName, machineSetting]) => [
        machineName,
        {
          name: machineName,
          wattage: Number(machineSetting?.wattage ?? 0),
          purchaseDate: machineSetting?.purchaseDate || "",
          depreciationCost: Number(machineSetting?.depreciationCost ?? 0),
          replacementRunHours: Number(machineSetting?.replacementRunHours ?? 0),
          manualRunHours: Number(machineSetting?.manualRunHours ?? 0),
        },
      ]),
    ),
  },
});

export const saveBillingSettingsToLocalBackup = (settingsToCache: BillingSettings) => {
  try {
    window.localStorage.setItem(BILLING_LOCAL_STORAGE_KEY, JSON.stringify(settingsToCache));
  } catch (_error) {
    // Ignore storage failures (private mode/quota limits).
  }
};

export const readBillingSettingsFromLocalBackup = (): BillingSettings | null => {
  try {
    const raw = window.localStorage.getItem(BILLING_LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BillingSettings>;
    return normalizeBillingSettingsForUi(parsed || {});
  } catch (_error) {
    return null;
  }
};

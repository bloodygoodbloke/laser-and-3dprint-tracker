import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent } from "react";
import api from "./api";
import { MaterialsPage } from "./MaterialsPage";
import { NumberInput } from "./NumberInput";
import BillingPage from "./BillingPage";
import ReportsPage from "./ReportsPage";
import SuppliersPage from "./SuppliersPage";
import CustomersPage from "./CustomersPage";
import MachinesPage from "./MachinesPage";
import DashboardPage from "./DashboardPage";
import AdminPage from "./AdminPage";
import JobsToolbar from "./JobsToolbar";
import NewJobDialog from "./NewJobDialog";
import JobCard from "./JobCard";
import {
  blankBillingSettings,
  DEFAULT_ADMIN_BACKGROUND_COLOR,
  DEFAULT_ADMIN_TEXT_COLOR,
  DEFAULT_SITE_ACCENT_COLOR,
  DEFAULT_SITE_ACCENT_TEXT_COLOR,
  DEFAULT_SITE_INPUT_COLOR,
  defaultMachineNames,
  normalizeBillingSettingsForUi,
  normalizeHexColor,
  readBillingSettingsFromLocalBackup,
  saveBillingSettingsToLocalBackup,
} from "./billingSettings";
import { computeInvoiceChargeBreakdown, computeRuntimeBreakdown, openInvoicePrintWindow } from "./invoicing";
import HelpPage from "./HelpPage";
import { parseMakerWorldUrl } from "./makerworldImport";
import { fetchVersionInfo, formatVersionBadge, type VersionInfo } from "./version";
import { useAuth } from "./AuthContext";
import { parsePrintTimeToMinutes } from "./printTime";
import { formatISODate, formatNumber } from "./format";
import { handleError } from "./errorHandling";
import { BambuDashboardPayload, BillingAuditLog, BillingSettings, Customer, EstimateTemplate, Job, MakerWorldMetadata, MakerWorldPrintProfile, Material, MaterialPurchase, Supplier } from "./types";

const APP_NAME = "MakerFlow";
const WORKSHOP_DAILY_CAPACITY_HOURS = 8;
const SCHEDULE_HORIZON_DAYS = 14;
const BAMBU_POLL_INTERVAL_ACTIVE_MS = 30000;
const BAMBU_POLL_INTERVAL_IDLE_MS = 90000;

const getSafeExternalUrl = (value?: string) => {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};

type ThemePreset = {
  name: string;
  background: string;
  text: string;
  input: string;
  accent: string;
  accentText: string;
};

const quickThemePresets: ThemePreset[] = [
  {
    name: "MakerFlow",
    background: "#FFFFFF",
    text: "#1C1C1E",
    input: "#E5E5E7",
    accent: "#3A7DFF",
    accentText: "#1C1C1E",
  },
  {
    name: "Dark",
    background: "#1C1C1E",
    text: "#E5E5E7",
    input: "#1C1C1E",
    accent: "#3A7DFF",
    accentText: "#E5E5E7",
  },
  {
    name: "Light",
    background: "#f8fafc",
    text: "#0f172a",
    input: "#e2e8f0",
    accent: "#0ea5e9",
    accentText: "#ffffff",
  },
  {
    name: "High Contrast",
    background: "#000000",
    text: "#ffffff",
    input: "#111111",
    accent: "#ffde00",
    accentText: "#000000",
  },
  {
    name: "Forest",
    background: "#0f241a",
    text: "#ecfdf3",
    input: "#193025",
    accent: "#34d399",
    accentText: "#052e1c",
  },
  {
    name: "Night Shift",
    background: "#111827",
    text: "#e5e7eb",
    input: "#1f2937",
    accent: "#f59e0b",
    accentText: "#111827",
  },
  {
    name: "Paper Invoice",
    background: "#fdfbf7",
    text: "#1f2937",
    input: "#f3f4f6",
    accent: "#2563eb",
    accentText: "#ffffff",
  },
];




const getJobMode = (machineType: string) => (machineType.toLowerCase().includes("laser") || machineType.toLowerCase().includes("cnc") ? "laser" : "3d");
const hexToRgba = (hex: string, alpha: number) => {
  const safeHex = normalizeHexColor(hex, "#000000").replace("#", "");
  const r = Number.parseInt(safeHex.slice(0, 2), 16);
  const g = Number.parseInt(safeHex.slice(2, 4), 16);
  const b = Number.parseInt(safeHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
const themeHexToRgb = (hex: string): [number, number, number] => {
  const safeHex = normalizeHexColor(hex, "#000000").replace("#", "");
  return [0, 2, 4].map((i) => Number.parseInt(safeHex.slice(i, i + 2), 16)) as [number, number, number];
};
const rgbToHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
const mixHex = (from: string, to: string, amount: number) => {
  const a = themeHexToRgb(from);
  const b = themeHexToRgb(to);
  return rgbToHex(a.map((v, i) => v + (b[i] - v) * amount));
};
const relativeLuminance = (hex: string) => {
  const [r, g, b] = themeHexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrastRatio = (a: string, b: string) => {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// Nudges a colour away from the background (darker on light themes, lighter on dark ones) until it reaches the target contrast.
const ensureContrast = (colour: string, background: string, target = 4.8) => {
  const towards = relativeLuminance(background) > 0.4 ? "#000000" : "#ffffff";
  let next = colour;
  for (let step = 0; step < 20 && contrastRatio(next, background) < target; step += 1) {
    next = mixHex(next, towards, 0.08);
  }
  return next;
};


const parseNumberInput = (value: string) => (value.trim() === "" ? 0 : Number(value));
const jobStatusOptions = ["Quote Draft", "Quote Sent", "Quote Approved", "Estimate Template", "Pending", "In Progress", "Completed", "Invoiced"];
const paymentStatusOptions = ["Unpaid", "Partially Paid", "Paid", "Overdue"];
const jobWorkflowStatusOptions = ["All", ...jobStatusOptions] as const;
const getPreviewType = (filePath?: string | null) => {
  const normalized = String(filePath || "").toLowerCase();
  if (normalized.endsWith(".svg")) return "svg";
  if (normalized.endsWith(".stl")) return "stl";
  if (/\.(png|jpe?g|webp|gif)$/.test(normalized)) return "image";
  return "none";
};
const toIsoDate = formatISODate;
const startOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};
const initialReportStartDate = () => {
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return toIsoDate(start);
};
const initialReportEndDate = () => toIsoDate(new Date());
const buildBambuDashboardFingerprint = (payload: BambuDashboardPayload | null) => {
  if (!payload) return "";
  const latestStatus = payload.latestStatuses?.[0];
  const latestFailure = payload.openFailures?.[0];
  const latestMaintenance = payload.maintenance?.[0];
  const latestEvent = payload.events?.[0];
  const latestSpool = payload.spools?.[0];
  return [
    payload.devices?.length || 0,
    payload.latestStatuses?.length || 0,
    latestStatus?.id || "",
    String(latestStatus?.reportedAt || ""),
    payload.openFailures?.length || 0,
    latestFailure?.id || "",
    String(latestFailure?.createdAt || ""),
    payload.maintenance?.length || 0,
    latestMaintenance?.id || "",
    String(latestMaintenance?.updatedAt || ""),
    payload.events?.length || 0,
    latestEvent?.id || "",
    String(latestEvent?.createdAt || ""),
    payload.spools?.length || 0,
    latestSpool?.id || "",
    String(latestSpool?.updatedAt || ""),
  ].join("|");
};

const COLOUR_NAMES: Array<[string, [number, number, number]]> = [
  ["black", [0, 0, 0]], ["white", [255, 255, 255]], ["grey", [128, 128, 128]], ["silver", [192, 192, 192]], ["red", [220, 30, 30]],
  ["orange", [255, 140, 0]], ["yellow", [255, 220, 0]], ["green", [40, 160, 60]], ["blue", [30, 80, 220]], ["purple", [130, 50, 180]],
  ["pink", [255, 130, 180]], ["brown", [120, 80, 40]], ["beige", [220, 200, 160]],
];
const hexToRgb = (hex: string): [number, number, number] | null => {
  const m = hex.trim().match(/^#?([0-9a-f]{6})/i);
  return m ? [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)] : null;
};
const nearestColourName = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return "";
  const dist = (c: [number, number, number]) => (c[0] - rgb[0]) ** 2 + (c[1] - rgb[1]) ** 2 + (c[2] - rgb[2]) ** 2;
  return COLOUR_NAMES.reduce((best, entry) => (dist(entry[1]) < dist(best[1]) ? entry : best))[0];
};
// Matches on filament type and colour (hex, or nearest colour name against the material's colour text); undefined if none.
const findMatchingMaterial = (materials: Material[], filament: { type: string; colour: string }) => {
  const type = filament.type.toLowerCase();
  if (!type) return undefined;
  const wantedName = nearestColourName(filament.colour);
  return materials.find((material) => {
    const typeText = `${material.type} ${material.name}`.toLowerCase();
    if (!new RegExp(`(^|[^a-z])${type.replace(/[^a-z0-9]/g, "")}([^a-z]|$)`).test(typeText)) return false;
    const materialColour = String(material.color || "").trim();
    if (!materialColour) return false;
    const materialRgb = hexToRgb(materialColour);
    if (materialRgb) return materialColour.replace("#", "").toLowerCase() === filament.colour.replace("#", "").toLowerCase();
    return !!wantedName && materialColour.toLowerCase().includes(wantedName);
  });
};

function App() {
  const { user: currentUser, logout } = useAuth();
  const KG_TO_G = 1000;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "jobs" | "reports" | "materials" | "machines" | "customers" | "suppliers" | "billing" | "admin" | "help">("dashboard");
  const [jobForm, setJobForm] = useState({ name: "", customer: "", sourceUrl: "", machineType: defaultMachineNames[0], machineRunTimeMinutes: "0", setupTimeMinutes: "0", postProcessingMinutes: "0", labourTimeMinutes: "0", dueDate: "", queuePosition: "0", qaChecklistText: "", qaPassed: false, reworkCost: "0", reworkNotes: "", failureReason: "", failureWasteGrams: "0", failureCost: "0", isRush: false, setupFee: "0", deliveryCharge: "0", paymentStatus: "Unpaid", depositPaidAmount: "0", status: "Pending" });
  const [jobMaterialEntries, setJobMaterialEntries] = useState<Array<{ materialId: string; usageQuantity: string }>>([]);
  const [billingSettings, setBillingSettings] = useState<BillingSettings>(blankBillingSettings());
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [jobEditorMode, setJobEditorMode] = useState<"none" | "edit" | "create" | "invoice">("none");
  const [selectedJobMaterialEntries, setSelectedJobMaterialEntries] = useState<Array<{ materialId: string; usageQuantity: string }>>([]);
  const [selectedJobForm, setSelectedJobForm] = useState({ name: "", customer: "", sourceUrl: "", machineType: defaultMachineNames[0], machineRunTimeMinutes: "", setupTimeMinutes: "", postProcessingMinutes: "", labourTimeMinutes: "", dueDate: "", queuePosition: "0", qaChecklistText: "", qaPassed: false, reworkCost: "0", reworkNotes: "", failureReason: "", failureWasteGrams: "0", failureCost: "0", isRush: false, setupFee: "0", deliveryCharge: "0", paymentStatus: "Unpaid", depositPaidAmount: "0", status: "Pending" });
  const [newJobForm, setNewJobForm] = useState({ name: "", customer: "", sourceUrl: "", machineType: defaultMachineNames[0], machineRunTimeMinutes: "0", setupTimeMinutes: "0", postProcessingMinutes: "0", labourTimeMinutes: "0", dueDate: "", queuePosition: "0", qaChecklistText: "", qaPassed: false, reworkCost: "0", reworkNotes: "", failureReason: "", failureWasteGrams: "0", failureCost: "0", isRush: false, setupFee: "0", deliveryCharge: "0", paymentStatus: "Unpaid", depositPaidAmount: "0", status: "Quote Draft" });
  const [newJobMaterialEntries, setNewJobMaterialEntries] = useState<Array<{ materialId: string; usageQuantity: string }>>([]);
  const [editingMachineName, setEditingMachineName] = useState<string | null>(null);
  const [showMachineEditor, setShowMachineEditor] = useState(false);
  const [machineForm, setMachineForm] = useState({ name: "", wattage: "0", purchaseDate: "", depreciationCost: "0", replacementRunHours: "0", manualRunHours: "0" });
  const [machineMessage, setMachineMessage] = useState("");
  const [savingBilling, setSavingBilling] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const [selectedBackupSections, setSelectedBackupSections] = useState(["workshop", "customers", "suppliers", "billing"]);
  const [billingSaveMessage, setBillingSaveMessage] = useState("");
  const [customerForm, setCustomerForm] = useState({ name: "", address: "", email: "", phone: "", notes: "" });
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerHistory, setCustomerHistory] = useState<Job[]>([]);
  const [customerMessage, setCustomerMessage] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierForm, setSupplierForm] = useState({ name: "", websiteUrl: "", contactEmail: "", contactPhone: "", notes: "" });
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [supplierPurchases, setSupplierPurchases] = useState<MaterialPurchase[]>([]);
  const [supplierPurchaseForm, setSupplierPurchaseForm] = useState({ materialName: "", quantityKg: "", totalCost: "", purchasedAt: "", notes: "" });
  const [supplierMessage, setSupplierMessage] = useState("");
  const [showCustomerCaptureModal, setShowCustomerCaptureModal] = useState(false);
  const [customerCaptureForm, setCustomerCaptureForm] = useState({ name: "", address: "", email: "", phone: "", notes: "" });
  const [jobSearchTerm, setJobSearchTerm] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState<(typeof jobWorkflowStatusOptions)[number]>("All");
  const [jobMachineFilter, setJobMachineFilter] = useState("All");
  const [reportStartDate, setReportStartDate] = useState(initialReportStartDate);
  const [reportEndDate, setReportEndDate] = useState(initialReportEndDate);
  const [reportStatusFilter, setReportStatusFilter] = useState<(typeof jobWorkflowStatusOptions)[number]>("All");
  const [reportMachineFilter, setReportMachineFilter] = useState("All");
  const [reportCustomerFilter, setReportCustomerFilter] = useState("All");
  const [bambuDashboard, setBambuDashboard] = useState<BambuDashboardPayload | null>(null);
  const [bambuMessage, setBambuMessage] = useState("");
  const [bambuSerialInput, setBambuSerialInput] = useState("BAMBU-SIM-001");
  const [bambuJobIdInput, setBambuJobIdInput] = useState("");
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [versionError, setVersionError] = useState("");
  const [makerWorldUrl, setMakerWorldUrl] = useState("");
  const [makerWorldMessage, setMakerWorldMessage] = useState("");
  const [modelUrlMessage, setModelUrlMessage] = useState("");
  const [makerWorldImportPreview, setMakerWorldImportPreview] = useState<string | null>(null);
  const [isLookingUpModelName, setIsLookingUpModelName] = useState(false);
  const [makerWorldMetadata, setMakerWorldMetadata] = useState<MakerWorldMetadata | null>(null);
  const [makerWorldProfile, setMakerWorldProfile] = useState<MakerWorldPrintProfile | null>(null);
  const [modelPreviewByJob, setModelPreviewByJob] = useState<Record<string, { sourceUrl: string; imageUrl: string | null; loading: boolean }>>({});
  const [savedEstimateTemplates, setSavedEstimateTemplates] = useState<EstimateTemplate[]>([]);
  const [billingAuditLogs, setBillingAuditLogs] = useState<BillingAuditLog[]>([]);
  const [uploadingJobId, setUploadingJobId] = useState<string | null>(null);
  const [jobFileMessage, setJobFileMessage] = useState<Record<string, string>>({});
  const [dashboardJobMessage, setDashboardJobMessage] = useState("");
  const [isCreatingDashboardJob, setIsCreatingDashboardJob] = useState(false);
  const addJobFormRef = useRef<HTMLFormElement | null>(null);
  const bambuPollInFlightRef = useRef(false);
  const bambuDashboardFingerprintRef = useRef("");

  const scrollToAddJobForm = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const form = addJobFormRef.current;
        if (!form) return;
        form.scrollIntoView({ behavior: "smooth", block: "start" });
        const firstField = form.querySelector("input, select, textarea") as HTMLElement | null;
        firstField?.focus();
      });
    });
  };

  const normalizeJobsForUi = (jobsData: Job[]) => jobsData.map((job) => {
    const rawChecklist = (job as Job & { qaChecklist?: unknown }).qaChecklist;
    let qaChecklist: string[] = [];
    if (Array.isArray(rawChecklist)) {
      qaChecklist = rawChecklist.map((item) => String(item || "").trim()).filter(Boolean);
    } else if (typeof rawChecklist === "string") {
      try {
        const parsed = JSON.parse(rawChecklist);
        if (Array.isArray(parsed)) {
          qaChecklist = parsed.map((item) => String(item || "").trim()).filter(Boolean);
        }
      } catch {
        qaChecklist = [];
      }
    }
    return { ...job, qaChecklist };
  });

  const loadData = async () => {
    const [jobsData, materialsData, customersData, suppliersData, templatesData, auditData] = await Promise.all([
      api.getJobs(),
      api.getMaterials(),
      api.getCustomers(),
      api.getSuppliers(),
      api.getEstimateTemplates(),
      api.getBillingAuditLogs(100),
    ]);
    const normalizedJobs = normalizeJobsForUi(jobsData);
    let finalMaterials = materialsData;
    if (!finalMaterials.length) {
      await api.seedMaterials();
      finalMaterials = await api.getMaterials();
    }
    setJobs(normalizedJobs);
    setMaterials(finalMaterials);
    setCustomers(customersData);
    setSuppliers(suppliersData);
    setSavedEstimateTemplates(templatesData);
    setBillingAuditLogs(auditData);
    if (!jobMaterialEntries.length && finalMaterials.length) {
      setJobMaterialEntries([{ materialId: finalMaterials[0].id, usageQuantity: "100" }]);
    }
  };


  const loadBillingSettings = async () => {
    try {
      const settings = await api.getBillingSettings();
      if (settings) {
        const normalized = normalizeBillingSettingsForUi(settings);
        setBillingSettings(normalized);
        saveBillingSettingsToLocalBackup(normalized);
        return;
      }

      const localBackup = readBillingSettingsFromLocalBackup();
      if (localBackup) {
        setBillingSettings(localBackup);
        try {
          // Migrate settings that only exist in this browser (e.g. saved while the API was rejecting requests) into the database.
          const saved = await api.saveBillingSettings(localBackup);
          const normalized = normalizeBillingSettingsForUi((saved || localBackup) as BillingSettings);
          setBillingSettings(normalized);
          saveBillingSettingsToLocalBackup(normalized);
          setBillingSaveMessage("Billing and equipment settings from your local browser backup were saved to the database.");
        } catch (error) {
          handleError(error, "Could not save billing settings from the local browser backup.", "Save local billing settings");
          setBillingSaveMessage("Backend returned no billing settings. Loaded your local browser backup, but saving it to the database failed.");
        }
        return;
      }

      setBillingSettings(blankBillingSettings());
      setBillingSaveMessage("No saved billing settings found yet. Save billing once to persist it.");
    } catch (error) {
      handleError(error, "Could not load billing settings from backend.", "Load billing settings");
      const localBackup = readBillingSettingsFromLocalBackup();
      if (localBackup) {
        setBillingSettings(localBackup);
        setBillingSaveMessage("Backend billing settings are unavailable. Loaded your local browser backup.");
        return;
      }

      setBillingSaveMessage("Could not load billing settings from backend.");
    }
  };

  useEffect(() => {
    loadData().catch((error) => { handleError(error, "Could not load application data.", "Load application data"); });
    loadBillingSettings().catch((error) => { handleError(error, "Could not load billing settings.", "Load billing settings"); });
    api.getBambuDashboard().then(setBambuDashboard).catch((error) => { handleError(error, "Could not load equipment status.", "Load equipment status"); });
  }, []);

  const applyBambuDashboardUpdate = (payload: BambuDashboardPayload, force = false) => {
    const nextFingerprint = buildBambuDashboardFingerprint(payload);
    if (!force && nextFingerprint && nextFingerprint === bambuDashboardFingerprintRef.current) {
      return false;
    }
    bambuDashboardFingerprintRef.current = nextFingerprint;
    setBambuDashboard(payload);
    return true;
  };

  const refreshBambuDashboard = async (force = false) => {
    if (bambuPollInFlightRef.current) return;
    bambuPollInFlightRef.current = true;
    try {
      const payload = await api.getBambuDashboard();
      applyBambuDashboardUpdate(payload, force);
    } finally {
      bambuPollInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (jobEditorMode !== "create") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [jobEditorMode]);

  useEffect(() => {
    if (activeTab !== "machines") return;

    const pollIntervalMs = (bambuDashboard?.devices?.length || 0) > 0
      ? BAMBU_POLL_INTERVAL_ACTIVE_MS
      : BAMBU_POLL_INTERVAL_IDLE_MS;

    const refreshIfVisible = () => {
      if (document.visibilityState !== "visible") return;
      refreshBambuDashboard().catch((error) => { handleError(error, "Could not refresh equipment status.", "Refresh equipment status"); });
    };

    refreshIfVisible();

    const timer = window.setInterval(() => {
      refreshIfVisible();
    }, pollIntervalMs);

    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
    };
  }, [activeTab, bambuDashboard?.devices?.length]);

  const selectedJob = useMemo(() => jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null, [jobs, selectedJobId]);
  const expandedModelJob = useMemo(() => jobs.find((job) => job.id === expandedJobId) ?? null, [jobs, expandedJobId]);

  useEffect(() => {
    if (!expandedModelJob?.sourceUrl) return;
    const { id, sourceUrl } = expandedModelJob;
    const currentPreview = modelPreviewByJob[id];
    if (currentPreview?.sourceUrl === sourceUrl && (currentPreview.loading || currentPreview.imageUrl)) return;

    let cancelled = false;
    const cachedUrl = expandedModelJob.sourceImageForUrl === sourceUrl ? expandedModelJob.sourceImageUrl || null : null;
    setModelPreviewByJob((current) => ({ ...current, [id]: { sourceUrl, imageUrl: cachedUrl, loading: true } }));
    // The server returns the cached thumbnail URL and only re-reads the source when the cache is stale.
    api.refreshJobSourceImage(id)
      .then(({ imageUrl }) => {
        if (!cancelled) setModelPreviewByJob((current) => ({ ...current, [id]: { sourceUrl, imageUrl, loading: false } }));
      })
      .catch((error) => {
        handleError(error, "Could not refresh the model preview.", "Refresh job source image");
        if (!cancelled) setModelPreviewByJob((current) => ({ ...current, [id]: { sourceUrl, imageUrl: cachedUrl, loading: false } }));
      });

    return () => { cancelled = true; };
  // Do not depend on modelPreviewByJob: setting loading=true would clean up this request,
  // then the next effect run would see the matching source and leave it loading forever.
  }, [expandedModelJob?.id, expandedModelJob?.sourceUrl]);

  useEffect(() => {
    if (jobs.length && !selectedJobId) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  useEffect(() => {
    if (!selectedJob) return;
    const checklistLines = (selectedJob.qaChecklist || []).join("\n");
    setSelectedJobForm({
      name: selectedJob.name,
      customer: selectedJob.customer || "",
      sourceUrl: selectedJob.sourceUrl || "",
      machineType: selectedJob.machineType || machineOptions[0],
      machineRunTimeMinutes: String(Number(selectedJob.machineRunTimeMinutes ?? selectedJob.estTimeMinutes ?? 0)),
      setupTimeMinutes: String(selectedJob.setupTimeMinutes ?? 0),
      postProcessingMinutes: String(selectedJob.postProcessingMinutes ?? 0),
      labourTimeMinutes: String(selectedJob.labourTimeMinutes ?? selectedJob.estTimeMinutes ?? 0),
      dueDate: selectedJob.dueDate ? formatISODate(selectedJob.dueDate) : "",
      queuePosition: String(selectedJob.queuePosition ?? 0),
      qaChecklistText: checklistLines,
      qaPassed: Boolean(selectedJob.qaPassed),
      reworkCost: String(selectedJob.reworkCost ?? 0),
      reworkNotes: selectedJob.reworkNotes || "",
      failureReason: selectedJob.failureReason || "",
      failureWasteGrams: String(selectedJob.failureWasteGrams ?? 0),
      failureCost: String(selectedJob.failureCost ?? 0),
      isRush: Boolean(selectedJob.isRush),
      setupFee: String(selectedJob.setupFee ?? 0),
      deliveryCharge: String(selectedJob.deliveryCharge ?? 0),
      paymentStatus: selectedJob.paymentStatus || "Unpaid",
      depositPaidAmount: String(selectedJob.depositPaidAmount ?? 0),
      status: selectedJob.status || "Pending",
    });
    setSelectedJobMaterialEntries((selectedJob.materials || []).map((entry) => ({
      materialId: entry.materialId,
      usageQuantity: String(entry.usageQuantity || 0),
    })));
  }, [selectedJob?.id, selectedJob?.name, selectedJob?.customer, selectedJob?.sourceUrl, selectedJob?.machineType, selectedJob?.estTimeMinutes, selectedJob?.machineRunTimeMinutes, selectedJob?.setupTimeMinutes, selectedJob?.postProcessingMinutes, selectedJob?.labourTimeMinutes, selectedJob?.dueDate, selectedJob?.queuePosition, selectedJob?.qaChecklist, selectedJob?.qaPassed, selectedJob?.reworkCost, selectedJob?.reworkNotes, selectedJob?.failureReason, selectedJob?.failureWasteGrams, selectedJob?.failureCost, selectedJob?.isRush, selectedJob?.setupFee, selectedJob?.deliveryCharge, selectedJob?.paymentStatus, selectedJob?.depositPaidAmount, selectedJob?.status, selectedJob?.materials]);

  useEffect(() => {
    if (!newJobMaterialEntries.length && materials.length) {
      setNewJobMaterialEntries([{ materialId: materials[0].id, usageQuantity: "" }]);
    }
  }, [materials, newJobMaterialEntries.length]);

  const pendingJobs = useMemo(() => jobs.filter((job) => job.status === "Pending"), [jobs]);
  const jobsWaitingPayment = useMemo(
    () => jobs.filter((job) => job.status === "Pending" && (job.paymentStatus || "Unpaid") !== "Paid").length,
    [jobs],
  );
  const jobsWaitingDispatch = useMemo(
    () => jobs.filter((job) => job.status === "Pending" && (job.paymentStatus || "Unpaid") === "Paid").length,
    [jobs],
  );
  const filteredJobs = useMemo(() => {
    const normalizedSearch = jobSearchTerm.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesStatus = jobStatusFilter === "All" || job.status === jobStatusFilter;
      const matchesMachine = jobMachineFilter === "All" || job.machineType === jobMachineFilter;
      const matchesSearch = !normalizedSearch
        || job.name.toLowerCase().includes(normalizedSearch)
        || String(job.customer || "").toLowerCase().includes(normalizedSearch)
        || String(job.jobNumber || "").toLowerCase().includes(normalizedSearch);
      return matchesStatus && matchesMachine && matchesSearch;
    });
  }, [jobs, jobMachineFilter, jobSearchTerm, jobStatusFilter]);
  const estimateTemplates = useMemo(
    () => jobs
      .filter((job) => job.status === "Estimate Template")
      .sort((left, right) => new Date(String(right.updatedAt || right.createdAt || 0)).getTime() - new Date(String(left.updatedAt || left.createdAt || 0)).getTime()),
    [jobs],
  );
  const adminBackgroundColor = normalizeHexColor(billingSettings.adminBackgroundColor, DEFAULT_ADMIN_BACKGROUND_COLOR);
  const adminTextColor = normalizeHexColor(billingSettings.adminTextColor, DEFAULT_ADMIN_TEXT_COLOR);
  const siteInputColor = normalizeHexColor(billingSettings.siteInputColor, DEFAULT_SITE_INPUT_COLOR);
  const siteAccentColor = normalizeHexColor(billingSettings.siteAccentColor, DEFAULT_SITE_ACCENT_COLOR);
  const siteAccentTextColor = normalizeHexColor(billingSettings.siteAccentTextColor, DEFAULT_SITE_ACCENT_TEXT_COLOR);
  // Hover keeps the accent-text contrast: pick whichever of lighter/darker reads better against the button text.
  const accentLighter = mixHex(siteAccentColor, "#ffffff", 0.14);
  const accentDarker = mixHex(siteAccentColor, "#000000", 0.14);
  const accentHoverColor = contrastRatio(siteAccentTextColor, accentLighter) >= contrastRatio(siteAccentTextColor, accentDarker) ? accentLighter : accentDarker;
  const appThemeStyle: CSSProperties = {
    "--app-bg": adminBackgroundColor,
    "--app-surface": hexToRgba(adminBackgroundColor, 0.88),
    "--app-surface-alt": hexToRgba(adminBackgroundColor, 0.72),
    "--app-text": adminTextColor,
    "--app-text-muted": hexToRgba(adminTextColor, 0.78),
    "--app-text-faint": hexToRgba(adminTextColor, 0.62),
    "--app-border": hexToRgba(adminTextColor, 0.26),
    "--app-input-bg": siteInputColor,
    "--app-accent": siteAccentColor,
    "--app-accent-text": siteAccentTextColor,
    "--app-accent-hover": accentHoverColor,
    "--app-accent-highlight": siteAccentColor.toUpperCase() === DEFAULT_SITE_ACCENT_COLOR ? "#5DA8FF" : siteAccentColor,
    "--app-link": ensureContrast(siteAccentColor, adminBackgroundColor),
    "--app-success": ensureContrast("#10b981", adminBackgroundColor),
    "--app-danger": ensureContrast("#f43f5e", adminBackgroundColor),
    "--app-warning": ensureContrast("#f59e0b", adminBackgroundColor),
    "--app-info": ensureContrast("#0ea5e9", adminBackgroundColor),
    "--app-violet": ensureContrast("#8b5cf6", adminBackgroundColor),
    "--app-accent-soft": hexToRgba(siteAccentColor, 0.18),
    "--app-neutral-soft": hexToRgba(adminTextColor, 0.12),
  } as CSSProperties;
  const adminSectionStyle = {
    backgroundColor: adminBackgroundColor,
    color: adminTextColor,
    borderColor: hexToRgba(adminTextColor, 0.25),
  };
  const adminCardStyle = {
    backgroundColor: hexToRgba(adminBackgroundColor, 0.5),
    borderColor: hexToRgba(adminTextColor, 0.25),
  };
  const adminMutedTextStyle = {
    color: hexToRgba(adminTextColor, 0.75),
  };
  const queuedJobs = useMemo(
    () => jobs
      .filter((job) => job.status === "Pending" || job.status === "In Progress")
      .sort((left, right) => Number(left.queuePosition || 0) - Number(right.queuePosition || 0)),
    [jobs],
  );
  const machineQueueProjections = useMemo(() => {
    const workdayStart = new Date();
    workdayStart.setHours(8, 0, 0, 0);
    const queueByMachine = new Map<string, Job[]>();

    queuedJobs.forEach((job) => {
      const key = String(job.machineType || "Other");
      const existing = queueByMachine.get(key) || [];
      existing.push(job);
      queueByMachine.set(key, existing);
    });

    return Array.from(queueByMachine.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([machineType, machineJobs]) => {
        let cumulativeMinutes = 0;
        const projectedJobs = machineJobs.map((job) => {
          cumulativeMinutes += Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0);
          const projectedCompletion = new Date(workdayStart);
          projectedCompletion.setMinutes(projectedCompletion.getMinutes() + cumulativeMinutes);
          return { job, projectedCompletion };
        });
        return { machineType, projectedJobs, totalMinutes: cumulativeMinutes };
      });
  }, [queuedJobs]);
  const scheduleCalendarDays = useMemo(() => {
    const dayMap = new Map<string, { date: Date; dueCount: number; projectedCount: number; totalRuntimeMinutes: number }>();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    for (let offset = 0; offset < SCHEDULE_HORIZON_DAYS; offset += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + offset);
      dayMap.set(formatISODate(date), {
        date,
        dueCount: 0,
        projectedCount: 0,
        totalRuntimeMinutes: 0,
      });
    }

    queuedJobs.forEach((job) => {
      if (!job.dueDate) return;
      const dueKey = formatISODate(new Date(job.dueDate));
      const day = dayMap.get(dueKey);
      if (!day) return;
      day.dueCount += 1;
      day.totalRuntimeMinutes += Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0);
    });

    machineQueueProjections.forEach((group) => {
      group.projectedJobs.forEach(({ projectedCompletion }) => {
        const projectedKey = formatISODate(projectedCompletion);
        const day = dayMap.get(projectedKey);
        if (!day) return;
        day.projectedCount += 1;
      });
    });

    return Array.from(dayMap.values());
  }, [machineQueueProjections, queuedJobs]);
  const getDueRiskLabel = (job: Job) => {
    if (!job.dueDate) return "No due date";
    const today = new Date();
    const due = new Date(job.dueDate);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "Overdue";
    if (diffDays <= 1) return "At risk";
    if (diffDays <= 3) return "Watch";
    return "On track";
  };
    const machineOptions = useMemo(() => {
      const configuredMachines = Object.keys(billingSettings.machineElectricitySettings || {}).filter((name) => name && name.trim());
      const preferred = defaultMachineNames.filter((name) => configuredMachines.includes(name));
      const extra = configuredMachines.filter((name) => !defaultMachineNames.includes(name)).sort((a, b) => a.localeCompare(b));
      const list = [...preferred, ...extra];
      if (!list.length) {
        list.push(...defaultMachineNames.filter((name) => name !== "Other"));
      }
      if (!list.includes("Other")) {
        list.push("Other");
      }
      return list;
    }, [billingSettings.machineElectricitySettings]);
    const machineProfiles = useMemo(
      () => Object.entries(billingSettings.machineElectricitySettings || {}).sort(([left], [right]) => left.localeCompare(right)),
      [billingSettings.machineElectricitySettings],
    );
    const recentJobs = useMemo(
      () => [...jobs]
        .sort((left, right) => new Date(String(right.createdAt || 0)).getTime() - new Date(String(left.createdAt || 0)).getTime())
        .slice(0, 5),
      [jobs],
    );
  const groupedMaterials = useMemo(() => {
    const groups = new Map<string, Material[]>();
    materials.forEach((material) => {
      const groupName = material.type?.trim() || "Other";
      const existing = groups.get(groupName) || [];
      existing.push(material);
      groups.set(groupName, existing);
    });
    return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right));
  }, [materials]);
  const billingMaterialTypes = useMemo(() => {
    const knownTypes = new Set<string>();
    materials.forEach((material) => {
      knownTypes.add(material.type?.trim() || "Other");
    });
    Object.keys(billingSettings.materialTypeMarkups || {}).forEach((typeName) => {
      knownTypes.add(typeName?.trim() || "Other");
    });
    if (!knownTypes.size) {
      knownTypes.add("Other");
    }
    return Array.from(knownTypes).sort((left, right) => left.localeCompare(right));
  }, [materials, billingSettings.materialTypeMarkups]);

  useEffect(() => {
    const fallbackMachine = machineOptions[0] || "Other";
    if (!machineOptions.includes(jobForm.machineType)) {
      setJobForm((current) => ({ ...current, machineType: fallbackMachine }));
    }
    if (!machineOptions.includes(newJobForm.machineType)) {
      setNewJobForm((current) => ({ ...current, machineType: fallbackMachine }));
    }
    if (!machineOptions.includes(selectedJobForm.machineType)) {
      setSelectedJobForm((current) => ({ ...current, machineType: fallbackMachine }));
    }
  }, [machineOptions, jobForm.machineType, newJobForm.machineType, selectedJobForm.machineType]);

  const toApiJobMaterials = (entries: Array<{ materialId: string; usageQuantity: string }>) => entries
    .filter((entry) => entry.materialId)
    .map((entry) => {
      const selectedMaterial = materials.find((material) => material.id === entry.materialId);
      return {
        materialId: entry.materialId,
        usageQuantity: Number(entry.usageQuantity || 0),
        usageUnit: "g",
        usageUnitCost: Number(selectedMaterial?.costPerUnit || 0),
      };
    });

  const toChecklistArray = (value: string) => value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const createJob = async (e: FormEvent) => {
    e.preventDefault();
    if (isCreatingDashboardJob) return;

    setDashboardJobMessage("");
    setIsCreatingDashboardJob(true);
    const rawCustomerName = String(jobForm.customer || "").trim();
    const existingCustomer = customers.find((customer) => customer.name.trim().toLowerCase() === rawCustomerName.toLowerCase());
    try {
      const created = await api.createJob({
        name: jobForm.name,
        customer: jobForm.customer || null,
        sourceUrl: jobForm.sourceUrl || "",
        machineType: jobForm.machineType,
        estTimeMinutes: parsePrintTimeToMinutes(jobForm.machineRunTimeMinutes),
        machineRunTimeMinutes: parsePrintTimeToMinutes(jobForm.machineRunTimeMinutes),
        setupTimeMinutes: Number(jobForm.setupTimeMinutes || 0),
        postProcessingMinutes: Number(jobForm.postProcessingMinutes || 0),
        labourTimeMinutes: Number(jobForm.labourTimeMinutes || 0),
        dueDate: jobForm.dueDate || null,
        queuePosition: Number(jobForm.queuePosition || 0),
        qaChecklist: toChecklistArray(jobForm.qaChecklistText),
        qaPassed: Boolean(jobForm.qaPassed),
        reworkCost: Number(jobForm.reworkCost || 0),
        reworkNotes: String(jobForm.reworkNotes || ""),
        failureReason: String(jobForm.failureReason || ""),
        failureWasteGrams: Number(jobForm.failureWasteGrams || 0),
        failureCost: Number(jobForm.failureCost || 0),
        isRush: jobForm.isRush,
        setupFee: Number(jobForm.setupFee || 0),
        deliveryCharge: Number(jobForm.deliveryCharge || 0),
        isSetupFee: Number(jobForm.setupFee || 0) > 0,
        isDelivery: Number(jobForm.deliveryCharge || 0) > 0,
        paymentStatus: jobForm.paymentStatus,
        depositPaidAmount: Number(jobForm.depositPaidAmount || 0),
        status: jobForm.status,
        materials: toApiJobMaterials(jobMaterialEntries),
      });

      const createdForUi = normalizeJobsForUi([created])[0];
      setJobs((current) => [createdForUi, ...current.filter((job) => job.id !== createdForUi.id)]);

      setJobForm({ name: "", customer: "", sourceUrl: "", machineType: machineOptions[0] || "Other", machineRunTimeMinutes: "0", setupTimeMinutes: "0", postProcessingMinutes: "0", labourTimeMinutes: "0", dueDate: "", queuePosition: "0", qaChecklistText: "", qaPassed: false, reworkCost: "0", reworkNotes: "", failureReason: "", failureWasteGrams: "0", failureCost: "0", isRush: false, setupFee: "0", deliveryCharge: "0", paymentStatus: "Unpaid", depositPaidAmount: "0", status: "Pending" });
      setJobMaterialEntries([]);

      try {
        await loadData();
      } catch (error) {
        handleError(error, "Could not refresh job data after creation.", "Reload jobs after create");
        const jobsData = await api.getJobs();
        setJobs(normalizeJobsForUi(jobsData));
      }

      setDashboardJobMessage(`Job ${created.jobNumber || created.name} created.`);

      if (rawCustomerName && !existingCustomer) {
        setCustomerCaptureForm({ name: rawCustomerName, address: "", email: "", phone: "", notes: "" });
        setShowCustomerCaptureModal(true);
      }
    } catch (error) {
      setDashboardJobMessage(handleError(error, "Failed to create job.", "Create dashboard job"));
    } finally {
      setIsCreatingDashboardJob(false);
    }
  };

  const openNewJobEditor = () => {
    setJobEditorMode("create");
    setNewJobForm({ name: "", customer: "", sourceUrl: "", machineType: machineOptions[0] || "Other", machineRunTimeMinutes: "0", setupTimeMinutes: "0", postProcessingMinutes: "0", labourTimeMinutes: "0", dueDate: "", queuePosition: "0", qaChecklistText: "", qaPassed: false, reworkCost: "0", reworkNotes: "", failureReason: "", failureWasteGrams: "0", failureCost: "0", isRush: false, setupFee: "0", deliveryCharge: "0", paymentStatus: "Unpaid", depositPaidAmount: "0", status: "Quote Draft" });
    setNewJobMaterialEntries(materials.length ? [{ materialId: materials[0].id, usageQuantity: "" }] : []);
    setMakerWorldUrl("");
    setMakerWorldMessage("");
    setModelUrlMessage("");
    setMakerWorldMetadata(null);
    setMakerWorldProfile(null);
    scrollToAddJobForm();
  };

  const applyEstimateTemplate = (template: Job) => {
    setActiveTab("jobs");
    setJobEditorMode("create");
    setNewJobForm({
      name: template.name,
      customer: "",
      sourceUrl: template.sourceUrl || "",
      machineType: template.machineType || machineOptions[0] || "Other",
      machineRunTimeMinutes: String(template.machineRunTimeMinutes ?? template.estTimeMinutes ?? 0),
      setupTimeMinutes: String(template.setupTimeMinutes ?? 0),
      postProcessingMinutes: String(template.postProcessingMinutes ?? 0),
      labourTimeMinutes: String(template.labourTimeMinutes ?? template.estTimeMinutes ?? 0),
      dueDate: "",
      queuePosition: "0",
      qaChecklistText: (template.qaChecklist || []).join("\n"),
      qaPassed: Boolean(template.qaPassed),
      reworkCost: String(template.reworkCost || 0),
      reworkNotes: String(template.reworkNotes || ""),
      failureReason: String(template.failureReason || ""),
      failureWasteGrams: String(template.failureWasteGrams || 0),
      failureCost: String(template.failureCost || 0),
      isRush: Boolean(template.isRush),
      setupFee: String(template.setupFee ?? 0),
      deliveryCharge: String(template.deliveryCharge ?? 0),
      paymentStatus: "Unpaid",
      depositPaidAmount: "0",
      status: "Quote Draft",
    });
    setNewJobMaterialEntries(
      (template.materials || []).length
        ? (template.materials || []).map((entry) => ({ materialId: entry.materialId, usageQuantity: String(entry.usageQuantity || 0) }))
        : (materials.length ? [{ materialId: materials[0].id, usageQuantity: "" }] : []),
    );
    setMakerWorldUrl(template.sourceUrl || "");
    setMakerWorldMessage("Estimate template loaded into Add Job. Add customer/details and create job.");
  };

  const openAddMachineForm = () => {
    setActiveTab("machines");
    setEditingMachineName(null);
    setMachineForm({ name: "", wattage: "0", purchaseDate: "", depreciationCost: "0", replacementRunHours: "0", manualRunHours: "0" });
    setShowMachineEditor(true);
  };

  const closeMachineForm = () => {
    setEditingMachineName(null);
    setMachineForm({ name: "", wattage: "0", purchaseDate: "", depreciationCost: "0", replacementRunHours: "0", manualRunHours: "0" });
    setShowMachineEditor(false);
  };

  const startEditingMachine = (machineName: string) => {
    const existing = billingSettings.machineElectricitySettings?.[machineName];
    if (!existing) return;
    setActiveTab("machines");
    setEditingMachineName(machineName);
    setMachineForm({
      name: machineName,
      wattage: String(existing.wattage ?? 0),
      purchaseDate: existing.purchaseDate ?? "",
      depreciationCost: String(existing.depreciationCost ?? 0),
      replacementRunHours: String(existing.replacementRunHours ?? 0),
      manualRunHours: String(existing.manualRunHours ?? 0),
    });
    setShowMachineEditor(true);
  };

  const saveMachine = async (e: FormEvent) => {
    e.preventDefault();
    const normalizedName = machineForm.name.trim();
    if (!normalizedName) return;

    const nextSettings = {
      ...billingSettings,
      machineElectricitySettings: { ...billingSettings.machineElectricitySettings },
    };

    if (editingMachineName && editingMachineName !== normalizedName) {
      delete nextSettings.machineElectricitySettings[editingMachineName];
    }

    if (!Number.isFinite(Number(machineForm.replacementRunHours || 0)) || !Number.isFinite(Number(machineForm.manualRunHours || 0))) {
      setMachineMessage("Runtime values must be non-negative numbers.");
      return;
    }

    nextSettings.machineElectricitySettings[normalizedName] = {
      name: normalizedName,
      wattage: Number(machineForm.wattage || 0),
      purchaseDate: machineForm.purchaseDate || "",
      depreciationCost: Number(machineForm.depreciationCost || 0),
      replacementRunHours: Number(machineForm.replacementRunHours || 0),
      manualRunHours: Number(machineForm.manualRunHours || 0),
    };

    setBillingSettings(nextSettings);
    setSavingBilling(true);
    try {
      await api.saveBillingSettings(nextSettings);
      setMachineMessage(editingMachineName ? "Machine updated." : "Machine added.");
      closeMachineForm();
    } finally {
      setSavingBilling(false);
    }
  };

  const removeMachine = async (machineName: string) => {
    const nextSettings = {
      ...billingSettings,
      machineElectricitySettings: { ...billingSettings.machineElectricitySettings },
    };
    delete nextSettings.machineElectricitySettings[machineName];

    setBillingSettings(nextSettings);
    setSavingBilling(true);
    try {
      await api.saveBillingSettings(nextSettings);
      setMachineMessage("Machine removed.");
      if (editingMachineName === machineName) {
        closeMachineForm();
      }
    } finally {
      setSavingBilling(false);
    }
  };

  const createJobFromJobsTab = async (e: FormEvent) => {
    e.preventDefault();
    let printTimeMinutes: number;
    let setupTimeMinutes: number;
    let postProcessingMinutes: number;
    let labourTimeMinutes: number;
    try {
      printTimeMinutes = parsePrintTimeToMinutes(newJobForm.machineRunTimeMinutes);
      setupTimeMinutes = parsePrintTimeToMinutes(newJobForm.setupTimeMinutes);
      postProcessingMinutes = parsePrintTimeToMinutes(newJobForm.postProcessingMinutes);
      labourTimeMinutes = parsePrintTimeToMinutes(newJobForm.labourTimeMinutes);
    } catch (error) {
      window.alert(handleError(error, "Invalid time.", "Parse job runtime"));
      return;
    }
    const rawCustomerName = String(newJobForm.customer || "").trim();
    const existingCustomer = customers.find((customer) => customer.name.trim().toLowerCase() === rawCustomerName.toLowerCase());
    let created: Job;
    try {
      created = await api.createJob({
        name: newJobForm.name,
        customer: newJobForm.customer || null,
        sourceUrl: newJobForm.sourceUrl || makerWorldUrl || "",
        machineType: newJobForm.machineType,
        estTimeMinutes: printTimeMinutes,
        machineRunTimeMinutes: printTimeMinutes,
        setupTimeMinutes,
        postProcessingMinutes,
        labourTimeMinutes,
        dueDate: newJobForm.dueDate || null,
        queuePosition: Number(newJobForm.queuePosition || 0),
        qaChecklist: toChecklistArray(newJobForm.qaChecklistText),
        qaPassed: Boolean(newJobForm.qaPassed),
        reworkCost: Number(newJobForm.reworkCost || 0),
        reworkNotes: String(newJobForm.reworkNotes || ""),
        failureReason: String(newJobForm.failureReason || ""),
        failureWasteGrams: Number(newJobForm.failureWasteGrams || 0),
        failureCost: Number(newJobForm.failureCost || 0),
        isRush: newJobForm.isRush,
        setupFee: Number(newJobForm.setupFee || 0),
        deliveryCharge: Number(newJobForm.deliveryCharge || 0),
        isSetupFee: Number(newJobForm.setupFee || 0) > 0,
        isDelivery: Number(newJobForm.deliveryCharge || 0) > 0,
        paymentStatus: newJobForm.paymentStatus,
        depositPaidAmount: Number(newJobForm.depositPaidAmount || 0),
        status: newJobForm.status,
        materials: toApiJobMaterials(newJobMaterialEntries),

      });
    } catch (error) {
      window.alert(handleError(error, "Failed to create job.", "Create job"));
      return;
    }
    setSelectedJobId(created.id);
    setExpandedJobId(created.id);
    await calculateJobCost(created);
    if (created.status === "Completed") {
      setJobEditorMode("invoice");
    } else {
      setJobEditorMode("none");
    }

    if (rawCustomerName && !existingCustomer) {
      setCustomerCaptureForm({ name: rawCustomerName, address: "", email: "", phone: "", notes: "" });
      setShowCustomerCaptureModal(true);
    }
  };

  const deleteJob = async (jobId: string) => {
    const confirmed = window.confirm("Delete this job? This cannot be undone.");
    if (!confirmed) return;

    try {
      await api.deleteJob(jobId);
      if (selectedJobId === jobId) {
        setSelectedJobId(null);
        setExpandedJobId(null);
        setJobEditorMode("none");
      }
      await loadData();
    } catch (error) {
      handleError(error, "Could not delete job. Please try again.", "Delete job");
      window.alert("Could not delete job. Please try again.");
    }
  };

  const addNewJobMaterialEntry = () => {
    setNewJobMaterialEntries((current) => {
      const selectedMaterial = materials[0];
      return [
        ...current,
        {
          materialId: selectedMaterial?.id || "",
          usageQuantity: "",
        },
      ];
    });
  };

  const updateNewJobMaterialEntry = (index: number, field: "materialId" | "usageQuantity", value: string) => {
    setNewJobMaterialEntries((current) => current.map((entry, entryIndex) => {
      if (entryIndex !== index) return entry;
      return { ...entry, [field]: value };
    }));
  };

  const removeNewJobMaterialEntry = (index: number) => {
    setNewJobMaterialEntries((current) => current.filter((_, entryIndex) => entryIndex !== index));
  };

  const calculateJobCost = async (job: Job) => {
    const machineRunTimeMinutes = Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0);
    const setupTimeMinutes = Number(job.setupTimeMinutes ?? 0);
    const postProcessingMinutes = Number(job.postProcessingMinutes ?? 0);
    const labourTimeMinutes = Number(job.labourTimeMinutes ?? job.estTimeMinutes ?? 0);
    try {
      await api.calculateCost(job.id, {
        mode: getJobMode(job.machineType),
        machineName: job.machineType,
        isRush: Boolean(job.isRush),
        machineRunTimeMinutes,
        setupTimeMinutes,
        postProcessingMinutes,
        labourTimeMinutes,
        materials: (job.materials || []).map((entry) => ({
          materialId: entry.materialId,
          usageQuantity: entry.usageQuantity,
          usageUnit: entry.usageUnit,
          usageUnitCost: entry.usageUnitCost,
        })),
        setupFee: Number(job.setupFee || 0),
        deliveryCharge: Number(job.deliveryCharge || 0),
        isSetupFee: Number(job.setupFee || 0) > 0,
        isDelivery: Number(job.deliveryCharge || 0) > 0,
      });
      await loadData();
    } catch (error) {
      handleError(error, "Could not calculate cost. Please check backend status and try again.", "Calculate job cost");
      window.alert("Could not calculate cost. Please check backend status and try again.");
    }
  };

  const updateJobStatusQuick = async (job: Job, status: string) => {
    await api.updateJob(job.id, {
      name: job.name,
      customer: job.customer || null,
      sourceUrl: job.sourceUrl || "",
      machineType: job.machineType,
      estTimeMinutes: Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0),
      machineRunTimeMinutes: Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0),
      setupTimeMinutes: Number(job.setupTimeMinutes ?? 0),
      postProcessingMinutes: Number(job.postProcessingMinutes ?? 0),
      labourTimeMinutes: Number(job.labourTimeMinutes ?? (Number(job.setupTimeMinutes ?? 0) + Number(job.postProcessingMinutes ?? 0))),
      dueDate: job.dueDate || null,
      queuePosition: Number(job.queuePosition || 0),
      qaChecklist: job.qaChecklist || [],
      qaPassed: Boolean(job.qaPassed),
      reworkCost: Number(job.reworkCost || 0),
      reworkNotes: String(job.reworkNotes || ""),
      failureReason: String(job.failureReason || ""),
      failureWasteGrams: Number(job.failureWasteGrams || 0),
      failureCost: Number(job.failureCost || 0),
      setupFee: Number(job.setupFee || 0),
      deliveryCharge: Number(job.deliveryCharge || 0),
      isRush: Boolean(job.isRush),
      isSetupFee: Number(job.setupFee || 0) > 0,
      isDelivery: Number(job.deliveryCharge || 0) > 0,
      paymentStatus: job.paymentStatus || "Unpaid",
      depositPaidAmount: Number(job.depositPaidAmount || 0),
      status,
      materials: toApiJobMaterials((job.materials || []).map((entry) => ({ materialId: entry.materialId, usageQuantity: String(entry.usageQuantity || 0) }))),
    });
    await loadData();
    setSelectedJobId(job.id);
    setExpandedJobId(job.id);
    if (status === "Completed") {
      await calculateJobCost({ ...job, status });
      setJobEditorMode("invoice");
      return;
    }
    setJobEditorMode("edit");
  };

  const getWorkflowActions = (job: Job) => {
    const actions: Array<{ label: string; status: string; tone: string }> = [];
    if (job.status === "Pending") actions.push({ label: "Start now", status: "In Progress", tone: "border-emerald-700 text-emerald-300" });
    if (job.status === "In Progress") actions.push({ label: "Mark complete", status: "Completed", tone: "border-emerald-700 text-emerald-300" });
    if (job.status === "Completed") actions.push({ label: "Mark invoiced", status: "Invoiced", tone: "border-sky-700 text-sky-300" });
    if (job.status === "Invoiced") actions.push({ label: "Reopen", status: "Completed", tone: "border-amber-700 text-amber-300" });
    return actions;
  };

  const uploadJobFile = async (job: Job, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const fileExtension = file.name.toLowerCase().split(".").pop();
    if (!["svg", "stl", "png", "jpg", "jpeg", "webp", "gif"].includes(fileExtension || "")) {
      setJobFileMessage((current) => ({ ...current, [job.id]: "Only SVG, STL and image (PNG, JPG, WebP, GIF) files are supported." }));
      event.target.value = "";
      return;
    }

    setUploadingJobId(job.id);
    setJobFileMessage((current) => ({ ...current, [job.id]: "Uploading file..." }));
    try {
      await api.uploadJobFile(job.id, file);
      await loadData();
      setSelectedJobId(job.id);
      setExpandedJobId(job.id);
      setJobFileMessage((current) => ({ ...current, [job.id]: `Uploaded ${file.name}.` }));
    } catch (error) {
      setJobFileMessage((current) => ({
        ...current,
        [job.id]: handleError(error, "Upload failed. Please try again.", "Upload job file"),
      }));
    } finally {
      setUploadingJobId(null);
      event.target.value = "";
    }
  };

  const saveSelectedJob = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    const nextStatus = selectedJobForm.status;
    try {
      await api.updateJob(selectedJob.id, {
        name: selectedJobForm.name,
        customer: selectedJobForm.customer || null,
        sourceUrl: selectedJobForm.sourceUrl || "",
        machineType: selectedJobForm.machineType,
        estTimeMinutes: parsePrintTimeToMinutes(selectedJobForm.machineRunTimeMinutes),
        machineRunTimeMinutes: parsePrintTimeToMinutes(selectedJobForm.machineRunTimeMinutes),
        setupTimeMinutes: Number(selectedJobForm.setupTimeMinutes || 0),
        postProcessingMinutes: Number(selectedJobForm.postProcessingMinutes || 0),
        labourTimeMinutes: Number(selectedJobForm.labourTimeMinutes || 0),
        dueDate: selectedJobForm.dueDate || null,
        queuePosition: Number(selectedJobForm.queuePosition || 0),
        qaChecklist: toChecklistArray(selectedJobForm.qaChecklistText),
        qaPassed: Boolean(selectedJobForm.qaPassed),
        reworkCost: Number(selectedJobForm.reworkCost || 0),
        reworkNotes: String(selectedJobForm.reworkNotes || ""),
        failureReason: String(selectedJobForm.failureReason || ""),
        failureWasteGrams: Number(selectedJobForm.failureWasteGrams || 0),
        failureCost: Number(selectedJobForm.failureCost || 0),
        isRush: selectedJobForm.isRush,
        setupFee: Number(selectedJobForm.setupFee || 0),
        deliveryCharge: Number(selectedJobForm.deliveryCharge || 0),
        isSetupFee: Number(selectedJobForm.setupFee || 0) > 0,
        isDelivery: Number(selectedJobForm.deliveryCharge || 0) > 0,
        paymentStatus: selectedJobForm.paymentStatus,
        depositPaidAmount: Number(selectedJobForm.depositPaidAmount || 0),
        status: selectedJobForm.status,
        materials: toApiJobMaterials(selectedJobMaterialEntries),
      });
      await loadData();
      if (nextStatus === "Completed") {
        await calculateJobCost({
          ...selectedJob,
          status: nextStatus,
          isRush: selectedJobForm.isRush,
          setupFee: Number(selectedJobForm.setupFee || 0),
          deliveryCharge: Number(selectedJobForm.deliveryCharge || 0),
          isSetupFee: Number(selectedJobForm.setupFee || 0) > 0,
          isDelivery: Number(selectedJobForm.deliveryCharge || 0) > 0,
        });
        setExpandedJobId(selectedJob.id);
        setSelectedJobId(selectedJob.id);
        setJobEditorMode("invoice");
        return;
      }
      setJobEditorMode("none");
    } catch (error) {
      window.alert(handleError(error, "Failed to save job.", "Save job"));
    }
  };

  const addSelectedJobMaterialEntry = () => {
    setSelectedJobMaterialEntries((current) => {
      const selectedMaterial = materials[0];
      return [
        ...current,
        {
          materialId: selectedMaterial?.id || "",
          usageQuantity: "100",
        },
      ];
    });
  };

  const updateSelectedJobMaterialEntry = (index: number, field: "materialId" | "usageQuantity", value: string) => {
    setSelectedJobMaterialEntries((current) => current.map((entry, entryIndex) => {
      if (entryIndex !== index) return entry;
      return { ...entry, [field]: value };
    }));
  };

  const removeSelectedJobMaterialEntry = (index: number) => {
    setSelectedJobMaterialEntries((current) => current.filter((_, entryIndex) => entryIndex !== index));
  };

  const saveBilling = async (e: FormEvent) => {
    e.preventDefault();
    setSavingBilling(true);
    try {
      const saved = await api.saveBillingSettings(billingSettings);
      const normalized = normalizeBillingSettingsForUi((saved || billingSettings) as BillingSettings);
      setBillingSettings(normalized);
      saveBillingSettingsToLocalBackup(normalized);
      setBillingSaveMessage("Billing settings saved.");
    } catch (error) {
      saveBillingSettingsToLocalBackup(billingSettings);
      const message = handleError(error, "Could not save billing settings.", "Save billing settings");
      setBillingSaveMessage(`${message} Local browser backup was updated.`);
    } finally {
      setSavingBilling(false);
    }
  };

  const updateBilling = (field: keyof BillingSettings, value: number) => {
    setBillingSettings((current) => ({ ...current, [field]: value }));
  };

  const updateMachineSetting = (machineName: string, field: "wattage" | "depreciationCost" | "replacementRunHours", value: number) => {
    setBillingSettings((current) => ({
      ...current,
      machineElectricitySettings: {
        ...current.machineElectricitySettings,
        [machineName]: {
          ...(current.machineElectricitySettings[machineName] || {}),
          name: machineName,
          [field]: value,
        },
      },
    }));
  };

  const updateMaterialTypeMarkup = (materialType: string, value: number) => {
    setBillingSettings((current) => ({
      ...current,
      materialTypeMarkups: {
        ...(current.materialTypeMarkups || {}),
        [materialType]: {
          percent: value,
        },
      },
    }));
  };

  const addJobMaterialEntry = () => {
    setJobMaterialEntries((current) => {
      const selectedMaterial = materials[0];
      return [
        ...current,
        {
          materialId: selectedMaterial?.id || "",
          usageQuantity: "100",
        },
      ];
    });
  };

  const updateJobMaterialEntry = (index: number, field: "materialId" | "usageQuantity", value: string) => {
    setJobMaterialEntries((current) => current.map((entry, entryIndex) => {
      if (entryIndex !== index) return entry;
      return { ...entry, [field]: value };
    }));
  };

  const removeJobMaterialEntry = (index: number) => {
    setJobMaterialEntries((current) => current.filter((_, entryIndex) => entryIndex !== index));
  };

  const calculateRuntimeBreakdown = (job: Job) => computeRuntimeBreakdown(job, billingSettings);
  const getInvoiceChargeBreakdown = (job: Job) => computeInvoiceChargeBreakdown(job, billingSettings);
  const getBaseCostTotal = (job: Job) => Number(job.cost?.totalCost ?? 0);
  const getProfitTotal = (job: Job) => {
    if (!job.cost) return 0;
    return Number(getInvoiceChargeBreakdown(job).customerCharge) - Number(getBaseCostTotal(job));
  };
  const getCostButtonLabel = (job: Job) => (job.cost ? "Refresh costs" : "Calculate cost");
  const jobsWithCost = useMemo(() => jobs.filter((job) => job.cost), [jobs]);
  const marginByMachine = useMemo(() => {
    const grouped = new Map<string, { jobs: number; revenue: number; base: number; margin: number }>();
    jobsWithCost.forEach((job) => {
      const key = String(job.machineType || "Other");
      const revenue = Number(getInvoiceChargeBreakdown(job).customerCharge || 0);
      const base = Number(getBaseCostTotal(job) || 0);
      const current = grouped.get(key) || { jobs: 0, revenue: 0, base: 0, margin: 0 };
      current.jobs += 1;
      current.revenue += revenue;
      current.base += base;
      current.margin += revenue - base;
      grouped.set(key, current);
    });
    return Array.from(grouped.entries())
      .map(([label, metrics]) => ({ label, ...metrics, marginPercent: metrics.revenue > 0 ? (metrics.margin / metrics.revenue) * 100 : 0 }))
      .sort((left, right) => right.margin - left.margin);
  }, [jobsWithCost, billingSettings]);
  const marginByCustomer = useMemo(() => {
    const grouped = new Map<string, { jobs: number; revenue: number; base: number; margin: number }>();
    jobsWithCost.forEach((job) => {
      const key = String(job.customer || "Walk-in customer");
      const revenue = Number(getInvoiceChargeBreakdown(job).customerCharge || 0);
      const base = Number(getBaseCostTotal(job) || 0);
      const current = grouped.get(key) || { jobs: 0, revenue: 0, base: 0, margin: 0 };
      current.jobs += 1;
      current.revenue += revenue;
      current.base += base;
      current.margin += revenue - base;
      grouped.set(key, current);
    });
    return Array.from(grouped.entries())
      .map(([label, metrics]) => ({ label, ...metrics, marginPercent: metrics.revenue > 0 ? (metrics.margin / metrics.revenue) * 100 : 0 }))
      .sort((left, right) => right.margin - left.margin);
  }, [jobsWithCost, billingSettings]);
  const marginByMaterialType = useMemo(() => {
    const grouped = new Map<string, { jobs: number; allocatedRevenue: number; allocatedBase: number; allocatedMargin: number }>();
    jobsWithCost.forEach((job) => {
      const revenue = Number(getInvoiceChargeBreakdown(job).customerCharge || 0);
      const base = Number(getBaseCostTotal(job) || 0);
      const margin = revenue - base;
      const materialLines = (job.materials || []).map((entry) => ({
        type: String(entry.material?.type || "Other"),
        lineBase: Number(entry.usageQuantity || 0) * Number(entry.usageUnitCost || 0),
      }));
      const totalMaterialBase = materialLines.reduce((sum, line) => sum + line.lineBase, 0);

      if (!materialLines.length || totalMaterialBase <= 0) {
        const fallback = grouped.get("Unspecified") || { jobs: 0, allocatedRevenue: 0, allocatedBase: 0, allocatedMargin: 0 };
        fallback.jobs += 1;
        fallback.allocatedRevenue += revenue;
        fallback.allocatedBase += base;
        fallback.allocatedMargin += margin;
        grouped.set("Unspecified", fallback);
        return;
      }

      materialLines.forEach((line) => {
        const share = line.lineBase / totalMaterialBase;
        const current = grouped.get(line.type) || { jobs: 0, allocatedRevenue: 0, allocatedBase: 0, allocatedMargin: 0 };
        current.jobs += 1;
        current.allocatedRevenue += revenue * share;
        current.allocatedBase += base * share;
        current.allocatedMargin += margin * share;
        grouped.set(line.type, current);
      });
    });
    return Array.from(grouped.entries())
      .map(([label, metrics]) => ({ label, ...metrics, marginPercent: metrics.allocatedRevenue > 0 ? (metrics.allocatedMargin / metrics.allocatedRevenue) * 100 : 0 }))
      .sort((left, right) => right.allocatedMargin - left.allocatedMargin);
  }, [jobsWithCost, billingSettings]);
  const deliveryAndUtilization = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const completionStatuses = new Set(["Completed", "Invoiced"]);
    const dueEligible = jobs.filter((job) => job.dueDate && completionStatuses.has(job.status));
    const onTimeCount = dueEligible.filter((job) => {
      if (!job.dueDate || !job.updatedAt) return false;
      return new Date(job.updatedAt).getTime() <= new Date(job.dueDate).getTime();
    }).length;
    const overdueOpen = jobs.filter((job) => {
      if (!job.dueDate) return false;
      if (completionStatuses.has(job.status)) return false;
      return new Date(job.dueDate).getTime() < todayStart.getTime();
    }).length;

    const machineCount = Math.max(1, machineOptions.filter((name) => name !== "Other").length || machineQueueProjections.length || 1);
    const weeklyCapacityMinutes = machineCount * WORKSHOP_DAILY_CAPACITY_HOURS * 60 * 7;
    const scheduledMinutes = queuedJobs.reduce((sum, job) => sum + Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0), 0);
    const utilizationPercent = weeklyCapacityMinutes > 0 ? (scheduledMinutes / weeklyCapacityMinutes) * 100 : 0;
    const perMachineCapacityMinutes = WORKSHOP_DAILY_CAPACITY_HOURS * 60 * 7;
    const utilizationByMachine = machineQueueProjections.map((group) => ({
      machineType: group.machineType,
      hours: group.totalMinutes / 60,
      utilizationPercent: perMachineCapacityMinutes > 0 ? (group.totalMinutes / perMachineCapacityMinutes) * 100 : 0,
    }));

    return {
      dueEligibleCount: dueEligible.length,
      onTimeCount,
      onTimePercent: dueEligible.length > 0 ? (onTimeCount / dueEligible.length) * 100 : 0,
      overdueOpen,
      machineCount,
      scheduledHours: scheduledMinutes / 60,
      utilizationPercent,
      utilizationByMachine,
    };
  }, [jobs, machineOptions, machineQueueProjections, queuedJobs]);
  const reportCustomers = useMemo(() => {
    const values = new Set<string>();
    jobs.forEach((job) => {
      const name = String(job.customer || "Walk-in customer").trim() || "Walk-in customer";
      values.add(name);
    });
    return Array.from(values).sort((left, right) => left.localeCompare(right));
  }, [jobs]);
  const reportJobs = useMemo(() => {
    const startDate = reportStartDate ? startOfDay(new Date(reportStartDate)) : null;
    const endDate = reportEndDate ? startOfDay(new Date(reportEndDate)) : null;

    return jobs.filter((job) => {
      const createdAt = job.createdAt ? startOfDay(new Date(job.createdAt)) : null;
      const dueAt = job.dueDate ? startOfDay(new Date(job.dueDate)) : null;
      const referenceDate = createdAt || dueAt;
      const inDateRange = !referenceDate
        || ((!startDate || referenceDate.getTime() >= startDate.getTime())
          && (!endDate || referenceDate.getTime() <= endDate.getTime()));
      const matchesStatus = reportStatusFilter === "All" || job.status === reportStatusFilter;
      const matchesMachine = reportMachineFilter === "All" || job.machineType === reportMachineFilter;
      const customerName = String(job.customer || "Walk-in customer").trim() || "Walk-in customer";
      const matchesCustomer = reportCustomerFilter === "All" || customerName === reportCustomerFilter;
      return inDateRange && matchesStatus && matchesMachine && matchesCustomer;
    });
  }, [jobs, reportCustomerFilter, reportEndDate, reportMachineFilter, reportStartDate, reportStatusFilter]);
  const reportJobsWithCost = useMemo(() => reportJobs.filter((job) => job.cost), [reportJobs]);
  const reportSummary = useMemo(() => {
    const totals = reportJobsWithCost.reduce((sum, job) => {
      const baseCost = Number(getBaseCostTotal(job) || 0);
      const customerCharge = Number(getInvoiceChargeBreakdown(job).customerCharge || 0);
      sum.base += baseCost;
      sum.revenue += customerCharge;
      sum.margin += customerCharge - baseCost;
      sum.runtimeMinutes += Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0);
      sum.labourMinutes += Number(job.labourTimeMinutes ?? job.estTimeMinutes ?? 0);
      sum.materialLines += Number(job.materials?.length || 0);
      return sum;
    }, { base: 0, revenue: 0, margin: 0, runtimeMinutes: 0, labourMinutes: 0, materialLines: 0 });

    return {
      jobsCount: reportJobs.length,
      jobsWithCostCount: reportJobsWithCost.length,
      ...totals,
      marginPercent: totals.revenue > 0 ? (totals.margin / totals.revenue) * 100 : 0,
    };
  }, [reportJobs, reportJobsWithCost, billingSettings]);
  const exportReportCsv = () => {
    const header = [
      "jobNumber",
      "name",
      "customer",
      "machineType",
      "status",
      "createdAt",
      "dueDate",
      "runtimeMinutes",
      "labourMinutes",
      "baseCost",
      "customerCharge",
      "profit",
    ].join(",");

    const rows = reportJobs.map((job) => {
      const baseCost = Number(getBaseCostTotal(job) || 0);
      const customerCharge = Number(getInvoiceChargeBreakdown(job).customerCharge || 0);
      const profit = customerCharge - baseCost;
      return [
        job.jobNumber || "",
        job.name,
        job.customer || "",
        job.machineType,
        job.status,
        job.createdAt ? formatISODate(job.createdAt) : "",
        job.dueDate ? formatISODate(job.dueDate) : "",
        String(Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0)),
        String(Number(job.labourTimeMinutes ?? job.estTimeMinutes ?? 0)),
        formatNumber(baseCost),
        formatNumber(customerCharge),
        formatNumber(profit),
      ].join(",");
    });

    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report-${reportStartDate || "all"}-to-${reportEndDate || "all"}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };
  const simulateBambuTick = async () => {
    await api.simulateBambuTick({ serial: bambuSerialInput || "BAMBU-SIM-001" });
    await refreshBambuDashboard(true);
    setBambuMessage("Simulated Bambu status tick ingested.");
  };
  const sendBambuEvent = async (eventType: "PRINT_STARTED" | "PRINT_FINISHED" | "PRINT_FAILED") => {
    await api.ingestBambuEvent({
      serial: bambuSerialInput || "BAMBU-SIM-001",
      jobId: bambuJobIdInput || undefined,
      eventType,
      runtimeMinutes: eventType === "PRINT_FINISHED" ? 180 : 0,
      materialGrams: eventType === "PRINT_FINISHED" ? 95 : 0,
      spoolAdjustments: eventType === "PRINT_FINISHED"
        ? [{ slotName: "A1", gramsUsed: 60 }, { slotName: "A2", gramsUsed: 35 }]
        : [],
      errorCode: eventType === "PRINT_FAILED" ? "NOZZLE_CLOG" : "",
      message: eventType === "PRINT_FAILED" ? "Nozzle clog detected" : "",
    });
    await refreshBambuDashboard(true);
    setBambuMessage(`${eventType} event ingested.`);
  };
  const importMakerWorldMetadata = async () => {
    const payload = await api.importMakerWorldMetadata(makerWorldUrl);
    setMakerWorldMetadata(payload);
    setNewJobForm((current) => ({ ...current, sourceUrl: payload.url || makerWorldUrl }));
    setMakerWorldMessage("MakerWorld metadata imported.");
  };
  const lookupModelTitle = async () => {
    const url = newJobForm.sourceUrl.trim();
    if (!url) {
      setModelUrlMessage("Enter a model page link first.");
      return;
    }
    if (/^https?:\/\/([^/]+\.)?makerworld\.com(\/|$)/i.test(url)) {
      setIsLookingUpModelName(true);
      setModelUrlMessage("");
      try {
        const data = await api.importMakerWorldV2(url);
        setNewJobForm((current) => ({
          ...current,
          name: data.title || parseMakerWorldUrl(url).jobName,
          sourceUrl: data.modelUrl || url,
          machineRunTimeMinutes: data.printMinutes !== null ? String(data.printMinutes) : current.machineRunTimeMinutes,
        }));
        if (data.filaments.length && materials.length) {
          // Unmatched filaments fall back to the default (first) material.
          setNewJobMaterialEntries(data.filaments.map((filament) => ({
            materialId: (findMatchingMaterial(materials, filament) || materials[0]).id,
            usageQuantity: filament.grams !== null ? String(filament.grams) : "",
          })));
        }
        setMakerWorldUrl(data.modelUrl || url);
        setMakerWorldImportPreview(data.previewImageUrl);
        const parts = [
          data.creatorName ? `by ${data.creatorName}` : "",
          data.printHours !== null ? `print time ${data.printHours}h ${data.printRemainderMinutes}m` : "",
          data.filamentGrams !== null ? `${data.filamentGrams} g` : "",
          data.filamentTypes.length ? data.filamentTypes.join("/") : "",
          data.filamentColours.length ? data.filamentColours.join(", ") : "",
        ].filter(Boolean);
        setModelUrlMessage(`Imported "${data.title}"${parts.length ? ` — ${parts.join(" · ")}` : ""}.${data.missing.length ? ` Not available: ${data.missing.join(", ")}.` : ""}`);
      } catch (error) {
        handleError(error, "MakerWorld details are unavailable.", "Import MakerWorld model details");
        try {
          const { jobName, modelUrl } = parseMakerWorldUrl(url);
          setNewJobForm((current) => ({ ...current, name: jobName, sourceUrl: modelUrl }));
          setMakerWorldUrl(modelUrl);
          setMakerWorldImportPreview(null);
          setModelUrlMessage(`Imported "${jobName}" from URL (MakerWorld details unavailable).`);
        } catch (error) {
          setModelUrlMessage(handleError(error, "MakerWorld import failed.", "Parse MakerWorld URL"));
        }
      } finally {
        setIsLookingUpModelName(false);
      }
      return;
    }
    setIsLookingUpModelName(true);
    setModelUrlMessage("");
    try {
      const result = await api.lookupModelTitle(url);
      setNewJobForm((current) => ({ ...current, name: result.title, sourceUrl: result.url }));
      setMakerWorldUrl(result.url);
      setModelUrlMessage(`Found “${result.title}” on ${result.source}. Check the name before saving.`);
    } catch (error) {
      setModelUrlMessage(handleError(error, "Could not read the model page. Enter the name manually and keep the link.", "Look up model title"));
    } finally {
      setIsLookingUpModelName(false);
    }
  };
  useEffect(() => {
    fetchVersionInfo()
      .then((info) => { setVersionInfo(info); setVersionError(""); })
      .catch((error) => setVersionError(handleError(error, "Failed to load version information.", "Load version information")));
  }, []);
  const importMakerWorldAutofill = async () => {
    const payload = await api.autofillMakerWorldJob(makerWorldUrl);
    setMakerWorldMetadata(payload.metadata);
    setNewJobForm((current) => {
      const nextLabour = Number(payload.jobDraft.labourTimeMinutes || 0);
      const nextSetup = Math.max(0, Math.round(nextLabour * 0.5));
      const nextPost = Math.max(0, nextLabour - nextSetup);
      return {
        ...current,
        name: payload.jobDraft.name,
        sourceUrl: payload.jobDraft.sourceUrl || current.sourceUrl,
        machineType: payload.jobDraft.machineType,
        machineRunTimeMinutes: String(payload.jobDraft.machineRunTimeMinutes),
        setupTimeMinutes: String(nextSetup),
        postProcessingMinutes: String(nextPost),
        labourTimeMinutes: String(nextLabour),
        status: payload.jobDraft.status,
        reworkNotes: [current.reworkNotes, payload.jobDraft.notes].filter(Boolean).join("\n"),
      };
    });
    if (payload.jobDraft.suggestedMaterialGrams > 0) {
      setNewJobMaterialEntries((current) => {
        if (!current.length && materials.length) {
          return [{ materialId: materials[0].id, usageQuantity: String(payload.jobDraft.suggestedMaterialGrams) }];
        }
        return current.map((entry, index) => index === 0 ? { ...entry, usageQuantity: String(payload.jobDraft.suggestedMaterialGrams) } : entry);
      });
    }
    setJobEditorMode("create");
    setMakerWorldMessage("MakerWorld job autofill applied to Add Job form.");
  };
  const importMakerWorldPrintProfile = async () => {
    const payload = await api.importMakerWorldPrintProfile(makerWorldUrl);
    setMakerWorldMetadata(payload.metadata);
    setMakerWorldProfile(payload.profile);
    setNewJobForm((current) => {
      const estimatedRuntime = Number(payload.profile.estimatedMinutes || current.machineRunTimeMinutes || 0);
      const estimatedLabour = Math.max(10, Math.round(estimatedRuntime * 0.15));
      const estimatedSetup = Math.max(0, Math.round(estimatedLabour * 0.5));
      const estimatedPost = Math.max(0, estimatedLabour - estimatedSetup);
      return {
        ...current,
        sourceUrl: payload.metadata.url || current.sourceUrl,
        machineRunTimeMinutes: String(estimatedRuntime),
        setupTimeMinutes: String(estimatedSetup),
        postProcessingMinutes: String(estimatedPost),
        labourTimeMinutes: String(estimatedLabour),
        reworkNotes: [
          current.reworkNotes,
          `Print profile: ${payload.profile.profileName}`,
          `Layer ${payload.profile.layerHeightMm}mm, Nozzle ${payload.profile.nozzleTempC}C, Bed ${payload.profile.bedTempC}C, Speed ${payload.profile.speedMmPerSec}mm/s, Infill ${payload.profile.infillPercent}%`,
        ].filter(Boolean).join("\n"),
      };
    });
    if (payload.profile.estimatedMaterialGrams > 0) {
      setNewJobMaterialEntries((current) => {
        if (!current.length && materials.length) {
          return [{ materialId: materials[0].id, usageQuantity: String(payload.profile.estimatedMaterialGrams) }];
        }
        return current.map((entry, index) => index === 0 ? { ...entry, usageQuantity: String(payload.profile.estimatedMaterialGrams) } : entry);
      });
    }
    setJobEditorMode("create");
    setMakerWorldMessage("MakerWorld print profile imported for costing estimation.");
  };
  const saveCurrentEstimateTemplate = async () => {
    if (!newJobForm.name.trim()) {
      setMakerWorldMessage("Enter a job name before saving to the estimate catalogue.");
      return;
    }

    const charge = Number(reportSummary.revenue || 0);
    const base = Number(reportSummary.base || 0);

    await api.createEstimateTemplate({
      name: newJobForm.name,
      sourceUrl: newJobForm.sourceUrl || makerWorldUrl || "",
      machineType: newJobForm.machineType,
      machineRunTimeMinutes: parsePrintTimeToMinutes(newJobForm.machineRunTimeMinutes),
      setupTimeMinutes: Number(newJobForm.setupTimeMinutes || 0),
      postProcessingMinutes: Number(newJobForm.postProcessingMinutes || 0),
      labourTimeMinutes: Number(newJobForm.labourTimeMinutes || 0),
      suggestedMaterialGrams: Number(newJobMaterialEntries[0]?.usageQuantity || 0),
      notes: String(newJobForm.reworkNotes || ""),
      lastEstimatedBaseCost: base,
      lastEstimatedCharge: charge,
      lastUsedAt: new Date().toISOString(),
    });

    const templates = await api.getEstimateTemplates();
    setSavedEstimateTemplates(templates);
    setMakerWorldMessage("Saved to estimate catalogue.");
  };

  const applySavedEstimateTemplate = async (template: EstimateTemplate) => {
    setNewJobForm((current) => ({
      ...current,
      name: template.name,
      sourceUrl: template.sourceUrl || current.sourceUrl,
      machineType: template.machineType,
      machineRunTimeMinutes: String(template.machineRunTimeMinutes || 0),
      setupTimeMinutes: String(template.setupTimeMinutes || 0),
      postProcessingMinutes: String(template.postProcessingMinutes || 0),
      labourTimeMinutes: String(template.labourTimeMinutes || 0),
    }));

    if (template.suggestedMaterialGrams > 0) {
      setNewJobMaterialEntries((current) => {
        if (!current.length && materials.length) {
          return [{ materialId: materials[0].id, usageQuantity: String(template.suggestedMaterialGrams) }];
        }
        return current.map((entry, index) => index === 0 ? { ...entry, usageQuantity: String(template.suggestedMaterialGrams) } : entry);
      });
    }

    await api.updateEstimateTemplate(template.id, { markUsed: true } as Partial<EstimateTemplate>);
    const templates = await api.getEstimateTemplates();
    setSavedEstimateTemplates(templates);
    setMakerWorldMessage(`Applied estimate template: ${template.name}`);
  };

  const deleteEstimateTemplate = async (templateId: string) => {
    await api.deleteEstimateTemplate(templateId);
    const templates = await api.getEstimateTemplates();
    setSavedEstimateTemplates(templates);
  };

  const selectedCustomerProfile = useMemo(
    () => customers.find((customer) => customer.name.trim().toLowerCase() === String(selectedJob?.customer || "").trim().toLowerCase()) || null,
    [customers, selectedJob?.customer],
  );
  const businessDisplayName = billingSettings.businessName?.trim() || "";

  const resetCustomerForm = () => {
    setCustomerForm({ name: "", address: "", email: "", phone: "", notes: "" });
    setEditingCustomerId(null);
  };

  const saveCustomer = async (e: FormEvent) => {
    e.preventDefault();
    if (!customerForm.name.trim()) return;

    if (editingCustomerId) {
      await api.updateCustomer(editingCustomerId, customerForm);
      setCustomerMessage("Customer updated.");
    } else {
      await api.createCustomer(customerForm);
      setCustomerMessage("Customer created.");
    }

    resetCustomerForm();
    await loadData();
  };

  const saveCapturedCustomer = async (e: FormEvent) => {
    e.preventDefault();
    if (!customerCaptureForm.name.trim()) return;
    await api.createCustomer(customerCaptureForm);
    setCustomerMessage("Customer created from job add flow.");
    setShowCustomerCaptureModal(false);
    setCustomerCaptureForm({ name: "", address: "", email: "", phone: "", notes: "" });
    await loadData();
  };

  const printInvoice = (job: Job) => openInvoicePrintWindow(job, { billingSettings, businessDisplayName, selectedCustomerProfile });

  const startEditingCustomer = (customer: Customer) => {
    setActiveTab("customers");
    setEditingCustomerId(customer.id);
    setCustomerForm({
      name: customer.name || "",
      address: customer.address || "",
      email: customer.email || "",
      phone: customer.phone || "",
      notes: customer.notes || "",
    });
  };

  const removeCustomer = async (customerId: string) => {
    await api.deleteCustomer(customerId);
    if (selectedCustomerId === customerId) {
      setSelectedCustomerId(null);
      setCustomerHistory([]);
    }
    setCustomerMessage("Customer removed.");
    await loadData();
  };

  const loadCustomerOrders = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    const payload = await api.getCustomerOrders(customerId);
    setCustomerHistory(payload.jobs || []);
  };

  const resetSupplierForm = () => {
    setSupplierForm({ name: "", websiteUrl: "", contactEmail: "", contactPhone: "", notes: "" });
    setEditingSupplierId(null);
  };

  const saveSupplier = async (e: FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) return;

    if (editingSupplierId) {
      await api.updateSupplier(editingSupplierId, supplierForm);
      setSupplierMessage("Supplier updated.");
    } else {
      await api.createSupplier(supplierForm);
      setSupplierMessage("Supplier created.");
    }

    resetSupplierForm();
    await loadData();
  };

  const startEditingSupplier = (supplier: Supplier) => {
    setActiveTab("suppliers");
    setEditingSupplierId(supplier.id);
    setSupplierForm({
      name: supplier.name || "",
      websiteUrl: supplier.websiteUrl || "",
      contactEmail: supplier.contactEmail || "",
      contactPhone: supplier.contactPhone || "",
      notes: supplier.notes || "",
    });
  };

  const removeSupplier = async (supplierId: string) => {
    await api.deleteSupplier(supplierId);
    if (selectedSupplierId === supplierId) {
      setSelectedSupplierId(null);
      setSupplierPurchases([]);
    }
    setSupplierMessage("Supplier removed.");
    await loadData();
  };

  const loadSupplierPurchases = async (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    const purchases = await api.getSupplierPurchases(supplierId);
    setSupplierPurchases(purchases || []);
  };

  const saveSupplierPurchase = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) return;
    if (!supplierPurchaseForm.materialName.trim()) return;

    await api.createSupplierPurchase(selectedSupplierId, {
      materialName: supplierPurchaseForm.materialName,
      quantityKg: Number(supplierPurchaseForm.quantityKg || 0),
      totalCost: Number(supplierPurchaseForm.totalCost || 0),
      purchasedAt: supplierPurchaseForm.purchasedAt || undefined,
      notes: supplierPurchaseForm.notes,
    });

    const purchases = await api.getSupplierPurchases(selectedSupplierId);
    setSupplierPurchases(purchases || []);
    setSupplierPurchaseForm({ materialName: "", quantityKg: "", totalCost: "", purchasedAt: "", notes: "" });
    setSupplierMessage("Purchase history entry added.");
  };

  const backupSections = {
    workshop: ["jobs", "materials", "jobCosts", "estimateTemplates", "bambuDevices", "bambuStatuses", "bambuEvents", "bambuSpools", "bambuUsageLogs", "bambuMaintenance", "bambuFailureLogs"],
    customers: ["customers"],
    suppliers: ["suppliers", "purchases"],
    billing: ["billingSettings", "billingAuditLogs"],
  } as const;

  const toggleBackupSection = (section: string) => {
    setSelectedBackupSections((current) => current.includes(section)
      ? current.filter((item) => item !== section)
      : [...current, section]);
  };

  const downloadSelectedBackup = async () => {
    if (!selectedBackupSections.length) {
      setBackupMessage("Select at least one section to back up.");
      return;
    }
    try {
      const fullBackup = await api.exportFullBackup();
      const keys = selectedBackupSections.flatMap((section) => backupSections[section as keyof typeof backupSections] || []);
      const data = Object.fromEntries(keys.map((key) => [key, fullBackup[key] ?? []])) as Record<string, unknown>;
      const fullSettings = Array.isArray(fullBackup.billingSettings) ? fullBackup.billingSettings[0] : fullBackup.billingSettings;
      if (selectedBackupSections.includes("workshop")) {
        data.machineElectricitySettings = fullSettings?.machineElectricitySettings ?? {};
      }
      if (selectedBackupSections.includes("billing") && Array.isArray(data.billingSettings)) {
        data.billingSettings = data.billingSettings.map((settings: Record<string, unknown>) => {
          const { machineElectricitySettings: _machineSettings, ...billingOnly } = settings;
          return billingOnly;
        });
      }
      const backup = {
        backupFormat: "makerflow-selected-backup",
        formatVersion: 1,
        schemaVersion: fullBackup.schemaVersion,
        exportedAt: fullBackup.exportedAt,
        includedSections: selectedBackupSections,
        data,
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "makerflow-backup.json";
      link.click();
      window.URL.revokeObjectURL(url);
      setBackupMessage(`Backup downloaded with ${selectedBackupSections.length} section${selectedBackupSections.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setBackupMessage(handleError(error, "Failed to download backup.", "Download backup"));
    }
  };

  const restoreSelectedBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.name.toLowerCase().endsWith(".csv")) {
        const csvText = await file.text();
        const [header, ...rows] = csvText.trim().split(/\r?\n/);
        if (/jobNumber/i.test(header || "")) {
          if (!window.confirm("Restore jobs from this CSV? Existing jobs will be replaced.")) return;
          const importedJobs = rows.filter(Boolean).map((row) => {
            const [jobNumber, name, customer, machineType, runtimeRaw, labourRaw, statusRaw] = row.split(",");
            let machineRunTimeMinutes = 0;
            try { machineRunTimeMinutes = parsePrintTimeToMinutes(runtimeRaw || ""); } catch { machineRunTimeMinutes = 0; }
            const status = statusRaw || labourRaw || "Pending";
            return { id: crypto.randomUUID(), jobNumber, name, customer, machineType, estTimeMinutes: machineRunTimeMinutes, machineRunTimeMinutes, labourTimeMinutes: Number(statusRaw ? labourRaw || 0 : runtimeRaw || 0), status } as Job;
          });
          await api.importBackup({ jobs: importedJobs, materials });
          await loadData();
          setBackupMessage(`Jobs CSV restored (${importedJobs.length} rows).`);
        } else if (/^name[,;]/i.test(header || "")) {
          if (!window.confirm("Restore materials from this CSV? Existing materials will be replaced.")) return;
          const importedMaterials = rows.filter(Boolean).map((row) => {
            const [name, type, unit, costPerUnitRaw, stockLevelRaw, reorderThresholdRaw, color] = row.split(",");
            return { name: String(name || "").trim(), type: String(type || "Other").trim() || "Other", unit: String(unit || "g").trim() || "g", costPerUnit: Number(costPerUnitRaw || 0), stockLevel: Number(stockLevelRaw || 0), reorderThreshold: Number(reorderThresholdRaw || 0), color: String(color || "").trim() };
          }).filter((material) => material.name);
          if (!importedMaterials.length) throw new Error("No valid material rows were found in this CSV.");
          await api.importMaterialsCsv({ materials: importedMaterials });
          await loadData();
          setBackupMessage(`Materials CSV restored (${importedMaterials.length} rows).`);
        } else {
          throw new Error("This CSV file is not a supported MakerFlow backup.");
        }
        return;
      }
      const payload = JSON.parse(await file.text());
      if (payload?.backupFormat === "makerflow-selected-backup") {
        const includedSections = Array.isArray(payload.includedSections) ? payload.includedSections.filter((section: unknown): section is keyof typeof backupSections => typeof section === "string" && Object.prototype.hasOwnProperty.call(backupSections, section)) : [];
        if (!includedSections.length || !payload.data || typeof payload.data !== "object") {
          throw new Error("This MakerFlow backup does not contain any restorable sections.");
        }
        for (const section of includedSections as Array<keyof typeof backupSections>) {
          for (const key of backupSections[section] as readonly string[]) {
            if (!Array.isArray(payload.data[key])) throw new Error(`This backup is missing its ${section} data.`);
          }
          if (section === "workshop" && (!payload.data.machineElectricitySettings || typeof payload.data.machineElectricitySettings !== "object" || Array.isArray(payload.data.machineElectricitySettings))) {
            throw new Error("This backup is missing its equipment settings.");
          }
        }
        const sectionNames: Record<string, string> = { workshop: "Workshop jobs, materials and equipment", customers: "Customers", suppliers: "Suppliers and purchases", billing: "Billing and theme settings" };
        const confirmed = window.confirm(`Restore ${includedSections.map((section: string) => sectionNames[section]).join(", ")}? Existing data in those sections will be replaced. Other sections will be kept.`);
        if (!confirmed) return;
        const currentBackup = await api.exportFullBackup();
        const mergedBackup = { ...currentBackup };
        const selectedSections = includedSections as Array<keyof typeof backupSections>;
        for (const section of selectedSections) {
          const keys = backupSections[section] as readonly string[];
          for (const key of keys) {
            (mergedBackup as Record<string, unknown>)[key] = payload.data[key] ?? [];
          }
        }
        const currentSettings = Array.isArray(currentBackup.billingSettings) ? currentBackup.billingSettings : [];
        const selectedBillingSettings = selectedSections.includes("billing") && Array.isArray(payload.data.billingSettings)
          ? payload.data.billingSettings
          : currentSettings;
        const machineSettings = selectedSections.includes("workshop")
          ? payload.data.machineElectricitySettings ?? {}
          : currentSettings[0]?.machineElectricitySettings ?? {};
        mergedBackup.billingSettings = selectedBillingSettings.map((settings: Record<string, unknown>) => ({
          ...settings,
          machineElectricitySettings: machineSettings,
        }));
        await api.importFullBackup(mergedBackup);
        await loadData();
        await loadBillingSettings();
        await refreshBambuDashboard();
        setBackupMessage(`Backup restored: ${includedSections.map((section: string) => sectionNames[section]).join(", ")}. Other sections were kept.`);
        return;
      }

      // Keep restore support for backups created by the previous individual JSON export buttons.
      if (Array.isArray(payload?.jobs) || Array.isArray(payload?.materials)) {
        if (!window.confirm("Restore this full backup? This replaces all current app data.")) return;
        await api.importFullBackup(payload);
        await loadData();
        await loadBillingSettings();
        await refreshBambuDashboard();
        setBackupMessage("Full backup restored successfully.");
      } else if (Array.isArray(payload?.customers)) {
        if (!window.confirm("Restore customers? This replaces the current customer list.")) return;
        await api.importCustomersBackup(payload);
        await loadData();
        setBackupMessage("Customers backup restored successfully.");
      } else if (Array.isArray(payload?.suppliers)) {
        if (!window.confirm("Restore suppliers? This replaces suppliers and purchase history.")) return;
        await api.importSuppliersBackup(payload);
        await loadData();
        setBackupMessage("Suppliers backup restored successfully.");
      } else if (Array.isArray(payload?.bambuDevices) || payload?.machineElectricitySettings) {
        if (!window.confirm("Restore equipment settings and telemetry? This replaces the current equipment data.")) return;
        await api.importMachinesBackup(payload);
        await loadBillingSettings();
        await refreshBambuDashboard();
        setBackupMessage("Equipment backup restored successfully.");
      } else if (payload?.billingSettings) {
        if (!window.confirm("Restore billing settings? This replaces the current billing and theme settings.")) return;
        await api.importBillingBackup(payload);
        await loadBillingSettings();
        setBackupMessage("Billing backup restored successfully.");
      } else {
        throw new Error("This file is not a supported MakerFlow backup.");
      }
    } catch (error) {
      setBackupMessage(handleError(error, "Failed to restore backup.", "Restore backup"));
    }
  };

  return (
    <div className="app-theme min-h-screen bg-slate-950 text-slate-100" style={appThemeStyle}>
      <div className="mx-auto max-w-7xl p-6">
        <header className="mb-8 flex items-center justify-between gap-4 no-print">
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            aria-label="Go to dashboard"
            title="Go to dashboard"
            className="shrink-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <img
              src="/branding/makerflow-primary.svg"
              alt="MakerFlow — Your workshop, organised."
              className="h-14 w-[168px] rounded-lg bg-white object-contain"
            />
          </button>
          <div className="flex min-w-0 items-center justify-end gap-3">
            {billingSettings.businessName?.trim() ? (
              <p className="text-right text-lg font-bold text-slate-100">{billingSettings.businessName.trim()}</p>
            ) : null}
            {billingSettings.businessLogoUrl ? (
              <button
                type="button"
                onClick={() => setActiveTab("billing")}
                aria-label="Open billing settings"
                title="Open billing settings"
                className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <img
                  src={billingSettings.businessLogoUrl}
                  alt={billingSettings.businessName?.trim() ? `${billingSettings.businessName.trim()} business logo` : "Business logo"}
                  className="h-14 w-14 rounded-full border border-slate-800 bg-slate-900 object-cover"
                />
              </button>
            ) : null}
            {logout ? (
              <button type="button" onClick={logout} title={currentUser.email} className="shrink-0 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
                Log out
              </button>
            ) : null}
          </div>
        </header>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 no-print">
          <nav className="flex flex-wrap gap-3">
            {(["dashboard", "jobs", "reports", "materials", "machines", "customers", "suppliers", "billing", "admin", "help"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-full px-4 py-2 text-sm capitalize ${activeTab === tab ? "bg-cyan-600 text-white" : "bg-slate-900 text-slate-300"}`}>
                {tab === "jobs" ? "Production Jobs" : tab === "machines" ? "Equipment" : tab}
              </button>
            ))}
          </nav>
          <div className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300 inline-flex">{jobs.length} production jobs</div>
        </div>

        {activeTab === "dashboard" && (
          <DashboardPage
            deliveryAndUtilization={deliveryAndUtilization}
            workshopDailyCapacityHours={WORKSHOP_DAILY_CAPACITY_HOURS}
            scheduleHorizonDays={SCHEDULE_HORIZON_DAYS}
            onPriceJob={() => {
              setActiveTab("jobs");
              openNewJobEditor();
            }}
            onAddCustomer={() => setActiveTab("customers")}
            onEditJob={(jobId) => {
              setActiveTab("jobs");
              setExpandedJobId(jobId);
              setSelectedJobId(jobId);
              setJobEditorMode("edit");
            }}
            pendingJobs={pendingJobs}
            jobs={jobs}
            jobsWaitingPayment={jobsWaitingPayment}
            jobsWaitingDispatch={jobsWaitingDispatch}
            recentJobs={recentJobs}
            getInvoiceChargeBreakdown={getInvoiceChargeBreakdown}
            calculateJobCost={calculateJobCost}
            getCostButtonLabel={getCostButtonLabel}
            machineQueueProjections={machineQueueProjections}
            scheduleCalendarDays={scheduleCalendarDays}
          />
        )}

        {activeTab === "reports" && (
          <ReportsPage
            reportStartDate={reportStartDate}
            setReportStartDate={setReportStartDate}
            reportEndDate={reportEndDate}
            setReportEndDate={setReportEndDate}
            reportStatusFilter={reportStatusFilter}
            setReportStatusFilter={(value) => setReportStatusFilter(value as (typeof jobWorkflowStatusOptions)[number])}
            statusOptions={jobWorkflowStatusOptions}
            reportMachineFilter={reportMachineFilter}
            setReportMachineFilter={setReportMachineFilter}
            machineOptions={machineOptions}
            reportCustomerFilter={reportCustomerFilter}
            setReportCustomerFilter={setReportCustomerFilter}
            reportCustomers={reportCustomers}
            reportSummary={reportSummary}
            marginByMachine={marginByMachine}
            marginByMaterialType={marginByMaterialType}
            marginByCustomer={marginByCustomer}
            reportJobs={reportJobs}
            exportReportCsv={exportReportCsv}
            getBaseCostTotal={getBaseCostTotal}
            getCustomerCharge={(job) => Number(getInvoiceChargeBreakdown(job).customerCharge || 0)}
          />
        )}

        {activeTab === "jobs" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <JobsToolbar
              openNewJobEditor={openNewJobEditor}
              jobSearchTerm={jobSearchTerm}
              setJobSearchTerm={setJobSearchTerm}
              jobStatusFilter={jobStatusFilter}
              setJobStatusFilter={(value) => setJobStatusFilter(value as (typeof jobWorkflowStatusOptions)[number])}
              statusOptions={jobWorkflowStatusOptions}
              jobMachineFilter={jobMachineFilter}
              setJobMachineFilter={setJobMachineFilter}
              machineOptions={machineOptions}
              filteredJobs={filteredJobs}
              jobs={jobs}
              estimateTemplates={estimateTemplates}
              applyEstimateTemplate={applyEstimateTemplate}
              queuedJobs={queuedJobs}
              getDueRiskLabel={getDueRiskLabel}
            />
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-3">
                {filteredJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    expandedJobId={expandedJobId}
                    setExpandedJobId={setExpandedJobId}
                    selectedJobId={selectedJobId}
                    setSelectedJobId={setSelectedJobId}
                    jobEditorMode={jobEditorMode}
                    setJobEditorMode={setJobEditorMode}
                    selectedJob={selectedJob}
                    selectedJobForm={selectedJobForm}
                    setSelectedJobForm={setSelectedJobForm}
                    selectedCustomerProfile={selectedCustomerProfile}
                    billingSettings={billingSettings}
                    businessDisplayName={businessDisplayName}
                    machineOptions={machineOptions}
                    materials={materials}
                    selectedJobMaterialEntries={selectedJobMaterialEntries}
                    addSelectedJobMaterialEntry={addSelectedJobMaterialEntry}
                    updateSelectedJobMaterialEntry={updateSelectedJobMaterialEntry}
                    removeSelectedJobMaterialEntry={removeSelectedJobMaterialEntry}
                    jobStatusOptions={jobStatusOptions}
                    paymentStatusOptions={paymentStatusOptions}
                    getBaseCostTotal={getBaseCostTotal}
                    getProfitTotal={getProfitTotal}
                    getInvoiceChargeBreakdown={getInvoiceChargeBreakdown}
                    calculateRuntimeBreakdown={calculateRuntimeBreakdown}
                    getCostButtonLabel={getCostButtonLabel}
                    calculateJobCost={calculateJobCost}
                    getWorkflowActions={getWorkflowActions}
                    updateJobStatusQuick={updateJobStatusQuick}
                    saveSelectedJob={saveSelectedJob}
                    deleteJob={deleteJob}
                    printInvoice={printInvoice}
                    uploadJobFile={uploadJobFile}
                    uploadingJobId={uploadingJobId}
                    jobFileMessage={jobFileMessage}
                    modelPreviewByJob={modelPreviewByJob}
                    setModelPreviewByJob={setModelPreviewByJob}
                    getPreviewType={getPreviewType}
                  />
                ))}
                {!filteredJobs.length ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                    No jobs match the current filters.
                  </div>
                ) : null}
              </div>

              <NewJobDialog
                jobEditorMode={jobEditorMode}
                setJobEditorMode={setJobEditorMode}
                addJobFormRef={addJobFormRef}
                createJobFromJobsTab={createJobFromJobsTab}
                saveCurrentEstimateTemplate={saveCurrentEstimateTemplate}
                setMakerWorldMessage={setMakerWorldMessage}
                savedEstimateTemplates={savedEstimateTemplates}
                applySavedEstimateTemplate={applySavedEstimateTemplate}
                deleteEstimateTemplate={deleteEstimateTemplate}
                newJobForm={newJobForm}
                setNewJobForm={setNewJobForm}
                machineOptions={machineOptions}
                setMakerWorldUrl={setMakerWorldUrl}
                setModelUrlMessage={setModelUrlMessage}
                isLookingUpModelName={isLookingUpModelName}
                lookupModelTitle={lookupModelTitle}
                modelUrlMessage={modelUrlMessage}
                makerWorldImportPreview={makerWorldImportPreview}
                addNewJobMaterialEntry={addNewJobMaterialEntry}
                newJobMaterialEntries={newJobMaterialEntries}
                materials={materials}
                updateNewJobMaterialEntry={updateNewJobMaterialEntry}
                removeNewJobMaterialEntry={removeNewJobMaterialEntry}
                jobStatusOptions={jobStatusOptions}
                paymentStatusOptions={paymentStatusOptions}
              />
            </div>
          </section>
        )}

        {activeTab === "materials" && <MaterialsPage materials={materials} onChanged={loadData} />}

        {activeTab === "machines" && (
          <MachinesPage
            openAddMachineForm={openAddMachineForm}
            showMachineEditor={showMachineEditor}
            editingMachineName={editingMachineName}
            closeMachineForm={closeMachineForm}
            saveMachine={saveMachine}
            machineForm={machineForm}
            setMachineForm={setMachineForm}
            machineProfiles={machineProfiles}
            jobs={jobs}
            startEditingMachine={startEditingMachine}
            removeMachine={removeMachine}
            machineMessage={machineMessage}
          />
        )}

        {activeTab === "customers" && (
          <CustomersPage
            customers={customers}
            customerForm={customerForm}
            setCustomerForm={setCustomerForm}
            editingCustomerId={editingCustomerId}
            resetCustomerForm={resetCustomerForm}
            saveCustomer={saveCustomer}
            startEditingCustomer={startEditingCustomer}
            removeCustomer={removeCustomer}
            loadCustomerOrders={loadCustomerOrders}
            selectedCustomerId={selectedCustomerId}
            customerHistory={customerHistory}
            customerMessage={customerMessage}
          />
        )}

        {activeTab === "suppliers" && (
          <SuppliersPage
            suppliers={suppliers}
            supplierForm={supplierForm}
            setSupplierForm={setSupplierForm}
            editingSupplierId={editingSupplierId}
            resetSupplierForm={resetSupplierForm}
            saveSupplier={saveSupplier}
            startEditingSupplier={startEditingSupplier}
            removeSupplier={removeSupplier}
            getSafeExternalUrl={getSafeExternalUrl}
            loadSupplierPurchases={loadSupplierPurchases}
            selectedSupplierId={selectedSupplierId}
            supplierPurchaseForm={supplierPurchaseForm}
            setSupplierPurchaseForm={setSupplierPurchaseForm}
            saveSupplierPurchase={saveSupplierPurchase}
            supplierPurchases={supplierPurchases}
            supplierMessage={supplierMessage}
          />
        )}

        {activeTab === "admin" && (
          <AdminPage
            isSuperAdmin={!!currentUser.isSuperAdmin}
            adminTextColor={adminTextColor}
            adminSectionStyle={adminSectionStyle}
            adminCardStyle={adminCardStyle}
            adminMutedTextStyle={adminMutedTextStyle}
            quickThemePresets={quickThemePresets}
            setBillingSettings={setBillingSettings}
            adminBackgroundColor={adminBackgroundColor}
            siteInputColor={siteInputColor}
            siteAccentColor={siteAccentColor}
            siteAccentTextColor={siteAccentTextColor}
            defaultTheme={{
              adminBackgroundColor: DEFAULT_ADMIN_BACKGROUND_COLOR,
              adminTextColor: DEFAULT_ADMIN_TEXT_COLOR,
              siteInputColor: DEFAULT_SITE_INPUT_COLOR,
              siteAccentColor: DEFAULT_SITE_ACCENT_COLOR,
              siteAccentTextColor: DEFAULT_SITE_ACCENT_TEXT_COLOR,
            }}
            saveBilling={saveBilling}
            savingBilling={savingBilling}
            selectedBackupSections={selectedBackupSections}
            setSelectedBackupSections={setSelectedBackupSections}
            toggleBackupSection={toggleBackupSection}
            downloadSelectedBackup={downloadSelectedBackup}
            restoreSelectedBackup={restoreSelectedBackup}
            backupMessage={backupMessage}
            workspaceId={currentUser.workspaceId}
            versionInfo={versionInfo}
            versionError={versionError}
          />
        )}

        {activeTab === "billing" && (
          <BillingPage
            workspaceId={currentUser.workspaceId}
            billingSettings={billingSettings}
            setBillingSettings={setBillingSettings}
            billingMaterialTypes={billingMaterialTypes}
            savingBilling={savingBilling}
            billingSaveMessage={billingSaveMessage}
            saveBilling={saveBilling}
            updateBilling={updateBilling}
            updateMaterialTypeMarkup={updateMaterialTypeMarkup}
            billingAuditLogs={billingAuditLogs}
            setBillingAuditLogs={setBillingAuditLogs}
          />
        )}

        {activeTab === "help" && <HelpPage versionInfo={versionInfo} versionError={versionError} />}

        {(billingSettings.businessAddress || billingSettings.businessEmail || billingSettings.businessPhone || billingSettings.businessWebsite) ? (
          <footer className="mt-10 border-t border-slate-800 pt-4 text-xs text-slate-400">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {billingSettings.businessAddress ? <span>{billingSettings.businessAddress}</span> : null}
              {billingSettings.businessEmail ? <span>{billingSettings.businessEmail}</span> : null}
              {billingSettings.businessPhone ? <span>{billingSettings.businessPhone}</span> : null}
              {billingSettings.businessWebsite ? (
                <a className="text-cyan-300 underline" href={billingSettings.businessWebsite} target="_blank" rel="noreferrer">
                  {billingSettings.businessWebsite}
                </a>
              ) : null}
            </div>
          </footer>
        ) : null}

        {versionInfo ? (
          <div className="mt-4 text-right text-xs text-slate-500">
            <button
              type="button"
              onClick={() => { setActiveTab("help"); window.setTimeout(() => document.getElementById("about-makerflow")?.scrollIntoView({ behavior: "smooth" }), 0); }}
              className="underline decoration-dotted hover:text-cyan-300"
              title={`Build ${versionInfo.buildNumber} • ${versionInfo.gitCommit}`}
            >
              {formatVersionBadge(versionInfo)}
            </button>
          </div>
        ) : null}

        {showCustomerCaptureModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 no-print">
            <form onSubmit={saveCapturedCustomer} className="w-full max-w-lg rounded-2xl border border-cyan-700/40 bg-slate-900 p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Customer details</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">Add customer to CRM Lite</h3>
                  <p className="mt-1 text-sm text-slate-400">This job used a new customer name. Complete details now or skip for later.</p>
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Name</span>
                  <input value={customerCaptureForm.name} onChange={(e) => setCustomerCaptureForm((current) => ({ ...current, name: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" required />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Address</span>
                  <input value={customerCaptureForm.address} onChange={(e) => setCustomerCaptureForm((current) => ({ ...current, address: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Email</span>
                  <input value={customerCaptureForm.email} onChange={(e) => setCustomerCaptureForm((current) => ({ ...current, email: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Phone</span>
                  <input value={customerCaptureForm.phone} onChange={(e) => setCustomerCaptureForm((current) => ({ ...current, phone: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Notes</span>
                  <input value={customerCaptureForm.notes} onChange={(e) => setCustomerCaptureForm((current) => ({ ...current, notes: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerCaptureModal(false);
                    setCustomerCaptureForm({ name: "", address: "", email: "", phone: "", notes: "" });
                  }}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300"
                >
                  Skip
                </button>
                <button type="submit" className="rounded-full border border-cyan-700 px-4 py-2 text-sm text-cyan-300">Save customer</button>
              </div>
            </form>
          </div>
        ) : null}

      </div>
    </div>
  );
}

export default App;

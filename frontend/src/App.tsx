import { createElement, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import api from "./api";
import { BillingSettings, Customer, Job, Material, MaterialPurchase, Supplier } from "./types";

const APP_NAME = "Fabrication Workshop Tracker";
const APP_VERSION = "0.6.0";
const WORKSHOP_DAILY_CAPACITY_HOURS = 8;
const SCHEDULE_HORIZON_DAYS = 14;

const defaultMachineNames = [
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

const blankBillingSettings = (): BillingSettings => ({
  businessName: "",
  businessLogoUrl: "",
  businessAddress: "",
  businessEmail: "",
  businessPhone: "",
  businessWebsite: "",
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

const getJobMode = (machineType: string) => (machineType.toLowerCase().includes("laser") || machineType.toLowerCase().includes("cnc") ? "laser" : "3d");
const normalizeMarkupPercent = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 25;
};
const normalizeOptionalMarkupPercent = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const toClearableNumberInput = (value: number) => (value === 0 ? "" : String(value));
const parseNumberInput = (value: string) => (value.trim() === "" ? 0 : Number(value));
const jobStatusOptions = ["Quote Draft", "Quote Sent", "Quote Approved", "Pending", "In Progress", "Completed", "Invoiced"];
const paymentStatusOptions = ["Unpaid", "Partially Paid", "Paid", "Overdue"];
const jobWorkflowStatusOptions = ["All", ...jobStatusOptions] as const;
const getPreviewType = (filePath?: string | null) => {
  const normalized = String(filePath || "").toLowerCase();
  if (normalized.endsWith(".svg")) return "svg";
  if (normalized.endsWith(".stl")) return "stl";
  return "none";
};

function App() {
  const KG_TO_G = 1000;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "jobs" | "materials" | "machines" | "customers" | "suppliers" | "billing" | "admin" | "help">("dashboard");
  const [jobForm, setJobForm] = useState({ name: "", customer: "", machineType: defaultMachineNames[0], machineRunTimeMinutes: "60", labourTimeMinutes: "60", dueDate: "", queuePosition: "0", qaChecklistText: "", qaPassed: false, reworkCost: "0", reworkNotes: "", isRush: false, paymentStatus: "Unpaid", depositPaidAmount: "0", status: "Pending" });
  const [materialForm, setMaterialForm] = useState({ name: "", type: "PLA", unit: "g", color: "", costPerUnit: "20", stockLevel: "1", reorderThreshold: "0.2" });
  const [jobMaterialEntries, setJobMaterialEntries] = useState<Array<{ materialId: string; usageQuantity: string }>>([]);
  const [billingSettings, setBillingSettings] = useState<BillingSettings>(blankBillingSettings());
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [jobEditorMode, setJobEditorMode] = useState<"none" | "edit" | "create" | "invoice">("none");
  const [selectedJobForm, setSelectedJobForm] = useState({ name: "", customer: "", machineType: defaultMachineNames[0], machineRunTimeMinutes: "", labourTimeMinutes: "", dueDate: "", queuePosition: "0", qaChecklistText: "", qaPassed: false, reworkCost: "0", reworkNotes: "", isRush: false, paymentStatus: "Unpaid", depositPaidAmount: "0", status: "Pending" });
  const [selectedJobMaterialEntries, setSelectedJobMaterialEntries] = useState<Array<{ materialId: string; usageQuantity: string }>>([]);
  const [newJobForm, setNewJobForm] = useState({ name: "", customer: "", machineType: defaultMachineNames[0], machineRunTimeMinutes: "60", labourTimeMinutes: "60", dueDate: "", queuePosition: "0", qaChecklistText: "", qaPassed: false, reworkCost: "0", reworkNotes: "", isRush: false, paymentStatus: "Unpaid", depositPaidAmount: "0", status: "Pending" });
  const [newJobMaterialEntries, setNewJobMaterialEntries] = useState<Array<{ materialId: string; usageQuantity: string }>>([]);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [showMaterialEditor, setShowMaterialEditor] = useState(false);
  const [editingMachineName, setEditingMachineName] = useState<string | null>(null);
  const [showMachineEditor, setShowMachineEditor] = useState(false);
  const [machineForm, setMachineForm] = useState({ name: "", wattage: "0", depreciationCost: "0", replacementRunHours: "0" });
  const [machineMessage, setMachineMessage] = useState("");
  const [savingBilling, setSavingBilling] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const [materialBackupMessage, setMaterialBackupMessage] = useState("");
  const [fullBackupMessage, setFullBackupMessage] = useState("");
  const [customerForm, setCustomerForm] = useState({ name: "", address: "", email: "", phone: "", notes: "" });
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerHistory, setCustomerHistory] = useState<Job[]>([]);
  const [customerMessage, setCustomerMessage] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierForm, setSupplierForm] = useState({ name: "", contactEmail: "", contactPhone: "", notes: "" });
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
  const [uploadingJobId, setUploadingJobId] = useState<string | null>(null);
  const [jobFileMessage, setJobFileMessage] = useState<Record<string, string>>({});

  const loadData = async () => {
    const [jobsData, materialsData, customersData, suppliersData] = await Promise.all([api.getJobs(), api.getMaterials(), api.getCustomers(), api.getSuppliers()]);
    const normalizedJobs = jobsData.map((job) => {
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
    let finalMaterials = materialsData;
    if (!finalMaterials.length) {
      await api.seedMaterials();
      finalMaterials = await api.getMaterials();
    }
    setJobs(normalizedJobs);
    setMaterials(finalMaterials);
    setCustomers(customersData);
    setSuppliers(suppliersData);
    if (!jobMaterialEntries.length && finalMaterials.length) {
      setJobMaterialEntries([{ materialId: finalMaterials[0].id, usageQuantity: "100" }]);
    }
  };

  const loadBillingSettings = async () => {
    const settings = await api.getBillingSettings();
    if (!settings) {
      setBillingSettings(blankBillingSettings());
      return;
    }

    setBillingSettings({
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
      depreciationMarkupPercent: Number((settings as BillingSettings).depreciationMarkupPercent ?? 0),
      labourRate: Number(settings.labourRate ?? 20),
      workshopHourlyRate: Number((settings as BillingSettings).workshopHourlyRate ?? 0),
      minimumCharge: Number((settings as BillingSettings).minimumCharge ?? 0),
      setupFee: Number((settings as BillingSettings).setupFee ?? 0),
      rushFeePercent: Number((settings as BillingSettings).rushFeePercent ?? 0),
      wasteFactorPercent: Number((settings as BillingSettings).wasteFactorPercent ?? 0),
      deliveryAmount: Number((settings as BillingSettings).deliveryAmount ?? 0),
      vatPercent: Number((settings as BillingSettings).vatPercent ?? 0),
      depositPercent: Number((settings as BillingSettings).depositPercent ?? 0),
      paymentTermsDays: Number((settings as BillingSettings).paymentTermsDays ?? 0),
      businessName: String((settings as BillingSettings).businessName ?? ""),
      businessLogoUrl: String((settings as BillingSettings).businessLogoUrl ?? ""),
      businessAddress: String((settings as BillingSettings).businessAddress ?? ""),
      businessEmail: String((settings as BillingSettings).businessEmail ?? ""),
      businessPhone: String((settings as BillingSettings).businessPhone ?? ""),
      businessWebsite: String((settings as BillingSettings).businessWebsite ?? ""),
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
              depreciationCost: Number(machineSetting?.depreciationCost ?? 0),
              replacementRunHours: Number(machineSetting?.replacementRunHours ?? 0),
            },
          ]),
        ),
      },
    });
  };

  useEffect(() => {
    loadData().catch(() => undefined);
    loadBillingSettings().catch(() => undefined);
  }, []);

  const selectedJob = useMemo(() => jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null, [jobs, selectedJobId]);

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
      machineType: selectedJob.machineType || machineOptions[0],
      machineRunTimeMinutes: String(selectedJob.machineRunTimeMinutes ?? selectedJob.estTimeMinutes ?? 0),
      labourTimeMinutes: String(selectedJob.labourTimeMinutes ?? selectedJob.estTimeMinutes ?? 0),
      dueDate: selectedJob.dueDate ? String(selectedJob.dueDate).slice(0, 10) : "",
      queuePosition: String(selectedJob.queuePosition ?? 0),
      qaChecklistText: checklistLines,
      qaPassed: Boolean(selectedJob.qaPassed),
      reworkCost: String(selectedJob.reworkCost ?? 0),
      reworkNotes: selectedJob.reworkNotes || "",
      isRush: Boolean(selectedJob.isRush),
      paymentStatus: selectedJob.paymentStatus || "Unpaid",
      depositPaidAmount: String(selectedJob.depositPaidAmount ?? 0),
      status: selectedJob.status || "Pending",
    });
    setSelectedJobMaterialEntries((selectedJob.materials || []).map((entry) => ({
      materialId: entry.materialId,
      usageQuantity: String(entry.usageQuantity || 0),
    })));
  }, [selectedJob?.id, selectedJob?.name, selectedJob?.customer, selectedJob?.machineType, selectedJob?.estTimeMinutes, selectedJob?.machineRunTimeMinutes, selectedJob?.labourTimeMinutes, selectedJob?.dueDate, selectedJob?.queuePosition, selectedJob?.qaChecklist, selectedJob?.qaPassed, selectedJob?.reworkCost, selectedJob?.reworkNotes, selectedJob?.isRush, selectedJob?.paymentStatus, selectedJob?.depositPaidAmount, selectedJob?.status, selectedJob?.materials]);

  useEffect(() => {
    if (!newJobMaterialEntries.length && materials.length) {
      setNewJobMaterialEntries([{ materialId: materials[0].id, usageQuantity: "100" }]);
    }
  }, [materials, newJobMaterialEntries.length]);

  const lowStockMaterials = useMemo(() => materials.filter((material) => material.stockLevel <= material.reorderThreshold), [materials]);
  const pendingJobs = useMemo(() => jobs.filter((job) => job.status === "Pending"), [jobs]);
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
      dayMap.set(date.toISOString().slice(0, 10), {
        date,
        dueCount: 0,
        projectedCount: 0,
        totalRuntimeMinutes: 0,
      });
    }

    queuedJobs.forEach((job) => {
      if (!job.dueDate) return;
      const dueKey = new Date(job.dueDate).toISOString().slice(0, 10);
      const day = dayMap.get(dueKey);
      if (!day) return;
      day.dueCount += 1;
      day.totalRuntimeMinutes += Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0);
    });

    machineQueueProjections.forEach((group) => {
      group.projectedJobs.forEach(({ projectedCompletion }) => {
        const projectedKey = projectedCompletion.toISOString().slice(0, 10);
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

  const resetMaterialForm = () => {
    setMaterialForm({ name: "", type: "PLA", unit: "g", color: "", costPerUnit: "20", stockLevel: "1", reorderThreshold: "0.2" });
  };

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
    const rawCustomerName = String(jobForm.customer || "").trim();
    const existingCustomer = customers.find((customer) => customer.name.trim().toLowerCase() === rawCustomerName.toLowerCase());
    await api.createJob({
      name: jobForm.name,
      customer: jobForm.customer || null,
      machineType: jobForm.machineType,
      estTimeMinutes: Number(jobForm.machineRunTimeMinutes),
      machineRunTimeMinutes: Number(jobForm.machineRunTimeMinutes || 0),
      labourTimeMinutes: Number(jobForm.labourTimeMinutes || 0),
      dueDate: jobForm.dueDate || null,
      queuePosition: Number(jobForm.queuePosition || 0),
      qaChecklist: toChecklistArray(jobForm.qaChecklistText),
      qaPassed: Boolean(jobForm.qaPassed),
      reworkCost: Number(jobForm.reworkCost || 0),
      reworkNotes: String(jobForm.reworkNotes || ""),
      isRush: jobForm.isRush,
      paymentStatus: jobForm.paymentStatus,
      depositPaidAmount: Number(jobForm.depositPaidAmount || 0),
      status: jobForm.status,
      materials: toApiJobMaterials(jobMaterialEntries),
    });
    setJobForm({ name: "", customer: "", machineType: machineOptions[0] || "Other", machineRunTimeMinutes: "60", labourTimeMinutes: "60", dueDate: "", queuePosition: "0", qaChecklistText: "", qaPassed: false, reworkCost: "0", reworkNotes: "", isRush: false, paymentStatus: "Unpaid", depositPaidAmount: "0", status: "Pending" });
    setJobMaterialEntries([]);
    await loadData();

    if (rawCustomerName && !existingCustomer) {
      setCustomerCaptureForm({ name: rawCustomerName, address: "", email: "", phone: "", notes: "" });
      setShowCustomerCaptureModal(true);
    }
  };

  const createMaterial = async (e: FormEvent) => {
    e.preventDefault();
    const purchaseCostPerKg = Number(materialForm.costPerUnit || 0);
    const stockKg = Number(materialForm.stockLevel || 0);
    const reorderKg = Number(materialForm.reorderThreshold || 0);
    const normalizedPayload = {
      name: materialForm.name,
      type: materialForm.type,
      unit: "g",
      color: materialForm.color,
      costPerUnit: purchaseCostPerKg / KG_TO_G,
      stockLevel: stockKg * KG_TO_G,
      reorderThreshold: reorderKg * KG_TO_G,
    };

    if (editingMaterialId) {
      await api.updateMaterial(editingMaterialId, normalizedPayload);
    } else {
      await api.createMaterial(normalizedPayload);
    }
    resetMaterialForm();
    setEditingMaterialId(null);
    setShowMaterialEditor(false);
    await loadData();
  };

  const startEditingMaterial = (material: Material) => {
    setActiveTab("materials");
    setShowMaterialEditor(true);
    setEditingMaterialId(material.id);
    setMaterialForm({
      name: material.name,
      type: material.type,
      unit: "g",
      color: material.color || "",
      costPerUnit: String((material.costPerUnit || 0) * KG_TO_G),
      stockLevel: String((material.stockLevel || 0) / KG_TO_G),
      reorderThreshold: String((material.reorderThreshold || 0) / KG_TO_G),
    });
  };

  const openAddMaterialForm = () => {
    setActiveTab("materials");
    setEditingMaterialId(null);
    resetMaterialForm();
    setShowMaterialEditor(true);
  };

  const closeMaterialForm = () => {
    setEditingMaterialId(null);
    resetMaterialForm();
    setShowMaterialEditor(false);
  };

  const copyMaterial = async (material: Material) => {
    await api.createMaterial({
      name: `${material.name} Copy`,
      type: material.type,
      unit: material.unit,
      color: material.color || "",
      costPerUnit: material.costPerUnit,
      stockLevel: material.stockLevel,
      reorderThreshold: material.reorderThreshold,
    });
    await loadData();
  };

  const openNewJobEditor = () => {
    setJobEditorMode("create");
    setNewJobForm({ name: "", customer: "", machineType: machineOptions[0] || "Other", machineRunTimeMinutes: "60", labourTimeMinutes: "60", dueDate: "", queuePosition: "0", qaChecklistText: "", qaPassed: false, reworkCost: "0", reworkNotes: "", isRush: false, paymentStatus: "Unpaid", depositPaidAmount: "0", status: "Pending" });
    setNewJobMaterialEntries(materials.length ? [{ materialId: materials[0].id, usageQuantity: "100" }] : []);
  };

  const openAddMachineForm = () => {
    setActiveTab("machines");
    setEditingMachineName(null);
    setMachineForm({ name: "", wattage: "0", depreciationCost: "0", replacementRunHours: "0" });
    setShowMachineEditor(true);
  };

  const closeMachineForm = () => {
    setEditingMachineName(null);
    setMachineForm({ name: "", wattage: "0", depreciationCost: "0", replacementRunHours: "0" });
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
      depreciationCost: String(existing.depreciationCost ?? 0),
      replacementRunHours: String(existing.replacementRunHours ?? 0),
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

    nextSettings.machineElectricitySettings[normalizedName] = {
      name: normalizedName,
      wattage: Number(machineForm.wattage || 0),
      depreciationCost: Number(machineForm.depreciationCost || 0),
      replacementRunHours: Number(machineForm.replacementRunHours || 0),
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
    const rawCustomerName = String(newJobForm.customer || "").trim();
    const existingCustomer = customers.find((customer) => customer.name.trim().toLowerCase() === rawCustomerName.toLowerCase());
    const created = await api.createJob({
      name: newJobForm.name,
      customer: newJobForm.customer || null,
      machineType: newJobForm.machineType,
      estTimeMinutes: Number(newJobForm.machineRunTimeMinutes || 0),
      machineRunTimeMinutes: Number(newJobForm.machineRunTimeMinutes || 0),
      labourTimeMinutes: Number(newJobForm.labourTimeMinutes || 0),
      dueDate: newJobForm.dueDate || null,
      queuePosition: Number(newJobForm.queuePosition || 0),
      qaChecklist: toChecklistArray(newJobForm.qaChecklistText),
      qaPassed: Boolean(newJobForm.qaPassed),
      reworkCost: Number(newJobForm.reworkCost || 0),
      reworkNotes: String(newJobForm.reworkNotes || ""),
      isRush: newJobForm.isRush,
      paymentStatus: newJobForm.paymentStatus,
      depositPaidAmount: Number(newJobForm.depositPaidAmount || 0),
      status: newJobForm.status,
      materials: toApiJobMaterials(newJobMaterialEntries),
    });
    await loadData();
    setSelectedJobId(created.id);
    if (created.status === "Completed") {
      await calculateJobCost(created);
      setExpandedJobId(created.id);
      setJobEditorMode("invoice");
    } else {
      setJobEditorMode("edit");
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
    } catch (_error) {
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
          usageQuantity: "100",
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
    const labourTimeMinutes = Number(job.labourTimeMinutes ?? job.estTimeMinutes ?? 0);
    await api.calculateCost(job.id, {
      mode: getJobMode(job.machineType),
      machineName: job.machineType,
      isRush: Boolean(job.isRush),
      machineRunTimeMinutes,
      labourTimeMinutes,
      materials: (job.materials || []).map((entry) => ({
        materialId: entry.materialId,
        usageQuantity: entry.usageQuantity,
        usageUnit: entry.usageUnit,
        usageUnitCost: entry.usageUnitCost,
      })),
    });
    await loadData();
  };

  const updateJobStatusQuick = async (job: Job, status: string) => {
    await api.updateJob(job.id, {
      name: job.name,
      customer: job.customer || null,
      machineType: job.machineType,
      estTimeMinutes: Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0),
      machineRunTimeMinutes: Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0),
      labourTimeMinutes: Number(job.labourTimeMinutes ?? job.estTimeMinutes ?? 0),
      dueDate: job.dueDate || null,
      queuePosition: Number(job.queuePosition || 0),
      qaChecklist: job.qaChecklist || [],
      qaPassed: Boolean(job.qaPassed),
      reworkCost: Number(job.reworkCost || 0),
      reworkNotes: String(job.reworkNotes || ""),
      isRush: Boolean(job.isRush),
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
    if (fileExtension !== "svg" && fileExtension !== "stl") {
      setJobFileMessage((current) => ({ ...current, [job.id]: "Only SVG and STL files are supported." }));
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
    } catch (_error) {
      setJobFileMessage((current) => ({ ...current, [job.id]: "Upload failed. Please try again." }));
    } finally {
      setUploadingJobId(null);
      event.target.value = "";
    }
  };

  const saveSelectedJob = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    const nextStatus = selectedJobForm.status;
    await api.updateJob(selectedJob.id, {
      name: selectedJobForm.name,
      customer: selectedJobForm.customer || null,
      machineType: selectedJobForm.machineType,
      estTimeMinutes: Number(selectedJobForm.machineRunTimeMinutes || 0),
      machineRunTimeMinutes: Number(selectedJobForm.machineRunTimeMinutes || 0),
      labourTimeMinutes: Number(selectedJobForm.labourTimeMinutes || 0),
      dueDate: selectedJobForm.dueDate || null,
      queuePosition: Number(selectedJobForm.queuePosition || 0),
      qaChecklist: toChecklistArray(selectedJobForm.qaChecklistText),
      qaPassed: Boolean(selectedJobForm.qaPassed),
      reworkCost: Number(selectedJobForm.reworkCost || 0),
      reworkNotes: String(selectedJobForm.reworkNotes || ""),
      isRush: selectedJobForm.isRush,
      paymentStatus: selectedJobForm.paymentStatus,
      depositPaidAmount: Number(selectedJobForm.depositPaidAmount || 0),
      status: selectedJobForm.status,
      materials: toApiJobMaterials(selectedJobMaterialEntries),
    });
    await loadData();
    if (nextStatus === "Completed") {
      await calculateJobCost({ ...selectedJob, status: nextStatus, isRush: selectedJobForm.isRush });
      setExpandedJobId(selectedJob.id);
      setSelectedJobId(selectedJob.id);
      setJobEditorMode("invoice");
      return;
    }
    setJobEditorMode("none");
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
      await api.saveBillingSettings(billingSettings);
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

  const formatCurrency = (value?: number | null) => `£${(value ?? 0).toFixed(2)}`;
  const calculateRuntimeBreakdown = (job: Job) => {
    const machineRunTimeMinutes = Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0);
    const materialWeightGrams = (job.materials || []).reduce((sum, entry) => sum + Number(entry.usageQuantity || 0), 0);
    const machineSettings = billingSettings.machineElectricitySettings || {};
    const normalizeMachineName = (value: string) => value.trim().toLowerCase();
    const normalizedMachineName = normalizeMachineName(String(job.machineType || ""));
    const selectedMachineEntry = Object.entries(machineSettings).find(([savedName]) => normalizeMachineName(savedName) === normalizedMachineName);
    const selectedMachine = machineSettings[job.machineType] || selectedMachineEntry?.[1] || {};
    const machineDepreciationCost = Number(selectedMachine?.depreciationCost ?? billingSettings.depreciationCost ?? 0);
    const machineReplacementRunHours = Number(selectedMachine?.replacementRunHours ?? billingSettings.depreciationHours ?? 0);
    const depreciationCost = machineReplacementRunHours > 0
      ? (machineRunTimeMinutes / 60) * (machineDepreciationCost / machineReplacementRunHours)
      : 0;
    const electricityCost = Math.max(0, Number(job.cost?.electricityCost ?? 0) - depreciationCost);

    return {
      machineRunTimeMinutes,
      materialWeightGrams,
      depreciationCost,
      electricityCost,
      workshopCost: Number(job.cost?.overheadCost ?? 0),
    };
  };
  const getMaterialTypeMarkupPercent = (materialType: string) => {
    const normalizedMaterialType = String(materialType || "Other").trim().toLowerCase();
    const matchedEntry = Object.entries(billingSettings.materialTypeMarkups || {}).find(([typeName]) => typeName.trim().toLowerCase() === normalizedMaterialType);
    const percent = Number(matchedEntry?.[1]?.percent ?? 0);
    return Number.isFinite(percent) && percent > 0 ? percent : 0;
  };
  const getInvoiceChargeBreakdown = (job: Job) => {
    const wasteFactorMultiplier = 1 + (Math.max(0, Number(billingSettings.wasteFactorPercent || 0)) / 100);
    const baseMaterialCost = Number(job.cost?.materialCost ?? 0);
    const runtimeBreakdown = calculateRuntimeBreakdown(job);
    const baseElectricityCost = Number(runtimeBreakdown.electricityCost ?? 0);
    const baseDepreciationCost = Number(runtimeBreakdown.depreciationCost ?? 0);
    const baseLabourCost = Number(job.cost?.labourCost ?? 0);
    const baseOverheadCost = Number(job.cost?.overheadCost ?? 0);
    const materialMarkupPercent = Number(billingSettings.materialMarkupPercent || 0);
    const electricityMarkupPercent = Number(billingSettings.electricityMarkupPercent || 0);
    const depreciationMarkupPercent = Number(billingSettings.depreciationMarkupPercent || 0);

    const materialTypeMarkupCharge = (job.materials || []).reduce((sum, entry) => {
      const lineBase = (Number(entry.usageQuantity || 0) * Number(entry.usageUnitCost || 0)) * wasteFactorMultiplier;
      const materialType = entry.material?.type || "Other";
      const typeMarkupPercent = getMaterialTypeMarkupPercent(materialType);
      return sum + (lineBase * (typeMarkupPercent / 100));
    }, 0);

    const materialCharge = baseMaterialCost + materialTypeMarkupCharge + (baseMaterialCost * (materialMarkupPercent / 100));
    const electricityCharge = baseElectricityCost + (baseElectricityCost * (electricityMarkupPercent / 100));
    const depreciationCharge = baseDepreciationCost + (baseDepreciationCost * (depreciationMarkupPercent / 100));
    const labourCharge = baseLabourCost;
    const overheadCharge = baseOverheadCost;
    const preGuardrailCustomerCharge = materialCharge + electricityCharge + depreciationCharge + labourCharge + overheadCharge;
    const setupFeeAmount = Math.max(0, Number(billingSettings.setupFee || 0));
    const rushFeeAmount = job.isRush
      ? (preGuardrailCustomerCharge + setupFeeAmount) * (Math.max(0, Number(billingSettings.rushFeePercent || 0)) / 100)
      : 0;
    const guardrailSubtotal = preGuardrailCustomerCharge + setupFeeAmount + rushFeeAmount;
    const minimumChargeApplied = Math.max(0, Math.max(0, Number(billingSettings.minimumCharge || 0)) - guardrailSubtotal);
    const customerCharge = guardrailSubtotal + minimumChargeApplied;

    return {
      materialCharge,
      electricityCharge,
      depreciationCharge,
      labourCharge,
      overheadCharge,
      setupFeeAmount,
      rushFeeAmount,
      minimumChargeApplied,
      customerCharge,
    };
  };
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
  const selectedCustomerProfile = useMemo(
    () => customers.find((customer) => customer.name.trim().toLowerCase() === String(selectedJob?.customer || "").trim().toLowerCase()) || null,
    [customers, selectedJob?.customer],
  );
  const businessDisplayName = billingSettings.businessName?.trim() || APP_NAME;
  const appHeading = billingSettings.businessName?.trim()
    ? `${billingSettings.businessName.trim()} • ${APP_NAME}`
    : APP_NAME;

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

  const printInvoice = (job: Job) => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=980,height=700");
    if (!printWindow) {
      window.alert("Could not open print window. Please allow pop-ups and try again.");
      return;
    }

    const safe = (value: string) => value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

    const customerName = job.customer || "Walk-in customer";
    const jobRuntime = Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0);
    const labourRuntime = Number(job.labourTimeMinutes ?? job.estTimeMinutes ?? 0);
    const chargeBreakdown = getInvoiceChargeBreakdown(job);
    const materialAmount = chargeBreakdown.materialCharge;
    const productionAmount = chargeBreakdown.electricityCharge + chargeBreakdown.depreciationCharge + chargeBreakdown.overheadCharge;
    const labourAmount = chargeBreakdown.labourCharge;
    const subTotal = chargeBreakdown.customerCharge;
    const deliveryAmount = Number(billingSettings.deliveryAmount || 0);
    const vatPercent = Number(billingSettings.vatPercent || 0);
    const vatAmount = (subTotal + deliveryAmount) * (vatPercent / 100);
    const grandTotal = subTotal + deliveryAmount + vatAmount;
    const suggestedDepositAmount = grandTotal * (Math.max(0, Number(billingSettings.depositPercent || 0)) / 100);
    const depositPaidAmount = Number(job.depositPaidAmount || 0);
    const balanceDue = Math.max(0, grandTotal - depositPaidAmount);
    const paymentTermsDays = Number(billingSettings.paymentTermsDays || 0);
    const dueLabel = paymentTermsDays > 0 ? `Due in ${paymentTermsDays} days` : "Due on receipt";

    const printMarkup = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Invoice ${safe(job.jobNumber || "TBC")}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; margin: 24px; color: #0f172a; }
      h1, h2, h3, p { margin: 0; }
      .muted { color: #475569; }
      .row { display: flex; justify-content: space-between; gap: 12px; }
      .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; }
      .table { border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; margin-top: 16px; }
      .thead, .trow { display: grid; grid-template-columns: 2fr 1fr; }
      .thead { background: #f8fafc; font-weight: 600; }
      .thead div, .trow div { padding: 10px 12px; }
      .trow { border-top: 1px solid #e2e8f0; }
      .totals { margin-top: 16px; margin-left: auto; width: 280px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; }
      .totals .row { margin-bottom: 8px; }
      .totals .row:last-child { margin-bottom: 0; font-weight: 700; border-top: 1px solid #cbd5e1; padding-top: 8px; }
      .footer { margin-top: 16px; font-size: 12px; color: #475569; display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
    </style>
  </head>
  <body>
    <div class="row">
      <div>
        <p class="muted" style="letter-spacing:0.08em; text-transform:uppercase; font-size:12px;">Invoice</p>
        <h2 style="margin-top:6px;">${safe(job.name)}</h2>
        <p class="muted" style="margin-top:4px;">${safe(customerName)}</p>
        <p class="muted" style="margin-top:12px;">From: <strong style="color:#0f172a;">${safe(businessDisplayName)}</strong></p>
        ${billingSettings.businessAddress ? `<p class="muted">${safe(billingSettings.businessAddress)}</p>` : ""}
      </div>
      <div style="text-align:right;">
        <p><strong>#${safe(job.jobNumber || "TBC")}</strong></p>
        <p class="muted">Issued ${safe(new Date().toLocaleDateString())}</p>
        <p class="muted">${safe(dueLabel)}</p>
      </div>
    </div>

    <div style="margin-top:14px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
      <div class="card">
        <p class="muted" style="font-size:12px; letter-spacing:0.08em; text-transform:uppercase;">Bill to</p>
        <p style="margin-top:8px;"><strong>${safe(customerName)}</strong></p>
        ${selectedCustomerProfile?.address ? `<p class="muted">${safe(selectedCustomerProfile.address)}</p>` : ""}
        ${selectedCustomerProfile?.email ? `<p class="muted">${safe(selectedCustomerProfile.email)}</p>` : ""}
        ${selectedCustomerProfile?.phone ? `<p class="muted">${safe(selectedCustomerProfile.phone)}</p>` : ""}
      </div>
      <div class="card">
        <p class="muted" style="font-size:12px; letter-spacing:0.08em; text-transform:uppercase;">Job summary</p>
        <p style="margin-top:8px;"><strong>${safe(job.status || "Pending")}</strong></p>
        <p class="muted">Runtime ${safe(String(jobRuntime))} mins • Labour ${safe(String(labourRuntime))} mins</p>
      </div>
    </div>

    <div class="table">
      <div class="thead"><div>Description</div><div style="text-align:right;">Amount</div></div>
      <div class="trow"><div><strong>Materials</strong></div><div style="text-align:right;"><strong>${safe(formatCurrency(materialAmount))}</strong></div></div>
      <div class="trow"><div><strong>Production costs</strong></div><div style="text-align:right;"><strong>${safe(formatCurrency(productionAmount))}</strong></div></div>
      <div class="trow"><div><strong>Labour (${safe(String(labourRuntime))} mins)</strong></div><div style="text-align:right;"><strong>${safe(formatCurrency(labourAmount))}</strong></div></div>
    </div>

    <div class="totals">
      <div class="row"><span class="muted">SubTotal</span><span class="muted">${safe(formatCurrency(subTotal))}</span></div>
      <div class="row"><span class="muted">Delivery</span><span class="muted">${safe(formatCurrency(deliveryAmount))}</span></div>
      <div class="row"><span class="muted">VAT (${safe(vatPercent.toFixed(0))}%)</span><span class="muted">${safe(formatCurrency(vatAmount))}</span></div>
      <div class="row"><span class="muted">Suggested deposit (${safe(Number(billingSettings.depositPercent || 0).toFixed(0))}%)</span><span class="muted">${safe(formatCurrency(suggestedDepositAmount))}</span></div>
      <div class="row"><span class="muted">Deposit paid</span><span class="muted">${safe(formatCurrency(depositPaidAmount))}</span></div>
      <div class="row"><span>Grand total</span><span>${safe(formatCurrency(grandTotal))}</span></div>
      <div class="row"><span>Balance due</span><span>${safe(formatCurrency(balanceDue))}</span></div>
    </div>

    ${(billingSettings.businessAddress || billingSettings.businessEmail || billingSettings.businessPhone || billingSettings.businessWebsite) ? `<div class="footer">
      ${billingSettings.businessAddress ? `<span>${safe(billingSettings.businessAddress)}</span>` : ""}
      ${billingSettings.businessEmail ? `<span>${safe(billingSettings.businessEmail)}</span>` : ""}
      ${billingSettings.businessPhone ? `<span>${safe(billingSettings.businessPhone)}</span>` : ""}
      ${billingSettings.businessWebsite ? `<span>${safe(billingSettings.businessWebsite)}</span>` : ""}
    </div>` : ""}
  </body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(printMarkup);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

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
    setSupplierForm({ name: "", contactEmail: "", contactPhone: "", notes: "" });
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

  const exportBackupCsv = async () => {
    const csv = await api.exportJobsCsv(jobs);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "jobs-backup.csv";
    link.click();
    window.URL.revokeObjectURL(url);
    setBackupMessage("Jobs export ready.");
  };

  const exportMaterialsCsv = async () => {
    const csv = await api.exportMaterialsCsv(materials);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "materials-backup.csv";
    link.click();
    window.URL.revokeObjectURL(url);
    setMaterialBackupMessage("Materials export ready.");
  };

  const importBackupCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = text.trim().split(/\r?\n/).slice(1);
    const importedJobs = rows.map((row) => {
      const [jobNumber, name, customer, machineType, machineRunTimeMinutesRaw, labourTimeMinutesRaw, statusRaw] = row.split(",");
      const status = statusRaw || labourTimeMinutesRaw || "Pending";
      const machineRunTimeMinutes = Number(machineRunTimeMinutesRaw || 0);
      const labourTimeMinutes = Number(statusRaw ? labourTimeMinutesRaw || 0 : machineRunTimeMinutesRaw || 0);
      return {
        id: crypto.randomUUID(),
        jobNumber,
        name,
        customer,
        machineType,
        estTimeMinutes: machineRunTimeMinutes,
        machineRunTimeMinutes,
        labourTimeMinutes,
        status,
      } as Job;
    });

    await api.importBackup({ jobs: importedJobs, materials });
    await loadData();
    setBackupMessage("Jobs backup imported successfully.");
  };

  const importMaterialsCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = text.trim().split(/\r?\n/).slice(1);
    const importedMaterials = rows
      .map((row) => {
        const [name, type, unit, costPerUnitRaw, stockLevelRaw, reorderThresholdRaw, color] = row.split(",");
        return {
          name: String(name || "").trim(),
          type: String(type || "Other").trim() || "Other",
          unit: String(unit || "g").trim() || "g",
          costPerUnit: Number(costPerUnitRaw || 0),
          stockLevel: Number(stockLevelRaw || 0),
          reorderThreshold: Number(reorderThresholdRaw || 0),
          color: String(color || "").trim(),
        };
      })
      .filter((material) => material.name);

    if (!importedMaterials.length) {
      setMaterialBackupMessage("No valid material rows found in CSV.");
      return;
    }

    await api.importMaterialsCsv({ materials: importedMaterials });
    await loadData();
    setMaterialBackupMessage(`Materials CSV imported (${importedMaterials.length} rows processed).`);
  };

  const exportFullBackup = async () => {
    const backup = await api.exportFullBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "full-backup.json";
    link.click();
    window.URL.revokeObjectURL(url);
    setFullBackupMessage("Full backup exported.");
  };

  const importFullBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const payload = JSON.parse(text);
    await api.importFullBackup(payload);
    await loadData();
    await loadBillingSettings();
    setFullBackupMessage("Full backup restored successfully.");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl p-6">
        <header className="mb-8 flex items-center justify-between no-print">
          <div>
            <h1 className="text-3xl font-semibold">{appHeading}</h1>
            <p className="mt-2 text-slate-400">Track jobs, materials, and production costs from one place.</p>
          </div>
          {billingSettings.businessLogoUrl ? (
            <img
              src={billingSettings.businessLogoUrl}
              alt="Business logo"
              className="h-14 w-14 rounded-full border border-slate-800 bg-slate-900 object-cover"
            />
          ) : null}
        </header>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 no-print">
          <nav className="flex flex-wrap gap-3">
            {(["dashboard", "jobs", "materials", "machines", "customers", "suppliers", "billing", "admin", "help"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-full px-4 py-2 text-sm capitalize ${activeTab === tab ? "bg-cyan-600 text-white" : "bg-slate-900 text-slate-300"}`}>
                {tab}
              </button>
            ))}
          </nav>
          <div className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300 inline-flex">{jobs.length} jobs</div>
        </div>

        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="text-xl font-semibold">Pending jobs</h2>
                <p className="mt-4 text-4xl font-semibold">{pendingJobs.length}</p>
              </section>
              <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="text-xl font-semibold">Low stock</h2>
                <p className="mt-4 text-4xl font-semibold">{lowStockMaterials.length}</p>
              </section>
              <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">Quick add job</h2>
              <form onSubmit={createJob} className="mt-4 space-y-4">
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Job name</span>
                  <input value={jobForm.name} onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })} placeholder="Job name" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" required />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Customer</span>
                  <input value={jobForm.customer} onChange={(e) => setJobForm({ ...jobForm, customer: e.target.value })} placeholder="Customer" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm text-slate-300">
                    <span className="mb-2 block">Machine type</span>
                    <select value={jobForm.machineType} onChange={(e) => setJobForm({ ...jobForm, machineType: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                      {machineOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm text-slate-300">
                    <span className="mb-2 block">Machine runtime (mins)</span>
                    <input value={jobForm.machineRunTimeMinutes} onChange={(e) => setJobForm({ ...jobForm, machineRunTimeMinutes: e.target.value })} placeholder="Minutes" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                  </label>
                  <label className="block text-sm text-slate-300 md:col-span-2">
                    <span className="mb-2 block">Labour time (mins)</span>
                    <input value={jobForm.labourTimeMinutes} onChange={(e) => setJobForm({ ...jobForm, labourTimeMinutes: e.target.value })} placeholder="Minutes" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                  </label>
                  <label className="block text-sm text-slate-300">
                    <span className="mb-2 block">Status</span>
                    <select value={jobForm.status} onChange={(e) => setJobForm({ ...jobForm, status: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                      {jobStatusOptions.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>{statusOption}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm text-slate-300">
                    <span className="mb-2 block">Payment status</span>
                    <select value={jobForm.paymentStatus} onChange={(e) => setJobForm({ ...jobForm, paymentStatus: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                      {paymentStatusOptions.map((paymentStatusOption) => (
                        <option key={paymentStatusOption} value={paymentStatusOption}>{paymentStatusOption}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm text-slate-300">
                    <span className="mb-2 block">Deposit paid (£)</span>
                    <input type="number" step="0.01" value={jobForm.depositPaidAmount} onChange={(e) => setJobForm({ ...jobForm, depositPaidAmount: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                  </label>
                </div>
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={jobForm.isRush}
                    onChange={(e) => setJobForm({ ...jobForm, isRush: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                  />
                  Apply rush fee for this job
                </label>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Materials used</h3>
                    <button type="button" onClick={addJobMaterialEntry} className="rounded-full border border-cyan-700 px-3 py-1 text-xs text-cyan-300">Add material</button>
                  </div>
                  <div className="space-y-3">
                    {jobMaterialEntries.map((entry, index) => (
                      <div key={`${entry.materialId}-${index}`} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 md:grid-cols-[1.6fr_1fr_auto]">
                        <label className="text-sm text-slate-300">
                          <span className="mb-2 block">Material</span>
                          <select value={entry.materialId} onChange={(e) => updateJobMaterialEntry(index, "materialId", e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                            {materials.map((material) => (
                              <option key={material.id} value={material.id}>{material.name} {material.color ? `• ${material.color}` : ""}</option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm text-slate-300">
                          <span className="mb-2 block">Quantity (g)</span>
                          <input type="number" min="0" step="0.01" value={entry.usageQuantity} onChange={(e) => updateJobMaterialEntry(index, "usageQuantity", e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                        </label>
                        <button type="button" onClick={() => removeJobMaterialEntry(index)} className="self-end rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">Create job</button>
              </form>
              </section>

              <section className="lg:col-span-3 rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="text-xl font-semibold">Recent jobs</h2>
                <div className="mt-4 space-y-3">
                  {jobs.slice(0, 5).map((job) => (
                    <div key={job.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
                      <div>
                        <p className="font-medium">{job.name}</p>
                        <p className="text-sm text-slate-400">{job.jobNumber || "No job number"} • {job.machineType} • {job.status}</p>
                      </div>
                      <button onClick={() => calculateJobCost(job)} className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300">{getCostButtonLabel(job)}</button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="lg:col-span-3 rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Scheduling calendar (next {SCHEDULE_HORIZON_DAYS} days)</h2>
                    <p className="mt-2 text-sm text-slate-400">Calendar view combines due dates with projected completion based on machine queue order and runtime.</p>
                  </div>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{machineQueueProjections.length} machine queues</span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {scheduleCalendarDays.map((day) => (
                    <div key={day.date.toISOString()} className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                      <p className="text-sm font-medium text-white">{day.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
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
                <h2 className="text-xl font-semibold">Margin reporting</h2>
                <p className="mt-2 text-sm text-slate-400">Internal margin analysis based on calculated customer charge and base total.</p>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <h3 className="text-sm font-semibold text-white">By machine</h3>
                    <div className="mt-2 space-y-2 text-xs">
                      {marginByMachine.slice(0, 6).map((row) => (
                        <div key={`machine-margin-${row.label}`} className="flex items-center justify-between">
                          <span className="text-slate-300">{row.label}</span>
                          <span className="text-slate-200">{formatCurrency(row.margin)} ({row.marginPercent.toFixed(1)}%)</span>
                        </div>
                      ))}
                      {!marginByMachine.length ? <p className="text-slate-500">No costed jobs yet.</p> : null}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <h3 className="text-sm font-semibold text-white">By material type</h3>
                    <div className="mt-2 space-y-2 text-xs">
                      {marginByMaterialType.slice(0, 6).map((row) => (
                        <div key={`material-margin-${row.label}`} className="flex items-center justify-between">
                          <span className="text-slate-300">{row.label}</span>
                          <span className="text-slate-200">{formatCurrency(row.allocatedMargin)} ({row.marginPercent.toFixed(1)}%)</span>
                        </div>
                      ))}
                      {!marginByMaterialType.length ? <p className="text-slate-500">No material margin data yet.</p> : null}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <h3 className="text-sm font-semibold text-white">By customer</h3>
                    <div className="mt-2 space-y-2 text-xs">
                      {marginByCustomer.slice(0, 6).map((row) => (
                        <div key={`customer-margin-${row.label}`} className="flex items-center justify-between">
                          <span className="text-slate-300">{row.label}</span>
                          <span className="text-slate-200">{formatCurrency(row.margin)} ({row.marginPercent.toFixed(1)}%)</span>
                        </div>
                      ))}
                      {!marginByCustomer.length ? <p className="text-slate-500">No customer margin data yet.</p> : null}
                    </div>
                  </div>
                </div>
              </section>

              <section className="lg:col-span-3 rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="text-xl font-semibold">Delivery and utilization dashboard</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">On-time delivery</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{deliveryAndUtilization.onTimePercent.toFixed(1)}%</p>
                    <p className="text-xs text-slate-400">{deliveryAndUtilization.onTimeCount} of {deliveryAndUtilization.dueEligibleCount} due jobs</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Overdue open jobs</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{deliveryAndUtilization.overdueOpen}</p>
                    <p className="text-xs text-slate-400">Pending or in-progress past due date</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Queued runtime</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{deliveryAndUtilization.scheduledHours.toFixed(1)} h</p>
                    <p className="text-xs text-slate-400">Across {deliveryAndUtilization.machineCount} machine lanes</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Weekly utilization</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{deliveryAndUtilization.utilizationPercent.toFixed(1)}%</p>
                    <p className="text-xs text-slate-400">vs {WORKSHOP_DAILY_CAPACITY_HOURS}h/day capacity assumption</p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <h3 className="text-sm font-semibold text-white">Machine utilization (next 7-day queue model)</h3>
                  <div className="mt-2 space-y-2 text-xs">
                    {deliveryAndUtilization.utilizationByMachine.map((row) => (
                      <div key={`utilization-${row.machineType}`} className="flex items-center justify-between">
                        <span className="text-slate-300">{row.machineType}</span>
                        <span className="text-slate-200">{row.hours.toFixed(1)} h ({row.utilizationPercent.toFixed(1)}%)</span>
                      </div>
                    ))}
                    {!deliveryAndUtilization.utilizationByMachine.length ? <p className="text-slate-500">No queued machine utilization data yet.</p> : null}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === "jobs" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Jobs</h2>
                <p className="mt-2 text-sm text-slate-400">Click a job card to expand details, then choose Edit job or Create invoice.</p>
              </div>
              <button type="button" onClick={openNewJobEditor} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">Add job</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Search jobs</span>
                <input
                  value={jobSearchTerm}
                  onChange={(e) => setJobSearchTerm(e.target.value)}
                  placeholder="Search by name, customer, or job number"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Status filter</span>
                <select value={jobStatusFilter} onChange={(e) => setJobStatusFilter(e.target.value as (typeof jobWorkflowStatusOptions)[number])} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                  {jobWorkflowStatusOptions.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>{statusOption}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Machine filter</span>
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
                <h3 className="text-sm font-semibold text-white">Machine queue and schedule</h3>
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
                        <p className="text-slate-400">{job.machineType} • Due {job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "Not set"}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs ${riskTone}`}>{dueRisk}</span>
                    </div>
                  );
                })}
                {!queuedJobs.length ? <p className="text-sm text-slate-400">No pending or in-progress queue items yet.</p> : null}
              </div>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-3">
                {filteredJobs.map((job) => (
                  <div key={job.id} className={`w-full rounded-2xl border ${expandedJobId === job.id ? "border-cyan-500 bg-cyan-500/10" : "border-slate-800 bg-slate-950"}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedJobId((current) => current === job.id ? null : job.id);
                        setSelectedJobId(job.id);
                      }}
                      className="w-full p-4 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{job.name}</p>
                          <p className="text-sm text-slate-400">{job.jobNumber || "No job number"} • {job.customer || "No customer"} • {job.machineType}</p>
                        </div>
                        <div className="text-right text-sm text-slate-400">
                          <p>
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${job.status === "Completed" || job.status === "Invoiced" ? "bg-emerald-600/20 text-emerald-300" : job.status === "In Progress" ? "bg-sky-600/20 text-sky-300" : "bg-slate-700 text-slate-200"}`}>
                              {job.status}
                            </span>
                          </p>
                          <p>{job.cost ? `Base (no markups) ${formatCurrency(getBaseCostTotal(job))}` : "No cost yet"}</p>
                          {job.cost ? <p>{`Customer (with markups) ${formatCurrency(getInvoiceChargeBreakdown(job).customerCharge)}`}</p> : null}
                          {job.cost ? <p>{`Profit ${formatCurrency(getProfitTotal(job))}`}</p> : null}
                        </div>
                      </div>
                    </button>

                    {expandedJobId === job.id ? (
                      <div className="border-t border-slate-800 px-4 pb-4 pt-3">
                        <div className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                          <p><span className="text-slate-500">Job:</span> {job.name}</p>
                          <p><span className="text-slate-500">Customer:</span> {job.customer || "No customer"}</p>
                          <p><span className="text-slate-500">Machine:</span> {job.machineType}</p>
                          <p><span className="text-slate-500">Machine runtime:</span> {job.machineRunTimeMinutes ?? job.estTimeMinutes} mins</p>
                          <p><span className="text-slate-500">Labour time:</span> {job.labourTimeMinutes ?? job.estTimeMinutes} mins</p>
                          <p><span className="text-slate-500">Status:</span> {job.status}</p>
                          <p><span className="text-slate-500">Queue position:</span> {job.queuePosition ?? 0}</p>
                          <p><span className="text-slate-500">Due date:</span> {job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "Not set"}</p>
                          <p><span className="text-slate-500">Payment:</span> {job.paymentStatus || "Unpaid"}</p>
                          <p><span className="text-slate-500">Rush:</span> {job.isRush ? "Yes" : "No"}</p>
                          <p><span className="text-slate-500">Deposit paid:</span> {formatCurrency(Number(job.depositPaidAmount || 0))}</p>
                          <p><span className="text-slate-500">Materials:</span> {job.materials?.length || 0}</p>
                          <p><span className="text-slate-500">QA passed:</span> {job.qaPassed ? "Yes" : "No"}</p>
                          <p><span className="text-slate-500">Rework cost:</span> {formatCurrency(Number(job.reworkCost || 0))}</p>
                          <p className="md:col-span-2"><span className="text-slate-500">QA checklist:</span> {(job.qaChecklist || []).length ? (job.qaChecklist || []).join(", ") : "No checklist items"}</p>
                          <p className="md:col-span-2"><span className="text-slate-500">Rework notes:</span> {job.reworkNotes || "None"}</p>
                          <p className="md:col-span-2"><span className="text-slate-500">File:</span> {job.filePath || "No file uploaded"}</p>
                        </div>

                        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Job file preview</p>
                            <label className="cursor-pointer rounded-full border border-cyan-700 px-3 py-1 text-xs text-cyan-300">
                              <span>{uploadingJobId === job.id ? "Uploading..." : "Upload SVG/STL"}</span>
                              <input
                                type="file"
                                accept=".svg,.stl"
                                disabled={uploadingJobId === job.id}
                                className="hidden"
                                onChange={(event) => uploadJobFile(job, event)}
                              />
                            </label>
                          </div>
                          {jobFileMessage[job.id] ? <p className="mt-2 text-xs text-cyan-300">{jobFileMessage[job.id]}</p> : null}
                          {job.filePath ? (
                            <div className="mt-3 space-y-3">
                              <div className="flex flex-wrap gap-3 text-xs">
                                <a className="text-cyan-300 underline" href={job.filePath} target="_blank" rel="noreferrer">Open file</a>
                                <a className="text-cyan-300 underline" href={job.filePath} download>Download file</a>
                              </div>
                              {getPreviewType(job.filePath) === "svg" ? (
                                <div className="overflow-hidden rounded-xl border border-slate-800 bg-white p-2">
                                  <img src={job.filePath} alt={`${job.name} preview`} className="max-h-72 w-full object-contain" />
                                </div>
                              ) : null}
                              {getPreviewType(job.filePath) === "stl" ? (
                                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                                  {createElement("model-viewer", {
                                    src: job.filePath,
                                    style: { width: "100%", height: "320px", backgroundColor: "#0f172a" },
                                    "camera-controls": "",
                                    "auto-rotate": "",
                                    "shadow-intensity": "1",
                                    exposure: "1",
                                  })}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-slate-400">Upload an SVG or STL file to preview it here.</p>
                          )}
                        </div>
                        {job.cost ? (
                          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-400">Cost breakdown</p>
                            <div className="space-y-1 text-sm">
                              {(() => {
                                const runtimeBreakdown = calculateRuntimeBreakdown(job);
                                const runtimeOnly = `${runtimeBreakdown.machineRunTimeMinutes} mins`;
                                const electricityMarkupMultiplier = 1 + (Number(billingSettings.electricityMarkupPercent || 0) / 100);
                                const depreciationMarkupMultiplier = 1 + (Number(billingSettings.depreciationMarkupPercent || 0) / 100);
                                const electricityWithMarkup = runtimeBreakdown.electricityCost * electricityMarkupMultiplier;
                                const depreciationWithMarkup = runtimeBreakdown.depreciationCost * depreciationMarkupMultiplier;
                                return (
                                  <>
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-300">Materials ({runtimeBreakdown.materialWeightGrams.toFixed(0)} g)</span>
                                      <span className="font-medium text-white">{formatCurrency(getInvoiceChargeBreakdown(job).materialCharge)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-300">Electricity ({runtimeOnly})</span>
                                      <span className="font-medium text-white">{formatCurrency(electricityWithMarkup)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-300">Depreciation ({runtimeOnly})</span>
                                      <span className="font-medium text-white">{formatCurrency(depreciationWithMarkup)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-300">Workshop ({runtimeOnly})</span>
                                      <span className="font-medium text-white">{formatCurrency(runtimeBreakdown.workshopCost)}</span>
                                    </div>
                                  </>
                                );
                              })()}
                              <div className="flex items-center justify-between">
                                <span className="text-slate-300">Labour ({job.labourTimeMinutes ?? job.estTimeMinutes} mins)</span>
                                <span className="font-medium text-white">{formatCurrency(job.cost.labourCost)}</span>
                              </div>
                              <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2">
                                <span className="text-slate-300">Base total (no markups)</span>
                                <span className="font-semibold text-white">{formatCurrency(getBaseCostTotal(job))}</span>
                              </div>
                              <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2">
                                <span className="text-slate-300">Customer total (with markups)</span>
                                <span className="font-semibold text-white">{formatCurrency(getInvoiceChargeBreakdown(job).customerCharge)}</span>
                              </div>
                              <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2">
                                <span className="text-slate-300">Profit (internal)</span>
                                <span className="font-semibold text-white">{formatCurrency(getProfitTotal(job))}</span>
                              </div>
                            </div>
                          </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {getWorkflowActions(job).map((action) => (
                            <button
                              key={`${job.id}-${action.status}`}
                              type="button"
                              onClick={() => updateJobStatusQuick(job, action.status)}
                              className={`rounded-full border px-3 py-1 text-sm ${action.tone}`}
                            >
                              {action.label}
                            </button>
                          ))}
                          {(job.status === "Quote Draft" || job.status === "Quote Sent") ? (
                            <button type="button" onClick={() => updateJobStatusQuick(job, "Quote Approved")} className="rounded-full border border-emerald-700 px-3 py-1 text-sm text-emerald-300">Approve quote</button>
                          ) : null}
                          {job.status === "Quote Draft" ? (
                            <button type="button" onClick={() => updateJobStatusQuick(job, "Quote Sent")} className="rounded-full border border-sky-700 px-3 py-1 text-sm text-sky-300">Send quote</button>
                          ) : null}
                          {job.status === "Quote Approved" ? (
                            <button type="button" onClick={() => updateJobStatusQuick(job, "Pending")} className="rounded-full border border-emerald-700 px-3 py-1 text-sm text-emerald-300">Convert to job</button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedJobId(job.id);
                              setSelectedJobId(job.id);
                              setJobEditorMode("edit");
                            }}
                            className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300"
                          >
                            Edit job
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedJobId(job.id);
                              setSelectedJobId(job.id);
                              setJobEditorMode("invoice");
                            }}
                            className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300"
                          >
                            Create invoice
                          </button>
                          <button type="button" onClick={() => calculateJobCost(job)} className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">{getCostButtonLabel(job)}</button>
                          <button type="button" onClick={() => deleteJob(job.id)} className="rounded-full border border-rose-700 px-3 py-1 text-sm text-rose-300">Delete job</button>
                        </div>

                        {jobEditorMode === "edit" && selectedJobId === job.id && selectedJob ? (
                          <form onSubmit={saveSelectedJob} className="mt-4 space-y-4 rounded-2xl border border-cyan-700/40 bg-slate-900 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Edit job</p>
                                <h3 className="mt-1 text-lg font-semibold text-white">{selectedJob.name}</h3>
                              </div>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => selectedJob && calculateJobCost(selectedJob)} className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300">{selectedJob ? getCostButtonLabel(selectedJob) : "Calculate cost"}</button>
                                <button type="button" onClick={() => setJobEditorMode("none")} className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">Cancel</button>
                                <button type="submit" className="rounded-full bg-cyan-600 px-3 py-1 text-sm font-medium">Save job</button>
                              </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <label className="block text-sm text-slate-300">
                                <span className="mb-2 block">Job name</span>
                                <input value={selectedJobForm.name} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, name: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" required />
                              </label>
                              <label className="block text-sm text-slate-300">
                                <span className="mb-2 block">Customer</span>
                                <input value={selectedJobForm.customer} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, customer: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                              </label>
                              <label className="block text-sm text-slate-300">
                                <span className="mb-2 block">Machine type</span>
                                <select value={selectedJobForm.machineType} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, machineType: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                                  {machineOptions.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="block text-sm text-slate-300">
                                <span className="mb-2 block">Status</span>
                                <select value={selectedJobForm.status} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, status: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                                  {jobStatusOptions.map((statusOption) => (
                                    <option key={statusOption} value={statusOption}>{statusOption}</option>
                                  ))}
                                </select>
                              </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <label className="block text-sm text-slate-300">
                                <span className="mb-2 block">Machine runtime (mins)</span>
                                <input value={selectedJobForm.machineRunTimeMinutes} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, machineRunTimeMinutes: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                              </label>
                              <label className="block text-sm text-slate-300">
                                <span className="mb-2 block">Labour time (mins)</span>
                                <input value={selectedJobForm.labourTimeMinutes} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, labourTimeMinutes: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                              </label>
                              <label className="block text-sm text-slate-300">
                                <span className="mb-2 block">Queue position</span>
                                <input type="number" min="0" value={selectedJobForm.queuePosition} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, queuePosition: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                              </label>
                              <label className="block text-sm text-slate-300">
                                <span className="mb-2 block">Due date</span>
                                <input type="date" value={selectedJobForm.dueDate} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, dueDate: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                              </label>
                              <label className="block text-sm text-slate-300">
                                <span className="mb-2 block">Payment status</span>
                                <select value={selectedJobForm.paymentStatus} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, paymentStatus: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                                  {paymentStatusOptions.map((paymentStatusOption) => (
                                    <option key={paymentStatusOption} value={paymentStatusOption}>{paymentStatusOption}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="block text-sm text-slate-300">
                                <span className="mb-2 block">Deposit paid (£)</span>
                                <input type="number" step="0.01" value={selectedJobForm.depositPaidAmount} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, depositPaidAmount: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                              </label>
                              <label className="block text-sm text-slate-300">
                                <span className="mb-2 block">Rework cost (£)</span>
                                <input type="number" step="0.01" value={selectedJobForm.reworkCost} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, reworkCost: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                              </label>
                              <label className="block text-sm text-slate-300">
                                <span className="mb-2 block">QA passed</span>
                                <select value={selectedJobForm.qaPassed ? "yes" : "no"} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, qaPassed: e.target.value === "yes" })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                                  <option value="no">No</option>
                                  <option value="yes">Yes</option>
                                </select>
                              </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <label className="block text-sm text-slate-300 md:col-span-2">
                                <span className="mb-2 block">QA checklist (one item per line)</span>
                                <textarea value={selectedJobForm.qaChecklistText} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, qaChecklistText: e.target.value })} rows={3} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                              </label>
                              <label className="block text-sm text-slate-300 md:col-span-2">
                                <span className="mb-2 block">Rework notes</span>
                                <textarea value={selectedJobForm.reworkNotes} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, reworkNotes: e.target.value })} rows={2} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                              </label>
                            </div>

                            <label className="flex items-center gap-3 text-sm text-slate-300">
                              <input
                                type="checkbox"
                                checked={selectedJobForm.isRush}
                                onChange={(e) => setSelectedJobForm({ ...selectedJobForm, isRush: e.target.checked })}
                                className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                              />
                              Apply rush fee for this job
                            </label>

                            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                              <div className="mb-3 flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-white">Materials used</h4>
                                <button type="button" onClick={addSelectedJobMaterialEntry} className="rounded-full border border-cyan-700 px-3 py-1 text-xs text-cyan-300">Add material</button>
                              </div>
                              <div className="space-y-3">
                                {selectedJobMaterialEntries.map((entry, index) => (
                                  <div key={`${entry.materialId}-${index}`} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 md:grid-cols-[1.6fr_1fr_auto]">
                                    <label className="text-sm text-slate-300">
                                      <span className="mb-2 block">Material</span>
                                      <select value={entry.materialId} onChange={(e) => updateSelectedJobMaterialEntry(index, "materialId", e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                                        {materials.map((material) => (
                                          <option key={material.id} value={material.id}>{material.name} {material.color ? `• ${material.color}` : ""}</option>
                                        ))}
                                      </select>
                                    </label>
                                    <label className="text-sm text-slate-300">
                                      <span className="mb-2 block">Quantity (g)</span>
                                      <input type="number" min="0" step="0.01" value={entry.usageQuantity} onChange={(e) => updateSelectedJobMaterialEntry(index, "usageQuantity", e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                                    </label>
                                    <button type="button" onClick={() => removeSelectedJobMaterialEntry(index)} className="self-end rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">Remove</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </form>
                        ) : null}

                        {jobEditorMode === "invoice" && selectedJobId === job.id && selectedJob ? (
                          <div className="mt-4 space-y-5 rounded-2xl border border-cyan-700/40 bg-slate-900 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Invoice</p>
                                <h3 className="mt-2 text-xl font-semibold">{selectedJob.name}</h3>
                              </div>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => selectedJob && calculateJobCost(selectedJob)} className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300">Refresh costs</button>
                                <button type="button" onClick={() => printInvoice(selectedJob)} className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300">Print / Save PDF</button>
                                <button type="button" onClick={() => setJobEditorMode("none")} className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">Close invoice</button>
                              </div>
                            </div>

                            {selectedJob.cost ? (
                              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                                  <div>
                                    <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">Invoice</p>
                                    <h5 className="mt-2 text-xl font-semibold text-white">{selectedJob.name}</h5>
                                    <p className="mt-1 text-sm text-slate-400">{selectedJob.customer || "Walk-in customer"}</p>
                                    <p className="mt-3 text-sm text-slate-400">From: <span className="text-slate-200">{businessDisplayName}</span></p>
                                    {billingSettings.businessAddress ? <p className="text-sm text-slate-400">{billingSettings.businessAddress}</p> : null}
                                  </div>
                                  <div className="text-sm text-slate-400">
                                    {billingSettings.businessLogoUrl ? <img src={billingSettings.businessLogoUrl} alt="Business logo" className="mb-2 ml-auto h-12 w-12 rounded-full object-cover" /> : null}
                                    <p className="font-medium text-white">#{selectedJob.jobNumber || "TBC"}</p>
                                    <p>Issued {new Date().toLocaleDateString()}</p>
                                    <p>{Number(billingSettings.paymentTermsDays || 0) > 0 ? `Due in ${Number(billingSettings.paymentTermsDays || 0)} days` : "Due on receipt"}</p>
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Bill to</p>
                                    <p className="mt-2 font-medium text-white">{selectedJob.customer || "Walk-in customer"}</p>
                                    {selectedCustomerProfile?.address ? <p className="text-sm text-slate-400">{selectedCustomerProfile.address}</p> : null}
                                    {selectedCustomerProfile?.email ? <p className="text-sm text-slate-400">{selectedCustomerProfile.email}</p> : null}
                                    {selectedCustomerProfile?.phone ? <p className="text-sm text-slate-400">{selectedCustomerProfile.phone}</p> : null}
                                    <p className="text-sm text-slate-400">{selectedJob.machineType}</p>
                                  </div>
                                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Job summary</p>
                                    <p className="mt-2 font-medium text-white">{selectedJob.status}</p>
                                    <p className="text-sm text-slate-400">Runtime {selectedJob.machineRunTimeMinutes ?? selectedJob.estTimeMinutes} mins • Labour {selectedJob.labourTimeMinutes ?? selectedJob.estTimeMinutes} mins</p>
                                    <p className="text-sm text-slate-400">Payment {selectedJob.paymentStatus || "Unpaid"}</p>
                                  </div>
                                </div>

                                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
                                  <div className="grid grid-cols-[2fr_1fr] bg-slate-950/90 px-4 py-3 text-sm font-medium text-slate-300">
                                    <span>Description</span>
                                    <span className="text-right">Amount</span>
                                  </div>
                                  <div className="divide-y divide-slate-800 bg-slate-950/50">
                                    <div className="grid grid-cols-[2fr_1fr] px-4 py-3 text-sm">
                                      <div>
                                        <p className="font-medium text-white">Materials</p>
                                      </div>
                                      <span className="text-right font-medium text-white">{formatCurrency(getInvoiceChargeBreakdown(selectedJob).materialCharge)}</span>
                                    </div>
                                    <div className="grid grid-cols-[2fr_1fr] px-4 py-3 text-sm">
                                      <div>
                                        <p className="font-medium text-white">Production costs</p>
                                      </div>
                                      <span className="text-right font-medium text-white">{formatCurrency(getInvoiceChargeBreakdown(selectedJob).electricityCharge + getInvoiceChargeBreakdown(selectedJob).overheadCharge)}</span>
                                    </div>
                                    <div className="grid grid-cols-[2fr_1fr] px-4 py-3 text-sm">
                                      <div>
                                        <p className="font-medium text-white">Labour ({selectedJob.labourTimeMinutes ?? selectedJob.estTimeMinutes} mins)</p>
                                      </div>
                                      <span className="text-right font-medium text-white">{formatCurrency(getInvoiceChargeBreakdown(selectedJob).labourCharge)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4 flex justify-end">
                                  <div className="w-full max-w-xs space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm">
                                    {(() => {
                                      const chargeBreakdown = getInvoiceChargeBreakdown(selectedJob);
                                      const subTotal = Number(chargeBreakdown.customerCharge || 0);
                                      const deliveryAmount = Number(billingSettings.deliveryAmount || 0);
                                      const vatAmount = (subTotal + deliveryAmount) * (Number(billingSettings.vatPercent || 0) / 100);
                                      const grandTotal = subTotal + deliveryAmount + vatAmount;
                                      const suggestedDepositAmount = grandTotal * (Math.max(0, Number(billingSettings.depositPercent || 0)) / 100);
                                      const depositPaidAmount = Number(selectedJob.depositPaidAmount || 0);
                                      const balanceDue = Math.max(0, grandTotal - depositPaidAmount);

                                      return (
                                        <>
                                          <div className="flex items-center justify-between text-slate-400">
                                            <span>SubTotal</span>
                                            <span>{formatCurrency(subTotal)}</span>
                                          </div>
                                          <div className="flex items-center justify-between text-slate-400">
                                            <span>Delivery</span>
                                            <span>{formatCurrency(deliveryAmount)}</span>
                                          </div>
                                          <div className="flex items-center justify-between text-slate-400">
                                            <span>VAT ({Number(billingSettings.vatPercent || 0).toFixed(0)}%)</span>
                                            <span>{formatCurrency(vatAmount)}</span>
                                          </div>
                                          <div className="flex items-center justify-between text-slate-400">
                                            <span>Suggested deposit ({Number(billingSettings.depositPercent || 0).toFixed(0)}%)</span>
                                            <span>{formatCurrency(suggestedDepositAmount)}</span>
                                          </div>
                                          <div className="flex items-center justify-between text-slate-400">
                                            <span>Deposit paid</span>
                                            <span>{formatCurrency(depositPaidAmount)}</span>
                                          </div>
                                          <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-base font-semibold text-white">
                                            <span>Grand total</span>
                                            <span>{formatCurrency(grandTotal)}</span>
                                          </div>
                                          <div className="flex items-center justify-between text-base font-semibold text-cyan-200">
                                            <span>Balance due</span>
                                            <span>{formatCurrency(balanceDue)}</span>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>

                                {(billingSettings.businessAddress || billingSettings.businessEmail || billingSettings.businessPhone || billingSettings.businessWebsite) ? (
                                  <div className="mt-5 border-t border-slate-800 pt-3 text-xs text-slate-400">
                                    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
                                      {billingSettings.businessAddress ? <span>{billingSettings.businessAddress}</span> : null}
                                      {billingSettings.businessEmail ? <span>{billingSettings.businessEmail}</span> : null}
                                      {billingSettings.businessPhone ? <span>{billingSettings.businessPhone}</span> : null}
                                      {billingSettings.businessWebsite ? (
                                        <a className="text-cyan-300 underline" href={billingSettings.businessWebsite} target="_blank" rel="noreferrer">
                                          {billingSettings.businessWebsite}
                                        </a>
                                      ) : null}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                                No cost has been calculated for this job yet. Use Refresh costs to generate the invoice totals.
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
                {!filteredJobs.length ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                    No jobs match the current filters.
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                {jobEditorMode === "create" ? (
                  <form onSubmit={createJobFromJobsTab} className="space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">New job</p>
                        <h3 className="mt-2 text-xl font-semibold">Add Job</h3>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setJobEditorMode("none")} className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">Cancel</button>
                        <button type="submit" className="rounded-full bg-cyan-600 px-3 py-1 text-sm font-medium">Create job</button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm text-slate-300">
                        <span className="mb-2 block">Job name</span>
                        <input value={newJobForm.name} onChange={(e) => setNewJobForm({ ...newJobForm, name: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" required />
                      </label>
                      <label className="block text-sm text-slate-300">
                        <span className="mb-2 block">Customer</span>
                        <input value={newJobForm.customer} onChange={(e) => setNewJobForm({ ...newJobForm, customer: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                      </label>
                      <label className="block text-sm text-slate-300">
                        <span className="mb-2 block">Machine type</span>
                        <select value={newJobForm.machineType} onChange={(e) => setNewJobForm({ ...newJobForm, machineType: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                          {machineOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm text-slate-300">
                        <span className="mb-2 block">Status</span>
                        <select value={newJobForm.status} onChange={(e) => setNewJobForm({ ...newJobForm, status: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                          {jobStatusOptions.map((statusOption) => (
                            <option key={statusOption} value={statusOption}>{statusOption}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm text-slate-300">
                        <span className="mb-2 block">Payment status</span>
                        <select value={newJobForm.paymentStatus} onChange={(e) => setNewJobForm({ ...newJobForm, paymentStatus: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                          {paymentStatusOptions.map((paymentStatusOption) => (
                            <option key={paymentStatusOption} value={paymentStatusOption}>{paymentStatusOption}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm text-slate-300">
                        <span className="mb-2 block">Machine runtime (mins)</span>
                        <input value={newJobForm.machineRunTimeMinutes} onChange={(e) => setNewJobForm({ ...newJobForm, machineRunTimeMinutes: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                      </label>
                      <label className="block text-sm text-slate-300">
                        <span className="mb-2 block">Labour time (mins)</span>
                        <input value={newJobForm.labourTimeMinutes} onChange={(e) => setNewJobForm({ ...newJobForm, labourTimeMinutes: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                      </label>
                      <label className="block text-sm text-slate-300">
                        <span className="mb-2 block">Deposit paid (£)</span>
                        <input type="number" step="0.01" value={newJobForm.depositPaidAmount} onChange={(e) => setNewJobForm({ ...newJobForm, depositPaidAmount: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                      </label>
                      <label className="block text-sm text-slate-300">
                        <span className="mb-2 block">Queue position</span>
                        <input type="number" min="0" value={newJobForm.queuePosition} onChange={(e) => setNewJobForm({ ...newJobForm, queuePosition: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                      </label>
                      <label className="block text-sm text-slate-300">
                        <span className="mb-2 block">Due date</span>
                        <input type="date" value={newJobForm.dueDate} onChange={(e) => setNewJobForm({ ...newJobForm, dueDate: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                      </label>
                      <label className="block text-sm text-slate-300">
                        <span className="mb-2 block">Rework cost (£)</span>
                        <input type="number" step="0.01" value={newJobForm.reworkCost} onChange={(e) => setNewJobForm({ ...newJobForm, reworkCost: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                      </label>
                      <label className="block text-sm text-slate-300">
                        <span className="mb-2 block">QA passed</span>
                        <select value={newJobForm.qaPassed ? "yes" : "no"} onChange={(e) => setNewJobForm({ ...newJobForm, qaPassed: e.target.value === "yes" })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm text-slate-300 md:col-span-2">
                        <span className="mb-2 block">QA checklist (one item per line)</span>
                        <textarea value={newJobForm.qaChecklistText} onChange={(e) => setNewJobForm({ ...newJobForm, qaChecklistText: e.target.value })} rows={3} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                      </label>
                      <label className="block text-sm text-slate-300 md:col-span-2">
                        <span className="mb-2 block">Rework notes</span>
                        <textarea value={newJobForm.reworkNotes} onChange={(e) => setNewJobForm({ ...newJobForm, reworkNotes: e.target.value })} rows={2} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                      </label>
                    </div>

                    <label className="flex items-center gap-3 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={newJobForm.isRush}
                        onChange={(e) => setNewJobForm({ ...newJobForm, isRush: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                      />
                      Apply rush fee for this job
                    </label>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white">Materials used</h4>
                        <button type="button" onClick={addNewJobMaterialEntry} className="rounded-full border border-cyan-700 px-3 py-1 text-xs text-cyan-300">Add material</button>
                      </div>
                      <div className="space-y-3">
                        {newJobMaterialEntries.map((entry, index) => (
                          <div key={`${entry.materialId}-${index}`} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 md:grid-cols-[1.6fr_1fr_auto]">
                            <label className="text-sm text-slate-300">
                              <span className="mb-2 block">Material</span>
                              <select value={entry.materialId} onChange={(e) => updateNewJobMaterialEntry(index, "materialId", e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                                {materials.map((material) => (
                                  <option key={material.id} value={material.id}>{material.name} {material.color ? `• ${material.color}` : ""}</option>
                                ))}
                              </select>
                            </label>
                            <label className="text-sm text-slate-300">
                              <span className="mb-2 block">Quantity (g)</span>
                              <input type="number" min="0" step="0.01" value={entry.usageQuantity} onChange={(e) => updateNewJobMaterialEntry(index, "usageQuantity", e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                            </label>
                            <button type="button" onClick={() => removeNewJobMaterialEntry(index)} className="self-end rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">Remove</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </form>
                ) : jobEditorMode === "edit" ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">Edit mode now opens directly under the expanded job card.</div>
                ) : jobEditorMode === "invoice" ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">Invoice mode now opens directly under the expanded job card.</div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">Expand a job card and choose Edit job or Create invoice.</div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === "materials" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Materials</h2>
                <p className="mt-2 text-sm text-slate-400">Group stock by material type and copy or edit entries quickly.</p>
              </div>
              <button type="button" onClick={openAddMaterialForm} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">Add material</button>
            </div>

            {showMaterialEditor ? (
              <div className="mt-6 rounded-2xl border border-cyan-700/40 bg-slate-950 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{editingMaterialId ? "Edit material" : "Add material"}</h3>
                    <p className="mt-1 text-sm text-slate-400">Fill in the material details and save.</p>
                  </div>
                  <button type="button" onClick={closeMaterialForm} className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">Close</button>
                </div>

                <form onSubmit={createMaterial} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block text-sm text-slate-300">
                      <span className="mb-2 block">Material name</span>
                      <input value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} placeholder="Material name" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" required />
                    </label>
                    <label className="block text-sm text-slate-300">
                      <span className="mb-2 block">Material type</span>
                      <input value={materialForm.type} onChange={(e) => setMaterialForm({ ...materialForm, type: e.target.value })} placeholder="Type" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                    <label className="block text-sm text-slate-300">
                      <span className="mb-2 block">Colour</span>
                      <input value={materialForm.color} onChange={(e) => setMaterialForm({ ...materialForm, color: e.target.value })} placeholder="Colour" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                    <label className="block text-sm text-slate-300">
                      <span className="mb-2 block">Usage unit</span>
                      <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-300">Grams (g)</div>
                    </label>
                    <label className="block text-sm text-slate-300">
                      <span className="mb-2 block">Purchase cost per kg</span>
                      <input value={materialForm.costPerUnit} onChange={(e) => setMaterialForm({ ...materialForm, costPerUnit: e.target.value })} placeholder="Cost per kg" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                    <label className="block text-sm text-slate-300">
                      <span className="mb-2 block">Stock purchased (kg)</span>
                      <input value={materialForm.stockLevel} onChange={(e) => setMaterialForm({ ...materialForm, stockLevel: e.target.value })} placeholder="e.g. 1" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                    <label className="block text-sm text-slate-300 md:col-span-2">
                      <span className="mb-2 block">Reorder threshold (kg)</span>
                      <input value={materialForm.reorderThreshold} onChange={(e) => setMaterialForm({ ...materialForm, reorderThreshold: e.target.value })} placeholder="e.g. 0.2" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={closeMaterialForm} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button>
                    <button className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">{editingMaterialId ? "Save material" : "Add material"}</button>
                  </div>
                </form>
              </div>
            ) : null}

            <div className="mt-6 space-y-6">
              {groupedMaterials.map(([type, typeMaterials]) => (
                <div key={type} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">{type}</h3>
                    <span className="text-sm text-slate-400">{typeMaterials.length} entries</span>
                  </div>
                  <div className="space-y-3">
                    {typeMaterials.map((material) => (
                      <div key={material.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{material.name}</p>
                            <p className="text-sm text-slate-400">{material.color || "No colour"} • {(material.stockLevel / KG_TO_G).toFixed(2)} kg ({material.stockLevel.toFixed(0)} g) • £{(material.costPerUnit * KG_TO_G).toFixed(2)} / kg (£{material.costPerUnit.toFixed(4)} / g)</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => startEditingMaterial(material)} className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300">Edit</button>
                            <button type="button" onClick={() => copyMaterial(material)} className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">Copy</button>
                            <span className={`rounded-full px-3 py-1 text-xs ${material.stockLevel <= material.reorderThreshold ? "bg-amber-600/20 text-amber-300" : "bg-emerald-600/20 text-emerald-300"}`}>
                              {material.stockLevel <= material.reorderThreshold ? "Low stock" : "Healthy"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "machines" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Machines</h2>
                <p className="mt-2 text-sm text-slate-400">Manage machine profiles used in job selection and runtime billing.</p>
              </div>
              <button type="button" onClick={openAddMachineForm} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">Add machine</button>
            </div>

            {showMachineEditor ? (
              <div className="mt-6 rounded-2xl border border-cyan-700/40 bg-slate-950 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{editingMachineName ? "Edit machine" : "Add machine"}</h3>
                    <p className="mt-1 text-sm text-slate-400">Set name and machine billing profile details.</p>
                  </div>
                  <button type="button" onClick={closeMachineForm} className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">Close</button>
                </div>

                <form onSubmit={saveMachine} className="space-y-3">
                  <label className="flex items-center gap-4 text-sm text-slate-300">
                    <span className="w-56 shrink-0">Machine name</span>
                    <input value={machineForm.name} onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" required />
                  </label>
                  <label className="flex items-center gap-4 text-sm text-slate-300">
                    <span className="w-56 shrink-0">Wattage (W)</span>
                    <input type="number" step="0.1" value={machineForm.wattage} onChange={(e) => setMachineForm({ ...machineForm, wattage: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                  </label>
                  <label className="flex items-center gap-4 text-sm text-slate-300">
                    <span className="w-56 shrink-0">Depreciation cost</span>
                    <input type="number" step="0.01" value={machineForm.depreciationCost} onChange={(e) => setMachineForm({ ...machineForm, depreciationCost: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                  </label>
                  <label className="flex items-center gap-4 text-sm text-slate-300">
                    <span className="w-56 shrink-0">Replacement runtime (h)</span>
                    <input type="number" step="0.1" value={machineForm.replacementRunHours} onChange={(e) => setMachineForm({ ...machineForm, replacementRunHours: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                  </label>

                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={closeMachineForm} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button>
                    <button className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">{editingMachineName ? "Save machine" : "Add machine"}</button>
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
                      <p className="text-sm text-slate-400">{machineSetting.wattage ?? 0}W • Depreciation {formatCurrency(machineSetting.depreciationCost ?? 0)} • Runtime {machineSetting.replacementRunHours ?? 0}h</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => startEditingMachine(machineName)} className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300">Edit</button>
                      <button type="button" onClick={() => removeMachine(machineName)} className="rounded-full border border-rose-700 px-3 py-1 text-sm text-rose-300">Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {machineMessage ? <p className="mt-4 text-sm text-cyan-300">{machineMessage}</p> : null}
          </section>
        )}

        {activeTab === "customers" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">CRM Lite customers</h2>
                <p className="mt-2 text-sm text-slate-400">Manage customer records (name, address, email, phone, notes) and review recent order history.</p>
              </div>
              {editingCustomerId ? (
                <button type="button" onClick={resetCustomerForm} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel edit</button>
              ) : null}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
              <form onSubmit={saveCustomer} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="text-lg font-semibold text-white">{editingCustomerId ? "Edit customer" : "Add customer"}</h3>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-40 shrink-0">Name</span>
                  <input value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" required />
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-40 shrink-0">Address</span>
                  <input value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-40 shrink-0">Email</span>
                  <input value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-40 shrink-0">Phone</span>
                  <input value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-40 shrink-0">Notes</span>
                  <input value={customerForm.notes} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                </label>
                <div className="flex justify-end">
                  <button className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">{editingCustomerId ? "Save customer" : "Add customer"}</button>
                </div>
              </form>

              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="text-lg font-semibold text-white">Customers</h3>
                <div className="space-y-2">
                  {customers.map((customer) => (
                    <div key={customer.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{customer.name}</p>
                          <p className="text-xs text-slate-400">{customer.email || "No email"} • {customer.phone || "No phone"}</p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => loadCustomerOrders(customer.id)} className="rounded-full border border-cyan-700 px-3 py-1 text-xs text-cyan-300">Order history</button>
                          <button type="button" onClick={() => startEditingCustomer(customer)} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">Edit</button>
                          <button type="button" onClick={() => removeCustomer(customer.id)} className="rounded-full border border-rose-700 px-3 py-1 text-xs text-rose-300">Delete</button>
                        </div>
                      </div>
                      {customer.address ? <p className="mt-2 text-xs text-slate-400">{customer.address}</p> : null}
                      {customer.notes ? <p className="mt-2 text-xs text-slate-400">{customer.notes}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {selectedCustomerId ? (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="text-lg font-semibold text-white">Recent order history</h3>
                {customerHistory.length ? (
                  <div className="mt-3 space-y-2">
                    {customerHistory.map((job) => (
                      <div key={job.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm">
                        <span>{job.jobNumber || "No job number"} • {job.name}</span>
                        <span className="text-slate-400">{job.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">No jobs found for this customer yet.</p>
                )}
              </div>
            ) : null}

            {customerMessage ? <p className="mt-4 text-sm text-cyan-300">{customerMessage}</p> : null}
          </section>
        )}

        {activeTab === "suppliers" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Suppliers and purchase history</h2>
                <p className="mt-2 text-sm text-slate-400">Track supplier records and material purchases for procurement history.</p>
              </div>
              {editingSupplierId ? (
                <button type="button" onClick={resetSupplierForm} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel edit</button>
              ) : null}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
              <form onSubmit={saveSupplier} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="text-lg font-semibold text-white">{editingSupplierId ? "Edit supplier" : "Add supplier"}</h3>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-40 shrink-0">Name</span>
                  <input value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" required />
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-40 shrink-0">Email</span>
                  <input value={supplierForm.contactEmail} onChange={(e) => setSupplierForm({ ...supplierForm, contactEmail: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-40 shrink-0">Phone</span>
                  <input value={supplierForm.contactPhone} onChange={(e) => setSupplierForm({ ...supplierForm, contactPhone: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-40 shrink-0">Notes</span>
                  <input value={supplierForm.notes} onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                </label>
                <div className="flex justify-end">
                  <button className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">{editingSupplierId ? "Save supplier" : "Add supplier"}</button>
                </div>
              </form>

              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="text-lg font-semibold text-white">Suppliers</h3>
                <div className="space-y-2">
                  {suppliers.map((supplier) => (
                    <div key={supplier.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{supplier.name}</p>
                          <p className="text-xs text-slate-400">{supplier.contactEmail || "No email"} • {supplier.contactPhone || "No phone"}</p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => loadSupplierPurchases(supplier.id)} className="rounded-full border border-cyan-700 px-3 py-1 text-xs text-cyan-300">Purchases</button>
                          <button type="button" onClick={() => startEditingSupplier(supplier)} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">Edit</button>
                          <button type="button" onClick={() => removeSupplier(supplier.id)} className="rounded-full border border-rose-700 px-3 py-1 text-xs text-rose-300">Delete</button>
                        </div>
                      </div>
                      {supplier.notes ? <p className="mt-2 text-xs text-slate-400">{supplier.notes}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {selectedSupplierId ? (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="text-lg font-semibold text-white">Purchase history</h3>
                <form onSubmit={saveSupplierPurchase} className="mt-3 grid gap-3 md:grid-cols-5">
                  <input value={supplierPurchaseForm.materialName} onChange={(e) => setSupplierPurchaseForm((current) => ({ ...current, materialName: e.target.value }))} placeholder="Material" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm" required />
                  <input type="number" step="0.01" min="0" value={supplierPurchaseForm.quantityKg} onChange={(e) => setSupplierPurchaseForm((current) => ({ ...current, quantityKg: e.target.value }))} placeholder="Qty kg" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
                  <input type="number" step="0.01" min="0" value={supplierPurchaseForm.totalCost} onChange={(e) => setSupplierPurchaseForm((current) => ({ ...current, totalCost: e.target.value }))} placeholder="Total £" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
                  <input type="date" value={supplierPurchaseForm.purchasedAt} onChange={(e) => setSupplierPurchaseForm((current) => ({ ...current, purchasedAt: e.target.value }))} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
                  <button className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">Add purchase</button>
                  <input value={supplierPurchaseForm.notes} onChange={(e) => setSupplierPurchaseForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Notes" className="md:col-span-5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
                </form>
                <div className="mt-3 space-y-2">
                  {supplierPurchases.map((purchase) => (
                    <div key={purchase.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm">
                      <span>{purchase.materialName} • {Number(purchase.quantityKg || 0).toFixed(2)} kg • {formatCurrency(Number(purchase.totalCost || 0))}</span>
                      <span className="text-slate-400">{purchase.purchasedAt ? new Date(purchase.purchasedAt).toLocaleDateString() : "-"}</span>
                    </div>
                  ))}
                  {!supplierPurchases.length ? <p className="text-sm text-slate-400">No purchases logged for this supplier.</p> : null}
                </div>
              </div>
            ) : null}

            {supplierMessage ? <p className="mt-4 text-sm text-cyan-300">{supplierMessage}</p> : null}
          </section>
        )}

        {activeTab === "admin" && (
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">Admin backup & data tools</h2>
              <p className="mt-2 text-sm text-slate-400">Export jobs, materials, and the full app data snapshot, then restore them later if needed.</p>
              <div className="mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                    <h3 className="text-sm font-semibold text-white">Jobs CSV</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={exportBackupCsv} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">Export</button>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <h3 className="font-semibold text-white">Machine queue and due-date risk</h3>
                    <p className="mt-2">Use Jobs to set queue position and due date per job. The queue panel highlights risk states (On track, Watch, At risk, Overdue) so production order can be adjusted early.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <h3 className="font-semibold text-white">Calendar scheduling and projections</h3>
                    <p className="mt-2">Dashboard now includes a 14-day schedule calendar and machine-level projected completion timestamps based on queue order and runtime.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <h3 className="font-semibold text-white">QA checklist and rework cost</h3>
                    <p className="mt-2">In job create/edit forms, add QA checklist items (one per line), mark QA pass/fail, and log rework cost/notes. Rework cost is included in cost impact when calculating totals.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <h3 className="font-semibold text-white">Supplier records and purchase history</h3>
                    <p className="mt-2">Use Suppliers to maintain supplier contact records and log material purchases (material name, quantity, total cost, purchase date, notes) for procurement history.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <h3 className="font-semibold text-white">Margin, delivery, and utilization reporting</h3>
                    <p className="mt-2">Dashboard includes margin reports by machine, material type, and customer, plus delivery KPIs and utilization metrics for production planning.</p>
                  </div>
                      <label className="cursor-pointer rounded-xl border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-300">
                        <span>Import</span>
                        <input type="file" accept=".csv" className="hidden" onChange={importBackupCsv} />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                    <h3 className="text-sm font-semibold text-white">Materials CSV</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={exportMaterialsCsv} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">Export</button>
                      <label className="cursor-pointer rounded-xl border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-300">
                        <span>Import</span>
                        <input type="file" accept=".csv" className="hidden" onChange={importMaterialsCsv} />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                    <h3 className="text-sm font-semibold text-white">Full backup</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={exportFullBackup} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">Download</button>
                      <label className="cursor-pointer rounded-xl border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-300">
                        <span>Restore</span>
                        <input type="file" accept=".json" className="hidden" onChange={importFullBackup} />
                      </label>
                    </div>
                  </div>
                </div>
                {backupMessage ? <p className="text-sm text-cyan-300">{backupMessage}</p> : null}
                {materialBackupMessage ? <p className="text-sm text-cyan-300">{materialBackupMessage}</p> : null}
                {fullBackupMessage ? <p className="text-sm text-cyan-300">{fullBackupMessage}</p> : null}
              </div>
            </section>
          </div>
        )}

        {activeTab === "billing" && (
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Billing and personalization</h2>
                  <p className="mt-2 text-sm text-slate-400">Configure business identity and billing rules in one dedicated area.</p>
                </div>
              </div>

              <details open className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <summary className="cursor-pointer list-none text-lg font-semibold text-white">Business personalization</summary>
                <div className="mt-4 flex items-center justify-end">
                  <button type="button" onClick={() => saveBilling({ preventDefault: () => undefined } as FormEvent)} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">
                    {savingBilling ? "Saving..." : "Save business details"}
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  <label className="flex items-center gap-4 text-sm text-slate-300">
                    <span className="w-56 shrink-0">Business name</span>
                    <input value={billingSettings.businessName || ""} onChange={(e) => setBillingSettings((current) => ({ ...current, businessName: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" placeholder="Fabrication Workshop Tracker" />
                  </label>
                  <label className="flex items-center gap-4 text-sm text-slate-300">
                    <span className="w-56 shrink-0">Business logo URL</span>
                    <input value={billingSettings.businessLogoUrl || ""} onChange={(e) => setBillingSettings((current) => ({ ...current, businessLogoUrl: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" placeholder="https://..." />
                  </label>
                  <label className="flex items-center gap-4 text-sm text-slate-300">
                    <span className="w-56 shrink-0">Business address</span>
                    <input value={billingSettings.businessAddress || ""} onChange={(e) => setBillingSettings((current) => ({ ...current, businessAddress: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" placeholder="Address shown on invoice" />
                  </label>
                  <label className="flex items-center gap-4 text-sm text-slate-300">
                    <span className="w-56 shrink-0">Business email</span>
                    <input value={billingSettings.businessEmail || ""} onChange={(e) => setBillingSettings((current) => ({ ...current, businessEmail: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" placeholder="hello@business.com" />
                  </label>
                  <label className="flex items-center gap-4 text-sm text-slate-300">
                    <span className="w-56 shrink-0">Business phone</span>
                    <input value={billingSettings.businessPhone || ""} onChange={(e) => setBillingSettings((current) => ({ ...current, businessPhone: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" placeholder="+44 ..." />
                  </label>
                  <label className="flex items-center gap-4 text-sm text-slate-300">
                    <span className="w-56 shrink-0">Business website</span>
                    <input value={billingSettings.businessWebsite || ""} onChange={(e) => setBillingSettings((current) => ({ ...current, businessWebsite: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" placeholder="https://..." />
                  </label>
                </div>
              </details>

              <details open className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <summary className="cursor-pointer list-none text-lg font-semibold text-white">Billing rules</summary>
                <div className="mt-4 flex items-center justify-end">
                  <button type="button" onClick={() => saveBilling({ preventDefault: () => undefined } as FormEvent)} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">
                    {savingBilling ? "Saving..." : "Save rules"}
                  </button>
                </div>

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="mt-4 text-xl font-semibold">Billing rules</h2>
                  <p className="mt-2 text-sm text-slate-400">Industry-style setup with dedicated Electricity, Materials, and Labour sections.</p>
                </div>
              </div>
              <form onSubmit={saveBilling} className="mt-6 space-y-6">
                <details open className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <summary className="cursor-pointer list-none text-lg font-semibold text-white">Electricity</summary>
                  <div className="mb-4">
                    <p className="mt-1 text-sm text-slate-400">Set base energy pricing rules used by runtime cost calculations.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="w-56 shrink-0">Electricity cost / kWh</span>
                      <input type="number" step="0.01" value={toClearableNumberInput(billingSettings.electricityCostPerKwh)} onChange={(e) => updateBilling("electricityCostPerKwh", parseNumberInput(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                    <label className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="w-56 shrink-0">Electricity markup %</span>
                      <input type="number" step="0.01" value={toClearableNumberInput(billingSettings.electricityMarkupPercent)} onChange={(e) => updateBilling("electricityMarkupPercent", parseNumberInput(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                    <label className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="w-56 shrink-0">Depreciation markup %</span>
                      <input type="number" step="0.01" value={toClearableNumberInput(billingSettings.depreciationMarkupPercent)} onChange={(e) => updateBilling("depreciationMarkupPercent", parseNumberInput(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                  </div>
                </details>

                <details open className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <summary className="cursor-pointer list-none text-lg font-semibold text-white">Materials</summary>
                  <div className="mb-4">
                    <p className="mt-1 text-sm text-slate-400">Set global markup and optional per-material-type pricing rules.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="w-56 shrink-0">Global material markup %</span>
                      <input type="number" step="0.01" value={toClearableNumberInput(billingSettings.materialMarkupPercent)} onChange={(e) => updateBilling("materialMarkupPercent", parseNumberInput(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
                    <div className="grid grid-cols-[1.4fr_1fr] bg-slate-900 px-4 py-3 text-sm font-medium text-slate-300">
                      <span>Material type</span>
                      <span>Markup %</span>
                    </div>
                    <div className="divide-y divide-slate-800 bg-slate-900/70">
                      {billingMaterialTypes.map((materialType) => (
                        <div key={materialType} className="grid grid-cols-[1.4fr_1fr] items-center gap-3 px-4 py-3 text-sm">
                          <div className="font-medium text-white">{materialType}</div>
                          <input type="number" step="0.01" aria-label={`Markup percent for ${materialType}`} value={toClearableNumberInput(billingSettings.materialTypeMarkups?.[materialType]?.percent ?? 0)} onChange={(e) => updateMaterialTypeMarkup(materialType, parseNumberInput(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                </details>

                <details open className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <summary className="cursor-pointer list-none text-lg font-semibold text-white">Labour</summary>
                  <div className="mb-4">
                    <p className="mt-1 text-sm text-slate-400">Set the base labour rate used in billing.</p>
                  </div>
                  <label className="flex items-center gap-4 text-sm text-slate-300">
                    <span className="w-56 shrink-0">Labour rate / hour</span>
                    <input type="number" step="0.01" value={toClearableNumberInput(billingSettings.labourRate)} onChange={(e) => updateBilling("labourRate", parseNumberInput(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                  </label>
                </details>

                <details open className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <summary className="cursor-pointer list-none text-lg font-semibold text-white">Workshop costs</summary>
                  <div className="mb-4">
                    <p className="mt-1 text-sm text-slate-400">Set a base workshop hourly rate that is included in customer billing.</p>
                  </div>
                  <label className="flex items-center gap-4 text-sm text-slate-300">
                    <span className="w-56 shrink-0">Workshop hourly rate</span>
                    <input type="number" step="0.01" value={toClearableNumberInput(billingSettings.workshopHourlyRate)} onChange={(e) => updateBilling("workshopHourlyRate", parseNumberInput(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                  </label>
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
                    Workshop costs are calculated from machine runtime hours multiplied by this hourly rate.
                  </div>
                </details>

                <details open className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <summary className="cursor-pointer list-none text-lg font-semibold text-white">Pricing guardrails</summary>
                  <div className="mb-4">
                    <p className="mt-1 text-sm text-slate-400">Apply minimum charge, setup fee, rush multiplier, and waste factor controls.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="w-56 shrink-0">Minimum charge (£)</span>
                      <input type="number" step="0.01" value={toClearableNumberInput(billingSettings.minimumCharge)} onChange={(e) => updateBilling("minimumCharge", parseNumberInput(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                    <label className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="w-56 shrink-0">Setup fee (£)</span>
                      <input type="number" step="0.01" value={toClearableNumberInput(billingSettings.setupFee)} onChange={(e) => updateBilling("setupFee", parseNumberInput(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                    <label className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="w-56 shrink-0">Rush fee %</span>
                      <input type="number" step="0.01" value={toClearableNumberInput(billingSettings.rushFeePercent)} onChange={(e) => updateBilling("rushFeePercent", parseNumberInput(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                    <label className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="w-56 shrink-0">Waste factor %</span>
                      <input type="number" step="0.01" value={toClearableNumberInput(billingSettings.wasteFactorPercent)} onChange={(e) => updateBilling("wasteFactorPercent", parseNumberInput(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                  </div>
                </details>

                <details open className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <summary className="cursor-pointer list-none text-lg font-semibold text-white">Invoice add-ons</summary>
                  <div className="mb-4">
                    <p className="mt-1 text-sm text-slate-400">Set delivery, VAT, deposits, and payment terms shown in invoice totals.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="w-56 shrink-0">Delivery amount</span>
                      <input type="number" step="0.01" value={toClearableNumberInput(billingSettings.deliveryAmount)} onChange={(e) => updateBilling("deliveryAmount", parseNumberInput(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                    <label className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="w-56 shrink-0">VAT %</span>
                      <input type="number" step="0.01" value={toClearableNumberInput(billingSettings.vatPercent)} onChange={(e) => updateBilling("vatPercent", parseNumberInput(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                    <label className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="w-56 shrink-0">Suggested deposit %</span>
                      <input type="number" step="0.01" value={toClearableNumberInput(billingSettings.depositPercent)} onChange={(e) => updateBilling("depositPercent", parseNumberInput(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                    <label className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="w-56 shrink-0">Payment terms (days)</span>
                      <input type="number" step="1" value={toClearableNumberInput(billingSettings.paymentTermsDays)} onChange={(e) => updateBilling("paymentTermsDays", parseNumberInput(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                  </div>
                </details>
              </form>
              </details>
            </section>
          </div>
        )}

        {activeTab === "help" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Help guide</h2>
            <div className="mt-6 space-y-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="font-semibold text-white">Creating a job</h3>
                <p className="mt-2">Use Dashboard quick add or Jobs &gt; Add job. Enter customer, machine type, machine runtime, labour time, status, payment status, optional deposit paid, and one or more materials. Use Quote Draft/Quote Sent/Quote Approved statuses when preparing quotes before production. Each new job receives an automatic job number. If the customer name is new, a popup appears so you can add customer details into CRM Lite right away.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="font-semibold text-white">Calculating costs</h3>
                <p className="mt-2">Use Calculate cost from Dashboard or Jobs. Costing uses material usage, machine runtime electricity/depreciation, labour time, and workshop hourly rate, plus guardrails from Billing Rules (minimum charge, setup fee, rush fee %, waste factor %). Mark a job as Rush to apply rush-fee logic. Job cards show internal breakdown lines; invoices show customer-facing totals.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="font-semibold text-white">Quote to job workflow</h3>
                <p className="mt-2">Open a quote in Jobs and use quick actions to move it through Quote Draft → Quote Sent → Quote Approved. Use Convert to job to set it to Pending and begin production. When a job is changed to Completed, the app refreshes costs and opens invoice mode automatically.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="font-semibold text-white">Machines and billing rules</h3>
                <p className="mt-2">Manage machine profiles in Machines (add/edit/remove wattage, depreciation, replacement runtime). In Billing, set markups, electricity rate, labour rate, workshop hourly rate, pricing guardrails (minimum charge, setup fee, rush fee %, waste factor %), and invoice finance settings (delivery, VAT, suggested deposit %, payment terms days). Billing and personalization sections are collapsible for easier navigation.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="font-semibold text-white">Business and customers</h3>
                <p className="mt-2">Set business personalization in Billing (name, logo, address, email, phone, website). Manage CRM Lite customer records in Customers and reuse those details in invoices.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="font-semibold text-white">Invoices and backup</h3>
                <p className="mt-2">Open a job card and choose Create invoice for print/PDF output. The invoice panel includes Refresh costs, Print / Save PDF, and Close invoice actions. Invoice totals include SubTotal, Delivery, VAT, Suggested deposit, Deposit paid, Grand total, and Balance due, and show payment terms when configured. In Admin tools, pair each export/import action by data type: jobs CSV export/import, materials CSV export/import, and full JSON backup download/restore.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="font-semibold text-white">If the app is not responding</h3>
                <p className="mt-2">Check that frontend `127.0.0.1:5173` and backend `localhost:4000` are both running, then verify backend health at `/api/health`. Restart both dev servers if either side is down.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="font-semibold text-white">Release notes and change history</h3>
                <p className="mt-2">Review project updates and release notes in the changelog: <a className="text-cyan-300 underline" href="https://github.com/bloodygoodbloke/laser-and-3dprint-tracker/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">CHANGELOG.md</a>.</p>
              </div>
            </div>
            <div className="mt-6 text-left text-xs text-slate-500">Version {APP_VERSION}</div>
          </section>
        )}

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
                <button type="submit" className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white">Save customer</button>
              </div>
            </form>
          </div>
        ) : null}

      </div>
    </div>
  );
}

export default App;

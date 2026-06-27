import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import api from "./api";
import { BillingSettings, Job, Material } from "./types";

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
  labourRate: 20,
  workshopHourlyRate: 0,
  overheadPercent: 0.15,
  machineElectricitySettings: getDefaultMachineRuntimeSettings(),
});

const getJobMode = (machineType: string) => (machineType.toLowerCase().includes("laser") || machineType.toLowerCase().includes("cnc") ? "laser" : "3d");
const normalizeMarkupPercent = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 25;
};

function App() {
  const KG_TO_G = 1000;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "jobs" | "materials" | "machines" | "admin" | "help">("dashboard");
  const [jobForm, setJobForm] = useState({ name: "", customer: "", machineType: defaultMachineNames[0], machineRunTimeMinutes: "60", labourTimeMinutes: "60", status: "Pending" });
  const [materialForm, setMaterialForm] = useState({ name: "", type: "PLA", unit: "g", color: "", costPerUnit: "20", stockLevel: "1", reorderThreshold: "0.2" });
  const [jobMaterialEntries, setJobMaterialEntries] = useState<Array<{ materialId: string; usageQuantity: string }>>([]);
  const [billingSettings, setBillingSettings] = useState<BillingSettings>(blankBillingSettings());
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [jobEditorMode, setJobEditorMode] = useState<"none" | "edit" | "create" | "invoice">("none");
  const [selectedJobForm, setSelectedJobForm] = useState({ name: "", customer: "", machineType: defaultMachineNames[0], machineRunTimeMinutes: "", labourTimeMinutes: "", status: "Pending" });
  const [selectedJobMaterialEntries, setSelectedJobMaterialEntries] = useState<Array<{ materialId: string; usageQuantity: string }>>([]);
  const [newJobForm, setNewJobForm] = useState({ name: "", customer: "", machineType: defaultMachineNames[0], machineRunTimeMinutes: "60", labourTimeMinutes: "60", status: "Pending" });
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

  const loadData = async () => {
    const [jobsData, materialsData] = await Promise.all([api.getJobs(), api.getMaterials()]);
    let finalMaterials = materialsData;
    if (!finalMaterials.length) {
      await api.seedMaterials();
      finalMaterials = await api.getMaterials();
    }
    setJobs(jobsData);
    setMaterials(finalMaterials);
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
      labourRate: Number(settings.labourRate ?? 20),
      workshopHourlyRate: Number((settings as BillingSettings).workshopHourlyRate ?? 0),
      overheadPercent: Number(settings.overheadPercent ?? 0.15),
      materialTypeMarkups: Object.fromEntries(
        Object.entries(settings.materialTypeMarkups || {}).map(([materialType, rule]) => [
          materialType,
          { percent: normalizeMarkupPercent(rule?.percent) },
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
    setSelectedJobForm({
      name: selectedJob.name,
      customer: selectedJob.customer || "",
      machineType: selectedJob.machineType || machineOptions[0],
      machineRunTimeMinutes: String(selectedJob.machineRunTimeMinutes ?? selectedJob.estTimeMinutes ?? 0),
      labourTimeMinutes: String(selectedJob.labourTimeMinutes ?? selectedJob.estTimeMinutes ?? 0),
      status: selectedJob.status || "Pending",
    });
    setSelectedJobMaterialEntries((selectedJob.materials || []).map((entry) => ({
      materialId: entry.materialId,
      usageQuantity: String(entry.usageQuantity || 0),
    })));
  }, [selectedJob?.id, selectedJob?.name, selectedJob?.customer, selectedJob?.machineType, selectedJob?.estTimeMinutes, selectedJob?.machineRunTimeMinutes, selectedJob?.labourTimeMinutes, selectedJob?.status, selectedJob?.materials]);

  useEffect(() => {
    if (!newJobMaterialEntries.length && materials.length) {
      setNewJobMaterialEntries([{ materialId: materials[0].id, usageQuantity: "100" }]);
    }
  }, [materials, newJobMaterialEntries.length]);

  const lowStockMaterials = useMemo(() => materials.filter((material) => material.stockLevel <= material.reorderThreshold), [materials]);
  const pendingJobs = useMemo(() => jobs.filter((job) => job.status === "Pending"), [jobs]);
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

  const createJob = async (e: FormEvent) => {
    e.preventDefault();
    await api.createJob({
      name: jobForm.name,
      customer: jobForm.customer || null,
      machineType: jobForm.machineType,
      estTimeMinutes: Number(jobForm.machineRunTimeMinutes),
      machineRunTimeMinutes: Number(jobForm.machineRunTimeMinutes || 0),
      labourTimeMinutes: Number(jobForm.labourTimeMinutes || 0),
      status: jobForm.status,
      materials: toApiJobMaterials(jobMaterialEntries),
    });
    setJobForm({ name: "", customer: "", machineType: machineOptions[0] || "Other", machineRunTimeMinutes: "60", labourTimeMinutes: "60", status: "Pending" });
    setJobMaterialEntries([]);
    await loadData();
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
    setNewJobForm({ name: "", customer: "", machineType: machineOptions[0] || "Other", machineRunTimeMinutes: "60", labourTimeMinutes: "60", status: "Pending" });
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
    const created = await api.createJob({
      name: newJobForm.name,
      customer: newJobForm.customer || null,
      machineType: newJobForm.machineType,
      estTimeMinutes: Number(newJobForm.machineRunTimeMinutes || 0),
      machineRunTimeMinutes: Number(newJobForm.machineRunTimeMinutes || 0),
      labourTimeMinutes: Number(newJobForm.labourTimeMinutes || 0),
      status: newJobForm.status,
      materials: toApiJobMaterials(newJobMaterialEntries),
    });
    await loadData();
    setSelectedJobId(created.id);
    setJobEditorMode("edit");
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

  const saveSelectedJob = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    await api.updateJob(selectedJob.id, {
      name: selectedJobForm.name,
      customer: selectedJobForm.customer || null,
      machineType: selectedJobForm.machineType,
      estTimeMinutes: Number(selectedJobForm.machineRunTimeMinutes || 0),
      machineRunTimeMinutes: Number(selectedJobForm.machineRunTimeMinutes || 0),
      labourTimeMinutes: Number(selectedJobForm.labourTimeMinutes || 0),
      status: selectedJobForm.status,
      materials: toApiJobMaterials(selectedJobMaterialEntries),
    });
    await loadData();
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
            <h1 className="text-3xl font-semibold">Laser & 3D Print Tracker</h1>
            <p className="mt-2 text-slate-400">Track jobs, materials, and production costs from one place.</p>
          </div>
          <div className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300">{jobs.length} jobs • {materials.length} materials</div>
        </header>

        <nav className="mb-8 flex gap-3 no-print">
          {(["dashboard", "jobs", "materials", "machines", "admin", "help"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-full px-4 py-2 text-sm capitalize ${activeTab === tab ? "bg-cyan-600 text-white" : "bg-slate-900 text-slate-300"}`}>
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === "dashboard" && (
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
                </div>
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
                    <button onClick={() => calculateJobCost(job)} className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300">Calculate cost</button>
                  </div>
                ))}
              </div>
            </section>
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
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-3">
                {jobs.map((job) => (
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
                          <p>{job.status}</p>
                          <p>{job.cost?.totalCost ? `£${job.cost.totalCost.toFixed(2)}` : "No cost yet"}</p>
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
                          <p><span className="text-slate-500">Materials:</span> {job.materials?.length || 0}</p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
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
                              setSelectedJobId(job.id);
                              setJobEditorMode("invoice");
                            }}
                            className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300"
                          >
                            Create invoice
                          </button>
                          <button type="button" onClick={() => calculateJobCost(job)} className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">Calculate cost</button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
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
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
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
                    </div>

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
                ) : jobEditorMode === "edit" && selectedJob ? (
                  <form onSubmit={saveSelectedJob} className="space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Job details</p>
                        <h3 className="mt-2 text-xl font-semibold">{selectedJob.name}</h3>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => selectedJob && calculateJobCost(selectedJob)} className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300">Calculate cost</button>
                        <button type="submit" className="rounded-full bg-cyan-600 px-3 py-1 text-sm font-medium">Save job</button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm text-slate-300">
                        <span className="mb-2 block">Job name</span>
                        <input value={selectedJobForm.name} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, name: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" required />
                      </label>
                      <label className="block text-sm text-slate-300">
                        <span className="mb-2 block">Customer</span>
                        <input value={selectedJobForm.customer} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, customer: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                      </label>
                      <label className="block text-sm text-slate-300">
                        <span className="mb-2 block">Machine type</span>
                        <select value={selectedJobForm.machineType} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, machineType: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                          {machineOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm text-slate-300">
                        <span className="mb-2 block">Status</span>
                        <select value={selectedJobForm.status} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, status: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm text-slate-300">
                        <span className="mb-2 block">Machine runtime (mins)</span>
                        <input value={selectedJobForm.machineRunTimeMinutes} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, machineRunTimeMinutes: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                      </label>
                      <label className="block text-sm text-slate-300">
                        <span className="mb-2 block">Labour time (mins)</span>
                        <input value={selectedJobForm.labourTimeMinutes} onChange={(e) => setSelectedJobForm({ ...selectedJobForm, labourTimeMinutes: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                      </label>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white">Materials used</h4>
                        <button type="button" onClick={addSelectedJobMaterialEntry} className="rounded-full border border-cyan-700 px-3 py-1 text-xs text-cyan-300">Add material</button>
                      </div>
                      <div className="space-y-3">
                        {selectedJobMaterialEntries.map((entry, index) => (
                          <div key={`${entry.materialId}-${index}`} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 md:grid-cols-[1.6fr_1fr_auto]">
                            <label className="text-sm text-slate-300">
                              <span className="mb-2 block">Material</span>
                              <select value={entry.materialId} onChange={(e) => updateSelectedJobMaterialEntry(index, "materialId", e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                                {materials.map((material) => (
                                  <option key={material.id} value={material.id}>{material.name} {material.color ? `• ${material.color}` : ""}</option>
                                ))}
                              </select>
                            </label>
                            <label className="text-sm text-slate-300">
                              <span className="mb-2 block">Quantity (g)</span>
                              <input type="number" min="0" step="0.01" value={entry.usageQuantity} onChange={(e) => updateSelectedJobMaterialEntry(index, "usageQuantity", e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                            </label>
                            <button type="button" onClick={() => removeSelectedJobMaterialEntry(index)} className="self-end rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">Remove</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-white">Customer invoice</h4>
                          <p className="mt-1 text-sm text-slate-400">A print-friendly summary for the customer with totals and line items.</p>
                        </div>
                        <button type="button" onClick={() => window.print()} className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300">Print / Save PDF</button>
                      </div>
                      {selectedJob.cost ? (
                        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950 p-5">
                          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                            <div>
                              <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">Invoice</p>
                              <h5 className="mt-2 text-xl font-semibold text-white">{selectedJob.name}</h5>
                              <p className="mt-1 text-sm text-slate-400">{selectedJob.customer || "Walk-in customer"}</p>
                            </div>
                            <div className="text-sm text-slate-400">
                              <p className="font-medium text-white">#{selectedJob.jobNumber || "TBC"}</p>
                              <p>Issued {new Date().toLocaleDateString()}</p>
                              <p>Due on receipt</p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Bill to</p>
                              <p className="mt-2 font-medium text-white">{selectedJob.customer || "Walk-in customer"}</p>
                              <p className="text-sm text-slate-400">{selectedJob.machineType}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Job summary</p>
                              <p className="mt-2 font-medium text-white">{selectedJob.status}</p>
                              <p className="text-sm text-slate-400">Runtime {selectedJob.machineRunTimeMinutes ?? selectedJob.estTimeMinutes} mins • Labour {selectedJob.labourTimeMinutes ?? selectedJob.estTimeMinutes} mins</p>
                            </div>
                          </div>

                          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
                            <div className="grid grid-cols-[2fr_1fr_1fr] bg-slate-900/90 px-4 py-3 text-sm font-medium text-slate-300">
                              <span>Description</span>
                              <span>Qty</span>
                              <span>Amount</span>
                            </div>
                            <div className="divide-y divide-slate-800 bg-slate-950/70">
                              <div className="grid grid-cols-[2fr_1fr_1fr] px-4 py-3 text-sm">
                                <div>
                                  <p className="font-medium text-white">Material usage</p>
                                  <p className="text-slate-400">{selectedJob.materials?.length ? `${selectedJob.materials.length} material line${selectedJob.materials.length > 1 ? "s" : ""}` : "No material lines"}</p>
                                </div>
                                <span className="text-slate-400">1</span>
                                <span className="font-medium text-white">{formatCurrency(selectedJob.cost.materialCost)}</span>
                              </div>
                              <div className="grid grid-cols-[2fr_1fr_1fr] px-4 py-3 text-sm">
                                <div>
                                  <p className="font-medium text-white">Machine runtime</p>
                                  <p className="text-slate-400">Electricity charge</p>
                                </div>
                                <span className="text-slate-400">1</span>
                                <span className="font-medium text-white">{formatCurrency(selectedJob.cost.electricityCost)}</span>
                              </div>
                              <div className="grid grid-cols-[2fr_1fr_1fr] px-4 py-3 text-sm">
                                <div>
                                  <p className="font-medium text-white">Labour</p>
                                  <p className="text-slate-400">Production time estimate</p>
                                </div>
                                <span className="text-slate-400">{selectedJob.labourTimeMinutes ?? selectedJob.estTimeMinutes} mins</span>
                                <span className="font-medium text-white">{formatCurrency(selectedJob.cost.labourCost)}</span>
                              </div>
                              <div className="grid grid-cols-[2fr_1fr_1fr] px-4 py-3 text-sm">
                                <div>
                                  <p className="font-medium text-white">Workshop costs</p>
                                  <p className="text-slate-400">Base workshop hourly charge</p>
                                </div>
                                <span className="text-slate-400">1</span>
                                <span className="font-medium text-white">{formatCurrency(selectedJob.cost.overheadCost)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex justify-end">
                            <div className="w-full max-w-xs space-y-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm">
                              <div className="flex items-center justify-between text-slate-400">
                                <span>Subtotal</span>
                                <span>{formatCurrency(selectedJob.cost.materialCost + selectedJob.cost.electricityCost + selectedJob.cost.labourCost + selectedJob.cost.overheadCost)}</span>
                              </div>
                              <div className="flex items-center justify-between text-slate-400">
                                <span>Customer charge</span>
                                <span>{formatCurrency(selectedJob.cost.customerCharge)}</span>
                              </div>
                              <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-base font-semibold text-white">
                                <span>Grand total</span>
                                <span>{formatCurrency(selectedJob.cost.customerCharge)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                          No cost has been calculated for this job yet. Use the Calculate cost button above to generate the invoice summary.
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button type="submit" className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">Save job details</button>
                    </div>
                  </form>
                ) : jobEditorMode === "invoice" && selectedJob ? (
                  <div className="space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Invoice</p>
                        <h3 className="mt-2 text-xl font-semibold">{selectedJob.name}</h3>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => selectedJob && calculateJobCost(selectedJob)} className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300">Refresh costs</button>
                        <button type="button" onClick={() => window.print()} className="rounded-full border border-cyan-700 px-3 py-1 text-sm text-cyan-300">Print / Save PDF</button>
                      </div>
                    </div>

                    {selectedJob.cost ? (
                      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">Invoice</p>
                            <h5 className="mt-2 text-xl font-semibold text-white">{selectedJob.name}</h5>
                            <p className="mt-1 text-sm text-slate-400">{selectedJob.customer || "Walk-in customer"}</p>
                          </div>
                          <div className="text-sm text-slate-400">
                            <p className="font-medium text-white">#{selectedJob.jobNumber || "TBC"}</p>
                            <p>Issued {new Date().toLocaleDateString()}</p>
                            <p>Due on receipt</p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Bill to</p>
                            <p className="mt-2 font-medium text-white">{selectedJob.customer || "Walk-in customer"}</p>
                            <p className="text-sm text-slate-400">{selectedJob.machineType}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Job summary</p>
                            <p className="mt-2 font-medium text-white">{selectedJob.status}</p>
                            <p className="text-sm text-slate-400">Runtime {selectedJob.machineRunTimeMinutes ?? selectedJob.estTimeMinutes} mins • Labour {selectedJob.labourTimeMinutes ?? selectedJob.estTimeMinutes} mins</p>
                          </div>
                        </div>

                        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
                          <div className="grid grid-cols-[2fr_1fr_1fr] bg-slate-950/90 px-4 py-3 text-sm font-medium text-slate-300">
                            <span>Description</span>
                            <span>Qty</span>
                            <span>Amount</span>
                          </div>
                          <div className="divide-y divide-slate-800 bg-slate-950/50">
                            <div className="grid grid-cols-[2fr_1fr_1fr] px-4 py-3 text-sm">
                              <div>
                                <p className="font-medium text-white">Material usage</p>
                                <p className="text-slate-400">{selectedJob.materials?.length ? `${selectedJob.materials.length} material line${selectedJob.materials.length > 1 ? "s" : ""}` : "No material lines"}</p>
                              </div>
                              <span className="text-slate-400">1</span>
                              <span className="font-medium text-white">{formatCurrency(selectedJob.cost.materialCost)}</span>
                            </div>
                            <div className="grid grid-cols-[2fr_1fr_1fr] px-4 py-3 text-sm">
                              <div>
                                <p className="font-medium text-white">Machine runtime</p>
                                <p className="text-slate-400">Electricity + depreciation</p>
                              </div>
                              <span className="text-slate-400">1</span>
                              <span className="font-medium text-white">{formatCurrency(selectedJob.cost.electricityCost)}</span>
                            </div>
                            <div className="grid grid-cols-[2fr_1fr_1fr] px-4 py-3 text-sm">
                              <div>
                                <p className="font-medium text-white">Labour</p>
                                <p className="text-slate-400">Production work time</p>
                              </div>
                              <span className="text-slate-400">{selectedJob.labourTimeMinutes ?? selectedJob.estTimeMinutes} mins</span>
                              <span className="font-medium text-white">{formatCurrency(selectedJob.cost.labourCost)}</span>
                            </div>
                            <div className="grid grid-cols-[2fr_1fr_1fr] px-4 py-3 text-sm">
                              <div>
                                <p className="font-medium text-white">Workshop costs</p>
                                <p className="text-slate-400">Base workshop hourly charge</p>
                              </div>
                              <span className="text-slate-400">1</span>
                              <span className="font-medium text-white">{formatCurrency(selectedJob.cost.overheadCost)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <div className="w-full max-w-xs space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm">
                            <div className="flex items-center justify-between text-slate-400">
                              <span>Subtotal</span>
                              <span>{formatCurrency(selectedJob.cost.materialCost + selectedJob.cost.electricityCost + selectedJob.cost.labourCost + selectedJob.cost.overheadCost)}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-400">
                              <span>Customer charge</span>
                              <span>{formatCurrency(selectedJob.cost.customerCharge)}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-base font-semibold text-white">
                              <span>Grand total</span>
                              <span>{formatCurrency(selectedJob.cost.customerCharge)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                        No cost has been calculated for this job yet. Use Refresh costs to generate the invoice totals.
                      </div>
                    )}
                  </div>
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

        {activeTab === "admin" && (
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">Admin backup & data tools</h2>
              <p className="mt-2 text-sm text-slate-400">Export jobs, materials, and the full app data snapshot, then restore them later if needed.</p>
              <div className="mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={exportBackupCsv} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">Export jobs CSV</button>
                  <button type="button" onClick={exportMaterialsCsv} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">Export materials CSV</button>
                  <button type="button" onClick={exportFullBackup} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">Download full backup</button>
                  <label className="cursor-pointer rounded-xl border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-300">
                    <span className="mb-2 block">Import jobs CSV</span>
                    <input type="file" accept=".csv" className="hidden" onChange={importBackupCsv} />
                  </label>
                  <label className="cursor-pointer rounded-xl border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-300">
                    <span className="mb-2 block">Restore full backup</span>
                    <input type="file" accept=".json" className="hidden" onChange={importFullBackup} />
                  </label>
                </div>
                {backupMessage ? <p className="text-sm text-cyan-300">{backupMessage}</p> : null}
                {materialBackupMessage ? <p className="text-sm text-cyan-300">{materialBackupMessage}</p> : null}
                {fullBackupMessage ? <p className="text-sm text-cyan-300">{fullBackupMessage}</p> : null}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Billing rules</h2>
                  <p className="mt-2 text-sm text-slate-400">Industry-style setup with dedicated Electricity, Materials, and Labour sections.</p>
                </div>
                <button type="button" onClick={() => saveBilling({ preventDefault: () => undefined } as FormEvent)} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">
                  {savingBilling ? "Saving..." : "Save rules"}
                </button>
              </div>
              <form onSubmit={saveBilling} className="mt-6 space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white">Electricity</h3>
                    <p className="mt-1 text-sm text-slate-400">Set base energy pricing rules used by runtime cost calculations.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="w-56 shrink-0">Electricity cost / kWh</span>
                      <input type="number" step="0.01" value={billingSettings.electricityCostPerKwh} onChange={(e) => updateBilling("electricityCostPerKwh", Number(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                    <label className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="w-56 shrink-0">Electricity markup %</span>
                      <input type="number" step="0.01" value={billingSettings.electricityMarkupPercent} onChange={(e) => updateBilling("electricityMarkupPercent", Number(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white">Materials</h3>
                    <p className="mt-1 text-sm text-slate-400">Set global markup and optional per-material-type pricing rules.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="w-56 shrink-0">Global material markup %</span>
                      <input type="number" step="0.01" value={billingSettings.materialMarkupPercent} onChange={(e) => updateBilling("materialMarkupPercent", Number(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
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
                          <input type="number" step="0.01" value={billingSettings.materialTypeMarkups?.[materialType]?.percent ?? 25} onChange={(e) => updateMaterialTypeMarkup(materialType, Number(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white">Labour</h3>
                    <p className="mt-1 text-sm text-slate-400">Set the base labour rate used in billing.</p>
                  </div>
                  <label className="flex items-center gap-4 text-sm text-slate-300">
                    <span className="w-56 shrink-0">Labour rate / hour</span>
                    <input type="number" step="0.01" value={billingSettings.labourRate} onChange={(e) => updateBilling("labourRate", Number(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                  </label>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white">Workshop costs</h3>
                    <p className="mt-1 text-sm text-slate-400">Set a base workshop hourly rate that is included in customer billing.</p>
                  </div>
                  <label className="flex items-center gap-4 text-sm text-slate-300">
                    <span className="w-56 shrink-0">Workshop hourly rate</span>
                    <input type="number" step="0.01" value={billingSettings.workshopHourlyRate} onChange={(e) => updateBilling("workshopHourlyRate", Number(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
                  </label>
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
                    Workshop costs are calculated from machine runtime hours multiplied by this hourly rate.
                  </div>
                </div>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{editingMaterialId ? "Edit material" : "Add material"}</h2>
                  <p className="mt-2 text-sm text-slate-400">Create or update stock and pricing entries for reusable materials.</p>
                </div>
                {editingMaterialId ? (
                  <button type="button" onClick={closeMaterialForm} className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">
                    Cancel edit
                  </button>
                ) : null}
              </div>
              <form onSubmit={createMaterial} className="mt-6 space-y-3">
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-56 shrink-0">Material name</span>
                  <input value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} placeholder="Material name" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" required />
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-56 shrink-0">Material type</span>
                  <input value={materialForm.type} onChange={(e) => setMaterialForm({ ...materialForm, type: e.target.value })} placeholder="Type" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-56 shrink-0">Colour</span>
                  <input value={materialForm.color} onChange={(e) => setMaterialForm({ ...materialForm, color: e.target.value })} placeholder="Colour" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-56 shrink-0">Usage unit</span>
                  <div className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-300">Grams (g)</div>
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-56 shrink-0">Purchase cost per kg</span>
                  <input value={materialForm.costPerUnit} onChange={(e) => setMaterialForm({ ...materialForm, costPerUnit: e.target.value })} placeholder="Cost per kg" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-56 shrink-0">Stock purchased (kg)</span>
                  <input value={materialForm.stockLevel} onChange={(e) => setMaterialForm({ ...materialForm, stockLevel: e.target.value })} placeholder="e.g. 1" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="w-56 shrink-0">Reorder threshold (kg)</span>
                  <input value={materialForm.reorderThreshold} onChange={(e) => setMaterialForm({ ...materialForm, reorderThreshold: e.target.value })} placeholder="e.g. 0.2" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Material pricing</h3>
                    <span className="text-sm text-cyan-300">Base cost per kg + markup = total per kg</span>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="w-56 shrink-0">Base cost / kg</span>
                      <div className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-300">{formatCurrency(Number(materialForm.costPerUnit) || 0)}</div>
                    </label>
                    <label className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="w-56 shrink-0">Markup %</span>
                      <input type="number" step="0.01" value={billingSettings.materialMarkupPercent} onChange={(e) => updateBilling("materialMarkupPercent", Number(e.target.value))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
                    </label>
                  </div>
                  <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-cyan-300">
                    Material total / kg: {formatCurrency((Number(materialForm.costPerUnit) || 0) + ((Number(materialForm.costPerUnit) || 0) * (billingSettings.materialMarkupPercent / 100)))}
                  </div>
                  <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
                    Stored internally as grams: stock {(Number(materialForm.stockLevel || 0) * KG_TO_G).toFixed(0)}g, reorder {(Number(materialForm.reorderThreshold || 0) * KG_TO_G).toFixed(0)}g, cost {(Number(materialForm.costPerUnit || 0) / KG_TO_G).toFixed(4)} per g.
                  </div>
                </div>
                <button className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium">{editingMaterialId ? "Save material" : "Add material"}</button>
              </form>
            </section>

          </div>
        )}

        {activeTab === "help" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Help guide</h2>
            <div className="mt-6 space-y-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="font-semibold text-white">Creating a job</h3>
                <p className="mt-2">Use Dashboard quick add or the Add job action in Jobs. Enter customer, machine type, machine runtime, labour time, and one or more materials. Each new job receives an automatic job number.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="font-semibold text-white">Calculating costs</h3>
                <p className="mt-2">Use Calculate cost from Dashboard or Jobs. Costing uses material usage, machine runtime electricity/depreciation, labour time, and workshop hourly rate to produce both internal totals and customer charge.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="font-semibold text-white">Machines and billing rules</h3>
                <p className="mt-2">Manage machine profiles in the Machines tab (add/edit/remove wattage, depreciation, replacement runtime). In Admin Billing rules, set markups, electricity rate, labour rate, and workshop hourly rate.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="font-semibold text-white">Invoices and backup</h3>
                <p className="mt-2">Open a job card and choose Create invoice for print/PDF output. In Admin tools, export jobs/materials CSV or full JSON backup, and restore from CSV/JSON when required.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="font-semibold text-white">If the app is not responding</h3>
                <p className="mt-2">Check that frontend `127.0.0.1:5173` and backend `localhost:4000` are both running, then verify backend health at `/api/health`. Restart both dev servers if either side is down.</p>
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

export default App;

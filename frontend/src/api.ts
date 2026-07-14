import { BambuDashboardPayload, BillingSettings, Customer, Job, Material, MaterialPurchase, Supplier } from "./types";

const csvHeader = "jobNumber,name,customer,machineType,machineRunTimeMinutes,labourTimeMinutes,status\n";
const materialsCsvHeader = "name,type,unit,costPerUnit,stockLevel,reorderThreshold,color\n";

const api = {
  async getJobs(): Promise<Job[]> {
    const res = await fetch("/api/jobs");
    if (!res.ok) throw new Error("Failed to load jobs");
    return res.json();
  },
  async createJob(payload: Partial<Job>) {
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create job");
    return res.json();
  },
  async updateJob(id: string, payload: Partial<Job>) {
    const res = await fetch(`/api/jobs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to update job");
    return res.json();
  },
  async deleteJob(id: string) {
    const res = await fetch(`/api/jobs/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete job");
  },
  async getMaterials(): Promise<Material[]> {
    const res = await fetch("/api/materials");
    if (!res.ok) throw new Error("Failed to load materials");
    return res.json();
  },
  async seedMaterials() {
    const res = await fetch("/api/materials/seed", { method: "POST" });
    if (!res.ok) throw new Error("Failed to seed materials");
    return res.json();
  },
  async getCustomers(): Promise<Customer[]> {
    const res = await fetch("/api/customers");
    if (!res.ok) throw new Error("Failed to load customers");
    return res.json();
  },
  async getSuppliers(): Promise<Supplier[]> {
    const res = await fetch("/api/suppliers");
    if (!res.ok) throw new Error("Failed to load suppliers");
    return res.json();
  },
  async createSupplier(payload: Partial<Supplier>) {
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create supplier");
    return res.json();
  },
  async updateSupplier(id: string, payload: Partial<Supplier>) {
    const res = await fetch(`/api/suppliers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to update supplier");
    return res.json();
  },
  async deleteSupplier(id: string) {
    const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete supplier");
  },
  async getSupplierPurchases(id: string): Promise<MaterialPurchase[]> {
    const res = await fetch(`/api/suppliers/${id}/purchases`);
    if (!res.ok) throw new Error("Failed to load supplier purchases");
    return res.json();
  },
  async createSupplierPurchase(id: string, payload: Partial<MaterialPurchase>) {
    const res = await fetch(`/api/suppliers/${id}/purchases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create purchase record");
    return res.json();
  },
  async createCustomer(payload: Partial<Customer>) {
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create customer");
    return res.json();
  },
  async updateCustomer(id: string, payload: Partial<Customer>) {
    const res = await fetch(`/api/customers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to update customer");
    return res.json();
  },
  async deleteCustomer(id: string) {
    const res = await fetch(`/api/customers/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete customer");
  },
  async getCustomerOrders(id: string): Promise<{ customer: Customer; jobs: Job[] }> {
    const res = await fetch(`/api/customers/${id}/orders`);
    if (!res.ok) throw new Error("Failed to load customer orders");
    return res.json();
  },
  async createMaterial(payload: Partial<Material>) {
    const res = await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create material");
    return res.json();
  },
  async updateMaterial(id: string, payload: Partial<Material>) {
    const res = await fetch(`/api/materials/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to update material");
    return res.json();
  },
  async getBillingSettings(): Promise<BillingSettings | null> {
    const res = await fetch("/api/billing-settings");
    if (!res.ok) throw new Error("Failed to load billing settings");
    return res.json();
  },
  async saveBillingSettings(payload: BillingSettings) {
    const res = await fetch("/api/billing-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to save billing settings");
    return res.json();
  },
  async exportJobsCsv(jobs: Job[]) {
    const rows = jobs.map((job) => [
      job.jobNumber || "",
      job.name,
      job.customer || "",
      job.machineType,
      String(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0),
      String(job.labourTimeMinutes ?? job.estTimeMinutes ?? 0),
      job.status,
    ].join(","));
    return `${csvHeader}${rows.join("\n")}`;
  },
  async exportMaterialsCsv(materials: Material[]) {
    const rows = materials.map((material) => [material.name, material.type, material.unit, String(material.costPerUnit), String(material.stockLevel), String(material.reorderThreshold), material.color || ""].join(","));
    return `${materialsCsvHeader}${rows.join("\n")}`;
  },
  async importMaterialsCsv(payload: { materials: Partial<Material>[] }) {
    const res = await fetch("/api/materials/import-csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to import materials CSV");
    return res.json();
  },
  async importBackup(payload: { jobs: Job[]; materials: Material[] }) {
    const res = await fetch("/api/admin/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to restore backup");
    return res.json();
  },
  async exportFullBackup() {
    const res = await fetch("/api/admin/backup/full");
    if (!res.ok) throw new Error("Failed to export full backup");
    return res.json();
  },
  async importFullBackup(payload: Record<string, unknown>) {
    const res = await fetch("/api/admin/backup/full", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to restore full backup");
    return res.json();
  },
  async calculateCost(id: string, payload: Record<string, unknown>) {
    const res = await fetch(`/api/jobs/${id}/calculate-cost`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to calculate cost");
    return res.json();
  },
  async uploadJobFile(id: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/jobs/${id}/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload file");
    return res.json();
  },
  async getBambuDashboard(): Promise<BambuDashboardPayload> {
    const res = await fetch("/api/bambu/dashboard");
    if (!res.ok) throw new Error("Failed to load Bambu dashboard");
    return res.json();
  },
  async ingestBambuStatus(payload: Record<string, unknown>) {
    const res = await fetch("/api/bambu/ingest/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to ingest Bambu status");
    return res.json();
  },
  async ingestBambuEvent(payload: Record<string, unknown>) {
    const res = await fetch("/api/bambu/ingest/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to ingest Bambu event");
    return res.json();
  },
  async simulateBambuTick(payload?: Record<string, unknown>) {
    const res = await fetch("/api/bambu/simulate/tick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    if (!res.ok) throw new Error("Failed to generate Bambu simulation tick");
    return res.json();
  },
};

export default api;
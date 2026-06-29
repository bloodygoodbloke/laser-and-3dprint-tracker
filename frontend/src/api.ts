import { BillingSettings, Customer, Job, Material } from "./types";

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
};

export default api;
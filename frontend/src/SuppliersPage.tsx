import type { Dispatch, FormEvent, SetStateAction } from "react";
import { formatCurrency, formatDate, formatNumber } from "./format";
import type { MaterialPurchase, Supplier } from "./types";

interface SupplierForm {
  name: string;
  websiteUrl: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
}

interface SupplierPurchaseForm {
  materialName: string;
  quantityKg: string;
  totalCost: string;
  purchasedAt: string;
  notes: string;
}

interface SuppliersPageProps {
  suppliers: Supplier[];
  supplierForm: SupplierForm;
  setSupplierForm: Dispatch<SetStateAction<SupplierForm>>;
  editingSupplierId: string | null;
  resetSupplierForm: () => void;
  saveSupplier: (event: FormEvent) => Promise<void>;
  startEditingSupplier: (supplier: Supplier) => void;
  removeSupplier: (supplierId: string) => Promise<void>;
  getSafeExternalUrl: (value?: string) => string | null;
  loadSupplierPurchases: (supplierId: string) => Promise<void>;
  selectedSupplierId: string | null;
  supplierPurchaseForm: SupplierPurchaseForm;
  setSupplierPurchaseForm: Dispatch<SetStateAction<SupplierPurchaseForm>>;
  saveSupplierPurchase: (event: FormEvent) => Promise<void>;
  supplierPurchases: MaterialPurchase[];
  supplierMessage: string;
}

export default function SuppliersPage({
  suppliers,
  supplierForm,
  setSupplierForm,
  editingSupplierId,
  resetSupplierForm,
  saveSupplier,
  startEditingSupplier,
  removeSupplier,
  getSafeExternalUrl,
  loadSupplierPurchases,
  selectedSupplierId,
  supplierPurchaseForm,
  setSupplierPurchaseForm,
  saveSupplierPurchase,
  supplierPurchases,
  supplierMessage,
}: SuppliersPageProps) {
  return (
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
            <span className="w-40 shrink-0">Website URL</span>
            <input type="url" placeholder="https://example.com" value={supplierForm.websiteUrl} onChange={(e) => setSupplierForm({ ...supplierForm, websiteUrl: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
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
            <button className="rounded-full border border-cyan-700 px-4 py-2 text-sm text-cyan-300">{editingSupplierId ? "Save supplier" : "Add supplier"}</button>
          </div>
        </form>

        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <h3 className="text-lg font-semibold text-white">Suppliers</h3>
          <div className="space-y-2">
            {suppliers.map((supplier) => {
              const websiteUrl = getSafeExternalUrl(supplier.websiteUrl);
              return (
                <div key={supplier.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{supplier.name}</p>
                      <p className="text-xs text-slate-400">{supplier.contactEmail || "No email"} • {supplier.contactPhone || "No phone"}</p>
                      {supplier.websiteUrl ? (
                        <p className="mt-1 break-all text-xs">
                          {websiteUrl ? <a className="text-cyan-300 underline" href={websiteUrl} target="_blank" rel="noopener noreferrer">{supplier.websiteUrl}</a> : supplier.websiteUrl}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => loadSupplierPurchases(supplier.id)} className="rounded-full border border-cyan-700 px-3 py-1 text-xs text-cyan-300">Purchases</button>
                      <button type="button" onClick={() => startEditingSupplier(supplier)} className="mf-btn mf-btn--sm">Edit</button>
                      <button type="button" onClick={() => removeSupplier(supplier.id)} className="mf-btn mf-btn--sm mf-btn--danger">Delete</button>
                    </div>
                  </div>
                  {supplier.notes ? <p className="mt-2 text-xs text-slate-400">{supplier.notes}</p> : null}
                </div>
              );
            })}
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
            <input type="date" aria-label="Purchase date" title="Purchase date" value={supplierPurchaseForm.purchasedAt} onChange={(e) => setSupplierPurchaseForm((current) => ({ ...current, purchasedAt: e.target.value }))} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
            <button className="rounded-full border border-cyan-700 px-4 py-2 text-sm text-cyan-300">Add purchase</button>
            <input value={supplierPurchaseForm.notes} onChange={(e) => setSupplierPurchaseForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Notes" className="md:col-span-5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
          </form>
          <div className="mt-3 space-y-2">
            {supplierPurchases.map((purchase) => (
              <div key={purchase.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm">
                <span>{purchase.materialName} • {formatNumber(Number(purchase.quantityKg || 0))} kg • {formatCurrency(Number(purchase.totalCost || 0))}</span>
                <span className="text-slate-400">{purchase.purchasedAt ? formatDate(purchase.purchasedAt) : "-"}</span>
              </div>
            ))}
            {!supplierPurchases.length ? <p className="text-sm text-slate-400">No purchases logged for this supplier.</p> : null}
          </div>
        </div>
      ) : null}

      {supplierMessage ? <p className="mt-4 text-sm text-cyan-300">{supplierMessage}</p> : null}
    </section>
  );
}

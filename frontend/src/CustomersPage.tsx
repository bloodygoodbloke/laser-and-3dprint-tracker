import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { Customer, Job } from "./types";

interface CustomerForm {
  name: string;
  address: string;
  email: string;
  phone: string;
  notes: string;
}

interface CustomersPageProps {
  customers: Customer[];
  customerForm: CustomerForm;
  setCustomerForm: Dispatch<SetStateAction<CustomerForm>>;
  editingCustomerId: string | null;
  resetCustomerForm: () => void;
  saveCustomer: (event: FormEvent) => Promise<void>;
  startEditingCustomer: (customer: Customer) => void;
  removeCustomer: (customerId: string) => Promise<void>;
  loadCustomerOrders: (customerId: string) => Promise<void>;
  selectedCustomerId: string | null;
  customerHistory: Job[];
  customerMessage: string;
}

export default function CustomersPage({
  customers,
  customerForm,
  setCustomerForm,
  editingCustomerId,
  resetCustomerForm,
  saveCustomer,
  startEditingCustomer,
  removeCustomer,
  loadCustomerOrders,
  selectedCustomerId,
  customerHistory,
  customerMessage,
}: CustomersPageProps) {
  return (
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
            <button className="rounded-full border border-cyan-700 px-4 py-2 text-sm text-cyan-300">{editingCustomerId ? "Save customer" : "Add customer"}</button>
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
                    <button type="button" onClick={() => startEditingCustomer(customer)} className="mf-btn mf-btn--sm">Edit</button>
                    <button type="button" onClick={() => removeCustomer(customer.id)} className="mf-btn mf-btn--sm mf-btn--danger">Delete</button>
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
  );
}

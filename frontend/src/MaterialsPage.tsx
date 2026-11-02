import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import api from "./api";
import type { Material } from "./types";
import {
  STOCK_STATUS_META,
  StockStatus,
  compareTypes,
  findCategory,
  formatCost,
  formatStock,
  getColourOptions,
  getStockStatus,
  getTypeOptions,
  getUnitOptions,
  resolveUnit,
} from "./materialsCatalog";

// Groups with more materials than this start collapsed. Expansion choices persist for the browser session.
const COLLAPSE_THRESHOLD = 6;
const SESSION_KEY = "makerflow.materials.groups";

const loadGroupState = (): Record<string, boolean> => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
  } catch {
    return {};
  }
};

const STATUS_COLOURS: Record<StockStatus, string> = {
  healthy: "var(--app-success)",
  reorder: "var(--app-warning)",
  low: "var(--app-danger)",
  out: "var(--app-neutral-soft, #64748b)",
};

const statusStyle = (status: StockStatus) => ({
  color: status === "out" ? undefined : STATUS_COLOURS[status],
  borderColor: STATUS_COLOURS[status],
  backgroundColor: `color-mix(in srgb, ${STATUS_COLOURS[status]} 14%, transparent)`,
});

function Combobox({ label, value, options, onChange, addLabel }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void; addLabel: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const trimmed = query.trim();
  const filtered = options.filter((option) => option.label.toLowerCase().includes(trimmed.toLowerCase()));
  const exact = options.some((option) => option.label.toLowerCase() === trimmed.toLowerCase() || option.value.toLowerCase() === trimmed.toLowerCase());
  const selectedLabel = options.find((option) => option.value === value)?.label || value;

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative" ref={rootRef}>
      <span className="mb-2 block text-sm text-slate-300">{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-left text-sm text-white"
      >
        <span className={selectedLabel ? "" : "text-slate-400"}>{selectedLabel || `Select ${label.toLowerCase()}`}</span>
        <span aria-hidden="true" className="text-slate-400">▾</span>
      </button>
      {open ? (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2 shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "Enter") {
                e.preventDefault();
                if (filtered[0]) choose(filtered[0].value);
                else if (trimmed) choose(trimmed);
              }
            }}
            placeholder="Search or type to add…"
            aria-label={`Search ${label}`}
            className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
          />
          <ul role="listbox" className="max-h-52 overflow-auto">
            {filtered.map((option) => (
              <li key={option.value}>
                <button type="button" role="option" aria-selected={option.value === value} onClick={() => choose(option.value)} className={`w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-slate-800 ${option.value === value ? "font-semibold text-cyan-300" : "text-slate-200"}`}>
                  {option.label}
                </button>
              </li>
            ))}
            {trimmed && !exact ? (
              <li>
                <button type="button" onClick={() => choose(trimmed)} className="w-full rounded-lg px-3 py-1.5 text-left text-sm font-semibold text-cyan-300 hover:bg-slate-800">
                  + Add {addLabel} “{trimmed}”
                </button>
              </li>
            ) : null}
            {!trimmed && filtered.length === 0 ? <li className="px-3 py-1.5 text-sm text-slate-400">Type to add a new {addLabel}.</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

const SWATCH = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const blankForm = { name: "", type: "Filament", unit: "g", color: "", costPerUnit: "20", stockLevel: "1", reorderThreshold: "0.2" };

type SortKey = "name" | "stock" | "status";

export function MaterialsPage({ materials, onChanged }: { materials: Material[]; onChanged: () => Promise<void> | void }) {
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [groupState, setGroupState] = useState<Record<string, boolean>>(loadGroupState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Values added via "+ Add New" stay selectable until the material is saved (then they come from inventory).
  const [extraTypes, setExtraTypes] = useState<string[]>([]);
  const [extraColours, setExtraColours] = useState<string[]>([]);
  const [extraUnits, setExtraUnits] = useState<string[]>([]);

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(groupState));
  }, [groupState]);

  const typeOptions = useMemo(() => {
    const options = getTypeOptions(materials);
    extraTypes.forEach((type) => !options.some((o) => o.toLowerCase() === type.toLowerCase()) && options.push(type));
    return options.map((type) => ({ value: type, label: type }));
  }, [materials, extraTypes]);
  const colourOptions = useMemo(() => {
    const options = getColourOptions(materials);
    extraColours.forEach((colour) => !options.some((o) => o.toLowerCase() === colour.toLowerCase()) && options.push(colour));
    return options.map((colour) => ({ value: colour, label: colour }));
  }, [materials, extraColours]);
  const unitOptions = useMemo(() => {
    const options = getUnitOptions(materials).map((unit) => ({ value: unit.value, label: unit.label }));
    extraUnits.forEach((unit) => !options.some((o) => o.value.toLowerCase() === unit.toLowerCase()) && options.push({ value: unit, label: unit }));
    return options;
  }, [materials, extraUnits]);

  const unit = resolveUnit(form.unit);

  const groups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const map = new Map<string, Material[]>();
    materials.forEach((material) => {
      const type = material.type?.trim() || "Other";
      if (typeFilter !== "all" && type !== typeFilter) return;
      if (needle && !`${material.name} ${material.color || ""} ${type}`.toLowerCase().includes(needle)) return;
      map.set(type, [...(map.get(type) || []), material]);
    });
    const compare = (a: Material, b: Material) => {
      if (sortKey === "stock") return a.stockLevel - b.stockLevel || a.name.localeCompare(b.name);
      if (sortKey === "status") return STOCK_STATUS_META[getStockStatus(a)].rank - STOCK_STATUS_META[getStockStatus(b)].rank || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name) || (a.color || "").localeCompare(b.color || "");
    };
    return Array.from(map.entries())
      .sort(([a], [b]) => compareTypes(a, b))
      .map(([type, items]) => [type, [...items].sort(compare)] as const);
  }, [materials, search, typeFilter, sortKey]);

  const allTypes = useMemo(() => Array.from(new Set(materials.map((m) => m.type?.trim() || "Other"))).sort(compareTypes), [materials]);
  const attentionCount = materials.filter((m) => getStockStatus(m) !== "healthy").length;
  const searching = search.trim().length > 0;

  const isOpen = (type: string, count: number) => searching || (groupState[type] ?? count <= COLLAPSE_THRESHOLD);
  const toggleGroup = (type: string, count: number) => setGroupState((current) => ({ ...current, [type]: !(current[type] ?? count <= COLLAPSE_THRESHOLD) }));

  const reset = () => {
    setForm(blankForm);
    setEditingId(null);
    setShowEditor(false);
    setError("");
  };

  const startEditing = (material: Material) => {
    const u = resolveUnit(material.unit);
    setEditingId(material.id);
    setShowEditor(true);
    setForm({
      name: material.name,
      type: material.type,
      unit: u.value,
      color: material.color || "",
      costPerUnit: String(Number(((material.costPerUnit || 0) * u.perEntryUnit).toFixed(4))),
      stockLevel: String(Number(((material.stockLevel || 0) / u.perEntryUnit).toFixed(4))),
      reorderThreshold: String(Number(((material.reorderThreshold || 0) / u.perEntryUnit).toFixed(4))),
    });
  };

  const changeType = (type: string) => {
    if (!typeOptions.some((o) => o.value === type)) setExtraTypes((current) => [...current, type]);
    // A brand-new material picks the category's usual unit; editing never changes the existing unit.
    const suggested = !editingId ? findCategory(type)?.defaultUnit : undefined;
    setForm((current) => ({ ...current, type, unit: suggested ?? current.unit }));
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      // Price, stock and reorder level are typed per entry unit (kg, l...) and stored per base unit (g, ml...).
      const payload = {
        name: form.name.trim(),
        type: form.type.trim() || "Other",
        unit: unit.baseUnit,
        color: form.color.trim(),
        costPerUnit: Number(form.costPerUnit || 0) / unit.perEntryUnit,
        stockLevel: Number(form.stockLevel || 0) * unit.perEntryUnit,
        reorderThreshold: Number(form.reorderThreshold || 0) * unit.perEntryUnit,
      };
      if (editingId) await api.updateMaterial(editingId, payload);
      else await api.createMaterial(payload);
      reset();
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save material");
    } finally {
      setSaving(false);
    }
  };

  const copy = async (material: Material) => {
    await api.createMaterial({
      name: `${material.name} Copy`,
      type: material.type,
      unit: material.unit,
      color: material.color || "",
      costPerUnit: material.costPerUnit,
      stockLevel: material.stockLevel,
      reorderThreshold: material.reorderThreshold,
    });
    await onChanged();
  };

  const field = "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2";

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Materials</h2>
          <p className="mt-2 text-sm text-slate-400">
            {materials.length} material{materials.length === 1 ? "" : "s"} across {allTypes.length} type{allTypes.length === 1 ? "" : "s"}
            {attentionCount ? ` • ${attentionCount} need attention` : ""}
          </p>
        </div>
        <button type="button" onClick={() => { reset(); setShowEditor(true); }} className="mf-btn">Add material</button>
      </div>

      {showEditor ? (
        <div className="mt-6 rounded-2xl border border-cyan-700/40 bg-slate-950 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">{editingId ? "Edit material" : "Add material"}</h3>
              <p className="mt-1 text-sm text-slate-400">Pick from the lists or type a new value to add it.</p>
            </div>
            <button type="button" onClick={reset} className="mf-btn mf-btn--outline mf-btn--sm">Close</button>
          </div>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Material name</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. PLA" className={field} required />
              </label>
              <Combobox label="Material type" value={form.type} options={typeOptions} onChange={changeType} addLabel="type" />
              <Combobox label="Colour" value={form.color} options={colourOptions} addLabel="colour" onChange={(colour) => {
                if (!colourOptions.some((o) => o.value === colour)) setExtraColours((current) => [...current, colour]);
                setForm({ ...form, color: colour });
              }} />
              <Combobox label="Usage unit" value={form.unit} options={unitOptions} addLabel="unit" onChange={(next) => {
                if (!unitOptions.some((o) => o.value === next)) setExtraUnits((current) => [...current, next]);
                setForm({ ...form, unit: next });
              }} />
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Purchase cost per {unit.entryUnit} (£)</span>
                <input type="number" min="0" step="any" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} className={field} />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Stock on hand ({unit.entryUnit})</span>
                <input type="number" min="0" step="any" value={form.stockLevel} onChange={(e) => setForm({ ...form, stockLevel: e.target.value })} className={field} />
              </label>
              <label className="block text-sm text-slate-300 md:col-span-2">
                <span className="mb-2 block">Reorder threshold ({unit.entryUnit})</span>
                <input type="number" min="0" step="any" value={form.reorderThreshold} onChange={(e) => setForm({ ...form, reorderThreshold: e.target.value })} className={field} />
                <span className="mt-1 block text-xs text-slate-400">Stored per {unit.baseUnit}; jobs consume this material in {unit.baseUnit}.</span>
              </label>
            </div>
            {error ? <p role="alert" className="text-sm" style={{ color: "var(--app-danger)" }}>{error}</p> : null}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={reset} className="mf-btn mf-btn--outline">Cancel</button>
              <button className="mf-btn" disabled={saving}>{saving ? "Saving…" : editingId ? "Save material" : "Add material"}</button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, colour or type" aria-label="Search materials" className={field} />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by material type" className={field}>
          <option value="all">All types</option>
          {allTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} aria-label="Sort materials" className={field}>
          <option value="name">Sort: Name</option>
          <option value="stock">Sort: Stock level (lowest first)</option>
          <option value="status">Sort: Status (most urgent first)</option>
        </select>
      </div>

      <div className="mt-6 space-y-4">
        {groups.length === 0 ? <p className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 text-center text-sm text-slate-400">No materials match your search.</p> : null}
        {groups.map(([type, items]) => {
          const open = isOpen(type, items.length);
          return (
            <div key={type} className="rounded-2xl border border-slate-800 bg-slate-950/70">
              <button type="button" aria-expanded={open} onClick={() => toggleGroup(type, items.length)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <span className="text-lg font-semibold text-white"><span aria-hidden="true" className="mr-2 text-slate-400">{open ? "▼" : "▶"}</span>{type} ({items.length})</span>
                {items.some((m) => getStockStatus(m) !== "healthy") ? <span className="text-xs text-slate-300">{items.filter((m) => getStockStatus(m) !== "healthy").length} need attention</span> : null}
              </button>
              {open ? (
                <div className="grid gap-3 px-4 pb-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((material) => {
                    const status = getStockStatus(material);
                    const meta = STOCK_STATUS_META[status];
                    const colour = material.color?.trim();
                    return (
                      <div key={material.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-white">{material.name}</p>
                            <span className="rounded-full border px-2 py-0.5 text-xs font-medium text-slate-200" style={statusStyle(status)}>{meta.icon} {meta.label}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border border-slate-700 px-2 py-0.5 font-semibold uppercase tracking-wide text-slate-200">{material.type || "Other"}</span>
                            {colour ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-2 py-0.5 uppercase tracking-wide text-slate-200">
                                {SWATCH.test(colour) ? <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border border-slate-500" style={{ backgroundColor: colour }} /> : null}
                                {colour}
                              </span>
                            ) : null}
                          </div>
                          <dl className="mt-3 space-y-1 text-sm text-slate-300">
                            <div className="flex gap-2"><dt className="text-slate-400">Stock:</dt><dd className="font-medium text-white">{formatStock(material)}</dd></div>
                            <div className="flex gap-2"><dt className="text-slate-400">Cost:</dt><dd className="font-medium text-white">{formatCost(material)}</dd></div>
                          </dl>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => startEditing(material)} className="mf-btn mf-btn--sm">Edit</button>
                          <button type="button" onClick={() => copy(material)} className="mf-btn mf-btn--outline mf-btn--sm">Copy</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

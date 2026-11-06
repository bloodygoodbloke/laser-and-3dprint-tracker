// Materials catalogue: types, units and stock status rules used by the Materials page.
//
// Backwards compatibility (see docs/CHANGELOG.md): nothing here changes what is stored.
// - `Material.unit` is the BASE unit that jobs consume. Costing multiplies a job's usageQuantity by
//   usageUnitCost (price per base unit) and never reads `unit`, so existing "g" materials behave exactly as before.
// - `Material.type` is a free-text string. Billing markups are looked up by that string (trimmed, case-insensitive),
//   so existing type names must never be rewritten. New types simply become new strings.
// - "Kilograms" and "Litres" are entry conveniences: prices and stock are typed per kg / per litre and stored per g / per ml.
//
// Future stock management (not implemented, recommendations only):
// - Add new categories (Plywood, MDF, Acrylic, Slate, Leather, Packaging...) by adding a MATERIAL_CATEGORIES entry.
//   They then get a default unit, a group in the list and a Billing markup row without any page redesign.
// - Optional inventory fields should be NULLABLE / defaulted columns so existing rows stay valid:
//   supplierId (FK to Supplier), sku, manufacturer, productUrl, barcode, shelfLocation, batchNumber (or lot).
//   Prisma/SQLite: `ALTER TABLE "Material" ADD COLUMN "sku" TEXT NOT NULL DEFAULT ''` is non-breaking for old records.
// - Anything that varies per delivery (batch/lot, purchase price, expiry) belongs in a separate StockLot table linked to
//   Material, so Material.costPerUnit keeps its current meaning for costing; MaterialPurchase already hints at this.
// - Category-specific attributes (sheet thickness, resin type, filament diameter) can go in an optional JSON `attributes`
//   column rather than one column per category.
// - Jobs keep a copy of usageUnitCost, so changing a material's price later never alters historical jobs or invoices.

import { formatCurrency } from "./format";
import type { Material } from "./types";

export interface MaterialCategory {
  name: string;
  /** Base unit suggested when this type is picked on a new material. */
  defaultUnit: string;
  /** Shown in the Add material type dropdown today. Future categories can be added with `suggested: false` until released. */
  suggested: boolean;
}

export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  { name: "Filament", defaultUnit: "g", suggested: true },
  { name: "Resin", defaultUnit: "ml", suggested: true },
  { name: "Laser Material", defaultUnit: "sheet", suggested: true },
  { name: "Consumable", defaultUnit: "unit", suggested: true },
  { name: "Hardware", defaultUnit: "unit", suggested: true },
  { name: "Other", defaultUnit: "unit", suggested: true },
  // Planned: appear automatically once `suggested` is switched on.
  { name: "Plywood", defaultUnit: "sheet", suggested: false },
  { name: "MDF", defaultUnit: "sheet", suggested: false },
  { name: "Acrylic", defaultUnit: "sheet", suggested: false },
  { name: "Slate", defaultUnit: "unit", suggested: false },
  { name: "Leather", defaultUnit: "sheet", suggested: false },
  { name: "Packaging", defaultUnit: "unit", suggested: false },
];

const normalise = (value: string) => value.trim().toLowerCase();

export const findCategory = (type: string) => MATERIAL_CATEGORIES.find((category) => normalise(category.name) === normalise(type));

/** Types for the dropdown: suggested defaults plus anything already in inventory (existing names are kept verbatim). */
export const getTypeOptions = (materials: Material[]): string[] => {
  const options = new Map<string, string>();
  MATERIAL_CATEGORIES.filter((category) => category.suggested).forEach((category) => options.set(normalise(category.name), category.name));
  materials.forEach((material) => {
    const type = (material.type || "").trim();
    if (type && !options.has(normalise(type))) options.set(normalise(type), type);
  });
  return Array.from(options.values());
};

/** Group order: known categories first (in catalogue order), then custom types alphabetically. */
export const compareTypes = (left: string, right: string) => {
  const leftIndex = MATERIAL_CATEGORIES.findIndex((category) => normalise(category.name) === normalise(left));
  const rightIndex = MATERIAL_CATEGORIES.findIndex((category) => normalise(category.name) === normalise(right));
  if (leftIndex !== -1 && rightIndex !== -1) return leftIndex - rightIndex;
  if (leftIndex !== -1) return -1;
  if (rightIndex !== -1) return 1;
  return left.localeCompare(right);
};

export const getColourOptions = (materials: Material[]): string[] => {
  const options = new Map<string, string>();
  materials.forEach((material) => {
    const colour = (material.color || "").trim();
    if (colour && !options.has(normalise(colour))) options.set(normalise(colour), colour);
  });
  return Array.from(options.values()).sort((left, right) => left.localeCompare(right));
};

export interface UnitOption {
  value: string;
  label: string;
  /** Unit stored on the material and used by jobs. */
  baseUnit: string;
  /** How many base units make one entry unit (price, stock and reorder level are typed per entry unit). */
  perEntryUnit: number;
  entryUnit: string;
}

export const UNIT_OPTIONS: UnitOption[] = [
  { value: "g", label: "Grams (g)", baseUnit: "g", perEntryUnit: 1000, entryUnit: "kg" },
  { value: "kg", label: "Kilograms (kg)", baseUnit: "g", perEntryUnit: 1000, entryUnit: "kg" },
  { value: "ml", label: "Millilitres (ml)", baseUnit: "ml", perEntryUnit: 1000, entryUnit: "l" },
  { value: "l", label: "Litres (l)", baseUnit: "ml", perEntryUnit: 1000, entryUnit: "l" },
  { value: "sheet", label: "Sheets", baseUnit: "sheet", perEntryUnit: 1, entryUnit: "sheet" },
  { value: "unit", label: "Units", baseUnit: "unit", perEntryUnit: 1, entryUnit: "unit" },
  { value: "m", label: "Metres", baseUnit: "m", perEntryUnit: 1, entryUnit: "m" },
];

const UNIT_ALIASES: Record<string, string> = { grams: "g", gram: "g", kilograms: "kg", kilogram: "kg", litres: "l", litre: "l", millilitres: "ml", sheets: "sheet", units: "unit", metres: "m", metre: "m" };

/** Resolve a stored unit string (or a typed custom unit) to its definition. Unknown strings become a custom 1:1 unit. */
export const resolveUnit = (unit: string | undefined | null): UnitOption => {
  const raw = (unit || "").trim();
  if (!raw) return UNIT_OPTIONS[0];
  const key = UNIT_ALIASES[normalise(raw)] || normalise(raw);
  return UNIT_OPTIONS.find((option) => option.value === key) ?? { value: raw, label: raw, baseUnit: raw, perEntryUnit: 1, entryUnit: raw };
};

/** Unit shown next to job quantities; weight aliases collapse to "g" so existing jobs read exactly as before. */
export const getBaseUnit = (unit: string | undefined | null) => resolveUnit(unit).baseUnit;

export const getUnitOptions = (materials: Material[]): UnitOption[] => {
  const options = [...UNIT_OPTIONS];
  materials.forEach((material) => {
    const resolved = resolveUnit(material.unit);
    if (!options.some((option) => option.value === resolved.value)) options.push(resolved);
  });
  return options;
};

export type StockStatus = "healthy" | "reorder" | "low" | "out";

export const STOCK_STATUS_META: Record<StockStatus, { icon: string; label: string; rank: number }> = {
  out: { icon: "⚫", label: "Out of Stock", rank: 0 },
  low: { icon: "🔴", label: "Low Stock", rank: 1 },
  reorder: { icon: "🟠", label: "Reorder Soon", rank: 2 },
  healthy: { icon: "🟢", label: "Healthy", rank: 3 },
};

/** Low stock keeps the existing rule (stock <= reorder threshold); "Reorder Soon" is a 50% warning band above it. */
export const REORDER_SOON_FACTOR = 1.5;

export const getStockStatus = (material: Pick<Material, "stockLevel" | "reorderThreshold">): StockStatus => {
  const stock = Number(material.stockLevel || 0);
  const threshold = Number(material.reorderThreshold || 0);
  if (stock <= 0) return "out";
  if (threshold > 0 && stock <= threshold) return "low";
  if (threshold > 0 && stock <= threshold * REORDER_SOON_FACTOR) return "reorder";
  return "healthy";
};

const trimNumber = (value: number, digits: number) => String(Number(value.toFixed(digits)));

/** "1 kg", "250 g", "2.5 l", "12 sheet" */
export const formatStock = (material: Pick<Material, "stockLevel" | "unit">): string => {
  const unit = resolveUnit(material.unit);
  const stock = Number(material.stockLevel || 0);
  if (unit.perEntryUnit === 1) return `${trimNumber(stock, 2)} ${unit.baseUnit}`;
  if (Math.abs(stock) >= unit.perEntryUnit) return `${trimNumber(stock / unit.perEntryUnit, 2)} ${unit.entryUnit}`;
  return `${trimNumber(stock, 1)} ${unit.baseUnit}`;
};

/** "£25.00 / kg" */
export const formatCost = (material: Pick<Material, "costPerUnit" | "unit">): string => {
  const unit = resolveUnit(material.unit);
  return `${formatCurrency(Number(material.costPerUnit || 0) * unit.perEntryUnit)} / ${unit.entryUnit}`;
}

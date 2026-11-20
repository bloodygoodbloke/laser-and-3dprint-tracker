import assert from "node:assert/strict";
import test from "node:test";
import { blankBillingSettings } from "../frontend/src/billingSettings.ts";
import { computeInvoiceChargeBreakdown } from "../frontend/src/invoicing.ts";
import { formatJobMaterialUsage } from "../frontend/src/materialsCatalog.ts";

const makeJob = (overrides = {}) => ({
  machineType: "Printer",
  machineRunTimeMinutes: 0,
  materials: [],
  cost: { materialCost: 10.01, electricityCost: 0, labourCost: 0, overheadCost: 0 },
  ...overrides,
});

test("quote rounding is added to the customer total and production costs", () => {
  const settings = { ...blankBillingSettings(), materialMarkupPercent: 0, quoteRoundingIncrement: 5 };
  const breakdown = computeInvoiceChargeBreakdown(makeJob(), settings);

  assert.equal(breakdown.quoteRoundingAmount, 4.99);
  assert.equal(breakdown.customerCharge, 15);
  assert.equal(breakdown.productionCharge, 4.99);
});

test("quote rounding follows the minimum charge and does not change exact increments", () => {
  const settings = { ...blankBillingSettings(), materialMarkupPercent: 0, minimumCharge: 20, quoteRoundingIncrement: 5 };
  const breakdown = computeInvoiceChargeBreakdown(makeJob(), settings);

  assert.equal(breakdown.minimumChargeApplied, 9.99);
  assert.equal(breakdown.quoteRoundingAmount, 0);
  assert.equal(breakdown.customerCharge, 20);
});

test("equipment depreciation markup is included in invoice production costs", () => {
  const settings = {
    ...blankBillingSettings(),
    materialMarkupPercent: 0,
    depreciationMarkupPercent: 50,
    machineElectricitySettings: { Printer: { name: "Printer", wattage: 0, depreciationCost: 100, replacementRunHours: 100 } },
  };
  const job = makeJob({
    machineRunTimeMinutes: 60,
    cost: { materialCost: 0, electricityCost: 1, labourCost: 0, overheadCost: 0 },
  });
  const breakdown = computeInvoiceChargeBreakdown(job, settings);

  assert.equal(breakdown.depreciationCharge, 1.5);
  assert.equal(breakdown.productionCharge, 1.5);
});

test("material usage summaries keep each material's unit separate", () => {
  assert.equal(formatJobMaterialUsage([
    { usageQuantity: 125, usageUnit: "g", material: { unit: "g" } },
    { usageQuantity: 2, usageUnit: "sheet" },
    { usageQuantity: 25, usageUnit: "g" },
  ]), "150 g, 2 sheet");
});

test("material usage summaries prefer the material usage unit over a legacy gram value", () => {
  assert.equal(formatJobMaterialUsage([
    { usageQuantity: 2, usageUnit: "g", material: { unit: "sheet" } },
  ]), "2 sheet");
});

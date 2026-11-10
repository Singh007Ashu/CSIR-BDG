export const ENGAGEMENT_TYPES = {
  TECHNOLOGY_TRANSFER: "Technology Transfer",
  CONSULTANCY_CNP: "Consultancy Project (CNP)",
  TECHNICAL_SERVICE_TSP: "Technical Service Project (TSP)",
};

export const PRICING_RULES = {
  CONSULTANCY_CNP: { directRate: 25, laboratoryShareRate: 25, projectFeeRate: 50 },
  TECHNICAL_SERVICE_TSP: { directRate: 40, laboratoryShareRate: 35, projectFeeRate: 25 },
};

export const MONEY_FIELDS = [
  "annualClientBenefit", "similarMarketPrice", "feeProposed", "assumedProjectCost",
  "temporaryStaffCost", "capitalCost", "consumablesCost", "servicesUtilitiesCost",
  "equipmentUsageCost", "externalPaymentsCost", "taDaCost", "contingenciesCost",
  "otherOutOfPocketCost", "overheadRate", "gstRate",
];

export const INTEGER_FIELDS = [
  "trl", "possibleTransfers", "demonstrationDurationValue",
  "documentSubmissionDurationValue", "trainingDurationValue",
];

export function parseOptionalNumber(value, label, { integer = false, min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === "" || value === null || value === undefined) return null;
  const source = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(source)) throw new Error(`${label} must contain numbers only.`);
  const number = Number(source);
  if (!Number.isFinite(number) || number < min || number > max || (integer && !Number.isInteger(number))) {
    throw new Error(`${label} must be ${integer ? "a whole number" : "a number"} between ${min} and ${max}.`);
  }
  return number;
}

export function normalizeManDays(rows = []) {
  if (!Array.isArray(rows) || rows.length > 25) throw new Error("Up to 25 man-day rows are allowed.");
  return rows.map((row, index) => {
    const personnelGroup = String(row.personnelGroup || "").trim().slice(0, 200);
    if (!personnelGroup) throw new Error(`Personnel group is required in man-day row ${index + 1}.`);
    const numberOfDays = parseOptionalNumber(row.numberOfDays, `Number of days in row ${index + 1}`, { integer: true, min: 0, max: 100000 });
    const numberOfPeople = parseOptionalNumber(row.numberOfPeople, `Number of people in row ${index + 1}`, { integer: true, min: 0, max: 100000 });
    const ratePerDay = parseOptionalNumber(row.ratePerDay, `Rate per day in row ${index + 1}`, { min: 0, max: 1000000000 });
    if (numberOfDays === null || numberOfPeople === null || ratePerDay === null) throw new Error(`All numeric values are required in man-day row ${index + 1}.`);
    return { personnelGroup, numberOfDays, numberOfPeople, ratePerDay, amount: numberOfDays * numberOfPeople * ratePerDay, displayOrder: index };
  });
}

const value = (record, key) => Number(record[key] || 0);

export function calculateCommercialPricing(type, record, manDays = []) {
  if (!PRICING_RULES[type]) return {
    directExpenditureTotal: null, laboratoryShareRate: null, laboratoryShareAmount: null,
    projectFeeRate: null, projectFeeAmount: null, totalProjectCostExcludingTax: null,
    gstAmount: null, totalCharges: value(record, "feeProposed") || null,
  };
  const rules = PRICING_RULES[type];
  const manDayTotal = manDays.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const overheadAmount = type === "TECHNICAL_SERVICE_TSP"
    ? (value(record, "consumablesCost") + value(record, "servicesUtilitiesCost") + value(record, "otherOutOfPocketCost")) * value(record, "overheadRate") / 100
    : 0;
  const directExpenditureTotal = manDayTotal + value(record, "temporaryStaffCost") + value(record, "capitalCost") +
    value(record, "consumablesCost") + value(record, "servicesUtilitiesCost") + value(record, "equipmentUsageCost") +
    value(record, "externalPaymentsCost") + value(record, "taDaCost") + value(record, "contingenciesCost") +
    value(record, "otherOutOfPocketCost") + overheadAmount;
  const assumedProjectCost = value(record, "assumedProjectCost");
  const laboratoryShareAmount = assumedProjectCost * rules.laboratoryShareRate / 100;
  const projectFeeAmount = assumedProjectCost * rules.projectFeeRate / 100;
  const totalProjectCostExcludingTax = directExpenditureTotal + laboratoryShareAmount + projectFeeAmount;
  const gstAmount = totalProjectCostExcludingTax * value(record, "gstRate") / 100;
  return {
    manDayTotal, overheadAmount, directExpenditureTarget: assumedProjectCost * rules.directRate / 100,
    directExpenditureTotal, laboratoryShareRate: rules.laboratoryShareRate, laboratoryShareAmount,
    projectFeeRate: rules.projectFeeRate, projectFeeAmount, totalProjectCostExcludingTax,
    gstAmount, totalCharges: totalProjectCostExcludingTax + gstAmount,
  };
}

"use client";

import { useEffect, useMemo, useState } from "react";
import NumericInput from "./NumericInput";
import { ENGAGEMENT_TYPES, PRICING_RULES, calculateCommercialPricing } from "../../lib/commercialPricing";

const starterRows = [
  { personnelGroup: "Senior Principal Scientist and above", numberOfDays: "", numberOfPeople: "", ratePerDay: "10500" },
  { personnelGroup: "Trainee Scientist up to Principal Scientist", numberOfDays: "", numberOfPeople: "", ratePerDay: "6000" },
  { personnelGroup: "S&T Assistants / Research Associates / Project Scientists", numberOfDays: "", numberOfPeople: "", ratePerDay: "4500" },
];

export const emptyCommercialEngagement = {
  engagementType: "TECHNOLOGY_TRANSFER", technologyId: "", proposerName: "", designationDepartment: "", teamMembers: "",
  knowledgeProductType: "Technology", title: "", clientName: "", clientAddress: "", serviceDetails: "", phasesWorkPackages: "",
  timeline: "", deliverables: "", clientBenefits: "", inventors: "", patentApplied: "", patentDetails: "",
  preLicensingEvaluated: "", preLicensingDetails: "", trl: "", biologicalResources: "", biologicalDetails: "",
  possibleTransfers: "", annualClientBenefit: "", similarMarketPrice: "", territory: "INDIAN", clientNature: "MSME",
  clientNatureDetails: "", licenseNature: "NON_EXCLUSIVE", feeProposed: "", licensingPeriodYears: "",
  demonstrationDurationValue: "", demonstrationDurationUnit: "MONTHS", documentSubmissionDurationValue: "",
  documentSubmissionDurationUnit: "MONTHS", trainingDurationValue: "", trainingDurationUnit: "WEEKS", otherInformation: "",
  assumedProjectCost: "", temporaryStaffCost: "", capitalCost: "", consumablesCost: "", servicesUtilitiesCost: "",
  equipmentUsageCost: "", externalPaymentsCost: "", taDaCost: "", contingenciesCost: "", otherOutOfPocketCost: "",
  overheadRate: "0", gstRate: "18", manDays: starterRows,
};

const money = (number) => `₹${Number(number || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const boolValue = (value) => value === true ? "true" : value === false ? "false" : "";

function Field({ label, required, children, wide = false, hint }) {
  return <div className={wide ? "span-2" : ""}><label>{label}{required && <b aria-hidden="true"> *</b>}</label>{children}{hint && <small className="field-hint">{hint}</small>}</div>;
}

function YesNo({ value, onChange }) {
  return <select value={boolValue(value)} onChange={(event) => onChange(event.target.value === "" ? "" : event.target.value === "true")}><option value="">Select</option><option value="true">Yes</option><option value="false">No</option></select>;
}

export default function CommercialEngagementForm({ initial = emptyCommercialEngagement, technologies = [], lockedType = false, onSave, saving = false }) {
  const [form, setForm] = useState({ ...emptyCommercialEngagement, ...initial, manDays: initial.manDays?.length ? initial.manDays : starterRows });
  useEffect(() => setForm({ ...emptyCommercialEngagement, ...initial, manDays: initial.manDays?.length ? initial.manDays : starterRows }), [initial]);
  const type = form.engagementType;
  const isTransfer = type === "TECHNOLOGY_TRANSFER";
  const pricedRows = useMemo(() => (form.manDays || []).map((row) => ({ ...row, amount: Number(row.numberOfDays || 0) * Number(row.numberOfPeople || 0) * Number(row.ratePerDay || 0) })), [form.manDays]);
  const pricing = useMemo(() => calculateCommercialPricing(type, form, pricedRows), [type, form, pricedRows]);
  const rules = PRICING_RULES[type];
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const numeric = (key, label, options = {}) => <NumericInput aria-label={label} value={form[key]} onChange={(value) => set(key, value)} {...options} />;
  const updateManDay = (index, key, value) => setForm((current) => ({ ...current, manDays: current.manDays.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row) }));

  return <form className="commercial-form" onSubmit={(event) => { event.preventDefault(); onSave(form, false); }}>
    <section className="editorial-card form-section">
      <div className="section-number">01</div><div className="section-copy"><span className="eyebrow">Controlled record type</span><h2>Proposal context</h2><p>Each pricing case links to one existing master technology. It does not create another technology, co-development project, or MOU.</p></div>
      <div className="form-grid section-fields">
        <Field label="Engagement type" required><select disabled={lockedType} value={type} onChange={(event) => set("engagementType", event.target.value)}>{Object.entries(ENGAGEMENT_TYPES).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></Field>
        <Field label="Linked technology" required><select disabled={Boolean(initial.id)} value={form.technologyId} onChange={(event) => set("technologyId", event.target.value)}><option value="">Select a master technology</option>{technologies.map((technology) => <option value={technology.id} key={technology.id}>CSIR-{technology.lab?.code || "LAB"} — {technology.name}</option>)}</select></Field>
        <Field label="Proposer name" required><input required value={form.proposerName} onChange={(event) => set("proposerName", event.target.value)} /></Field>
        <Field label="Designation and department" required><input required value={form.designationDepartment} onChange={(event) => set("designationDepartment", event.target.value)} /></Field>
        {!isTransfer && <Field label="Team members and roles" wide><textarea value={form.teamMembers || ""} onChange={(event) => set("teamMembers", event.target.value)} /></Field>}
        <Field label={isTransfer ? "Knowledge product title" : "Consultancy / technical service title"} required wide><input required value={form.title} onChange={(event) => set("title", event.target.value)} /></Field>
        {!isTransfer && <Field label="Knowledge product / service type"><select value={form.knowledgeProductType || ""} onChange={(event) => set("knowledgeProductType", event.target.value)}>{["Technology", "Process", "Software", "Design", "Consultancy Service", "Testing", "Training", "Other"].map((item) => <option key={item}>{item}</option>)}</select></Field>}
      </div>
    </section>

    {isTransfer ? <>
      <section className="editorial-card form-section"><div className="section-number">02</div><div className="section-copy"><span className="eyebrow">Template A & B</span><h2>IP, readiness and market value</h2></div><div className="form-grid section-fields">
        <Field label="Inventors" wide><textarea value={form.inventors || ""} onChange={(event) => set("inventors", event.target.value)} /></Field>
        <Field label="Patent applied?"><YesNo value={form.patentApplied} onChange={(value) => set("patentApplied", value)} /></Field><Field label="Patent application details"><input value={form.patentDetails || ""} onChange={(event) => set("patentDetails", event.target.value)} /></Field>
        <Field label="Pre-licensing evaluation completed?"><YesNo value={form.preLicensingEvaluated} onChange={(value) => set("preLicensingEvaluated", value)} /></Field><Field label="Validated TRL (0–9)">{numeric("trl", "TRL", { integer: true, max: 9 })}</Field>
        <Field label="Pre-licensing evaluation details" wide><textarea value={form.preLicensingDetails || ""} onChange={(event) => set("preLicensingDetails", event.target.value)} /></Field>
        <Field label="Uses biological resources?"><YesNo value={form.biologicalResources} onChange={(value) => set("biologicalResources", value)} /></Field><Field label="Biological-resource details"><input value={form.biologicalDetails || ""} onChange={(event) => set("biologicalDetails", event.target.value)} /></Field>
        <Field label="Possible licences / transfers">{numeric("possibleTransfers", "Possible transfers", { integer: true })}</Field><Field label="Estimated client benefit per year (₹)">{numeric("annualClientBenefit", "Annual client benefit")}</Field>
        <Field label="Comparable market price (₹)">{numeric("similarMarketPrice", "Similar market price")}</Field>
      </div></section>
      <section className="editorial-card form-section"><div className="section-number">03</div><div className="section-copy"><span className="eyebrow">Template C</span><h2>Client, licence and proposed fee</h2></div><div className="form-grid section-fields">
        <Field label="Client name" required><input value={form.clientName || ""} onChange={(event) => set("clientName", event.target.value)} /></Field><Field label="Client address"><input value={form.clientAddress || ""} onChange={(event) => set("clientAddress", event.target.value)} /></Field>
        <Field label="Territory"><select value={form.territory || ""} onChange={(event) => set("territory", event.target.value)}><option value="INDIAN">Indian</option><option value="OVERSEAS">Overseas</option></select></Field><Field label="Nature of client"><select value={form.clientNature || ""} onChange={(event) => set("clientNature", event.target.value)}>{["STARTUP", "SMALL_SCALE", "MSME", "ENTERPRISE", "OTHER"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></Field>
        {form.clientNature === "OTHER" && <Field label="Other client type"><input value={form.clientNatureDetails || ""} onChange={(event) => set("clientNatureDetails", event.target.value)} /></Field>}
        <Field label="Nature of licence"><select value={form.licenseNature || ""} onChange={(event) => set("licenseNature", event.target.value)}><option value="EXCLUSIVE">Exclusive</option><option value="NON_EXCLUSIVE">Non-exclusive</option></select></Field>
        <Field label="Proposed fee (₹)" required>{numeric("feeProposed", "Proposed fee")}</Field><Field label="Licensing period (years)">{numeric("licensingPeriodYears", "Licensing period")}</Field>
        {[["demonstration", "Demonstration duration"], ["documentSubmission", "KP document submission duration"], ["training", "Training duration"]].map(([prefix, label]) => <div className="duration-field" key={prefix}><label>{label}</label><div><NumericInput integer value={form[`${prefix}DurationValue`]} onChange={(value) => set(`${prefix}DurationValue`, value)} /><select value={form[`${prefix}DurationUnit`]} onChange={(event) => set(`${prefix}DurationUnit`, event.target.value)}><option value="WEEKS">Weeks</option><option value="MONTHS">Months</option></select></div></div>)}
        <Field label="Other information" wide><textarea value={form.otherInformation || ""} onChange={(event) => set("otherInformation", event.target.value)} /></Field>
      </div></section>
    </> : <>
      <section className="editorial-card form-section"><div className="section-number">02</div><div className="section-copy"><span className="eyebrow">Consultancy scope</span><h2>Service, plan and client benefit</h2></div><div className="form-grid section-fields">
        <Field label="Client name" required><input value={form.clientName || ""} onChange={(event) => set("clientName", event.target.value)} /></Field><Field label="Client address"><input value={form.clientAddress || ""} onChange={(event) => set("clientAddress", event.target.value)} /></Field>
        <Field label="Service details, objectives and scope" required wide><textarea value={form.serviceDetails || ""} onChange={(event) => set("serviceDetails", event.target.value)} /></Field>
        <Field label="Phases and work packages" wide><textarea value={form.phasesWorkPackages || ""} onChange={(event) => set("phasesWorkPackages", event.target.value)} /></Field>
        <Field label="Timeline"><input value={form.timeline || ""} onChange={(event) => set("timeline", event.target.value)} /></Field><Field label="Deliverables"><textarea value={form.deliverables || ""} onChange={(event) => set("deliverables", event.target.value)} /></Field>
        <Field label="Benefits envisaged by the client" wide><textarea value={form.clientBenefits || ""} onChange={(event) => set("clientBenefits", event.target.value)} /></Field>
      </div></section>
      <section className="editorial-card form-section"><div className="section-number">03</div><div className="section-copy"><span className="eyebrow">Cost estimate</span><h2>Man-days and direct expenditure</h2><p>Only numeric characters are accepted in quantity, rate and amount fields. Amounts are calculated automatically.</p></div><div className="section-fields span-full">
        <div className="table-wrap pricing-table"><table><thead><tr><th>Personnel group</th><th>Days</th><th>People</th><th>Rate/day</th><th>Amount</th><th></th></tr></thead><tbody>{form.manDays.map((row, index) => <tr key={index}><td><input value={row.personnelGroup} onChange={(event) => updateManDay(index, "personnelGroup", event.target.value)} /></td><td><NumericInput integer value={row.numberOfDays} onChange={(value) => updateManDay(index, "numberOfDays", value)} /></td><td><NumericInput integer value={row.numberOfPeople} onChange={(value) => updateManDay(index, "numberOfPeople", value)} /></td><td><NumericInput value={row.ratePerDay} onChange={(value) => updateManDay(index, "ratePerDay", value)} /></td><td><strong>{money(pricedRows[index]?.amount)}</strong></td><td><button type="button" className="icon-button" aria-label="Remove row" onClick={() => set("manDays", form.manDays.filter((_, rowIndex) => rowIndex !== index))}>×</button></td></tr>)}</tbody><tfoot><tr><td colSpan="4">Total man-day cost</td><td>{money(pricing.manDayTotal)}</td><td></td></tr></tfoot></table></div>
        <button type="button" className="text-action" onClick={() => set("manDays", [...form.manDays, { personnelGroup: "", numberOfDays: "", numberOfPeople: "", ratePerDay: "" }])}>+ Add personnel row</button>
        <div className="form-grid cost-grid">
          <Field label="Assumed project cost (₹)" required>{numeric("assumedProjectCost", "Assumed project cost")}</Field><Field label="Temporary project staff (₹)">{numeric("temporaryStaffCost", "Temporary staff cost")}</Field>
          <Field label="Capital cost (₹)">{numeric("capitalCost", "Capital cost")}</Field><Field label="Consumables (₹)">{numeric("consumablesCost", "Consumables cost")}</Field>
          <Field label="Services and utilities (₹)">{numeric("servicesUtilitiesCost", "Services and utilities cost")}</Field><Field label="Equipment usage (₹)">{numeric("equipmentUsageCost", "Equipment usage cost")}</Field>
          <Field label="External payments (₹)">{numeric("externalPaymentsCost", "External payments cost")}</Field><Field label="TA and DA (₹)">{numeric("taDaCost", "TA and DA")}</Field>
          <Field label="Contingencies (₹)">{numeric("contingenciesCost", "Contingencies cost")}</Field><Field label="Other out-of-pocket cost (₹)">{numeric("otherOutOfPocketCost", "Other out-of-pocket cost")}</Field>
          {type === "TECHNICAL_SERVICE_TSP" && <Field label="Overhead rate (%)" hint="Applied to consumables + services/utilities + other out-of-pocket cost.">{numeric("overheadRate", "Overhead rate", { max: 100 })}</Field>}
          <Field label="GST rate (%)">{numeric("gstRate", "GST rate", { max: 100 })}</Field>
        </div>
      </div></section>
      <section className="pricing-summary"><div><span>Direct expenditure</span><strong>{money(pricing.directExpenditureTotal)}</strong><small>Template target {rules?.directRate}%: {money(pricing.directExpenditureTarget)}</small></div><div><span>Laboratory share ({rules?.laboratoryShareRate}%)</span><strong>{money(pricing.laboratoryShareAmount)}</strong></div><div><span>Project fee ({rules?.projectFeeRate}%)</span><strong>{money(pricing.projectFeeAmount)}</strong></div><div><span>Project cost before tax</span><strong>{money(pricing.totalProjectCostExcludingTax)}</strong></div><div className="accent"><span>GST + final charges</span><strong>{money(pricing.totalCharges)}</strong><small>GST {money(pricing.gstAmount)}</small></div></section>
    </>}

    <div className="form-submit-bar"><div><strong>{initial.referenceNo || "New commercial pricing record"}</strong><span>{initial.status ? `Current status: ${initial.status}` : "Save a draft or submit to Head BDG for decision."}</span></div><div className="row-actions"><button type="submit" className="btn secondary" disabled={saving}>Save Draft</button><button type="button" className="btn" disabled={saving} onClick={() => onSave(form, true)}>Submit to Head BDG</button></div></div>
  </form>;
}

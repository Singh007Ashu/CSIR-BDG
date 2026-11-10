const agreementTypes = ["Technology Transfer", "Licensing", "Royalty Agreement", "Sponsored Research", "Consultancy", "Pilot Deployment", "Co-development", "Testing/Validation", "Training/Capacity Building", "Government/PSU Deployment"];
const statusOptions = ["Open", "In Progress", "Closed", "Deferred", "Disputed", "Cancelled", "Under Verification", "Royalty Awaited", "At Risk"];
const riskOptions = ["Low", "Medium", "High", "Critical"];
const f = (key, label, type = "text", mandatory = false, guidance = "Enter the evidence-backed value.", options, calculated = false) => ({ key, label, type, mandatory, guidance, options, calculated });

export const SOP_INSTRUCTOR_DEFINITIONS = [
  {
    code: "SOP-01", annexure: "Annexure I", name: "Master Technology Commercialisation Register",
    whatFor: "Create the single source of truth before any ECF, value or impact workflow starts.",
    whenUse: "At technology onboarding and whenever ownership, maturity, IP or commercialisation status changes.",
    who: { responsible: "Lab BD", supporting: "PI, TMD and IPU", bdg: "Monitor completeness and accept the central register entry." },
    prerequisites: ["Approved technology title", "PI or technical owner identified", "Current TRL/CRL and IP position"],
    steps: ["Select the laboratory technology.", "Verify identity, owner and theme.", "Enter maturity, IP and commercialisation information.", "Link the source dossier.", "Save draft, validate and submit."],
    fields: [f("serialNumber", "S.No.", "number"), f("lab", "Lab", "text", true, "Prefilled from the selected laboratory."), f("technology", "Technology", "text", true, "Prefilled from the selected master technology."), f("piTechnicalOwner", "PI / Technical Owner", "text", true), f("sectorTheme", "Sector / Theme", "text", true), f("technologyType", "Technology Type", "select", true, "Select the approved type.", ["IP-backed", "Non-IP know-how", "Process", "Product/Device", "Software/Digital", "Material/Chemical", "Service-linked", "Platform", "Social/Environmental"]), f("ipStatus", "IP Status", "select", true, "Use the latest validated position.", ["Patent granted", "Patent filed", "Patent not filed", "Know-how only", "Copyright/design", "Bundled IP"]), f("trl", "TRL", "number", true, "Validated level from 1 to 9."), f("crl", "CRL", "number", true, "Validated level from 1 to 9."), f("commercialisationStage", "Commercialisation Stage", "select", true, "Current stage only.", ["Lead identified", "Under discussion", "NDA/MoU stage", "Agreement executed", "Payment due", "Payment realised", "Under deployment", "Royalty-bearing", "Closed/completed", "Stalled/dropped"]), f("partnerClient", "Partner / Client"), f("responsibleBdOfficer", "Responsible BD Officer", "text", true), f("lastUpdated", "Last Updated", "date", true), f("remarks", "Remarks", "textarea")],
    doNotEnter: ["Unverified TRL/CRL estimates", "Duplicate aliases", "Projected receipts or impact claims"],
    evidence: ["Technology profile/dossier", "PI ownership confirmation", "TRL/CRL assessment", "IP status record"],
    systemChecks: ["TRL/CRL must be 1 to 9", "Lab and technology come from master data", "Required identity fields cannot be blank"],
    submission: "Lab BD certifies the current master record and submits it for governed use.",
    bdgAction: "Monitor completeness, query inconsistencies and include the record in the central register; BDG does not create laboratory source data.",
    completion: "A submitted, evidence-linked master register entry exists.", next: "SOP-02"
  },
  {
    code: "SOP-02", annexure: "Annexure II", name: "Recording of External Cash Flow Commitments",
    whatFor: "Capture every expected ECF created by an agreement, proposal, sanction, licence, LoI, MoU or work order.",
    whenUse: "Within seven working days of the commitment-creating document.",
    who: { responsible: "Lab BD", supporting: "PI for technical scope and milestone linkage", bdg: "Monitor, analyse and flag missing or inconsistent data; CPD may use it for planning." },
    prerequisites: ["SOP-01 record exists", "Source document is available", "Payment schedule and due dates are known"],
    steps: ["Select the registered technology.", "Record partner and source document.", "Enter committed and due amounts.", "Link milestone and IP applicability.", "Attach evidence and submit within seven working days."],
    fields: [f("serialNumber", "S.No.", "number"), f("lab", "Lab", "text", true, "Prefilled from the laboratory."), f("technology", "Technology", "text", true, "Prefilled from the master register."), f("partnerClient", "Partner / Client", "text", true), f("agreementType", "Agreement Type", "select", true, "Select the source instrument.", agreementTypes), f("agreementRef", "Agreement Ref.", "text", true), f("agreementDate", "Agreement Date", "date", true), f("totalCommittedAmount", "Total Committed Amount (Rs.)", "number", true), f("amountDueTillDate", "Amount Due Till Date (Rs.)", "number", true), f("dueDate", "Due Date", "date", true), f("paymentMilestone", "Payment Milestone", "text", true), f("ipLinked", "IP Linked", "select", true, "Whether linked to IP/licensing.", ["Yes", "No"]), f("responsibleOfficer", "Responsible Officer", "text", true), f("riskLevel", "Risk Level", "select", true, "Current evidence-based risk.", riskOptions), f("status", "Status", "select", true, "Current commitment status.", statusOptions), f("remarks", "Remarks", "textarea")],
    doNotEnter: ["Unsigned discussions as firm commitments", "Amounts without source reference", "Actual receipts in commitment fields"],
    evidence: ["Signed agreement/MoU/licence/LoI", "Proposal/sanction/work order", "Payment milestone schedule"],
    systemChecks: ["Amounts cannot be negative", "Due cannot exceed commitment without remarks", "Reference and due date are mandatory"],
    submission: "Lab BD submits and remains accountable for laboratory-source accuracy.",
    bdgAction: "Monitor timeliness, analyse exposure, flag anomalies and raise queries; BDG does not verify accounting or certify payment.",
    completion: "Commitment is linked to a master technology, evidence and due-date schedule.", next: "SOP-03"
  },
  {
    code: "SOP-03", annexure: "Annexure III", name: "Committed vs Actual Reconciliation",
    whatFor: "Map laboratory-reported receipts to commitments and calculate outstanding balance and delay.",
    whenUse: "Monthly and whenever a receipt, partial receipt or delayed receipt is reported.",
    who: { responsible: "Lab BD", supporting: "PI for milestone evidence", bdg: "Monitor and analyse reconciliation, flag exceptions and raise queries." },
    prerequisites: ["SOP-02 commitment exists", "Lab has sourced receipt information internally", "Receipt reference/date are available"],
    steps: ["Reuse SOP-02 data.", "Confirm amount due and receipt details.", "Record Lab BD Confirmation.", "Review calculated balance and delay.", "Link evidence and submit."],
    fields: [f("serialNumber", "S.No.", "number"), f("lab", "Lab", "text", true, "Prefilled from the commitment."), f("technology", "Technology", "text", true, "Prefilled from the commitment."), f("partnerClient", "Partner / Client", "text", true), f("dueDate", "Due Date", "date", true), f("amountDue", "Amount Due (Rs.)", "number", true), f("amountReceived", "Amount Received (Rs.)", "number", true), f("dateReceived", "Date Received", "date"), f("receiptRef", "Receipt Ref.", "text", true), f("balance", "Balance (Rs.)", "number", false, "Amount due minus amount received; system calculated.", undefined, true), f("delayDays", "Delay Days", "number", false, "System calculated from due and receipt dates.", undefined, true), f("labBdConfirmation", "Lab BD Confirmation", "select", true, "Confirms laboratory-provided information.", ["Confirmed", "Pending clarification"]), f("remarks", "Remarks", "textarea")],
    doNotEnter: ["Receipt without laboratory reference", "Invoiced amounts as received", "Any claim that BDG certified payment"],
    evidence: ["Invoice/demand note", "Receipt/bank booking/laboratory confirmation", "PI milestone certificate when applicable"],
    systemChecks: ["Balance is calculated", "Delay days are calculated", "Receipt date required for positive receipt"],
    submission: "Lab BD submits monthly reconciliation; internal finance sourcing stays outside the website workflow.",
    bdgAction: "Consolidate and analyse reconciliation, flag, query and escalate exceptions only.",
    completion: "Receipt is linked with evidence, calculated balance and delay.", next: "SOP-04"
  },
  {
    code: "SOP-04", annexure: "Annexure V", name: "Business Value Capture",
    whatFor: "Capture direct, indirect, market, strategic and future revenue value beyond immediate receipts.",
    whenUse: "At a commercial milestone and during quarterly review.",
    who: { responsible: "Lab BD", supporting: "URDIP, IPU, TMD and ICM", bdg: "Consolidate, analyse and query business-value claims." },
    prerequisites: ["SOP-01 record exists", "Commercial/market evidence is available"],
    steps: ["Reuse identity and receipts.", "Record direct revenue and projections.", "Capture leveraged investment, import substitution and market size.", "Add strategic notes and evidence.", "Validate and submit."],
    fields: [f("serialNumber", "S.No.", "number"), f("lab", "Lab", "text", true), f("technology", "Technology", "text", true), f("directRevenue", "Direct Revenue (Rs.)", "number", true), f("royaltyPotential1Yr", "Royalty Potential - 1 Yr", "number"), f("royaltyPotential3Yr", "Royalty Potential - 3 Yr", "number"), f("royaltyPotential5Yr", "Royalty Potential - 5 Yr", "number"), f("royaltyPotential10Yr", "Royalty Potential - 10 Yr", "number"), f("industryInvestmentLeveraged", "Industry Investment Leveraged (Rs.)", "number"), f("importSubstitutionValue", "Import Substitution Value (Rs.)", "number"), f("marketSizeAddressed", "Market Size Addressed (Rs.)", "number"), f("partnersCount", "Partners Count", "number"), f("startupsMsmesSupported", "Startups / MSMEs Supported", "number"), f("strategicValueNotes", "Strategic Value Notes", "textarea", true), f("evidenceRef", "Evidence Ref.", "text", true)],
    doNotEnter: ["Unsupported market-size claims", "Double-counted receipts", "Royalty forecasts without assumptions"],
    evidence: ["Receipt/revenue reference", "Market/customer intelligence", "Royalty assumptions", "Investment/import substitution evidence"],
    systemChecks: ["Values cannot be negative", "Evidence is mandatory", "Counts must be whole non-negative values"],
    submission: "Lab BD submits source-backed value data; specialist units validate only their domain.",
    bdgAction: "Consolidate and analyse, flag double counting and seek clarification; no accounting certification.",
    completion: "A source-backed business-value profile exists.", next: "SOP-05"
  },
  {
    code: "SOP-05", annexure: "Annexure VI", name: "Impact Assessment Framework",
    whatFor: "Capture financial, social, environmental, socio-economic, strategic and intangible outcomes.",
    whenUse: "Quarterly and whenever a material deployment outcome occurs.",
    who: { responsible: "Lab BD and PI", supporting: "IMD, URDIP and CPD", bdg: "Integrate evidence-backed impact into the dashboard." },
    prerequisites: ["Deployment/outcome exists", "Evidence basis is identifiable"],
    steps: ["Describe the financial outcome.", "Record beneficiary, job/MSME and environmental outcomes.", "Explain wider impact.", "Add evidence.", "Validate and submit."],
    fields: [f("serialNumber", "S.No.", "number"), f("lab", "Lab", "text", true), f("technology", "Technology", "text", true), f("financialImpact", "Financial Impact", "textarea", true), f("socialBeneficiaries", "Social Beneficiaries", "number"), f("jobsMsmesSupported", "Jobs / MSMEs Supported", "number"), f("environmentalImpact", "Environmental Impact", "textarea"), f("energyWaterEmissionSavings", "Energy / Water / Emission Savings", "textarea"), f("socioEconomicImpact", "Socio-Economic Impact", "textarea"), f("strategicNationalImpact", "Strategic / National Impact", "textarea"), f("intangibleImpact", "Intangible Impact", "textarea"), f("evidenceRef", "Evidence Ref.", "text", true), f("impactScore", "Impact Score", "number", false, "Reused from SOP-06 when available.", undefined, true), f("impactCategory", "Impact Category", "text", false, "Reused from SOP-06 when available.", undefined, true)],
    doNotEnter: ["Beneficiary estimates without basis", "Outputs described as outcomes", "Duplicate receipt amounts"],
    evidence: ["Deployment/user evidence", "Beneficiary/adoption evidence", "Environmental measurement", "Government/PSU or startup/MSME adoption"],
    systemChecks: ["Evidence is mandatory", "Counts cannot be negative", "Score/category reuse SOP-06"],
    submission: "Lab BD and PI provide outcomes/evidence; IMD validates mission/social/environmental dimensions.",
    bdgAction: "Integrate validated impact, flag unsupported claims and maintain traceability.",
    completion: "An evidence-linked impact profile exists.", next: "SOP-06"
  },
  {
    code: "SOP-06", annexure: "Scoring Matrix", name: "Technology Impact Scoring",
    whatFor: "Apply the approved 100-point annual prioritisation framework.",
    whenUse: "Annual cycle or after a major milestone.",
    who: { responsible: "BDG coordinates", supporting: "TMD, IMD, URDIP and IPU", bdg: "Approve the consolidated evidence-backed score." },
    prerequisites: ["SOP-04/SOP-05 evidence", "Each score is traceable"],
    steps: ["Review reused evidence.", "Score within each weight.", "Record evidence/remarks.", "Review calculated total/category.", "Submit assessment."],
    fields: [f("lab", "Lab", "text", true), f("technology", "Technology", "text", true), f("directFinancialRealisation", "Direct financial realisation (max 20)", "number", true), f("futureRevenueRoyalty", "Future revenue/royalty potential (max 10)", "number", true), f("industryAdoption", "Industry adoption and market traction (max 15)", "number", true), f("strategicRelevance", "Strategic/national relevance (max 10)", "number", true), f("socialImpactScore", "Social impact (max 10)", "number", true), f("environmentalImpactScore", "Environmental impact (max 10)", "number", true), f("importExportPotential", "Import substitution/export potential (max 10)", "number", true), f("scalability", "Scalability and replication potential (max 10)", "number", true), f("intangibleValue", "Intangible institutional value (max 5)", "number", true), f("totalScore", "Total (max 100)", "number", false, "System calculated.", undefined, true), f("category", "Category", "text", false, "System calculated from total.", undefined, true), f("evidenceRemarks", "Evidence / Remarks", "textarea", true)],
    doNotEnter: ["Score above weight", "Score without evidence", "Manual category"],
    evidence: ["SOP-04 evidence", "SOP-05 evidence", "Reviewer justifications"],
    systemChecks: ["Scores are bounded", "Total is out of 100", "Category is calculated"],
    submission: "Domain reviewers validate; BDG coordinates and records the final score.",
    bdgAction: "Review consistency, resolve queries and approve prioritisation; no accounting/payment action.",
    completion: "Evidence-backed total and category exist.", next: "SOP-07"
  },
  {
    code: "SOP-07", annexure: "Annexure VIII", name: "Dashboard and Reporting",
    whatFor: "Produce lab-, theme- and CSIR-level monitoring views.",
    whenUse: "Monthly laboratory and quarterly consolidated cycles.",
    who: { responsible: "Lab BD for lab data", supporting: "CPD for performance alignment", bdg: "Maintain, analyse and circulate the dashboard." },
    prerequisites: ["Current SOP-02 to SOP-06 records", "Reporting period selected"],
    steps: ["Select period.", "Reuse commitments, receipts, risks and impact.", "Confirm lab totals.", "Submit return.", "BDG consolidates and queries exceptions."],
    fields: [f("lab", "Lab", "text", true), f("periodLabel", "Reporting Period", "text", true, "Use YYYY-MM or YYYY-Qn."), f("ecfCommitted", "ECF Committed (Rs.)", "number", true), f("amountDue", "Amount Due (Rs.)", "number", true), f("actualRealised", "Actual Realised (Rs.)", "number", true), f("balance", "Balance / Unrealised (Rs.)", "number", false, "System calculated.", undefined, true), f("realisationRatio", "Realisation Ratio (%)", "number", false, "System calculated.", undefined, true), f("atRiskAmount", "Overdue / At-risk Amount (Rs.)", "number", true), f("technologiesLicensed", "Technologies Licensed", "number", true), f("technologiesDeployed", "Technologies Deployed", "number", true), f("royaltyCases", "Royalty Cases", "number", true), f("impactOutcomes", "Impact Outcomes", "textarea", true), f("exceptionSummary", "Exception Summary", "textarea")],
    doNotEnter: ["Untraceable manual totals", "Closed risks as open", "Narrative without period"],
    evidence: ["Monthly lab return", "Commitment/reconciliation extracts", "Risk summary", "Impact evidence index"],
    systemChecks: ["Balance/ratio calculated", "Period checked", "Totals non-negative"],
    submission: "Lab BD submits the lab return; BDG monitors and consolidates.",
    bdgAction: "Analyse trends, flag quality issues, raise queries and escalate unresolved exceptions.",
    completion: "A traceable lab return is consolidated.", next: "SOP-08"
  },
  {
    code: "SOP-08", annexure: "Annexure IV", name: "Variance Management and Escalation",
    whatFor: "Explain and resolve overdue, disputed, deferred, under-verified, cancelled, partial or excess variances.",
    whenUse: "Immediately for critical risk and monthly for open variance.",
    who: { responsible: "Lab BD", supporting: "ICM, IPU, TMD and URDIP by issue", bdg: "Classify risk, monitor action and escalate." },
    prerequisites: ["SOP-02 and SOP-03 exist", "Variance is calculated"],
    steps: ["Reuse commitment/actual values.", "Review calculated variance.", "Select functional category.", "Record reason/action/owner/date.", "Set escalation/status and submit."],
    fields: [f("serialNumber", "S.No.", "number"), f("lab", "Lab", "text", true), f("technology", "Technology", "text", true), f("committedAmountDue", "Committed Amount Due (Rs.)", "number", true), f("actualRealised", "Actual Realised (Rs.)", "number", true), f("variance", "Variance (Rs.)", "number", false, "System calculated.", undefined, true), f("varianceCategory", "Variance Category", "select", true, "Functional reason, not a blind numeric label.", ["Timing / milestone delay", "Documentation pending", "Partner payment delay", "Dispute", "Deferred scope", "Cancellation / non-realisation", "Excess receipt", "Other"]), f("reason", "Reason", "textarea", true), f("correctiveAction", "Corrective Action", "textarea", true), f("ownerUnit", "Owner Unit", "select", true, "Corrective-action owner.", ["Lab BD", "PI", "BDG", "ICM", "IPU", "TMD", "URDIP", "CPD", "IMD"]), f("revisedDate", "Revised Date", "date", true), f("escalationLevel", "Escalation Level", "select", true, "Current level.", ["First Level", "Second Level", "Final Review", "Resolved"]), f("status", "Status", "select", true, "Current action status.", statusOptions)],
    doNotEnter: ["Manual variance", "Category based only on sign", "Action without owner/date"],
    evidence: ["Commitment/reconciliation refs", "Partner/milestone evidence", "Corrective-action note"],
    systemChecks: ["Variance calculated", "Reason/action/owner/date mandatory", "Functional mapping kept separate"],
    submission: "Lab BD owns explanation/action; specialist units support only relevant issues.",
    bdgAction: "Monitor, analyse, flag, query and escalate; BDG does not perform accounting or payment certification.",
    completion: "Reason, action, owner, date, escalation and status are tracked.", next: "SOP-09"
  },
  {
    code: "SOP-09", annexure: "Evidence Checklist", name: "Controls, Audit Trail and Evidence",
    whatFor: "Keep every commitment, receipt, value and impact claim evidence-backed and auditable.",
    whenUse: "With every submission and before completion.",
    who: { responsible: "Lab BD; PI for technical evidence", supporting: "Relevant domain unit", bdg: "Check provenance, history and completeness." },
    prerequisites: ["Governed SOP record exists", "Source evidence identified"],
    steps: ["Select evidence type.", "Identify confirmer/certifier.", "Enter stable reference.", "Check version/completeness.", "Submit evidence index."],
    fields: [f("lab", "Lab", "text", true), f("technology", "Technology", "text", true), f("evidenceType", "Evidence Type", "select", true, "Select source evidence.", ["Agreement / MoU / Licence / LoI / Work Order / Sanction", "Invoice / Receipt / Bank Booking / Laboratory Confirmation", "Royalty Statement / Sales Statement", "Technical Milestone Certificate", "Deployment Certificate / User Feedback", "Pilot Validation Report", "Government/PSU Adoption Letter", "Start-up/MSME Adoption Evidence", "Environmental Measurement Report", "Case Study / Media / Standards / Policy Evidence"]), f("requiredFor", "Required For", "text", true), f("confirmedBy", "Confirmed / Certified By", "text", true, "Lab BD, PI, competent authority, partner/licensee or domain validator."), f("evidenceRef", "Evidence Reference", "text", true), f("version", "Version / Date", "text", true), f("remarks", "Remarks", "textarea")],
    doNotEnter: ["Unstable local path", "Unsupported claim", "BDG as accounting/payment certifier"],
    evidence: ["Commitment evidence", "Receipt/lab confirmation", "Milestone/deployment evidence", "Impact evidence"],
    systemChecks: ["Type/purpose/reference mandatory", "Every update creates history", "Identity/time logged"],
    submission: "Lab BD links source evidence; PI/authorised representative confirms technical/impact evidence.",
    bdgAction: "Maintain provenance/version control, flag missing evidence and track queries.",
    completion: "Record has traceable evidence and immutable history.", next: "SOP-10"
  },
  {
    code: "SOP-10", annexure: "Implementation & Review", name: "Review and Implementation",
    whatFor: "Run phased implementation, periodic review and approved framework improvement.",
    whenUse: "Quarterly review, annual impact reporting and approved implementation change.",
    who: { responsible: "BDG", supporting: "CPD, IMD, TMD, IPU, URDIP, ICM and laboratories", bdg: "Own review coordination and implementation tracking." },
    prerequisites: ["Dashboard/exception data available", "Proposal has evidence and owner"],
    steps: ["Select period/type.", "Record findings/learnings.", "Define proposed change.", "Record decision, owner/date.", "Track to closure."],
    fields: [f("reviewPeriod", "Review Period", "text", true), f("reviewType", "Review Type", "select", true, "Select cycle.", ["Quarterly SOP Review", "Annual Impact Review", "Pilot Review", "Approved Change Implementation"]), f("findings", "Findings", "textarea", true), f("pilotLearnings", "Pilot / Implementation Learnings", "textarea"), f("changeProposal", "Change Proposal", "textarea"), f("decisionReference", "Decision / Approval Reference", "text", true), f("implementationOwner", "Implementation Owner", "text", true), f("targetDate", "Target Date", "date", true), f("status", "Status", "select", true, "Implementation status.", ["Open", "In Progress", "Completed", "Deferred"]), f("completionNote", "Completion Note", "textarea")],
    doNotEnter: ["Unapproved change as active policy", "Item without owner/date", "Deletion of history"],
    evidence: ["Review minutes", "Implementation tracker", "Annual report", "Approved revision/circular"],
    systemChecks: ["Decision/owner/date mandatory", "Completed needs note", "History immutable"],
    submission: "BDG records outcomes after competent decision.",
    bdgAction: "Coordinate review and implement only approved changes with audit trail.",
    completion: "Decision is implemented or formally closed.", next: null
  }
];

export function getSopDefinition(code) { return SOP_INSTRUCTOR_DEFINITIONS.find((item) => item.code === code) || null; }

export function calculateSopData(code, rawData) {
  const data = { ...(rawData || {}) };
  const n = (key) => Number.isFinite(Number(data[key])) ? Number(data[key]) : 0;
  if (code === "SOP-03") {
    data.balance = n("amountDue") - n("amountReceived");
    const due = data.dueDate ? new Date(data.dueDate) : null;
    const end = data.dateReceived ? new Date(data.dateReceived) : new Date();
    data.delayDays = due && !Number.isNaN(due.getTime()) && !Number.isNaN(end.getTime()) ? Math.max(0, Math.floor((end - due) / 86400000)) : 0;
  }
  if (code === "SOP-06") {
    const keys = ["directFinancialRealisation", "futureRevenueRoyalty", "industryAdoption", "strategicRelevance", "socialImpactScore", "environmentalImpactScore", "importExportPotential", "scalability", "intangibleValue"];
    data.totalScore = keys.reduce((sum, key) => sum + n(key), 0);
    data.category = data.totalScore > 75 ? "Category A - High" : data.totalScore >= 50 ? "Category B - Moderate" : data.totalScore >= 30 ? "Category C - Emerging" : "Category D - Monitor";
  }
  if (code === "SOP-07") { data.balance = n("amountDue") - n("actualRealised"); data.realisationRatio = n("amountDue") > 0 ? Number((n("actualRealised") * 100 / n("amountDue")).toFixed(2)) : 0; }
  if (code === "SOP-08") data.variance = n("committedAmountDue") - n("actualRealised");
  return data;
}

export function validateSopData(code, rawData) {
  const definition = getSopDefinition(code);
  if (!definition) return ["Unknown SOP stage."];
  const data = calculateSopData(code, rawData);
  const errors = definition.fields.filter((item) => item.mandatory && !item.calculated && (data[item.key] === "" || data[item.key] === null || data[item.key] === undefined)).map((item) => `${item.label} is required.`);
  for (const item of definition.fields.filter((entry) => entry.type === "number" && !entry.calculated)) if (data[item.key] !== "" && data[item.key] !== null && data[item.key] !== undefined && (!Number.isFinite(Number(data[item.key])) || Number(data[item.key]) < 0)) errors.push(`${item.label} must be a non-negative number.`);
  if (code === "SOP-01" && (Number(data.trl) < 1 || Number(data.trl) > 9 || Number(data.crl) < 1 || Number(data.crl) > 9)) errors.push("TRL and CRL must be between 1 and 9.");
  if (code === "SOP-02" && Number(data.amountDueTillDate) > Number(data.totalCommittedAmount) && !data.remarks) errors.push("Add remarks when amount due exceeds total commitment.");
  if (code === "SOP-03" && Number(data.amountReceived) > 0 && !data.dateReceived) errors.push("Date Received is required when an amount has been received.");
  if (code === "SOP-06") {
    const max = { directFinancialRealisation: 20, futureRevenueRoyalty: 10, industryAdoption: 15, strategicRelevance: 10, socialImpactScore: 10, environmentalImpactScore: 10, importExportPotential: 10, scalability: 10, intangibleValue: 5 };
    for (const [key, limit] of Object.entries(max)) if (Number(data[key]) > limit) errors.push(`${definition.fields.find((item) => item.key === key)?.label || key} cannot exceed ${limit}.`);
  }
  if (code === "SOP-10" && data.status === "Completed" && !data.completionNote) errors.push("Completion Note is required when status is Completed.");
  return [...new Set(errors)];
}

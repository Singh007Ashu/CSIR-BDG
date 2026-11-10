import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";

async function GETHandler(req) {
  const { session, error } = await requireAnyAuth();
  if (error) return error;
  if (!isManager(session)) return NextResponse.json({ error: "Head & Admin permission required." }, { status: 403 });

  const labId = Number(new URL(req.url).searchParams.get("labId")) || null;
  const labs = await prisma.lab.findMany({
    include: {
      technologies: {
        where: { recordScope: "MASTER" },
        select: { id: true, approvalStatus: true, sopCompletion: true, evidenceReference: true, sopLegacyExempt: true, createdAt: true, submittedAt: true },
      },
      reportSubmissions: { include: { report: true }, orderBy: { report: { periodStart: "desc" } } },
      targetQueries: { where: { status: { in: ["OPEN", "IN_PROGRESS", "RESPONDED"] } }, select: { id: true, status: true } },
    },
    orderBy: { code: "asc" },
  });

  const rows = labs.map((lab) => {
    const tracked = lab.technologies.filter((item) => !item.sopLegacyExempt);
    const monthly = lab.reportSubmissions.find((item) => item.report.reportType === "MONTHLY");
    const quarterly = lab.reportSubmissions.find((item) => item.report.reportType === "QUARTERLY");
    return {
      id: lab.id,
      code: lab.code,
      name: lab.name,
      accountStatus: lab.accountStatus,
      technologySubmissions: lab.technologies.length,
      legacyMasterRecords: lab.technologies.filter((item) => item.sopLegacyExempt).length,
      sopTracked: tracked.length,
      sopComplete: tracked.filter((item) => item.sopCompletion === 100).length,
      sopIncomplete: tracked.filter((item) => item.sopCompletion < 100).length,
      pendingTechnologies: tracked.filter((item) => item.approvalStatus === "PENDING").length,
      missingEvidence: tracked.filter((item) => !item.evidenceReference).length,
      monthlyStatus: monthly?.status || "PENDING",
      quarterlyStatus: quarterly?.status || "PENDING",
      openQueries: lab.targetQueries.length,
      latestTechnologyAt: lab.technologies.reduce((latest, item) => { const value = item.submittedAt || item.createdAt; return !latest || value > latest ? value : latest; }, null),
    };
  });

  const totals = {
    totalTechnologies: rows.reduce((sum, row) => sum + row.technologySubmissions, 0),
    legacyMasterRecords: rows.reduce((sum, row) => sum + row.legacyMasterRecords, 0),
    sopTracked: rows.reduce((sum, row) => sum + row.sopTracked, 0),
    sopComplete: rows.reduce((sum, row) => sum + row.sopComplete, 0),
    sopIncomplete: rows.reduce((sum, row) => sum + row.sopIncomplete, 0),
    pendingReview: rows.reduce((sum, row) => sum + row.pendingTechnologies, 0),
    missingEvidence: rows.reduce((sum, row) => sum + row.missingEvidence, 0),
    monthlyPending: rows.filter((row) => row.monthlyStatus === "PENDING").length,
    quarterlyPending: rows.filter((row) => row.quarterlyStatus === "PENDING").length,
    openQueries: rows.reduce((sum, row) => sum + row.openQueries, 0),
    commercialPending: await prisma.commercialEngagement.count({ where: { status: "SUBMITTED" } }),
  };

  let selectedLab = null;
  if (labId) {
    selectedLab = await prisma.lab.findUnique({
      where: { id: labId },
      select: {
        id: true,
        code: true,
        name: true,
        labId: true,
        accountStatus: true,
        piName: true,
        authorizedPerson: true,
        officialEmail: true,
        technologies: {
          where: { recordScope: "MASTER" },
          select: {
            id: true,
            name: true,
            theme: true,
            sector: true,
            technologyType: true,
            piName: true,
            trl: true,
            crl: true,
            ipStatus: true,
            commercialisationStage: true,
            approvalStatus: true,
            sopCompletion: true,
            sopLegacyExempt: true,
            evidenceReference: true,
            createdAt: true,
            submittedAt: true,
            briefDescription: true,
            advantages: true,
            applications: true,
            keyFeatures: true,
            recordFinancialYear: true,
            projectLinks: { select: { project: { select: { id: true, name: true, slug: true } } } },
          },
          orderBy: { name: "asc" },
        },
        reportSubmissions: {
          include: { report: { select: { id: true, title: true, reportType: true, periodLabel: true, dueDate: true } } },
          orderBy: { report: { periodStart: "desc" } },
          take: 8,
        },
        targetQueries: {
          where: { status: { in: ["OPEN", "IN_PROGRESS", "RESPONDED"] } },
          select: { id: true, title: true, status: true, priority: true, dueAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  return NextResponse.json({ totals, labs: rows, selectedLab });
}

export const GET = withApiBoundary(GETHandler);

import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth, isManager } from "../../../lib/session";
import { isGoverningRole } from "../../../lib/roles";

async function GETHandler() {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const labId = session.type === "lab" ? session.labId : session.assignedLabId || null;
  const scoped = labId ? { labId } : {};
  const [masterTechnologies, ficciTechnologies, ficciDocuments, projects, coDevelopment, commercialPricing, mous, problemStatements, partnerships, workflows, openWorkflows, labs, reports, queries] = await Promise.all([
    prisma.technology.count({ where: { recordScope: "MASTER", ...scoped } }),
    prisma.technology.count({ where: { recordScope: "PROJECT_ONLY", projectLinks: { some: { project: { slug: "ficci" } } } } }),
    prisma.document.count({ where: { sourceKey: { startsWith: "ficci-doc:" } } }),
    prisma.project.count(),
    prisma.coDevelopmentProject.count({ where: scoped }),
    prisma.commercialEngagement.count({ where: scoped }),
    prisma.mou.count({ where: scoped }),
    prisma.problemStatement.count(),
    prisma.partnership.count(),
    prisma.workflowPacket.count({ where: labId ? { labId } : {} }),
    prisma.workflowPacket.count({ where: { ...(labId ? { labId } : {}), status: { notIn: ["COMPLETED", "REJECTED"] } } }),
    prisma.lab.count(),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.query.count({ where: { ...(labId ? { targetLabId: labId } : {}), status: { in: ["OPEN", "IN_PROGRESS", "RESPONDED"] } } }),
  ]);
  const mode = session.type === "lab" ? "LAB" : isManager(session) ? "MANAGER" : isGoverningRole(session.role) ? "GOVERNING" : "APPLICANT";
  return NextResponse.json({ mode, role: session.role || "LAB", counts: { masterTechnologies, ficciTechnologies, ficciDocuments, projects, coDevelopment, commercialPricing, mous, problemStatements, partnerships, workflows, openWorkflows, labs, reports, queries } });
}

export const GET = withApiBoundary(GETHandler);

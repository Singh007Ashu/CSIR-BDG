import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireAnyAuth } from "../../../lib/session";
import { SOP_INSTRUCTOR_DEFINITIONS } from "../../../lib/sopInstructor";

const instructorByCode = Object.fromEntries(SOP_INSTRUCTOR_DEFINITIONS.map((item) => [item.code, item]));

async function GETHandler() {
  const { error } = await requireAnyAuth();
  if (error) return error;
  const [sops, parameters, raci, templates] = await Promise.all([
    prisma.sop.findMany({ where: { active: true }, include: { stages: { orderBy: { stageNumber: "asc" } } } }),
    prisma.technologyParameter.findMany({ where: { active: true }, include: { options: { where: { active: true }, orderBy: { displayOrder: "asc" } }, project: { select: { id: true, name: true } }, sopStage: true }, orderBy: [{ projectId: "asc" }, { displayOrder: "asc" }] }),
    prisma.raciAssignment.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } }),
    prisma.excelTemplate.findMany({ where: { active: true }, orderBy: { effectiveFrom: "desc" } }),
  ]);
  const stages = sops.flatMap((sop) => sop.stages);
  const roadmap = stages.map((stage) => {
    const instructor = instructorByCode[stage.code];
    return { ...stage, timing: instructor?.whenUse || "As directed by Head BDG", ownerAction: instructor?.submission || "Follow the active RACI assignment.", files: instructor?.evidence || ["Supporting evidence"], instructor };
  });
  const excluded = new Set(["Finance", "Lab Finance"]);
  const units = Array.from(new Set(raci.flatMap((item) => [item.responsibleUnit, item.accountableUnit, item.consultedUnits, item.informedUnits]).filter(Boolean).flatMap((value) => value.split(",").map((unit) => unit.trim()).filter((unit) => unit && !excluded.has(unit))))).sort();
  return NextResponse.json({ sops, parameters, raci, templates, roadmap, units, instructor: SOP_INSTRUCTOR_DEFINITIONS });
}

export const GET = withApiBoundary(GETHandler);

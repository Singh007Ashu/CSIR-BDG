import { withApiBoundary } from "../../../../lib/apiBoundary";
import { publicLabSelect } from "../../../../lib/publicRecords";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireAnyAuth } from "../../../../lib/session";

function csvCell(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
async function GETHandler() {
  const { session, error } = await requireAnyAuth(); if (error) return error;
  const records = await prisma.technology.findMany({ where: session.type === "lab" ? { labId: session.labId } : {}, include: { lab: { select: publicLabSelect }, datasetCategory: true }, orderBy: [{ lab: { name: "asc" } }, { name: "asc" }] });
  const headings = ["Technology Name", "Lab Code", "Laboratory", "PI", "Category", "Technology Area", "Description", "Applications", "Advantages", "IP Status", "TRL", "CRL", "Status"];
  const rows = records.map((item) => [item.name, item.lab.code, item.lab.name, item.piName, item.datasetCategory?.name, item.sector, item.briefDescription, item.applications, item.advantages, item.ipStatus, item.trl, item.crl, item.status]);
  const csv = `\uFEFF${[headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=csir-technologies.csv", "Cache-Control": "private, no-store" } });
}

export const GET = withApiBoundary(GETHandler);

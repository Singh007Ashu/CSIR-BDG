import { isInternalRole } from "./roles";

export function collaborationScope(session) {
  if (session?.type === "lab") return { labId: session.labId || -1 };
  if (session?.role === "APPLICANT") return { organizationId: session.organizationId || -1 };
  if (["LAB_BD", "PI"].includes(session?.role)) return { labId: session.assignedLabId || session.labId || -1 };
  return isInternalRole(session?.role) ? {} : { id: -1 };
}

export const collaborationIncludes = {
  organization: { select: { id: true, name: true, type: true } },
  lab: { select: { id: true, code: true, name: true } },
};

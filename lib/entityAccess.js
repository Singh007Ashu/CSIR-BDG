import { prisma } from "./db";
import { workflowWhere } from "./workflow";
import { isInternalRole, LAB_GOVERNING_ROLES } from "./roles";
import { isManager } from "./session";

export const ENTITY_FIELD = {
  LAB_PROFILE: "uploadedByLabId",
  TECHNOLOGY: "technologyId",
  CODEV_PROJECT: "coDevelopmentProjectId",
  MOU: "mouId",
  COMMERCIAL_ENGAGEMENT: "commercialEngagementId",
};

export async function getEntityOwner(entityType, entityId) {
  const id = Number(entityId);
  if (entityType === "LAB_PROFILE") { const lab = await prisma.lab.findUnique({ where: { id }, select: { id: true } }); return lab ? { id, labId: id } : null; }
  if (entityType === "TECHNOLOGY") return prisma.technology.findUnique({ where: { id }, select: { id: true, labId: true } });
  if (entityType === "CODEV_PROJECT") return prisma.coDevelopmentProject.findUnique({ where: { id }, select: { id: true, labId: true } });
  if (entityType === "MOU") return prisma.mou.findUnique({ where: { id }, select: { id: true, labId: true } });
  if (entityType === "COMMERCIAL_ENGAGEMENT") return prisma.commercialEngagement.findUnique({ where: { id }, select: { id: true, labId: true } });
  return null;
}

export async function canAccessEntity(session, entityType, entityId, write = false) {
  if (!session || !Number.isInteger(Number(entityId)) || Number(entityId)<1) return {allowed:false,owner:null};
  if(entityType==="WORKFLOW_PACKET") {
    const packet=await prisma.workflowPacket.findFirst({where:{id:Number(entityId),...workflowWhere(session)},select:{id:true,labId:true}});
    return {allowed:Boolean(packet)&&!write,owner:packet};
  }
  const owner = await getEntityOwner(entityType, entityId);
  if (!owner) return { allowed: false, owner: null };
  if (entityType === "LAB_PROFILE") return { allowed: session.type === "lab" ? owner.labId === session.labId : !write && isManager(session), owner };
  if (session.type === "lab") return { allowed: owner.labId === session.labId, owner };
  if (session.type !== "user" || !isInternalRole(session.role)) return {allowed:false,owner};
  if(LAB_GOVERNING_ROLES.includes(session.role))return {allowed:!write&&Boolean(session.assignedLabId)&&owner.labId===session.assignedLabId,owner};
  if (write) return { allowed: isManager(session), owner };
  return { allowed: true, owner };
}

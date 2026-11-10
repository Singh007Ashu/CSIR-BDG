import { prisma } from "./db";
import { auditJson } from "./auditRedaction";

export async function generateLabId(code) {
  const normalized = String(code).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const prefix = `CSIR-${normalized}-`;
  const latest = await prisma.lab.findFirst({
    where: { labId: { startsWith: prefix } }, orderBy: { labId: "desc" }, select: { labId: true },
  });
  const sequence = latest ? Number(latest.labId.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(sequence).padStart(4, "0")}`;
}

export async function logAudit({ actorType, actorLabId, actorUserId, action, entityType, entityId, details, oldValue, newValue, recordLabel, ipAddress, userAgent }) {
  try {
    await prisma.auditLog.create({ data: {
      actorType, actorLabId: actorLabId || null, actorUserId: actorUserId || null, action,
      entityType: entityType || null, entityId: entityId ? Number(entityId) : null,
      details: details ? auditJson(details) : null, oldValue: oldValue ? auditJson(oldValue) : null, newValue: newValue ? auditJson(newValue) : null, recordLabel: recordLabel || null, ipAddress: ipAddress || null, userAgent: userAgent || null,
    } });
    if (actorType === "LAB" && actorLabId && /CREATED|UPDATED|SUBMITTED|UPLOADED|ADDED|SAVED/.test(action) && !/PASSWORD/.test(action)) {
      const lab = await prisma.lab.findUnique({where:{id:actorLabId},select:{name:true,code:true}});
      const links={TECHNOLOGY:"/master-technologies",MOU:"/mou-repository",DOCUMENT:"/notifications",REPORT:"/reports",PROJECT:"/projects"};
      const technology = entityType === "TECHNOLOGY" && entityId ? await prisma.technology.findUnique({where:{id:Number(entityId)},select:{name:true}}) : null;
      if (technology) {
        const created = action === "TECHNOLOGY_CREATED";
        await notifyHeadBdgAndAdmins({type:created?"NEW_TECHNOLOGY":"TECHNOLOGY_UPDATE",title:created?"New technology added":action === "TECHNOLOGY_SUBMITTED"?"Technology submitted for review":"Technology updated",message:`CSIR-${lab?.code||actorLabId} — ${technology.name}. ${created?"Added by the laboratory; this is not an approval.":"Laboratory data has been updated."}`,link:`/master-technologies?technologyId=${entityId}`});
        return;
      }
      await notifyHeadBdgAndAdmins({type:"LAB_UPDATE",title:`CSIR-${lab?.code||actorLabId}: ${action.toLowerCase().replaceAll("_"," ")}`,message:`${lab?.name||"Laboratory"} updated ${recordLabel||newValue?.name||entityType||"a record"}${entityId?` (#${entityId})`:""}.`,link:links[entityType]||"/notifications"});
    }
  } catch (error) { console.error("Audit log failed", error); }
}

export async function notifyHeadBdgAndAdmins({ type, title, message, link }) {
  const recipients = await prisma.user.findMany({
    where: { role: { in: ["HEAD_ADMIN", "HEAD_BDG", "ADMIN", "SUPER_ADMIN"] }, accountStatus: "ACTIVE" }, select: { id: true },
  });
  if (!recipients.length) return;
  await prisma.notification.createMany({ data: recipients.map(({ id }) => ({
    recipientType: "USER", recipientUserId: id, type, title, message, link: link || null,
  })) });
}

export async function notifyLab(labId, { type, title, message, link }) {
  await prisma.notification.create({ data: {
    recipientType: "LAB", recipientLabId: Number(labId), type, title, message, link: link || null,
  } });
}

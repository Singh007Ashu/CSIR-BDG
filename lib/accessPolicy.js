const managers = new Set(["HEAD_ADMIN", "HEAD_BDG", "ADMIN", "SUPER_ADMIN"]);
const hq = new Set(["BDG", "CPD", "IMD", "TMD", "IPU", "URDIP", "ICM"]);
const under = (path, prefix) => path === prefix || path.startsWith(prefix + "/");
export function restrictedRoleMutation(session, pathname, method) {
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return false;
  if (managers.has(session?.role)) return false;
  if (session?.role === "READ_ONLY") return !["/api/auth/logout", "/api/notifications"].includes(pathname);
  if (session?.role === "PI") return !["/api/auth/logout", "/api/lab-auth/logout", "/api/notifications", "/api/lab-auth/change-password"].includes(pathname) && !/^\/api\/intake\/\d+$/.test(pathname);
  if (hq.has(session?.role)) return !["/api/auth/logout", "/api/notifications", "/api/industry-matching"].includes(pathname) && !under(pathname,"/api/intake");
  return false;
}

// A named lab officer is a lab-scoped data principal, not an HQ-wide reader.
// Keep getSession/requireUser as the original login identity for profile/logout.
export function dataPrincipal(session) {
  if (session?.type === "user" && ["LAB_BD", "PI"].includes(session.role)) {
    if (!Number.isInteger(session.assignedLabId) || session.assignedLabId < 1) return null;
    return { ...session, type: "lab", labId: session.assignedLabId, authenticatedType: "user" };
  }
  return session;
}

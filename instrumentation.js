import { sessionSecret } from "./lib/securityPolicy";

export async function register() {
  try {
    // Fail before accepting requests, not only when the first user signs in.
    sessionSecret();
    if (process.env.DB_PROVIDER && !["sqlite", "mysql"].includes(process.env.DB_PROVIDER)) {
      throw new Error("DB_PROVIDER must be sqlite or mysql.");
    }
    if (process.env.DB_PROVIDER === "mysql" && !process.env.MYSQL_DATABASE_URL?.startsWith("mysql://")) {
      throw new Error("MYSQL_DATABASE_URL is required for the MySQL provider.");
    }
    if (process.env.MALWARE_SCAN_MODE === "disabled" && process.env.CSIR_TESTING_MODE !== "1") {
      throw new Error("Disabling malware scanning is permitted only in explicit testing mode.");
    }
    if (process.env.NODE_ENV === "production") {
      const bindHost = String(process.env.HOSTNAME || "").toLowerCase();
      if (process.env.CSIR_REQUIRE_LOOPBACK_BIND === "1" && !["127.0.0.1", "localhost", "::1"].includes(bindHost)) {
        throw new Error("Production Node server HOSTNAME must be a loopback address; expose it only through the trusted reverse proxy.");
      }
      if (process.env.TRUST_PROXY !== "1") {
        throw new Error("TRUST_PROXY=1 is required in production for trusted source-IP authentication throttling.");
      }
      const origins = (process.env.APP_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
      if (!origins.length) throw new Error("APP_ORIGINS must explicitly list the permitted deployment origins.");
      for (const origin of origins) {
        const url = new URL(origin);
        if (url.origin !== origin || (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) {
          throw new Error("APP_ORIGINS entries must be exact HTTPS origins (HTTP is allowed only on loopback).");
        }
      }
    }
  } catch (error) {
    console.error("Fatal startup configuration error:", error);
    process.exit(1);
  }
}

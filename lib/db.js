import { PrismaClient } from "@prisma/client";
import { PrismaClient as MysqlPrismaClient } from "@csir/mysql-client";
import { PrismaClient as PrismaD1Client } from "@csir/d1-client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareEnv } from "./cloudflare-env.js";

const globalForPrisma = globalThis;
const modelProxies = new Map();

function localClient() {
  const Client = process.env.DB_PROVIDER === "mysql" ? MysqlPrismaClient : PrismaClient;
  if (!globalForPrisma.prisma) globalForPrisma.prisma = new Client({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  return globalForPrisma.prisma;
}

function cloudflareClient(env) {
  if (!globalForPrisma.d1PrismaClients) globalForPrisma.d1PrismaClients = new WeakMap();
  let client = globalForPrisma.d1PrismaClients.get(env.DB);
  if (!client) {
    client = new PrismaD1Client({ adapter: new PrismaD1(env.DB), log: ["error"] });
    globalForPrisma.d1PrismaClients.set(env.DB, client);
  }
  return client;
}

async function activeClient() {
  const env = await getCloudflareEnv();
  return env?.DB ? cloudflareClient(env) : localClient();
}

async function invokeModel(modelName, methodName, args) {
  const client = await activeClient();
  const method = client[modelName]?.[methodName];
  if (typeof method !== "function") return method;
  return method.apply(client[modelName], args);
}

function modelProxy(modelName) {
  if (!modelProxies.has(modelName)) {
    modelProxies.set(modelName, new Proxy({}, {
      get(_target, methodName) {
        return (...args) => invokeModel(modelName, methodName, args);
      },
    }));
  }
  return modelProxies.get(modelName);
}

// Existing routes keep prisma.model.method(). The async proxy selects local
// SQLite under Node.js and the D1 adapter inside Cloudflare Workers.
export const prisma = new Proxy({}, {
  get(_target, property) {
    if (typeof property !== "string") return undefined;
    if (property.startsWith("$")) {
      return async (...args) => {
        const env = await getCloudflareEnv();
        const client = env?.DB ? cloudflareClient(env) : localClient();
        // D1 does not support Prisma interactive transactions. Execute the existing
        // mutation callback sequentially on D1; local SQLite keeps true transactions.
        if (property === "$transaction" && env?.DB && typeof args[0] === "function") return args[0](client);
        const method = client[property];
        return typeof method === "function" ? method.apply(client, args) : method;
      };
    }
    return modelProxy(property);
  },
});

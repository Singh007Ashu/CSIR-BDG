import { env } from "cloudflare:workers";

export async function getCloudflareEnv() {
  return env || null;
}
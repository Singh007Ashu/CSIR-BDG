import { registerHooks } from "node:module";

const workersStubUrl = new URL("../lib/cloudflare-workers-local.mjs", import.meta.url).href;
const d1ClientStubUrl = new URL("../lib/d1-client-local-stub.mjs", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") return { url: workersStubUrl, shortCircuit: true };
    if (specifier === "@csir/d1-client") return { url: d1ClientStubUrl, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
/**
 * MAE APS · Security audit gate with a narrowly scoped, temporary exception.
 * Runtime dependencies: zero high/critical findings tolerated.
 * Development tooling: only GHSA-vfj7-8cjw-p6xm on braces (unpatched as of
 * 2026-10-13), and its exclusively dev-only dependent chain, is excepted.
 * All other high/critical findings fail the build.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function fail(message) {
  console.error(message);
  process.exit(1);
}
function run(args) {
  return spawnSync("npm", args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
}

const production = run(["audit", "--omit=dev", "--audit-level=high"]);
if (production.error || production.status !== 0) {
  console.error(production.stdout, production.stderr);
  fail("Auditoria de dependências de PRODUÇÃO não passou. Deploy bloqueado.");
}

const result = run(["audit", "--json", "--audit-level=high"]);
if (result.error) fail("Auditoria npm não executou.");
let audit;
try { audit = JSON.parse(result.stdout); } catch { fail("npm audit retornou formato inesperado."); }
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
if (!audit || typeof audit.vulnerabilities !== "object") fail("Sem relatório de vulnerabilidades verificável.");

const allowed = new Set([
  "braces", "micromatch", "fast-glob", "@next/eslint-plugin-next", "eslint-config-next",
]);
const onlyAdvisory = "GHSA-vfj7-8cjw-p6xm";
const found = [];

for (const [name, v] of Object.entries(audit.vulnerabilities)) {
  if (!["high", "critical"].includes(v.severity)) continue;
  const pkg = lock.packages["node_modules/" + name];
  if (!allowed.has(name) || !pkg || pkg.dev !== true) {
    fail("Vulnerabilidade alta ou crítica não permitida: " + name);
  }
  for (const dependency of v.via ?? []) {
    if (typeof dependency === "string") {
      if (!allowed.has(dependency)) fail("Cadeia não permitida: " + name + " → " + dependency);
    } else if (typeof dependency === "object" && dependency) {
      if (dependency.name !== "braces" ||
          !String(dependency.url ?? "").includes(onlyAdvisory)) {
        fail("Advisory novo ou fora da exceção: " + name);
      }
    } else fail("Formato desconhecido de advisory: " + name);
  }
  found.push(name);
}
if (!found.includes("braces") && result.status !== 0) fail("npm audit falhou sem razão reconhecida.");
console.log("Auditoria de runtime: 0 vulnerabilidades altas/críticas.");
console.log("Exceção temporária, somente desenvolvimento e GHSA-vfj7-8cjw-p6xm: " + found.sort().join(", "));

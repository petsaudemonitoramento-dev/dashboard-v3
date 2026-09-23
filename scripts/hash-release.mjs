import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const tagIndex = process.argv.indexOf("--tag");
const tag = tagIndex >= 0 ? process.argv[tagIndex + 1] : null;
if (!tag) throw new Error("Informe a tag congelada com --tag, por exemplo: --tag v1.0.0");
if (execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()) throw new Error("A árvore Git precisa estar limpa antes do hash final.");
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const tagged = execFileSync("git", ["rev-list", "-n", "1", tag], { encoding: "utf8" }).trim();
if (head !== tagged) throw new Error(`HEAD não corresponde à tag ${tag}.`);
const excluded = new Set([".git", ".next", "node_modules", "coverage", ".supabase-test"]);
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name !== "package-lock.json" && !entry.name.endsWith(".tsbuildinfo") && !path.includes("docs\\registro\\hash-")) files.push(path);
  }
}
await walk(resolve("."));
files.sort((a, b) => relative(resolve("."), a).localeCompare(relative(resolve("."), b), "en"));
const hash = createHash("sha256");
for (const file of files) {
  hash.update(relative(resolve("."), file).replaceAll("\\", "/"));
  hash.update("\0"); hash.update(await readFile(file)); hash.update("\0");
}
const digest = hash.digest("hex");
const output = resolve(`docs/registro/hash-${tag}.txt`);
await writeFile(output, `tag=${tag}\ncommit=${head}\nsha256=${digest}\nfiles=${files.length}\n`, "utf8");
console.log(output);

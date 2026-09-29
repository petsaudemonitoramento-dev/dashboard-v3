import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const tagIndex = process.argv.indexOf("--tag");
const tag = tagIndex >= 0 ? process.argv[tagIndex + 1] : null;
if (!tag) throw new Error("Informe a tag congelada com --tag, por exemplo: --tag v1.0.0");
if (execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()) throw new Error("A árvore Git precisa estar limpa antes do hash final.");
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const tagged = execFileSync("git", ["rev-list", "-n", "1", tag], { encoding: "utf8" }).trim();
if (head !== tagged) throw new Error(`HEAD não corresponde à tag ${tag}.`);

// O hash cobre exatamente os arquivos versionados na tag, lidos do Git e não do
// disco: arquivos ignorados (.env.local, supabase/.temp, .vercel) e conversões
// de fim de linha do sistema operacional não alteram o resultado.
const tree = execFileSync("git", ["rev-parse", `${tag}^{tree}`], { encoding: "utf8" }).trim();
const listing = execFileSync("git", ["ls-tree", "-r", "-z", "--full-tree", tag], { encoding: "utf8" });
const files = listing
  .split("\0")
  .filter(Boolean)
  .map((entry) => {
    const [meta, path] = entry.split("\t");
    const [, type, object] = meta.split(" ");
    return { type, object, path };
  })
  .filter(({ type, path }) => type === "blob" && path !== "package-lock.json" && !path.startsWith("docs/registro/hash-"))
  .sort((a, b) => a.path.localeCompare(b.path, "en"));

const hash = createHash("sha256");
for (const file of files) {
  hash.update(file.path);
  hash.update("\0");
  hash.update(execFileSync("git", ["cat-file", "blob", file.object]));
  hash.update("\0");
}
const digest = hash.digest("hex");
const output = resolve(`docs/registro/hash-${tag}.txt`);
await writeFile(output, `tag=${tag}\ncommit=${head}\ntree=${tree}\nsha256=${digest}\nfiles=${files.length}\n`, "utf8");
console.log(output);

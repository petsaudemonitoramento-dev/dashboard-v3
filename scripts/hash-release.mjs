import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const tagIndex = process.argv.indexOf("--tag");
const tag = tagIndex >= 0 ? process.argv[tagIndex + 1] : null;

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    ...options,
  });
}

if (!tag || !/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/.test(tag)) {
  throw new Error("Informe uma tag semântica com --tag, por exemplo: --tag v1.0.0");
}
if (git(["status", "--porcelain", "--untracked-files=all"]).trim()) {
  throw new Error("A árvore Git precisa estar limpa antes do hash final.");
}

let tagged;
try {
  const tagType = git(["cat-file", "-t", `refs/tags/${tag}`]).trim();
  if (tagType !== "tag") {
    throw new Error(`A referência ${tag} precisa ser uma tag anotada.`);
  }
  tagged = git(["rev-parse", "--verify", `refs/tags/${tag}^{commit}`]).trim();
} catch (error) {
  if (error instanceof Error && error.message.includes("tag anotada")) throw error;
  throw new Error(`A tag anotada ${tag} não existe neste repositório.`);
}

const head = git(["rev-parse", "HEAD"]).trim();
if (head !== tagged) throw new Error(`HEAD não corresponde à tag ${tag}.`);

const tree = git(["rev-parse", `${tag}^{tree}`]).trim();
const listing = git(["ls-tree", "-r", "-z", "--full-tree", tag]);
const files = listing
  .split("\0")
  .filter(Boolean)
  .map((entry) => {
    const [meta, path] = entry.split("\t");
    const [mode, type, object] = meta.split(" ");
    return { mode, type, object, path };
  })
  .filter(({ type }) => type === "blob");

const sourceHash = createHash("sha256");
for (const file of files) {
  const blob = execFileSync("git", ["cat-file", "blob", file.object], { cwd: repoRoot });
  sourceHash.update(`${file.mode} ${file.type} ${file.path}\0${blob.length}\0`, "utf8");
  sourceHash.update(blob);
  sourceHash.update("\0");
}

const packagePath = resolve(repoRoot, "docs/registro/trechos-codigo-v1.txt");
let registrationPackage;
try {
  registrationPackage = await readFile(packagePath);
} catch {
  throw new Error("Gere e revise o pacote com npm run registro:codigo antes do hash final.");
}
const packageText = registrationPackage.toString("utf8");
if (!packageText.includes(`commit=${head}\n`)) {
  throw new Error("O pacote de código não corresponde ao commit congelado.");
}

const output = resolve(repoRoot, `docs/registro/hash-${tag}.txt`);
const manifest = [
  "format=mae-aps-release-hash-v1",
  `tag=${tag}`,
  `commit=${head}`,
  `tree=${tree}`,
  `source_sha256=${sourceHash.digest("hex")}`,
  `source_files=${files.length}`,
  "package=docs/registro/trechos-codigo-v1.txt",
  `package_sha256=${createHash("sha256").update(registrationPackage).digest("hex")}`,
  `package_bytes=${registrationPackage.length}`,
  "",
].join("\n");
await writeFile(output, manifest, "utf8");
console.log(output);

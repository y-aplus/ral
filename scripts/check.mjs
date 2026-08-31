import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { assertNoObviousSecrets } from "../packages/ral/src/cli.mjs";

const checks = [
  ["node", ["--check", "packages/ral/src/cli.mjs"]],
  ["node", ["--check", "site/main.js"]],
  ["node", ["--check", "scripts/serve.mjs"]]
];

for (const [program, args] of checks) {
  const result = spawnSync(program, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) process.exit(result.status || 1);
}

const notice = (await readFile("REINVENTION_NOTICE", "utf8")).trim();
const html = await readFile("site/index.html", "utf8");
if (!html.includes(notice)) {
  console.error("site/index.html does not contain the canonical REINVENTION_NOTICE text.");
  process.exit(1);
}

const help = spawnSync("node", ["packages/ral/src/cli.mjs", "--help"], {
  encoding: "utf8",
  shell: false
});
if (help.status !== 0 || !help.stdout.includes("ral publish")) {
  console.error(help.stderr || "ral --help check failed.");
  process.exit(1);
}

let secretGuardBlocked = false;
try {
  assertNoObviousSecrets(["README.md", "config/credentials.pem"]);
} catch (error) {
  secretGuardBlocked = error instanceof Error && error.message.includes("credentials.pem");
}
if (!secretGuardBlocked) {
  console.error("ral secret-bearing filename guard check failed.");
  process.exit(1);
}
assertNoObviousSecrets(["README.md", "src/index.js"]);

console.log("Checks passed: JavaScript syntax, Notice sync, ral CLI help, and secret filename guard.");

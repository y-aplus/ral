#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import process from "node:process";

const VERSION = "0.1.0";
const HELP = `ral ${VERSION}

Publish the current commit to your public GitHub fork.
No upstream pull request is created.

Usage:
  ral publish [options]
  ral --help
  ral --version

Options:
  --dry-run           Inspect and describe the publication without writing
  --yes, -y           Accept prompts after you have reviewed the repository
  --message, -m TEXT  Commit message for a dirty worktree
  --help, -h          Show help
  --version, -v       Show version
`;

class RalError extends Error {}

function command(program, args, { cwd, allowFailure = false, inherit = false } = {}) {
  const result = spawnSync(program, args, {
    cwd,
    encoding: "utf8",
    shell: false,
    stdio: inherit ? "inherit" : "pipe"
  });

  if (result.error) {
    if (result.error.code === "ENOENT") {
      throw new RalError(`Required command not found: ${program}`);
    }
    throw result.error;
  }

  if (result.status !== 0 && !allowFailure) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new RalError(`${program} ${args.join(" ")} failed${detail ? `:\n${detail}` : "."}`);
  }

  return {
    ok: result.status === 0,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim()
  };
}

function parseArgs(argv) {
  const options = { command: null, dryRun: false, yes: false, message: null };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "publish" && options.command === null) {
      options.command = "publish";
    } else if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument === "--yes" || argument === "-y") {
      options.yes = true;
    } else if (argument === "--message" || argument === "-m") {
      options.message = argv[index + 1];
      index += 1;
      if (!options.message) throw new RalError(`${argument} requires a value.`);
    } else if (argument === "--help" || argument === "-h") {
      options.command = "help";
    } else if (argument === "--version" || argument === "-v") {
      options.command = "version";
    } else {
      throw new RalError(`Unknown argument: ${argument}`);
    }
  }

  if (options.command === null) options.command = "help";
  return options;
}

function parseGitHubRemote(remoteUrl) {
  const match = remoteUrl.match(/github\.com(?::|\/)([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (!match) throw new RalError(`Not a GitHub remote: ${remoteUrl}`);
  return { owner: match[1], repo: match[2], nameWithOwner: `${match[1]}/${match[2]}` };
}

function parseStatusPaths(status) {
  return status
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      const path = line.slice(3).trim();
      return path.includes(" -> ") ? path.split(" -> ") : [path];
    });
}

export function assertNoObviousSecrets(paths) {
  const sensitive = [...new Set(paths)].filter((path) => {
    const normalized = path.replaceAll("\\", "/").toLowerCase();
    const name = normalized.split("/").at(-1);
    return (
      /^\.env(?:\.|$)/.test(name) ||
      /(?:^|[-_.])(secret|secrets|credential|credentials)(?:[-_.]|$)/.test(name) ||
      /\.(?:pem|p12|pfx|key|keystore)$/.test(name) ||
      /^(?:id_rsa|id_ed25519)$/.test(name)
    );
  });

  if (sensitive.length > 0) {
    throw new RalError(
      `Publication stopped because tracked or changed files may contain secrets:\n${sensitive
        .map((path) => `  - ${path}`)
        .join("\n")}\nReview or remove them before publishing.`
    );
  }
}

async function confirm(question, options) {
  if (options.yes) return true;
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question(`${question} [y/N] `);
    return /^y(?:es)?$/i.test(answer.trim());
  } finally {
    prompt.close();
  }
}

function jsonCommand(program, args, cwd, allowFailure = false) {
  const result = command(program, args, { cwd, allowFailure });
  if (!result.ok) return null;
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new RalError(`Could not parse JSON returned by ${program}.`);
  }
}

function chooseSourceRemote(cwd) {
  const remotes = command("git", ["remote"], { cwd }).stdout.split(/\r?\n/).filter(Boolean);
  for (const name of ["upstream", "origin", ...remotes]) {
    if (!remotes.includes(name)) continue;
    const url = command("git", ["remote", "get-url", name], { cwd }).stdout;
    try {
      return { name, url, ...parseGitHubRemote(url) };
    } catch {
      // Continue until a GitHub remote is found.
    }
  }
  throw new RalError("No GitHub remote found. Add an origin or upstream remote first.");
}

function branchName(cwd) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 13).replace("T", "-");
  const sha = command("git", ["rev-parse", "--short=8", "HEAD"], { cwd }).stdout;
  return `ral/${stamp}-${sha}`;
}

function ensureRemote(cwd, desiredName, url) {
  const remotes = command("git", ["remote"], { cwd }).stdout.split(/\r?\n/).filter(Boolean);
  if (!remotes.includes(desiredName)) {
    command("git", ["remote", "add", desiredName, url], { cwd });
    return desiredName;
  }

  const currentUrl = command("git", ["remote", "get-url", desiredName], { cwd }).stdout;
  if (currentUrl === url || currentUrl === url.replace("https://github.com/", "git@github.com:").replace(/\.git$/, ".git")) {
    return desiredName;
  }

  let suffix = 2;
  while (remotes.includes(`${desiredName}-${suffix}`)) suffix += 1;
  const fallback = `${desiredName}-${suffix}`;
  command("git", ["remote", "add", fallback, url], { cwd });
  return fallback;
}

async function prepareCommit(cwd, status, options) {
  if (!status) return;
  console.log("\nChanged files:\n");
  console.log(status);

  if (options.dryRun) {
    console.log("\n[dry-run] These changes would need a commit before publication.");
    return;
  }

  const approved = await confirm("Commit all changed files shown above?", options);
  if (!approved) throw new RalError("Nothing published. Commit or stash the changes and try again.");

  command("git", ["add", "--all"], { cwd });
  command("git", ["commit", "-m", options.message || "Publish reusable modification"], { cwd, inherit: true });
}

function ensurePublicFork(cwd, source, viewer, options) {
  const sourceInfo = jsonCommand(
    "gh",
    ["repo", "view", source.nameWithOwner, "--json", "nameWithOwner,url,visibility,isPrivate"],
    cwd
  );
  if (sourceInfo.isPrivate || sourceInfo.visibility !== "PUBLIC") {
    throw new RalError("The MVP only publishes from a public GitHub source repository.");
  }

  if (source.owner.toLowerCase() === viewer.toLowerCase()) {
    return { nameWithOwner: source.nameWithOwner, url: sourceInfo.url, gitUrl: `${sourceInfo.url}.git`, existing: true };
  }

  const forkName = `${viewer}/${source.repo}`;
  let fork = jsonCommand(
    "gh",
    ["repo", "view", forkName, "--json", "nameWithOwner,url,visibility,isFork,parent"],
    cwd,
    true
  );

  if (fork) {
    const parentName = fork.parent?.nameWithOwner?.toLowerCase();
    if (!fork.isFork || parentName !== source.nameWithOwner.toLowerCase()) {
      throw new RalError(`${forkName} already exists but is not a fork of ${source.nameWithOwner}.`);
    }
  } else if (options.dryRun) {
    return {
      nameWithOwner: forkName,
      url: `https://github.com/${forkName}`,
      gitUrl: `https://github.com/${forkName}.git`,
      existing: false
    };
  } else {
    console.log(`\nCreating public fork ${forkName}...`);
    command("gh", ["repo", "fork", source.nameWithOwner, "--clone=false"], { cwd, inherit: true });
    fork = jsonCommand(
      "gh",
      ["repo", "view", forkName, "--json", "nameWithOwner,url,visibility,isFork,parent"],
      cwd
    );
  }

  if (fork.visibility !== "PUBLIC") {
    throw new RalError(`The target fork ${forkName} is not public.`);
  }

  return { ...fork, gitUrl: `${fork.url}.git`, existing: true };
}

async function publish(options) {
  command("git", ["--version"]);
  command("gh", ["--version"]);

  const cwd = command("git", ["rev-parse", "--show-toplevel"]).stdout;
  command("git", ["rev-parse", "--verify", "HEAD"], { cwd });
  const source = chooseSourceRemote(cwd);
  const auth = command("gh", ["auth", "status", "--hostname", "github.com"], { cwd, allowFailure: true });
  if (!auth.ok) throw new RalError("GitHub CLI is not authenticated. Run: gh auth login");

  const viewer = command("gh", ["api", "user", "--jq", ".login"], { cwd }).stdout;
  const status = command("git", ["status", "--short"], { cwd }).stdout;
  const trackedPaths = command("git", ["ls-files"], { cwd }).stdout.split(/\r?\n/).filter(Boolean);
  assertNoObviousSecrets([...trackedPaths, ...parseStatusPaths(status)]);

  console.log("Reinvention Avoidance Layer publication");
  console.log(`  source: ${source.nameWithOwner} (${source.name})`);
  console.log(`  account: ${viewer}`);
  await prepareCommit(cwd, status, options);

  if (options.dryRun && status) {
    console.log("\n[dry-run] Commit the worktree, then run again to preview the exact branch and URL.");
    return;
  }

  const branch = branchName(cwd);
  const sha = command("git", ["rev-parse", "--short=12", "HEAD"], { cwd }).stdout;
  const fork = ensurePublicFork(cwd, source, viewer, options);
  const shareUrl = `${fork.url}/tree/${branch}`;

  console.log("\nPublication plan");
  console.log(`  commit: ${sha}`);
  console.log(`  target: ${fork.nameWithOwner}`);
  console.log(`  branch: ${branch}`);
  console.log(`  public: ${shareUrl}`);

  if (options.dryRun) {
    console.log(`\n[dry-run] ${fork.existing ? "No fork creation is needed." : "A public fork would be created."}`);
    console.log("[dry-run] No files were committed and nothing was pushed.");
    return;
  }

  const approved = await confirm("Publish this commit to the public target above?", options);
  if (!approved) throw new RalError("Nothing published.");

  const remote = ensureRemote(cwd, "ral-fork", fork.gitUrl);
  console.log(`\nPushing to ${remote}...`);
  command("git", ["push", remote, `HEAD:refs/heads/${branch}`], { cwd, inherit: true });

  console.log("\nPublished.");
  console.log(shareUrl);
  console.log("\nNo upstream pull request was created.");
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.command === "help") {
      console.log(HELP);
      return;
    }
    if (options.command === "version") {
      console.log(VERSION);
      return;
    }
    await publish(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`ral: ${message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main();
}

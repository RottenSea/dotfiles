#!/usr/bin/env node
// Links every file under Windows/ or Linux/ into the home directory, so editing a live config
// edits the repo. A <name>.template is first copied to <name> inside the repo (gitignored, for
// secrets), and <name> is linked. Run `npm run setup -- --help` for the options.

import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLATFORMS = { win32: "Windows", linux: "Linux" };

const HELP = `Usage: npm run setup -- [option]
   or: node scripts/install.mjs [option]

Links every file under Windows/ or Linux/ (picked by the system it runs on) into the
home directory. A link that already points at the repo is left alone. Anything else at
a target is moved into ~/dotfiles_backup_<time>/ first.

Options:
  --revert    Turn each managed link back into a standalone file with the same content.
  --backup    Copy the secret files made from .template into backup/<platform>/.
  --dry-run   Print what would happen without changing any file. Combines with the above.
  -h, --help  Show this help.`;

/** Maps a path under the platform folder to its live path. */
export function targetPath(rel, { platform, env }) {
  const parts = rel.split("/");
  if (platform === "Windows") {
    const roots = { "AppData/Roaming": env.APPDATA, "AppData/Local": env.LOCALAPPDATA, "AppData/LocalLow": join(env.USERPROFILE, "AppData", "LocalLow") };
    const prefix = parts.slice(0, 2).join("/");
    if (prefix in roots) return join(roots[prefix], ...parts.slice(2));
    return join(env.USERPROFILE, ...parts);
  }
  return join(env.HOME, ...parts);
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

/**
 * Lists the managed files: { rel, source, template }. A template's entry links the file
 * materialized from it; a file that has a template next to it is covered by that entry.
 */
export function managedFiles(platformDir) {
  const files = walk(platformDir);
  const templates = new Set(files.filter((file) => file.endsWith(".template")));
  return files
    .filter((file) => !templates.has(`${file}.template`))
    .map((file) => {
      const template = templates.has(file) ? file : null;
      const source = template ? file.slice(0, -".template".length) : file;
      return { rel: relative(platformDir, source).split(sep).join("/"), source, template };
    })
    .sort((a, b) => a.rel.localeCompare(b.rel));
}

const samePath = (a, b, platform) => (platform === "Windows" ? resolve(a).toLowerCase() === resolve(b).toLowerCase() : resolve(a) === resolve(b));

function linkTarget(path) {
  try {
    if (!lstatSync(path).isSymbolicLink()) return null;
    return resolve(dirname(path), readlinkSync(path));
  } catch {
    return null;
  }
}

/** What is at a target now: "missing", "linked" (to the source), "other-link" or "file". */
export function state(target, source, platform) {
  let stat;
  try {
    stat = lstatSync(target);
  } catch {
    return "missing";
  }
  if (!stat.isSymbolicLink()) return "file";
  return samePath(linkTarget(target), source, platform) ? "linked" : "other-link";
}

function sameContent(a, b) {
  try {
    return readFileSync(a).equals(readFileSync(b));
  } catch {
    return false;
  }
}

function timestamp(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/** Links every managed file. Returns counts for the summary. */
export function install({ root, platform, env, dryRun = false, now = new Date(), log = console.log }) {
  const home = platform === "Windows" ? env.USERPROFILE : env.HOME;
  const backupDir = join(home, `dotfiles_backup_${timestamp(now)}`);
  const counts = { linked: 0, unchanged: 0, materialized: 0, backedUp: 0 };

  for (const { rel, source, template } of managedFiles(join(root, platform))) {
    if (template && !existsSync(source)) {
      log(`[new]    ${platform}/${rel} from its template. Fill in its secrets.`);
      if (!dryRun) copyFileSync(template, source);
      counts.materialized++;
    }

    const target = targetPath(rel, { platform, env });
    const current = state(target, source, platform);
    if (current === "linked") {
      counts.unchanged++;
      continue;
    }

    if (current === "file" && !sameContent(target, source)) {
      // An app can save over the link with a plain file, so its changes never reach the repo.
      log(`[backup] ${rel}: a standalone file that differs from the repo. Compare the backup with the repo file.`);
    } else if (current === "other-link") {
      log(`[backup] ${rel}: a link to ${linkTarget(target) ?? "a missing file"}.`);
    }
    if (current !== "missing") {
      if (!dryRun) {
        const saved = join(backupDir, ...rel.split("/"));
        mkdirSync(dirname(saved), { recursive: true });
        renameSync(target, saved);
      }
      counts.backedUp++;
    }

    log(`[link]   ${rel}`);
    if (!dryRun) {
      mkdirSync(dirname(target), { recursive: true });
      try {
        symlinkSync(source, target, "file");
      } catch (error) {
        if (error.code === "EPERM" && platform === "Windows") {
          throw new Error("Windows refused to create a symbolic link. Turn on Developer Mode (Settings > System > For developers) or run from an elevated terminal.");
        }
        throw error;
      }
    }
    counts.linked++;
  }

  log(`\n${dryRun ? "Would link" : "Linked"} ${counts.linked}, ${counts.unchanged} already linked, ${counts.materialized} made from templates.`);
  if (counts.backedUp > 0) log(`${dryRun ? "Would move" : "Moved"} ${counts.backedUp} existing file(s) into ${backupDir}.`);
  return counts;
}

/** Turns each managed link back into a standalone file. */
export function revert({ root, platform, env, dryRun = false, log = console.log }) {
  let count = 0;
  for (const { rel, source } of managedFiles(join(root, platform))) {
    const target = targetPath(rel, { platform, env });
    if (state(target, source, platform) !== "linked") continue;
    log(`[revert] ${rel}`);
    if (!dryRun) {
      const content = readFileSync(target);
      rmSync(target);
      writeFileSync(target, content);
    }
    count++;
  }
  log(`\n${dryRun ? "Would turn" : "Turned"} ${count} link(s) into standalone files. The repo is unchanged.`);
  return count;
}

/** Copies the files made from templates into backup/<platform>/. */
export function backup({ root, platform, dryRun = false, log = console.log }) {
  let count = 0;
  for (const { rel, source, template } of managedFiles(join(root, platform))) {
    if (!template) continue;
    if (!existsSync(source)) {
      log(`[skip]   ${platform}/${rel}: not made from its template yet.`);
      continue;
    }
    log(`[copy]   ${platform}/${rel}`);
    if (!dryRun) {
      const dest = join(root, "backup", platform, ...rel.split("/"));
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(source, dest);
    }
    count++;
  }
  log(`\n${dryRun ? "Would copy" : "Copied"} ${count} file(s) into backup/${platform}/. The folder holds secrets and stays out of git.`);
  return count;
}

function main(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      revert: { type: "boolean", default: false },
      backup: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) return console.log(HELP);
  if (values.revert && values.backup) throw new Error("--revert and --backup do different things. Pass one of them.");

  const platform = PLATFORMS[process.platform];
  if (!platform) throw new Error(`There are no configs for ${process.platform}. Only Windows and Linux are covered.`);
  const options = { root: ROOT, platform, env: process.env, dryRun: values["dry-run"] };
  if (values["dry-run"]) console.log("Dry run: nothing will change.\n");

  if (values.revert) revert(options);
  else if (values.backup) backup(options);
  else install(options);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

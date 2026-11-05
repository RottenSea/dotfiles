import assert from "node:assert/strict";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, beforeEach, describe, test } from "node:test";
import { backup, install, managedFiles, revert, state, targetPath } from "../install.mjs";

const temp = mkdtempSync(join(tmpdir(), "dotfiles-"));
after(() => rmSync(temp, { recursive: true, force: true }));

function write(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

const quiet = () => {};
const now = new Date(2026, 10, 5, 9, 30, 0);

describe("targetPath", () => {
  const env = { USERPROFILE: "/u", APPDATA: "/u/AppData/Roaming", LOCALAPPDATA: "/u/AppData/Local", HOME: "/home/me" };

  test("maps the AppData folders on Windows", () => {
    assert.equal(targetPath("AppData/Roaming/Code/User/settings.json", { platform: "Windows", env }), join("/u/AppData/Roaming", "Code/User/settings.json"));
    assert.equal(targetPath("AppData/Local/x.json", { platform: "Windows", env }), join("/u/AppData/Local", "x.json"));
    assert.equal(targetPath("AppData/LocalLow/x.json", { platform: "Windows", env }), join("/u", "AppData/LocalLow/x.json"));
    assert.equal(targetPath(".claude/CLAUDE.md", { platform: "Windows", env }), join("/u", ".claude/CLAUDE.md"));
  });

  test("maps everything under HOME on Linux", () => {
    assert.equal(targetPath(".config/kitty/kitty.conf", { platform: "Linux", env }), join("/home/me", ".config/kitty/kitty.conf"));
  });
});

describe("with a repo and a home directory", () => {
  let root;
  let env;
  let options;

  beforeEach(() => {
    const base = mkdtempSync(join(temp, "case-"));
    root = join(base, "repo");
    const home = join(base, "home");
    env = { USERPROFILE: home, APPDATA: join(home, "AppData", "Roaming"), LOCALAPPDATA: join(home, "AppData", "Local") };
    options = { root, platform: "Windows", env, now, log: quiet };
    write(join(root, "Windows/.bashrc"), "plain");
    write(join(root, "Windows/.claude/settings.json.template"), "YOUR_TOKEN");
    write(join(root, "Windows/AppData/Roaming/Code/User/settings.json"), "editor");
    mkdirSync(home, { recursive: true });
  });

  const live = (rel) => targetPath(rel, { platform: "Windows", env });

  test("lists templates by the file they make", () => {
    write(join(root, "Windows/.claude/settings.json"), "secret");
    assert.deepEqual(
      managedFiles(join(root, "Windows")).map(({ rel, template }) => [rel, Boolean(template)]),
      [[".bashrc", false], [".claude/settings.json", true], ["AppData/Roaming/Code/User/settings.json", false]],
    );
  });

  test("links every file and materializes templates", () => {
    const counts = install(options);
    assert.deepEqual(counts, { linked: 3, unchanged: 0, materialized: 1, backedUp: 0 });
    assert.equal(readFileSync(join(root, "Windows/.claude/settings.json"), "utf8"), "YOUR_TOKEN");
    assert.equal(state(live(".claude/settings.json"), join(root, "Windows/.claude/settings.json"), "Windows"), "linked");
    assert.equal(readFileSync(live("AppData/Roaming/Code/User/settings.json"), "utf8"), "editor");
    assert.ok(!existsSync(join(env.USERPROFILE, "dotfiles_backup_20261105_093000")));
  });

  test("leaves correct links alone on a second run", () => {
    install(options);
    assert.deepEqual(install(options), { linked: 0, unchanged: 3, materialized: 0, backedUp: 0 });
  });

  test("keeps a materialized file that already exists", () => {
    write(join(root, "Windows/.claude/settings.json"), "secret");
    install(options);
    assert.equal(readFileSync(join(root, "Windows/.claude/settings.json"), "utf8"), "secret");
  });

  test("backs up a standalone file and a wrong link, then links", () => {
    write(live(".bashrc"), "changed by an app");
    write(join(env.USERPROFILE, "elsewhere"), "other");
    mkdirSync(dirname(live("AppData/Roaming/Code/User/settings.json")), { recursive: true });
    symlinkSync(join(env.USERPROFILE, "elsewhere"), live("AppData/Roaming/Code/User/settings.json"), "file");
    const lines = [];
    const counts = install({ ...options, log: (line) => lines.push(line) });
    assert.equal(counts.backedUp, 2);
    const backupDir = join(env.USERPROFILE, "dotfiles_backup_20261105_093000");
    assert.equal(readFileSync(join(backupDir, ".bashrc"), "utf8"), "changed by an app");
    assert.ok(lstatSync(join(backupDir, "AppData/Roaming/Code/User/settings.json")).isSymbolicLink());
    assert.ok(lines.some((line) => line.includes("differs from the repo")));
    assert.equal(state(live(".bashrc"), join(root, "Windows/.bashrc"), "Windows"), "linked");
  });

  test("changes nothing in a dry run", () => {
    write(live(".bashrc"), "changed by an app");
    const counts = install({ ...options, dryRun: true });
    assert.deepEqual(counts, { linked: 3, unchanged: 0, materialized: 1, backedUp: 1 });
    assert.ok(!existsSync(join(root, "Windows/.claude/settings.json")));
    assert.equal(state(live(".bashrc"), join(root, "Windows/.bashrc"), "Windows"), "file");
    assert.deepEqual(readdirSync(env.USERPROFILE).sort(), [".bashrc"]);
  });

  test("reverts managed links into standalone files", () => {
    install(options);
    assert.equal(revert(options), 3);
    assert.ok(!lstatSync(live(".bashrc")).isSymbolicLink());
    assert.equal(readFileSync(live(".bashrc"), "utf8"), "plain");
    assert.equal(revert(options), 0);
  });

  test("copies materialized files into backup/", () => {
    assert.equal(backup(options), 0);
    install(options);
    assert.equal(backup(options), 1);
    assert.equal(readFileSync(join(root, "backup/Windows/.claude/settings.json"), "utf8"), "YOUR_TOKEN");
  });
});

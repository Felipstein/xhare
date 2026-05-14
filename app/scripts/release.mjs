#!/usr/bin/env node
/**
 * One-shot release script.
 *
 * Usage (from the `app/` directory):
 *   pnpm release patch       0.1.0 → 0.1.1
 *   pnpm release minor       0.1.5 → 0.2.0
 *   pnpm release major       0.4.2 → 1.0.0
 *
 * What it does:
 *   1. Refuses to run if the working tree is dirty or you're not on main.
 *   2. Reads the current version from package.json.
 *   3. Bumps the chosen segment (semver).
 *   4. Writes the new version into package.json, tauri.conf.json and
 *      Cargo.toml so all three manifests stay in sync.
 *   5. Commits the bumps with a `release: vX.Y.Z` message.
 *   6. Creates an annotated tag `vX.Y.Z` and pushes both the commit and the
 *      tag. The tag push triggers `.github/workflows/release.yml` which builds
 *      the macOS .dmg and Windows .msi and publishes a GitHub Release.
 *
 * The script aborts on any failure — partial state means git is left as it
 * was, so it's safe to retry after fixing whatever blocked it.
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(APP_ROOT, '..');

const PACKAGE_JSON = resolve(APP_ROOT, 'package.json');
const TAURI_CONF = resolve(APP_ROOT, 'src-tauri/tauri.conf.json');
const CARGO_TOML = resolve(APP_ROOT, 'src-tauri/Cargo.toml');

const VALID_BUMPS = new Set(['patch', 'minor', 'major']);

function die(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function ok(message) {
  console.info(`✔ ${message}`);
}

function info(message) {
  console.info(`· ${message}`);
}

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'pipe', cwd: REPO_ROOT, ...opts }).toString().trim();
}

function bumpSemver(current, kind) {
  const match = current.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) die(`current version "${current}" is not plain semver (x.y.z)`);
  let [, major, minor, patch] = match.map((s, i) => (i === 0 ? s : Number.parseInt(s, 10)));
  if (kind === 'patch') patch += 1;
  else if (kind === 'minor') {
    minor += 1;
    patch = 0;
  } else if (kind === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  }
  return `${major}.${minor}.${patch}`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, data) {
  // Preserve final newline like Prettier does.
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function updateCargoToml(newVersion) {
  const content = readFileSync(CARGO_TOML, 'utf8');
  const pattern = /^(\s*version\s*=\s*)"[^"]+"/m;
  if (!pattern.test(content)) die('could not find version line in Cargo.toml');
  writeFileSync(CARGO_TOML, content.replace(pattern, `$1"${newVersion}"`));
}

// ─── Sanity checks ────────────────────────────────────────────────────────

const kind = process.argv[2];
if (!kind || !VALID_BUMPS.has(kind)) {
  die('usage: pnpm release <patch|minor|major>');
}

try {
  run('git rev-parse --is-inside-work-tree');
} catch {
  die('not inside a git repo');
}

const branch = run('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main') {
  die(`must be on main, currently on "${branch}"`);
}

const dirty = run('git status --porcelain');
if (dirty.length > 0) {
  die('working tree is dirty — commit or stash before releasing\n' + dirty);
}

// Make sure local main is in sync with origin so we don't tag behind remote.
info('fetching origin…');
run('git fetch origin main --quiet');
const local = run('git rev-parse HEAD');
const remote = run('git rev-parse origin/main');
if (local !== remote) {
  die('local main is not in sync with origin/main — pull or push first');
}

// ─── Compute new version ─────────────────────────────────────────────────

const pkg = readJson(PACKAGE_JSON);
const currentVersion = pkg.version;
const newVersion = bumpSemver(currentVersion, kind);
const newTag = `v${newVersion}`;

// Refuse to overwrite an existing tag.
try {
  run(`git rev-parse ${newTag}`, { stdio: 'pipe' });
  die(`tag ${newTag} already exists`);
} catch {
  /* expected — tag should not exist yet */
}

info(`current:  ${currentVersion}`);
info(`new:      ${newVersion}  (${kind})`);
info(`tag:      ${newTag}`);
info('');

// ─── Write the three manifests ───────────────────────────────────────────

pkg.version = newVersion;
writeJson(PACKAGE_JSON, pkg);
ok(`bumped package.json`);

const tauriConf = readJson(TAURI_CONF);
tauriConf.version = newVersion;
writeJson(TAURI_CONF, tauriConf);
ok(`bumped tauri.conf.json`);

updateCargoToml(newVersion);
ok(`bumped Cargo.toml`);

// Cargo updates Cargo.lock with the new version on the next build. Doing it
// proactively here keeps the commit complete instead of leaving an orphan
// lockfile diff on the next `cargo build`.
info('refreshing Cargo.lock…');
run('cargo update -p xhare --offline', { cwd: resolve(APP_ROOT, 'src-tauri') });
ok('refreshed Cargo.lock');

// ─── Commit + tag + push ─────────────────────────────────────────────────

run(
  `git add ${PACKAGE_JSON} ${TAURI_CONF} ${CARGO_TOML} ${resolve(APP_ROOT, 'src-tauri/Cargo.lock')}`,
);
run(`git commit -m "release: ${newTag}"`);
ok(`committed release: ${newTag}`);

run(`git tag -a ${newTag} -m "Release ${newTag}"`);
ok(`tagged ${newTag}`);

info('pushing commit and tag…');
run('git push origin main');
run(`git push origin ${newTag}`);
ok(`pushed ${newTag}`);

info('');
ok(`Release ${newTag} kicked off.`);
info('Watch the build at:');
info('  https://github.com/Felipstein/xhare/actions');
info('Release will appear at:');
info(`  https://github.com/Felipstein/xhare/releases/tag/${newTag}`);

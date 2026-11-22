/**
 * Publishes the demo (invented data, no server features) to its own
 * Cloudflare Pages project, without Access: `npm run deploy:demo`.
 * Deployed from a copy outside the repo so no Pages Functions (functions/)
 * and no private wrangler.toml settings are picked up.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const PROJECT = process.env.DEMO_PROJECT ?? 'truce-demo';

execFileSync('npm', ['run', 'build:demo'], { cwd: ROOT, stdio: 'inherit' });
const dir = mkdtempSync(join(tmpdir(), 'truce-demo-'));
cpSync(join(ROOT, 'dist-demo'), join(dir, 'site'), { recursive: true });
try {
  execFileSync(join(ROOT, 'node_modules/.bin/wrangler'), ['pages', 'deploy', 'site', '--project-name', PROJECT, '--branch', 'main', '--commit-dirty=true'], { cwd: dir, stdio: 'inherit' });
} finally {
  rmSync(dir, { recursive: true, force: true });
}

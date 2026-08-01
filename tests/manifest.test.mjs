import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'stack.manifest.json'), 'utf8'));

test('component ids and pins are unique and explicit', () => {
  assert.equal(new Set(manifest.components.map((component) => component.id)).size, manifest.components.length);
  for (const component of manifest.components) {
    assert.match(component.revision, /^[0-9a-f]{40}$/);
    assert.match(component.repository, /^https:\/\/github\.com\//);
  }
});

test('distribution accounts for every requested portable surface', () => {
  const surfaces = manifest.portable_surfaces.join(' ').toLowerCase();
  for (const expected of ['claude', 'codex', 'skills', 'agent definitions', 'hooks', 'playbooks', 'herdr']) {
    assert.match(surfaces, new RegExp(expected));
  }
});

test('Claude and Codex agent roles use their host-native formats', () => {
  const claude = readdirSync(join(root, 'profiles', 'agents')).filter((name) => name.endsWith('.md')).map((name) => name.replace(/\.md$/, '')).sort();
  const codex = readdirSync(join(root, 'profiles', 'codex-agents')).filter((name) => name.endsWith('.toml')).map((name) => name.replace(/^siso-/, '').replace(/\.toml$/, '')).sort();
  assert.deepEqual(codex, claude);
  for (const name of codex) {
    const content = readFileSync(join(root, 'profiles', 'codex-agents', `siso-${name}.toml`), 'utf8');
    assert.match(content, /^name\s*=\s*"[^"]+"/m);
    assert.match(content, /^description\s*=\s*"[^"]+"/m);
    assert.match(content, /^developer_instructions\s*=\s*"""/m);
  }
});

test('plan is deterministic and does not mutate the home directory', () => {
  const result = spawnSync(process.execPath, [join(root, 'bin', 'siso-stack.mjs'), 'plan', '--required-only'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /required\thooks\t/);
  assert.doesNotMatch(result.stdout, /optional\t/);
});

test('missing option values and unknown operations fail safely', () => {
  const cli = join(root, 'bin', 'siso-stack.mjs');
  assert.equal(spawnSync(process.execPath, [cli, 'install', '--dry-run', '--home'], { encoding: 'utf8' }).status, 2);
  assert.equal(spawnSync(process.execPath, [cli, 'instal'], { encoding: 'utf8' }).status, 2);
  assert.equal(spawnSync(process.execPath, [cli], { encoding: 'utf8' }).status, 2);
  assert.equal(spawnSync(process.execPath, [cli, 'help'], { encoding: 'utf8' }).status, 0);
});

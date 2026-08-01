#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'stack.manifest.json'), 'utf8'));
const failures = [];
const ids = new Set();
const privatePatterns = [
  ['', 'Users', 'shaan' + 'sisodia'].join('/'),
  ['tail100d11', 'ts', 'net'].join('.'),
  ['ANTHROPIC', 'AUTH', 'TOKEN'].join('_'),
  ['OPENAI', 'API', 'KEY'].join('_'),
  ['.minimax', 'key'].join('-')
];

for (const component of manifest.components) {
  if (ids.has(component.id)) failures.push(`duplicate component id: ${component.id}`);
  ids.add(component.id);
  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\.git$/.test(component.repository)) {
    failures.push(`${component.id}: repository must be a GitHub HTTPS clone URL`);
  }
  if (!/^[0-9a-f]{40}$/.test(component.revision) || /^0+$/.test(component.revision)) {
    failures.push(`${component.id}: revision must be a non-zero full commit SHA`);
  }
  if (!component.license) failures.push(`${component.id}: license is required`);
}

for (const relative of ['README.md', 'install.sh', 'bin/siso-stack.mjs', 'profiles/claude.md', 'profiles/codex.md']) {
  if (!existsSync(join(root, relative))) failures.push(`missing distribution file: ${relative}`);
}

const inventory = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' });
if (inventory.status !== 0) failures.push('could not enumerate publishable files');
for (const relative of inventory.stdout.split('\n').filter(Boolean)) {
  const source = readFileSync(join(root, relative));
  if (source.includes(0)) continue;
  const content = source.toString('utf8');
  for (const pattern of privatePatterns) {
    if (content.includes(pattern)) failures.push(`${relative}: forbidden public pattern ${pattern}`);
  }
}

const syntax = spawnSync(process.execPath, ['--check', join(root, 'bin', 'siso-stack.mjs')], { encoding: 'utf8' });
if (syntax.status !== 0) failures.push('bin/siso-stack.mjs: syntax check failed');

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
console.log(`PASS stack manifest: ${manifest.components.length} pinned components, ${manifest.portable_surfaces.length} portable surfaces`);

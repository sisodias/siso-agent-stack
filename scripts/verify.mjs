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
const secretPatterns = [
  { label: 'private key', pattern: new RegExp(['-----BEGIN', '(?:RSA |EC |OPENSSH )?', 'PRIVATE KEY-----'].join('\\s*'), 'i') },
  { label: 'GitHub token', pattern: new RegExp(['gh', '[pousr]_', '[A-Za-z0-9]{20,}'].join('')) },
  { label: 'provider token', pattern: new RegExp(['s', 'k-', '[A-Za-z0-9_-]{20,}'].join('')) },
  { label: 'AWS access key', pattern: new RegExp(['AK', 'IA', '[A-Z0-9]{16}'].join('')) },
  { label: 'assigned secret', pattern: new RegExp(`(?:${['api', 'key'].join('[_-]?')}|${['access', 'token'].join('[_-]?')}|${['client', 'secret'].join('[_-]?')}|password)\\s*[:=]\\s*["'][^"']{16,}["']`, 'i') },
  { label: 'private host', pattern: new RegExp(`(?:${['10', '\\d{1,3}', '\\d{1,3}', '\\d{1,3}'].join('\\.')}|${['192', '168', '\\d{1,3}', '\\d{1,3}'].join('\\.')}|${['172', '(?:1[6-9]|2\\d|3[01])', '\\d{1,3}', '\\d{1,3}'].join('\\.')}|[A-Za-z0-9.-]+\\.${['ts', 'net'].join('\\.')})`, 'i') }
];
const forbiddenNames = /(?:^|\/)(?:\.env(?:\..*)?|id_rsa|credentials(?:\.json)?|secrets?(?:\.[^/]*)?|[^/]+\.(?:pem|p12|key|sqlite|sqlite3|db|log))$/i;

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
  if (forbiddenNames.test(relative)) failures.push(`${relative}: forbidden publishable filename`);
  const source = readFileSync(join(root, relative));
  if (source.includes(0)) {
    failures.push(`${relative}: unexpected binary publishable`);
    continue;
  }
  const content = source.toString('utf8');
  for (const pattern of privatePatterns) {
    if (content.includes(pattern)) failures.push(`${relative}: forbidden public pattern ${pattern}`);
  }
  for (const detector of secretPatterns) {
    if (detector.pattern.test(content)) failures.push(`${relative}: suspected ${detector.label}`);
  }
}

const syntax = spawnSync(process.execPath, ['--check', join(root, 'bin', 'siso-stack.mjs')], { encoding: 'utf8' });
if (syntax.status !== 0) failures.push('bin/siso-stack.mjs: syntax check failed');

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
console.log(`PASS stack manifest: ${manifest.components.length} pinned components, ${manifest.portable_surfaces.length} portable surfaces`);

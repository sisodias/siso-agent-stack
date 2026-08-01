import test from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const verifier = join(root, 'scripts', 'verify.mjs');

test('privacy verifier scans every publishable file', () => {
  const fixture = join(root, 'privacy-leak.fixture');
  try {
    writeFileSync(fixture, ['', 'Users', 'shaan' + 'sisodia', 'private'].join('/'));
    const result = spawnSync(process.execPath, [verifier], { cwd: root, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /privacy-leak\.fixture/);
  } finally {
    unlinkSync(fixture);
  }
});

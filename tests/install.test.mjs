import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const cli = join(root, 'bin', 'siso-stack.mjs');
const sourceRoot = resolve(root, '..');

function run(home, operation) {
  return spawnSync(process.execPath, [cli, operation, '--home', home, '--source-root', sourceRoot, '--required-only'], { encoding: 'utf8' });
}

test('clean install is backup-stable and doctor rejects receipt omission and dirty pins', () => {
  const home = mkdtempSync(join(tmpdir(), 'siso-stack-test-'));
  assert.equal(run(home, 'install').status, 0);
  assert.equal(run(home, 'install').status, 0);
  assert.equal(run(home, 'doctor').status, 0);
  const distributionShim = join(home, '.local', 'bin', 'siso-stack');
  const originalDistributionShim = readFileSync(distributionShim, 'utf8');
  assert.match(originalDistributionShim, /managed by siso-agent-stack/);
  assert.equal(readdirSync(join(home, '.claude')).filter((name) => name.includes('.siso-backup-')).length, 0);
  assert.equal(readdirSync(join(home, '.codex')).filter((name) => name.includes('.siso-backup-')).length, 0);

  writeFileSync(distributionShim, '#!/bin/sh\nexit 0\n');
  assert.notEqual(run(home, 'doctor').status, 0);
  writeFileSync(distributionShim, originalDistributionShim);

  const receiptPath = join(home, '.siso', 'agent-stack', 'install-receipt.json');
  const originalReceipt = readFileSync(receiptPath, 'utf8');
  const receipt = JSON.parse(originalReceipt);
  receipt.components = receipt.components.filter((component) => component.id !== 'hooks');
  writeFileSync(receiptPath, JSON.stringify(receipt));
  assert.notEqual(run(home, 'doctor').status, 0);
  writeFileSync(receiptPath, originalReceipt);

  writeFileSync(join(home, '.siso', 'agent-stack', 'repos', 'hooks', 'dirty.fixture'), 'dirty');
  assert.notEqual(run(home, 'doctor').status, 0);
});

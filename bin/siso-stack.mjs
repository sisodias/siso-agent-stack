#!/usr/bin/env node
import {
  chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync,
  readdirSync, readlinkSync, renameSync, symlinkSync, unlinkSync, writeFileSync
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const distributionRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(distributionRoot, 'stack.manifest.json'), 'utf8'));
const operation = process.argv[2] || '';
let options;
try {
  options = parseOptions(process.argv.slice(3));
} catch (error) {
  console.error(`ERROR ${error.message}`);
  printUsage();
  process.exit(2);
}
const targetHome = resolve(options.home || homedir());
const stackRoot = resolve(options.root || join(targetHome, '.siso', 'agent-stack'));
const repositoriesRoot = join(stackRoot, 'repos');
const profileRoot = join(stackRoot, 'profile');
const binRoot = join(targetHome, '.local', 'bin');
const receiptPath = join(stackRoot, 'install-receipt.json');
const failures = [];

function parseOptions(args) {
  const parsed = {};
  const valueAfter = (index, option) => {
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${option} requires a value`);
    return value;
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--home') parsed.home = valueAfter(index++, '--home');
    else if (arg === '--root') parsed.root = valueAfter(index++, '--root');
    else if (arg === '--source-root') parsed.sourceRoot = resolve(valueAfter(index++, '--source-root'));
    else if (arg === '--required-only') parsed.requiredOnly = true;
    else if (arg === '--no-external') parsed.noExternal = true;
    else if (arg === '--dry-run') parsed.dryRun = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return parsed;
}

function printUsage() {
  console.log('Usage: siso-stack <install|doctor|plan> [--home PATH] [--root PATH] [--source-root PATH] [--required-only] [--no-external] [--dry-run]');
}

function run(command, args, configuration = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...configuration });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed: ${(result.stderr || result.stdout || '').trim()}`);
  }
  return result.stdout.trim();
}

function includedComponents() {
  return manifest.components.filter((component) => {
    if (options.requiredOnly && !component.required) return false;
    if (options.noExternal && component.install === 'external-source') return false;
    return true;
  });
}

function repositoryPath(component) {
  return join(repositoriesRoot, component.id);
}

function localSource(component) {
  if (!options.sourceRoot) return null;
  const candidates = [component.id, `siso-${component.id}`, component.repository.split('/').at(-1).replace(/\.git$/, '')];
  return candidates.map((candidate) => join(options.sourceRoot, candidate)).find((candidate) => existsSync(join(candidate, '.git'))) || null;
}

function materialize(component) {
  const destination = repositoryPath(component);
  if (options.dryRun) {
    console.log(`CLONE ${component.repository}@${component.revision} -> ${destination}`);
    return;
  }
  mkdirSync(repositoriesRoot, { recursive: true });
  const existingCheckout = existsSync(join(destination, '.git'));
  if (!existingCheckout) {
    const source = localSource(component) || component.repository;
    run('git', ['clone', '--no-checkout', source, destination]);
  }
  if (existingCheckout) {
    const dirty = run('git', ['-C', destination, 'status', '--porcelain']);
    if (dirty) throw new Error(`managed component is dirty: ${destination}`);
  }
  const origin = run('git', ['-C', destination, 'remote', 'get-url', 'origin']);
  if (!localSource(component) && origin !== component.repository) {
    throw new Error(`${component.id}: origin ${origin} does not match ${component.repository}`);
  }
  let hasCommit = spawnSync('git', ['-C', destination, 'cat-file', '-e', `${component.revision}^{commit}`]).status === 0;
  if (!hasCommit) {
    run('git', ['-C', destination, 'fetch', '--depth', '1', 'origin', component.revision]);
    hasCommit = true;
  }
  if (hasCommit) run('git', ['-C', destination, 'checkout', '--detach', component.revision]);
  const actual = run('git', ['-C', destination, 'rev-parse', 'HEAD']);
  if (actual !== component.revision) throw new Error(`${component.id}: expected ${component.revision}, got ${actual}`);
  console.log(`PIN   ${component.id} ${actual.slice(0, 12)}`);
}

function walkFor(root, targetName, found = []) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) walkFor(path, targetName, found);
    else if (entry.name === targetName) found.push(path);
  }
  return found;
}

function managedLink(source, destination) {
  mkdirSync(dirname(destination), { recursive: true });
  if (existsSync(destination) || lstatExists(destination)) {
    if (lstatExists(destination) && lstatSync(destination).isSymbolicLink() && readlinkSync(destination) === source) return;
    if (lstatExists(destination) && lstatSync(destination).isSymbolicLink()) {
      const previousSource = readlinkSync(destination);
      if (previousSource === stackRoot || previousSource.startsWith(`${stackRoot}/`)) {
        unlinkSync(destination);
        symlinkSync(source, destination);
        return;
      }
    }
    throw new Error(`install collision (preserved): ${destination}`);
  }
  symlinkSync(source, destination);
}

function lstatExists(path) {
  try { lstatSync(path); return true; } catch { return false; }
}

function installSkills() {
  const sources = new Map();
  const hub = repositoryPath(manifest.components.find((component) => component.id === 'skills'));
  for (const skillFile of walkFor(join(hub, 'registry', 'skills'), 'SKILL.md')) {
    sources.set(basename(dirname(skillFile)), dirname(skillFile));
  }
  const playbook = repositoryPath(manifest.components.find((component) => component.id === 'playbook'));
  if (existsSync(join(playbook, 'skills'))) {
    for (const skillFile of walkFor(join(playbook, 'skills'), 'SKILL.md')) {
      sources.set(basename(dirname(skillFile)), dirname(skillFile));
    }
  }
  for (const [name, source] of sources) {
    managedLink(source, join(targetHome, '.claude', 'skills', name));
    managedLink(source, join(targetHome, '.codex', 'skills', name));
  }
  return sources.size;
}

function installAgents() {
  const claudeSource = join(distributionRoot, 'profiles', 'agents');
  const codexSource = join(distributionRoot, 'profiles', 'codex-agents');
  const claudeInstalled = join(profileRoot, 'agents', 'claude');
  const codexInstalled = join(profileRoot, 'agents', 'codex');
  mkdirSync(claudeInstalled, { recursive: true });
  mkdirSync(codexInstalled, { recursive: true });
  let count = 0;
  for (const entry of readdirSync(claudeSource)) {
    if (!entry.endsWith('.md')) continue;
    copyFileSync(join(claudeSource, entry), join(claudeInstalled, entry));
    managedLink(join(claudeInstalled, entry), join(targetHome, '.claude', 'agents', entry));
    count += 1;
  }
  for (const entry of readdirSync(codexSource)) {
    if (!entry.endsWith('.toml')) continue;
    copyFileSync(join(codexSource, entry), join(codexInstalled, entry));
    managedLink(join(codexInstalled, entry), join(targetHome, '.codex', 'agents', entry));
  }
  return count;
}

function installShim(name, executable) {
  const destination = join(binRoot, name);
  mkdirSync(binRoot, { recursive: true });
  const content = shimContent(executable);
  if (existsSync(destination)) {
    const existing = readFileSync(destination, 'utf8');
    if (!existing.includes('# managed by siso-agent-stack')) {
      throw new Error(`command collision (preserved): ${destination}`);
    }
  }
  writeFileSync(destination, content, { mode: 0o755 });
  chmodSync(destination, 0o755);
}

function shimContent(executable) {
  return `#!/bin/sh\n# managed by siso-agent-stack\nexec '${executable.replaceAll("'", "'\\''")}' "$@"\n`;
}

function exactManagedLink(source, destination) {
  return lstatExists(destination)
    && lstatSync(destination).isSymbolicLink()
    && readlinkSync(destination) === source;
}

function installCommands(components) {
  let count = 0;
  for (const component of components) {
    for (const [name, relative] of Object.entries(component.commands || {})) {
      const executable = join(repositoryPath(component), relative);
      if (!existsSync(executable)) throw new Error(`${component.id}: missing command ${relative}`);
      installShim(name, executable);
      count += 1;
    }
  }
  return count;
}

function replaceManagedBlock(path, block) {
  const begin = '<!-- BEGIN SISO AGENT STACK -->';
  const end = '<!-- END SISO AGENT STACK -->';
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const pattern = new RegExp(`${begin}[\\s\\S]*?${end}\\n?`, 'g');
  const retained = existing.replace(pattern, '').trimEnd();
  const next = `${retained}${retained ? '\n\n' : ''}${begin}\n${block.trim()}\n${end}\n`;
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path) && existing !== next) {
    const backup = `${path}.siso-backup-${Date.now()}`;
    copyFileSync(path, backup);
  }
  writeFileSync(path, next, { mode: 0o600 });
}

function installProfiles() {
  mkdirSync(profileRoot, { recursive: true });
  copyFileSync(join(distributionRoot, 'profiles', 'claude.md'), join(profileRoot, 'claude.md'));
  copyFileSync(join(distributionRoot, 'profiles', 'codex.md'), join(profileRoot, 'codex.md'));
  replaceManagedBlock(join(targetHome, '.claude', 'CLAUDE.md'), `@${join(profileRoot, 'claude.md')}`);
  replaceManagedBlock(join(targetHome, '.codex', 'AGENTS.md'), `Read and follow the portable profile at ${join(profileRoot, 'codex.md')}.`);
}

function installHooks() {
  const hooks = manifest.components.find((component) => component.id === 'hooks');
  const cli = join(repositoryPath(hooks), 'bin', 'siso-hooks.mjs');
  run(process.execPath, [cli, 'install', '--home', targetHome]);
}

function install() {
  const components = includedComponents();
  for (const component of components) materialize(component);
  if (options.dryRun) return;
  installProfiles();
  const agentCount = installAgents();
  const skillCount = installSkills();
  const commandCount = installCommands(components);
  installHooks();
  const receipt = {
    schema_version: 1,
    stack_version: manifest.version,
    installed_at: new Date().toISOString(),
    home: targetHome,
    root: stackRoot,
    components: components.map(({ id, revision, repository }) => ({ id, revision, repository })),
    skill_count: skillCount,
    agent_count: agentCount,
    command_count: commandCount
  };
  mkdirSync(dirname(receiptPath), { recursive: true });
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  console.log(`PASS installed SISO Agent Stack ${manifest.version}: ${components.length} components, ${skillCount} skills, ${commandCount} commands`);
}

function doctor() {
  let receipt = null;
  if (!existsSync(receiptPath)) failures.push(`missing install receipt: ${receiptPath}`);
  else {
    try { receipt = JSON.parse(readFileSync(receiptPath, 'utf8')); }
    catch { failures.push(`invalid install receipt: ${receiptPath}`); }
  }
  if (receipt) {
    if (receipt.stack_version !== manifest.version) failures.push(`receipt stack version ${receipt.stack_version} does not match ${manifest.version}`);
    if (receipt.home !== targetHome) failures.push(`receipt home ${receipt.home} does not match ${targetHome}`);
    if (receipt.root !== stackRoot) failures.push(`receipt root ${receipt.root} does not match ${stackRoot}`);
  }
  const componentById = new Map(manifest.components.map((component) => [component.id, component]));
  const components = receipt
    ? receipt.components.flatMap((record) => componentById.has(record.id) ? [componentById.get(record.id)] : [])
    : includedComponents();
  if (receipt) {
    for (const record of receipt.components) {
      const expected = componentById.get(record.id);
      if (!expected) failures.push(`receipt contains unknown component: ${record.id}`);
      else if (record.revision !== expected.revision || record.repository !== expected.repository) {
        failures.push(`receipt metadata differs from manifest: ${record.id}`);
      }
    }
  }
  for (const component of components) {
    const path = repositoryPath(component);
    if (!existsSync(join(path, '.git'))) {
      failures.push(`missing component: ${component.id}`);
      continue;
    }
    const actual = spawnSync('git', ['-C', path, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
    if (actual !== component.revision) failures.push(`${component.id}: expected ${component.revision}, got ${actual || 'missing'}`);
    for (const relative of Object.values(component.commands || {})) {
      if (!existsSync(join(path, relative))) failures.push(`${component.id}: missing command ${relative}`);
    }
  }
  for (const profile of [join(targetHome, '.claude', 'CLAUDE.md'), join(targetHome, '.codex', 'AGENTS.md')]) {
    if (!existsSync(profile) || !readFileSync(profile, 'utf8').includes('BEGIN SISO AGENT STACK')) failures.push(`missing managed profile block: ${profile}`);
  }
  for (const [host, name] of [['claude', 'claude.md'], ['codex', 'codex.md']]) {
    const installed = join(profileRoot, name);
    const source = join(distributionRoot, 'profiles', name);
    if (!existsSync(installed) || !readFileSync(installed).equals(readFileSync(source))) {
      failures.push(`${host} portable profile differs from release source: ${installed}`);
    }
  }
  const agentNames = readdirSync(join(distributionRoot, 'profiles', 'agents')).filter((name) => name.endsWith('.md'));
  for (const [host, sourceDirectory, installedDirectory, extension] of [
    ['.claude', join(distributionRoot, 'profiles', 'agents'), join(profileRoot, 'agents', 'claude'), '.md'],
    ['.codex', join(distributionRoot, 'profiles', 'codex-agents'), join(profileRoot, 'agents', 'codex'), '.toml']
  ]) {
    for (const name of readdirSync(sourceDirectory).filter((entry) => entry.endsWith(extension))) {
      const source = join(sourceDirectory, name);
      const installed = join(installedDirectory, name);
      if (!existsSync(installed) || !readFileSync(installed).equals(readFileSync(source))) {
        failures.push(`${host} agent definition differs from release source: ${name}`);
      }
      const destination = join(targetHome, host, 'agents', name);
      if (!exactManagedLink(installed, destination)) failures.push(`missing exact ${host} agent link: ${destination}`);
    }
  }
  const installedIds = new Set(components.map((component) => component.id));
  if (installedIds.has('skills') && installedIds.has('playbook')) {
    const skillSources = new Map();
    for (const skillFile of walkFor(join(repositoryPath(componentById.get('skills')), 'registry', 'skills'), 'SKILL.md')) {
      skillSources.set(basename(dirname(skillFile)), dirname(skillFile));
    }
    const playbookSkills = join(repositoryPath(componentById.get('playbook')), 'skills');
    if (existsSync(playbookSkills)) {
      for (const skillFile of walkFor(playbookSkills, 'SKILL.md')) {
        skillSources.set(basename(dirname(skillFile)), dirname(skillFile));
      }
    }
    for (const [name, source] of skillSources) {
      for (const host of ['.claude', '.codex']) {
        const destination = join(targetHome, host, 'skills', name);
        if (!exactManagedLink(source, destination)) failures.push(`missing exact ${host} skill link: ${destination}`);
      }
    }
    if (receipt && receipt.skill_count !== skillSources.size) failures.push(`receipt skill count ${receipt.skill_count} does not match ${skillSources.size}`);
  }
  let commandCount = 0;
  for (const component of components) {
    for (const [name, relative] of Object.entries(component.commands || {})) {
      const executable = join(repositoryPath(component), relative);
      const shim = join(binRoot, name);
      if (!existsSync(shim) || readFileSync(shim, 'utf8') !== shimContent(executable)) failures.push(`missing or altered command shim: ${shim}`);
      commandCount += 1;
    }
  }
  if (receipt && receipt.command_count !== commandCount) failures.push(`receipt command count ${receipt.command_count} does not match ${commandCount}`);
  if (receipt && receipt.agent_count !== agentNames.length) failures.push(`receipt agent count ${receipt.agent_count} does not match ${agentNames.length}`);
  const hooks = manifest.components.find((component) => component.id === 'hooks');
  if (existsSync(repositoryPath(hooks))) {
    const result = spawnSync(process.execPath, [join(repositoryPath(hooks), 'bin', 'siso-hooks.mjs'), 'doctor', '--home', targetHome], { encoding: 'utf8' });
    if (result.status !== 0) failures.push(`hooks doctor failed: ${(result.stderr || result.stdout).trim()}`);
  }
  if (failures.length) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    process.exit(1);
  }
  console.log(`PASS SISO Agent Stack ${manifest.version}: pins, profiles, hooks, and receipt verified`);
}

function plan() {
  console.log(`SISO Agent Stack ${manifest.version}`);
  for (const component of includedComponents()) {
    console.log(`${component.required ? 'required' : 'optional'}\t${component.id}\t${component.revision}\t${component.repository}`);
  }
  console.log(`Portable surfaces: ${manifest.portable_surfaces.length}; explicit excluded-state classes: ${manifest.excluded_state.length}`);
}

if (operation === 'install') install();
else if (operation === 'doctor') doctor();
else if (operation === 'plan') plan();
else if (operation === 'help' || operation === '--help' || operation === '-h') printUsage();
else {
  console.error(operation ? `ERROR unknown operation: ${operation}` : 'ERROR missing operation');
  printUsage();
  process.exit(2);
}

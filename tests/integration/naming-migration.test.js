import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SEARCH_DIRS = ['apps', 'packages', 'public', 'tests', 'scripts', 'docs'];
const OLD_STORAGE_PREFIX = 'b' + 'hm_';
const OLD_GLOBAL_CONFIG = 'BHM' + '_CONFIG';

function shouldSkip(relPath) {
  return [
    'node_modules',
    'dist',
    path.join('apps', 'web', 'dist'),
    path.join('apps', 'web', 'node_modules'),
    path.join('docs', 'superpowers', 'plans'),
  ].some(skip => relPath === skip || relPath.startsWith(skip + path.sep));
}

function collectFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  const relDir = path.relative(ROOT, dir);
  if (shouldSkip(relDir)) return out;

  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const rel = path.relative(ROOT, full);
    if (shouldSkip(rel)) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) collectFiles(full, out);
    else out.push(full);
  }
  return out;
}

function findForbiddenHits(needle) {
  return SEARCH_DIRS
    .flatMap(dir => collectFiles(path.join(ROOT, dir)))
    .flatMap(file => {
      const text = readFileSync(file, 'utf8');
      return text.includes(needle) ? [path.relative(ROOT, file)] : [];
    });
}

describe('SNUH Mate naming contract', () => {
  it('runtime, tests, and current docs do not reference the old storage prefix', () => {
    expect(findForbiddenHits(OLD_STORAGE_PREFIX)).toEqual([]);
  });

  it('runtime and tests do not reference the old global config name', () => {
    expect(findForbiddenHits(OLD_GLOBAL_CONFIG)).toEqual([]);
  });
});

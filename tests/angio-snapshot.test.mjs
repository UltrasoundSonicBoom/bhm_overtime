import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = '/Users/momo/Documents/GitHub/bhm_overtime';

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

test('angio snapshot artifacts exist', () => {
  const requiredPaths = [
    'angio/index.html',
    'angio/files.html',
    'angio/people.html',
    'angio/operations.html',
    'angio/angio.css',
    'angio/angio.js',
    'data/angio/source_files.json',
    'data/angio/grid_cells.json',
    'data/angio/people.json',
    'data/angio/operations.json',
    'data/angio/comparisons.json',
  ];

  for (const relPath of requiredPaths) {
    assert.equal(exists(relPath), true, `${relPath} should exist`);
  }
});

test('public entrypoints link to angio snapshot', () => {
  const indexHtml = read('index.html');
  const onboardingHtml = read('onboarding.html');

  assert.match(indexHtml, /angio\.snuhmate\.com/);
  assert.match(onboardingHtml, /angio/i);
});

test('angio data bundle has the expected top-level shapes', () => {
  const sourceFiles = JSON.parse(read('data/angio/source_files.json'));
  const gridCells = JSON.parse(read('data/angio/grid_cells.json'));
  const people = JSON.parse(read('data/angio/people.json'));
  const operations = JSON.parse(read('data/angio/operations.json'));
  const comparisons = JSON.parse(read('data/angio/comparisons.json'));

  assert.equal(Array.isArray(sourceFiles.files), true);
  assert.equal(sourceFiles.files.length >= 5, true);
  assert.equal(Array.isArray(gridCells.cells), true);
  assert.equal(gridCells.cells.length > 100, true);
  assert.equal(Array.isArray(people.people), true);
  assert.equal(people.people.length > 10, true);
  assert.equal(Array.isArray(operations.snapshots), true);
  assert.equal(operations.snapshots.length >= 4, true);
  assert.equal(Array.isArray(comparisons.reports), true);
  assert.equal(comparisons.reports.length >= 3, true);
});

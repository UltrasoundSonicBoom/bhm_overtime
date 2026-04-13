import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';

const SHORTS_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT_DIR = path.join(SHORTS_DIR, 'out');

async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: SHORTS_DIR,
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`));
    });
  });
}

await fs.mkdir(OUT_DIR, {recursive: true});

await run('node', ['scripts/build-latest.mjs']);

const clips = JSON.parse(await fs.readFile(path.join(SHORTS_DIR, 'data', 'latest-shorts.json'), 'utf8'));

for (const clip of clips) {
  await run('npx', [
    'remotion',
    'render',
    'src/index.ts',
    'SnuhCardShort',
    path.join('out', clip.fileName),
    '--props',
    JSON.stringify({clip}),
  ]);
}

await fs.writeFile(path.join(OUT_DIR, 'render-manifest.json'), JSON.stringify({renderedAt: new Date().toISOString(), clips}, null, 2));

console.log(`Rendered ${clips.length} clips to ${OUT_DIR}`);

import esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });

await esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  sourcemap: true,
  target: 'node24',
  external: ['discord.js', 'dotenv'],
});

console.log('[BUILD] dist/index.js gerado com esbuild');

#!/usr/bin/env node
// Сборка 3D-модуля: src3d/garden3d.js (+ three.js) → docs/site/js/garden3d.js, один файл, tree-shaking, минификация.
import { build } from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statSync } from 'node:fs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(ROOT, 'docs/site/js/garden3d.js');
await build({ entryPoints: [resolve(ROOT, 'src3d/garden3d.js')], bundle: true, minify: true, format: 'esm', target: ['es2020', 'safari15'], outfile: out, legalComments: 'none', logLevel: 'error', treeShaking: true });
console.log('garden3d.js', (statSync(out).size / 1024).toFixed(0), 'KB');

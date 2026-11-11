import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'public/assets/fonts');
await mkdir(output, { recursive: true });
for (const [source, name] of [
  ['@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2', 'lilita-one-latin.woff2'],
  ['@fontsource-variable/nunito-sans/files/nunito-sans-latin-wght-normal.woff2', 'nunito-sans-latin.woff2'],
  ['@fontsource/lilita-one/LICENSE', 'Lilita-One-LICENSE.txt'],
  ['@fontsource-variable/nunito-sans/LICENSE', 'Nunito-Sans-LICENSE.txt'],
]) await copyFile(path.join(root, 'node_modules', source), path.join(output, name));
console.log('Prepared two local font families and license notices.');

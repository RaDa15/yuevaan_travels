import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || '/yuevaan_travels').replace(/\/+$/, '');

const DYNAMIC_ROUTE_FILES = [
  'app/layout.jsx',
  'app/about/page.jsx',
  'app/contact/page.jsx',
  'app/legal/page.jsx',
  'app/travel-guide/page.jsx',
];

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

function prefixPublicAssetUrls(outDir, basePath) {
  if (!basePath) return 0;
  const escapedBase = basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const alreadyPrefixed = new RegExp(`${escapedBase}/(images|logos|videos|preloader|maps)/`, 'g');
  const rawAssetUrl = /(["'(\s=\\])\/(images|logos|videos|preloader|maps)\//g;
  const textExts = new Set(['.html', '.css', '.js', '.txt', '.json']);
  let rewrittenCount = 0;

  for (const filePath of walkFiles(outDir)) {
    if (!textExts.has(path.extname(filePath).toLowerCase())) continue;
    const before = fs.readFileSync(filePath, 'utf8');
    // Normalize any already-prefixed paths first so replacement stays idempotent
    const normalized = before.replace(alreadyPrefixed, '/$1/');
    const after = normalized.replace(rawAssetUrl, `$1${basePath}/$2/`);
    if (after !== before) {
      fs.writeFileSync(filePath, after, 'utf8');
      rewrittenCount += 1;
    }
  }
  return rewrittenCount;
}

const backups = new Map();

try {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });

  for (const rel of DYNAMIC_ROUTE_FILES) {
    const abs = path.join(ROOT, rel);
    const original = fs.readFileSync(abs, 'utf8');
    backups.set(abs, original);
    const patched = original.replace(
      /export const dynamic = ['"]force-dynamic['"];/g,
      "export const dynamic = 'force-static';"
    );
    fs.writeFileSync(abs, patched, 'utf8');
  }

  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  const dataCheck = spawnSync(npmCmd, ['run', 'check:data'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (dataCheck.status !== 0) {
    process.exit(dataCheck.status || 1);
  }

  const build = spawnSync(npxCmd, ['next', 'build'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      STATIC_EXPORT: '1',
      NEXT_PUBLIC_BASE_PATH: BASE_PATH,
    },
  });
  if (build.status !== 0) {
    process.exit(build.status || 1);
  }

  if (!fs.existsSync(path.join(OUT_DIR, 'index.html'))) {
    throw new Error('Static export completed without out/index.html');
  }

  const rewritten = prefixPublicAssetUrls(OUT_DIR, BASE_PATH);
  fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '');

  const htmlCount = walkFiles(OUT_DIR).filter((f) => f.endsWith('.html')).length;
  console.log(
    `GitHub Pages static export ready in ./out (${htmlCount} HTML pages, ${rewritten} files asset-prefixed for ${BASE_PATH}).`
  );
} finally {
  for (const [abs, original] of backups.entries()) {
    fs.writeFileSync(abs, original, 'utf8');
  }
}

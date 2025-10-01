const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', 'dist', '.git'].includes(ent.name)) continue;
      out.push(...walk(p));
    } else if (ent.isFile()) {
      if (/\.(ts|tsx|js|jsx|json|css|md)$/.test(ent.name)) out.push(p);
    }
  }
  return out;
}

function fail(msg, items) {
  console.error('\n[verify-manifest] ' + msg);
  for (const it of items) console.error('  - ' + it);
  process.exit(1);
}

function main() {
  const src = path.join(root, 'src');
  if (!fs.existsSync(src)) {
    console.log('[verify-manifest] no src/ folder found, skipping');
    return;
  }

  const files = walk(src);

  // Rule: any file that imports @jsonforms must live under src/renderers/
  const jsonformsBad = [];
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('@jsonforms')) {
      const rel = path.relative(root, f).replace(/\\/g, '/');
      if (!rel.startsWith('src/renderers/')) jsonformsBad.push(rel);
    }
  }

  if (jsonformsBad.length) {
    fail('Files importing @jsonforms must live under src/renderers:', jsonformsBad);
  }

  console.log('[verify-manifest] OK');
}

main();

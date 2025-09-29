#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const forbidden = [
  '@material-ui',
  '@mui',
  'antd',
  'rjsf',
  'react-jsonschema-form',
  'material-ui',
];

// files to scan
function walk(dir) {
  const res = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of list) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      // skip node_modules, dist, .git
      if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === '.git') continue;
      res.push(...walk(p));
    } else if (ent.isFile()) {
      if (/\.(ts|tsx|js|jsx|json|css|md)$/.test(ent.name)) res.push(p);
    }
  }
  return res;
}

function reportAndExit(msg, items) {
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

  const violations = [];
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    for (const tok of forbidden) {
      if (content.includes(tok)) {
        violations.push(`${f}: contains forbidden token '${tok}'`);
      }
    }
  }

  // rule: any file that imports @jsonforms must live under src/renderers
  const jsonformsBad = [];
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes("@jsonforms")) {
      const rel = path.relative(root, f).replace(/\\/g, '/');
      if (!rel.startsWith('src/renderers/')) jsonformsBad.push(rel);
    }
  }

  if (violations.length) reportAndExit('Forbidden imports/usages found:', violations);
  if (jsonformsBad.length) reportAndExit('Files importing @jsonforms must live under src/renderers:', jsonformsBad);

  console.log('[verify-manifest] OK — no manifest violations found');
}

main();

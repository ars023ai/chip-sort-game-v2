const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'dist');
const scripts = ['rules.js','balance.js','scenes.js','session.js','sound.js','game.js','studio.js'];
for (const file of scripts) execFileSync(process.execPath, ['--check', path.join(root, file)]);
const files = ['index.html','styles.css',...scripts,'assets/master-caps.webp','assets/reference-approved-b-v4.webp','assets/favicon.svg'];
fs.rmSync(out, { recursive: true, force: true });
for (const file of files) {
  const target = path.join(out, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(root, file), target);
}
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`PASS: ${files.length} production files packaged; no runtime dependencies`);

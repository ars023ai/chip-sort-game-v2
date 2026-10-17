const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const target = process.argv.find(arg => arg.startsWith('--target='))?.split('=')[1] || 'web';
if (!['web','yandex','mobile'].includes(target)) throw new Error('Use web, yandex or mobile.');
const creator = target === 'web';
const out = path.join(root, target === 'mobile' ? 'mobile/www' : target === 'yandex' ? 'dist-yandex' : 'dist');
const scripts = ['boot.js','platform.js','layout.js','rules.js','balance.js','scenes.js','session.js','sound.js','game.js',...(creator ? ['studio.js','studio-recorder.js'] : [])];
for (const file of scripts) execFileSync(process.execPath, ['--check', path.join(root, file)]);
const files = ['index.html','privacy.html','styles.css',...scripts,'assets/master-caps-red-rull-v1.webp','assets/reference-approved-b-v4.webp','assets/favicon.svg',
  'assets/app-icon-192.png','assets/app-icon-512.png','assets/social-preview.webp',...(creator ? ['creator-guide.html','downloads.html'] : [])];
fs.rmSync(out, { recursive: true, force: true });
for (const file of files) {
  const dest = path.join(out,file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(root,file),dest);
}
let html = fs.readFileSync(path.join(out,'index.html'),'utf8');
html = html.replace('<head>', '<head>\n  <script>window.CAP_CONFIG=' + JSON.stringify({ target, creator }) + ';</script>');
fs.writeFileSync(path.join(out,'index.html'),html);
if (target !== 'web') fs.copyFileSync(path.join(root,'docs',`privacy-${target}.html`),path.join(out,'privacy.html'));
if (target === 'web') for(const kind of ['mobile','yandex']) fs.copyFileSync(path.join(root,'docs',`privacy-${kind}.html`),path.join(out,`privacy-${kind}.html`));
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log(`PASS: ${target} packaged; Creator Studio ${creator ? 'enabled' : 'disabled'}; ${files.length} files; local game assets`);

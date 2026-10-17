const fs = require('node:fs'), path = require('node:path');
require('esbuild').buildSync({ entryPoints: [path.join(__dirname,'shell.js')], bundle:true, platform:'browser', format:'iife', minify:true, outfile:path.join(__dirname,'www/native-shell.js') });
const file=path.join(__dirname,'www/index.html');
fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('</head>','<script src="native-shell.js" defer></script></head>'));
console.log('PASS: native lifecycle and Android back button bundled');

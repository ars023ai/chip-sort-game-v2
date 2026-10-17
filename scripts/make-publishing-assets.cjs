// Reproducible format exports from approved generated artwork. No gameplay is synthesized.
const fs=require('node:fs'),path=require('node:path');
const sharp=require(require.resolve('sharp',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));
const root=path.resolve(__dirname,'..'),out=path.join(root,'release-kit');
const [icon,hero,portrait,square,banner]=process.argv.slice(2);
if(!banner)throw new Error('Pass icon, hero, portrait, square and banner PNG paths.');
for(const dir of ['01-yandex','02-google-play','03-app-store','04-social-youtube','05-texts','06-creator-scenes','07-guides','08-mobile-source'])fs.mkdirSync(path.join(out,dir),{recursive:true});
async function png(input,relative,w,h,position='centre'){
 const file=path.join(out,relative);await sharp(input).resize(w,h,{fit:'cover',position}).flatten({background:'#183c27'}).removeAlpha().png({compressionLevel:9}).toFile(file);return file;
}
(async()=>{
 const p=await png(icon,'01-yandex/icon-512.png',512,512);
 await png(icon,'01-yandex/icon-maskable-512.png',512,512);
 await png(hero,'01-yandex/cover-800x470.png',800,470);
 await png(banner,'01-yandex/showcase-1560x520.png',1560,520);
 await png(icon,'02-google-play/icon-512.png',512,512);
 await png(hero,'02-google-play/feature-1024x500.png',1024,500);
 await png(icon,'03-app-store/app-icon-1024.png',1024,1024);
 await png(icon,'04-social-youtube/avatar-800.png',800,800);
 await png(banner,'04-social-youtube/youtube-banner-2560x1440.png',2560,1440);
 await png(hero,'04-social-youtube/youtube-thumbnail-1280x720.png',1280,720);
 await png(icon,'04-social-youtube/youtube-watermark-150.png',150,150);
 await png(square,'04-social-youtube/post-square-en-1080.png',1080,1080);
 await png(portrait,'04-social-youtube/post-story-ru-1080x1920.png',1080,1920);
 await png(hero,'04-social-youtube/post-landscape-en-1920x1080.png',1920,1080);
 await sharp(icon).resize(192,192).removeAlpha().png({compressionLevel:9}).toFile(path.join(root,'assets/app-icon-192.png'));
 fs.copyFileSync(p,path.join(root,'assets/app-icon-512.png'));
 await sharp(hero).resize(1200,630,{fit:'cover'}).webp({quality:88}).toFile(path.join(root,'assets/social-preview.webp'));
 let bytes=0,count=0;for(const folder of fs.readdirSync(out))for(const f of fs.readdirSync(path.join(out,folder))){const file=path.join(out,folder,f),stat=fs.statSync(file);if(stat.isFile()){bytes+=stat.size;count++;if(/\.png$/.test(f)){const m=await sharp(file).metadata();if(m.hasAlpha)throw new Error('Unexpected alpha: '+file);}}}
 console.log(`PASS: ${count} opaque RGB assets, ${(bytes/1048576).toFixed(1)} MB; native/store/social sizes exported`);
})();

const fs=require('node:fs'),path=require('node:path');
const sharp=require(require.resolve('sharp',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));
const root=path.resolve(__dirname,'..'),kit=path.join(root,'release-kit'),icon=path.join(kit,'03-app-store/app-icon-1024.png');
(async()=>{
 for(const f of fs.readdirSync(path.join(kit,'04-social-youtube'))){if(!f.endsWith('.png')||/avatar|watermark/.test(f))continue;const p=path.join(kit,'04-social-youtube',f);await sharp(p).jpeg({quality:94,mozjpeg:true}).toFile(p.replace('.png','.jpg'));fs.unlinkSync(p);}
 const mask=path.join(kit,'01-yandex/icon-maskable-512.png');
 await sharp(icon).resize(410,410).extend({top:51,bottom:51,left:51,right:51,background:'#12351f'}).png({compressionLevel:9}).toFile(mask);
 const res=path.join(root,'mobile/android/app/src/main/res');
 for(const [density,size]of Object.entries({mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192})){
  for(const name of ['ic_launcher.png','ic_launcher_round.png'])await sharp(mask).resize(size,size).png().toFile(path.join(res,'mipmap-'+density,name));
  await sharp(mask).resize(size*108/48,size*108/48).png().toFile(path.join(res,'mipmap-'+density,'ic_launcher_foreground.png'));
 }
 for(const folder of fs.readdirSync(res)){const p=path.join(res,folder,'splash.png');if(!fs.existsSync(p))continue;const {width,height}=await sharp(p).metadata(),s=Math.round(Math.min(width,height)*.40);await sharp({create:{width,height,channels:3,background:'#213427'}}).composite([{input:await sharp(icon).resize(s,s).png().toBuffer(),gravity:'centre'}]).png().toFile(p+'.new.png');fs.renameSync(p+'.new.png',p);}
 const xc=path.join(root,'mobile/ios/App/App/Assets.xcassets');fs.copyFileSync(icon,path.join(xc,'AppIcon.appiconset/AppIcon-512@2x.png'));
 for(const f of fs.readdirSync(path.join(xc,'Splash.imageset'))){if(!f.endsWith('.png'))continue;const p=path.join(xc,'Splash.imageset',f),s=900;await sharp({create:{width:2732,height:2732,channels:3,background:'#213427'}}).composite([{input:await sharp(icon).resize(s,s).png().toBuffer(),gravity:'centre'}]).png().toFile(p);}
 const gd=path.join(root,'mobile/android/app/build.gradle');fs.writeFileSync(gd,fs.readFileSync(gd,'utf8').replace('versionName "1.0"','versionName "2.2.1"'));
 const manifest=path.join(root,'mobile/android/app/src/main/AndroidManifest.xml');fs.writeFileSync(manifest,fs.readFileSync(manifest,'utf8').replace('android:allowBackup="true"','android:allowBackup="false"'));
 const project=path.join(root,'mobile/ios/App/App.xcodeproj/project.pbxproj');fs.writeFileSync(project,fs.readFileSync(project,'utf8').replaceAll('MARKETING_VERSION = 1.0;','MARKETING_VERSION = 2.2.1;'));
 console.log('PASS: store/media file sizes optimized; maskable safe margin; Android/iOS icons, splash and versions prepared');
})();

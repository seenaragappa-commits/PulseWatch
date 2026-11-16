const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function fingerprint(dir){
 const hash=crypto.createHash('sha256');
 function walk(relative){for(const entry of fs.readdirSync(path.join(dir,relative),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const name=path.join(relative,entry.name);if(entry.isSymbolicLink())throw Error('Build must not contain symlinks');if(entry.isDirectory())walk(name);else if(entry.isFile()){hash.update(name.replaceAll('\\','/'));hash.update(fs.readFileSync(path.join(dir,name)));}}}
 walk('');return hash.digest('hex');
}
function sourceFingerprint(root){
 const hash=crypto.createHash('sha256');
 function walk(relative){const full=path.join(root,relative);if(!fs.existsSync(full))return;const stat=fs.lstatSync(full);if(stat.isSymbolicLink())throw Error('Frontend source must not contain symlinks');if(stat.isDirectory()){for(const name of fs.readdirSync(full).sort())walk(path.join(relative,name));}else if(stat.isFile()){const bytes=fs.readFileSync(full);hash.update(JSON.stringify([relative.replaceAll('\\','/'),bytes.length]));hash.update(bytes);}}
 for(const name of ['index.html','vite.config.js','package.json','package-lock.json','client/src','public'])walk(name);
 return hash.digest('hex');
}
function assertSourceFresh(root,expected){if(!expected||sourceFingerprint(root)!==expected)throw Error('Frontend source changed since E2E build');}
module.exports={fingerprint,sourceFingerprint,assertSourceFresh};

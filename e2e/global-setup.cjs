const {spawnSync}=require('node:child_process');
const path=require('node:path');
const {fingerprint,sourceFingerprint,assertSourceFresh}=require('./build-proof.cjs');
module.exports=async()=>{
 const root=path.resolve(__dirname,'..'),source=sourceFingerprint(root);
 const result=spawnSync(process.execPath,[path.resolve(__dirname,'../node_modules/vite/bin/vite.js'),'build'],{cwd:root,stdio:'inherit',env:process.env});
 if(result.error||result.status!==0)throw Error('Fresh frontend build failed');
 assertSourceFresh(root,source);process.env.PULSEWATCH_E2E_SOURCE_HASH=source;
 process.env.PULSEWATCH_E2E_BUILD_HASH=fingerprint(path.resolve(__dirname,'../dist'));
};

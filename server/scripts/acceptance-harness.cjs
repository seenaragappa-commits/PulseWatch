// Manual acceptance harness: never loaded by production startup.
if(process.env.NODE_ENV!=='test')throw new Error('Acceptance harness requires NODE_ENV=test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const express=require('express');
const {createDatabase}=require('../src/database/database');
const {createMonitorRepository}=require('../src/repositories/monitorRepository');
const {createApp}=require('../src/app');
const {createMonitorWorker}=require('../src/workers/monitorWorker');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'pulsewatch-acceptance-'));
const file=path.join(directory,'acceptance.db'),db=createDatabase(file),repo=createMonitorRepository(db);
let failing=false;
const checker=async()=>failing?{status:'DOWN',failureCategory:'CONNECTION_REFUSED',errorMessage:'Controlled connection refused',responseTimeMs:12}:{status:'UP',responseTimeMs:12};
// createApp owns /api routes; mount at root.
const root=createApp(repo,{testMode:true,validateTarget:async()=>({}),rateLimit:1000,corsOrigin:'http://127.0.0.1:3199'});
const site=express();site.use(express.static(path.resolve('dist')));site.use(root);
const worker=createMonitorWorker(repo,{checker:async()=>{const result=await checker();return {...result,httpStatusCode:result.status==='UP'?200:null};},dnsChecker:checker,sslChecker:checker,tcpChecker:checker});
const server=site.listen(Number(process.env.ACCEPTANCE_PORT??3199),'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:'+server.address().port,database:file})));
worker.start();
let stopping=false;
async function stop(){if(stopping)return;stopping=true;await worker.stop();server.close(()=>{db.close();console.log('Stopped; disposable evidence retained at '+file);process.exit(0);});}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
require('node:readline').createInterface({input:process.stdin}).on('line',async command=>{
 if(command==='fail'||command==='recover'){failing=command==='fail';for(const monitor of repo.list({limit:100}).data)await worker.check(monitor);console.log(command+' checks recorded');}
 if(command==='stop')await stop();
});

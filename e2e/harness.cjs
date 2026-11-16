if(process.env.NODE_ENV!=='test'||!process.send)throw Error('Test IPC harness only');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),express=require('express');
const {fingerprint,assertSourceFresh}=require('./build-proof.cjs');
assertSourceFresh(path.resolve('.'),process.env.PULSEWATCH_E2E_SOURCE_HASH);
if(!process.env.PULSEWATCH_E2E_BUILD_HASH||fingerprint(path.resolve('dist'))!==process.env.PULSEWATCH_E2E_BUILD_HASH)throw Error('Fresh frontend build proof missing or mismatched');
const {createDatabase}=require('../server/src/database/database'),{createMonitorRepository}=require('../server/src/repositories/monitorRepository'),{createApp}=require('../server/src/app'),{createMonitorWorker}=require('../server/src/workers/monitorWorker');
const file=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'pulsewatch-browser-')),'test.db'),db=createDatabase(file),repo=createMonitorRepository(db);
let failing=false;
const result=()=>failing?{status:'DOWN',responseTimeMs:12,failureCategory:'CONNECTION_REFUSED',errorMessage:'Controlled connection refused'}:{status:'UP',responseTimeMs:12};
const cert=issuer=>({status:'UP',responseTimeMs:12,certificateIssuer:issuer,certificateValidFrom:'2026-11-01T00:00:00Z',certificateValidTo:'2027-01-01T00:00:00Z',certificateExpiresInDays:47});
const worker=createMonitorWorker(repo,{checker:async()=>({...result(),httpStatusCode:failing?null:200}),dnsChecker:async()=>result(),tcpChecker:async()=>result(),sslChecker:async()=>failing?result():cert('Current fixture CA')});
const app=express();app.use(express.static(path.resolve('dist')));app.use(createApp(repo,{testMode:true,validateTarget:async()=>({}),rateLimit:1000}));
const server=app.listen(0,'127.0.0.1',()=>{worker.start();process.send({ready:true,origin:'http://127.0.0.1:'+server.address().port,database:file});});
process.on('message',async({id,command})=>{
 try{
 if(command==='stop'){await worker.stop();server.close(()=>{db.close();process.send({id});process.exit(0);});return;}
 if(command==='history'){const m=repo.list({limit:100}).data.find(m=>m.monitorType==='SSL');for(let i=0;i<25;i++)repo.record(m.id,cert(i<5?'Historical fixture CA':'Current fixture CA'));}
 else{failing=command==='fail';for(const m of repo.list({limit:100}).data)await worker.check(m);}
 process.send({id});
 }catch(error){process.send({id,error:error.message});}
});

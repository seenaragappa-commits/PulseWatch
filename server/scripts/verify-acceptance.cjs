// Controlled acceptance runner. All writes use a new temporary database.
// Retains evidence; never reads or writes the configured application database.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createDatabase}=require('../src/database/database');
const {createMonitorRepository}=require('../src/repositories/monitorRepository');
const evidence={startedAt:new Date().toISOString(),results:[]};
const pass=(test,details)=>evidence.results.push({test,status:'PASS',details});
function launch(args,env){
  const child=spawn(process.execPath,args,{cwd:path.resolve(__dirname,'../..'),env:{...process.env,...env},stdio:['pipe','pipe','pipe'],windowsHide:true});
  let output='',errors='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>errors+=data);
  return {child,get output(){return output;},get errors(){return errors;},async until(text){const deadline=Date.now()+10000;while(!output.includes(text)){if(child.exitCode!==null)throw new Error('Child exited: '+errors);if(Date.now()>deadline)throw new Error('Child readiness timeout: '+text);await new Promise(resolve=>setTimeout(resolve,20));}},async exit(){await Promise.race([new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);}),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Child exit timeout')),10000);timer.unref();})]);}};
}
let harness,backend,frontend;
(async()=>{
  harness=launch(['server/scripts/acceptance-harness.cjs'],{NODE_ENV:'test',ACCEPTANCE_PORT:'0'});
  await harness.until('"database"');
  const info=JSON.parse(harness.output.trim().split('\n')[0]);evidence.harness=info;
  const api=async(route,method='GET',body)=>{const response=await fetch(info.url+'/api'+route,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});assert(response.ok,method+' '+route+' '+response.status);return response.status===204?null:response.json();};
  assert.equal((await api('/monitors')).pagination.total,0);pass('Isolated API starts empty');
  const page=await fetch(info.url);assert.equal(page.status,200);assert.match(await page.text(),/root/);pass('Built frontend HTML served over local HTTP (not browser execution)');
  const ids=[];
  for(const type of ['HTTP','DNS','SSL','TCP']){
    const payload={name:'Acceptance '+type,monitorType:type,intervalSeconds:86400,timeoutMs:1000,...(type==='HTTP'?{url:'https://example.com'}:{domain:'example.com'}),...(type==='TCP'?{tcpPort:443}:{})};
    const {data}=await api('/monitors','POST',payload);ids.push(data.id);
    await api('/monitors/'+data.id,'PATCH',{name:'Edited '+type,timeoutMs:2000,...(type==='HTTP'?{url:'https://example.org'}:{domain:'example.org'})});
    assert.equal((await api('/monitors/'+data.id+'/pause','POST')).data.enabled,false);
    assert.equal((await api('/monitors/'+data.id+'/resume','POST')).data.enabled,true);
    pass(type+' create, edit, pause and resume through running API');
  }
  // Wait for the real scheduler to dispatch its first injected successful checks.
  const deadline=Date.now()+5000;
  while((await api('/monitors')).data.some(m=>m.currentStatus!=='UP')){assert(Date.now()<deadline,'Scheduler did not run');await new Promise(resolve=>setTimeout(resolve,100));}
  pass('Scheduler dispatches all four injected checkers; UP status and check history');
  for(let count=1;count<=4;count++){
    const occurrences=harness.output.split('fail checks recorded').length;
    harness.child.stdin.write('fail\n');
    const until=Date.now()+5000;while(harness.output.split('fail checks recorded').length===occurrences){assert(Date.now()<until);await new Promise(resolve=>setTimeout(resolve,20));}
    const incidents=(await api('/incidents')).data;
    assert.equal(incidents.length,count<3?0:4);
    for(const incident of incidents){assert.equal(incident.failure_count,count);assert.equal(incident.status,'OPEN');assert.equal(incident.failure_category,'CONNECTION_REFUSED');assert.equal((await api('/incidents/'+incident.id)).data.id,incident.id);}
  }
  pass('1/2 failures create no incidents; 3/4 create and update exactly one incident per type');
  harness.child.stdin.write('recover\n');await harness.until('recover checks recorded');
  const incidents=(await api('/incidents')).data;assert.equal(incidents.length,4);assert(incidents.every(i=>i.status==='RESOLVED'&&i.resolved_at));
  for(const id of ids){const monitor=(await api('/monitors/'+id)).data;assert.equal(monitor.consecutiveFailures,0);assert.equal(monitor.currentStatus,'UP');const history=await api('/monitors/'+id+'/checks?page=2&limit=2');assert.equal(history.pagination.total,6);assert.equal(history.data.length,2);assert(history.data.every(c=>c.checked_at));await api('/monitors/'+id+'/pause','POST');}
  pass('Recovery resolves incidents, resets counters and retains six paginated checks per type');
  harness.child.stdin.write('stop\n');await harness.exit();assert.equal(harness.child.exitCode,0);pass('Harness drains and shuts down through stdin command');
  let db=createDatabase(info.database);
  const initialVersions=db.prepare('SELECT * FROM schema_migrations ORDER BY version').all();assert.equal(initialVersions.length,8);db.close();
  for(let i=1;i<=3;i++){
    db=createDatabase(info.database);const repo=createMonitorRepository(db);
    assert.equal(repo.list({}).pagination.total,4);assert.equal(repo.incidentsAll({}).pagination.total,4);
    for(const id of ids){assert.equal(repo.checks(id,{}).pagination.total,6);const monitor=repo.get(id);assert.match(monitor.name,/^Edited /);assert.equal(monitor.target,monitor.monitorType==='HTTP'?'https://example.org':'example.org');assert.equal(monitor.timeoutMs,2000);assert.equal(monitor.enabled,false);}
    assert.deepEqual(db.prepare('SELECT * FROM schema_migrations ORDER BY version').all(),initialVersions);
    assert.equal(db.pragma('integrity_check',{simple:true}),'ok');assert.deepEqual(db.pragma('foreign_key_check'),[]);db.close();
  }
  pass('Three database reopen/migration cycles preserve all monitor/check/incident rows; integrity and foreign keys valid');
  // Exercise the unchanged real startup and shutdown handler with paused fixtures.
  // Stdin emits SIGTERM inside the child; Windows process.kill is not a POSIX signal.
  for(let i=1;i<=2;i++){
    backend=launch(['-e',"process.stdin.on('data',()=>process.emit('SIGTERM'));require('./server/src/index.js')"],{NODE_ENV:'production',DB_PATH:info.database,PORT:'3219',HOST:'127.0.0.1'});
    await backend.until('PulseWatch API listening');
    const response=await fetch('http://127.0.0.1:3219/api/monitors');assert.equal(response.status,200);const {data}=await response.json();assert.equal(data.length,4);assert(data.every(m=>m.enabled===false&&m.currentStatus==='UP'));
    backend.child.stdin.write('stop\n');await backend.exit();assert.equal(backend.child.exitCode,0);assert.match(backend.output,/Shutting down/);
  }
  pass('Two real backend startup/shutdown cycles using isolated DB preserve edits and paused state');
  backend=launch(['-e',"process.stdin.on('data',()=>process.emit('SIGTERM'));require('./server/src/index.js')"],{NODE_ENV:'production',DB_PATH:info.database,PORT:'3001',HOST:'127.0.0.1'});
  await backend.until('PulseWatch API listening');
  frontend=launch(['-e',"(async()=>{const {createServer}=await import('vite');const server=await createServer({server:{host:'127.0.0.1',port:5189,strictPort:true}});await server.listen();console.log('Acceptance Vite ready');process.stdin.on('data',async()=>{await server.close();process.exit(0);});})().catch(error=>{console.error(error.message);process.exit(1);});"],{NODE_ENV:'development'});
  await frontend.until('Acceptance Vite ready');
  assert.equal((await fetch('http://127.0.0.1:5189/')).status,200);
  assert.equal((await fetch('http://127.0.0.1:5189/src/main.jsx')).status,200);
  const proxied=await fetch('http://127.0.0.1:5189/api/monitors');assert.equal(proxied.status,200);assert.equal((await proxied.json()).data.length,4);
  frontend.child.stdin.write('stop\n');await frontend.exit();assert.equal(frontend.child.exitCode,0);
  backend.child.stdin.write('stop\n');await backend.exit();assert.equal(backend.child.exitCode,0);
  pass('Vite starts, transforms React entry, and proxies /api to real backend using isolated DB (not browser execution)');
  const guard=launch(['server/scripts/acceptance-harness.cjs'],{NODE_ENV:'production'});await guard.exit();assert.notEqual(guard.child.exitCode,0);assert.match(guard.errors,/requires NODE_ENV=test/);pass('Acceptance harness refuses production mode');
  const invalidPath=fs.mkdtempSync(path.join(os.tmpdir(),'pulsewatch-unopenable-db-'));
  const bad=launch(['server/src/index.js'],{NODE_ENV:'production',DB_PATH:invalidPath,PORT:'3219'});await bad.exit();assert.notEqual(bad.child.exitCode,0);assert(!bad.output.includes('API listening'));pass('Database-open failure exits without starting API');
  evidence.finishedAt=new Date().toISOString();
})().catch(error=>{evidence.results.push({test:'Acceptance runner',status:'FAIL',details:error.message});process.exitCode=1;}).finally(async()=>{
  for(const proc of [harness,backend,frontend])if(proc&&proc.child.exitCode===null){proc.child.stdin.write('stop\n');try{await proc.exit();}catch{proc.child.kill();}}
  const destination=path.resolve(__dirname,'../../docs/acceptance-evidence');fs.mkdirSync(destination,{recursive:true});fs.writeFileSync(path.join(destination,'runtime.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
});

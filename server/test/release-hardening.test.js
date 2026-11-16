const request=require('supertest');
const {createDatabase}=require('../src/database/database');
const {createMonitorRepository}=require('../src/repositories/monitorRepository');
const {createMonitorWorker}=require('../src/workers/monitorWorker');
const {createApp}=require('../src/app');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const sample={name:'Target',url:'https://example.com',intervalSeconds:15,timeoutMs:1000};
it('migrates an existing version 5 database without losing monitor history',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pulsewatch-revision-')),file=path.join(dir,'fixture.db');let db=createDatabase(file);
 try{const repo=createMonitorRepository(db),m=repo.create(sample);repo.record(m.id,{status:'UP'});db.exec('ALTER TABLE monitors DROP COLUMN config_revision; DELETE FROM schema_migrations WHERE version=6');db.close();db=createDatabase(file);const migrated=createMonitorRepository(db);expect(migrated.get(m.id).configRevision).toBe(0);expect(migrated.checks(m.id,{}).pagination.total).toBe(1);expect(db.prepare('SELECT count(*) n FROM schema_migrations WHERE version=6').get().n).toBe(1);}
 finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
});
describe('stale monitoring results',()=>{
 let db,repo;
 beforeEach(()=>{db=createDatabase(':memory:');repo=createMonitorRepository(db);});
 afterEach(()=>db.close());
 it.each(['edit','pause-resume','delete'])('discards a delayed failure after %s',async action=>{
  const m=repo.create(sample);for(let i=0;i<2;i++)repo.record(m.id,{status:'DOWN',errorMessage:'failure'});
  let release;const worker=createMonitorWorker(repo,{checker:()=>new Promise(resolve=>release=resolve)});
  const check=worker.check(repo.get(m.id));
  if(action==='edit')repo.update(m.id,{url:'https://example.org',timeoutMs:2000});
  if(action==='pause-resume'){repo.setEnabled(m.id,false);repo.setEnabled(m.id,true);}
  if(action==='delete')repo.remove(m.id);
  release({status:'DOWN',errorMessage:'old failure'});await check;await worker.stop();
  if(action==='delete'){expect(repo.get(m.id)).toBeUndefined();return;}
  expect(repo.checks(m.id,{}).pagination.total).toBe(2);expect(repo.incidents(m.id,{}).data).toHaveLength(0);expect(repo.get(m.id).consecutiveFailures).toBe(action==='edit'?0:2);
 });
 it('discards an old success without resolving an open incident and accepts a fresh check',async()=>{
  const m=repo.create(sample);for(let i=0;i<3;i++)repo.record(m.id,{status:'DOWN',errorMessage:'failure'});
  let release;const worker=createMonitorWorker(repo,{checker:()=>new Promise(resolve=>release=resolve)});const pending=worker.check(repo.get(m.id));
  repo.update(m.id,{url:'https://example.org'});release({status:'UP'});await pending;
  expect(repo.incidents(m.id,{}).data[0]).toMatchObject({status:'RESOLVED',closure_reason:'configuration_changed',recovery_details:null});expect(repo.get(m.id).currentStatus).toBe('PENDING');
  const fresh=worker.check(repo.get(m.id));release({status:'UP'});await fresh;await worker.stop();expect(repo.incidents(m.id,{}).data[0]).toMatchObject({status:'RESOLVED',closure_reason:'configuration_changed',recovery_details:null});
 });
 it.each(['DNS','SSL','TCP'])('discards a delayed %s result after a target edit',async type=>{
  const m=repo.create({name:type,monitorType:type,domain:'example.com',intervalSeconds:15,timeoutMs:1000,...(type==='TCP'?{tcpPort:443}:{})});
  let release;const checker=()=>new Promise(resolve=>release=resolve),worker=createMonitorWorker(repo,{dnsChecker:checker,sslChecker:checker,tcpChecker:checker});
  const pending=worker.check(m);repo.update(m.id,{domain:'example.org'});release({status:'DOWN',errorMessage:'old result'});await pending;await worker.stop();
  expect(repo.get(m.id).target).toBe('example.org');expect(repo.checks(m.id,{}).pagination.total).toBe(0);expect(repo.incidents(m.id,{}).data).toHaveLength(0);
 });
});
describe('browser-origin guard',()=>{
 let db,repo,app,id;
 beforeEach(()=>{db=createDatabase(':memory:');repo=createMonitorRepository(db);id=repo.create(sample).id;app=createApp(repo,{corsOrigin:'http://127.0.0.1:5173'});});
 afterEach(()=>db.close());
 it('rejects a hostile simple form POST before pause or resume',async()=>{
  await request(app).post(`/api/monitors/${id}/pause`).set('Origin','https://hostile.example').set('Content-Type','application/x-www-form-urlencoded').send('x=1').expect(403);
  expect(repo.get(id).enabled).toBe(true);
  await request(app).post(`/api/monitors/${id}/pause`).set('Sec-Fetch-Site','cross-site').expect(403);expect(repo.get(id).enabled).toBe(true);
 });
 it('permits configured dashboard and missing-Origin local clients',async()=>{
  await request(app).post(`/api/monitors/${id}/pause`).set('Origin','http://127.0.0.1:5173').expect(200);
  await request(app).post(`/api/monitors/${id}/resume`).expect(200);expect(repo.get(id).enabled).toBe(true);
 });
 it('rejects malformed and null origins',async()=>{for(const origin of ['null','https://hostile.example/path'])await request(app).post(`/api/monitors/${id}/pause`).set('Origin',origin).expect(403);});
 it('accepts an actual same-origin loopback server and rejects a matching untrusted Host',async()=>{
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));try{
   const port=server.address().port;
   await request(server).post(`/api/monitors/${id}/pause`).set('Origin',`http://127.0.0.1:${port}`).expect(200);
   await request(server).post(`/api/monitors/${id}/resume`).set('Host',`hostile.example:${port}`).set('Origin',`http://hostile.example:${port}`).expect(403);
   expect(repo.get(id).enabled).toBe(false);
  }finally{await new Promise(resolve=>server.close(resolve));}
 });
});

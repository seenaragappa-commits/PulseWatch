const {createDatabase}=require('../src/database/database');
const {createMonitorRepository}=require('../src/repositories/monitorRepository');
const request=require('supertest');const {createApp}=require('../src/app');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
it('migrates version 6 incident data additively and retains evidence',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pulsewatch-closure-')),file=path.join(dir,'test.db');let db=createDatabase(file);try{const repo=createMonitorRepository(db),m=repo.create({name:'Existing',url:'https://example.com',intervalSeconds:15,timeoutMs:1000});for(let i=0;i<3;i++)repo.record(m.id,{status:'DOWN',httpStatusCode:503});db.exec('ALTER TABLE incidents DROP COLUMN closure_reason; DELETE FROM schema_migrations WHERE version=7');db.close();db=createDatabase(file);const migrated=createMonitorRepository(db);expect(migrated.incidents(m.id,{}).data[0]).toMatchObject({status:'OPEN',failure_category:'HTTP_5XX',closure_reason:null});expect(migrated.checks(m.id,{}).pagination.total).toBe(3);expect(db.prepare('SELECT count(*) n FROM schema_migrations WHERE version=7').get().n).toBe(1);expect(db.pragma('integrity_check',{simple:true})).toBe('ok');expect(db.pragma('foreign_key_check')).toEqual([]);}finally{db.close();}});
describe('configuration changes and incident evidence',()=>{
 let db,repo,m;
 beforeEach(()=>{db=createDatabase(':memory:');repo=createMonitorRepository(db);m=repo.create({name:'Target',url:'https://example.com',intervalSeconds:15,timeoutMs:1000});});
 afterEach(()=>db.close());
 const fail=repo=>repo.record(1,{status:'DOWN',httpStatusCode:503,errorMessage:'HTTP 503'});
 it('starts a new failure sequence and preserves old checks',()=>{
  fail(repo);fail(repo);const old=repo.checks(m.id,{}).data;repo.update(m.id,{url:'https://example.org'});
  expect(repo.get(m.id)).toMatchObject({consecutiveFailures:0,currentStatus:'PENDING',lastCheckedAt:null});
  fail(repo);expect(repo.incidents(m.id,{}).data).toHaveLength(0);fail(repo);fail(repo);
  const incident=repo.incidents(m.id,{}).data[0],checks=repo.checks(m.id,{}).data;
  expect(repo.incidents(m.id,{}).data).toHaveLength(1);expect(incident.failure_count).toBe(3);expect(incident.first_failure_at).toBe(checks[2].checked_at);expect(checks).toHaveLength(5);expect(checks.slice(-2).map(c=>c.id)).toEqual(old.map(c=>c.id));
 });
 it('closes open incident for configuration change without claiming recovery',async()=>{
  for(let i=0;i<3;i++)fail(repo);const original=repo.incidents(m.id,{}).data[0];repo.update(m.id,{url:'https://example.org'});
  repo.record(m.id,{status:'UP',httpStatusCode:200});const closed=repo.incidentById(original.id);
  expect(closed).toMatchObject({status:'RESOLVED',closure_reason:'configuration_changed',failure_category:original.failure_category,first_failure_at:original.first_failure_at,last_failure_at:original.last_failure_at,recovery_details:null});
  await request(createApp(repo)).get('/api/incidents/'+original.id).expect(200).expect(r=>expect(r.body.data.closure_reason).toBe('configuration_changed'));
  expect(repo.checks(m.id,{}).pagination.total).toBe(4);
 });
 it('preserves failure counts and revision for display-only and unchanged edits',()=>{fail(repo);const rev=repo.get(m.id).configRevision;repo.update(m.id,{name:'New name',url:m.url,timeoutMs:m.timeoutMs});expect(repo.get(m.id)).toMatchObject({consecutiveFailures:1,configRevision:rev});});
 it.each(['intervalSeconds','timeoutMs'])('resets on changed %s',key=>{fail(repo);repo.update(m.id,{[key]:key==='intervalSeconds'?30:2000});expect(repo.get(m.id).consecutiveFailures).toBe(0);});
 it.each(['DNS','SSL','TCP'])('resets %s after relevant configuration changes',type=>{const value={name:type,monitorType:type,domain:'example.com',intervalSeconds:15,timeoutMs:1000,...(type==='TCP'?{tcpPort:443}:{})};const item=repo.create(value);repo.record(item.id,{status:'DOWN'});repo.update(item.id,type==='SSL'?{sslExpiryWarningDays:10}:type==='TCP'?{tcpPort:80}:{domain:'example.org'});expect(repo.get(item.id).consecutiveFailures).toBe(0);});
 it('retains legacy historical incidents with null closure reason',()=>{for(let i=0;i<3;i++)fail(repo);repo.record(m.id,{status:'UP'});db.prepare('UPDATE incidents SET closure_reason=NULL').run();expect(repo.incidents(m.id,{}).data[0]).toMatchObject({status:'RESOLVED',closure_reason:null});});
});

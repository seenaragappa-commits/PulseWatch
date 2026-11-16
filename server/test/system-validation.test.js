const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const request=require('supertest');
const {createDatabase}=require('../src/database/database');
const {createMonitorRepository}=require('../src/repositories/monitorRepository');
const {createApp}=require('../src/app');
const {createMonitorWorker}=require('../src/workers/monitorWorker');
const {checkTcp}=require('../src/services/tcpChecker');
const {checkCertificate}=require('../src/services/sslChecker');
const {EventEmitter}=require('node:events');

describe.each(['HTTP','DNS','SSL','TCP'])('%s full lifecycle',type=>{
  it('validates API configuration, schedules due work, prevents overlap, preserves history and recovers after restart',async()=>{
    const directory=fs.mkdtempSync(path.join(os.tmpdir(),'pulsewatch-system-')),file=path.join(directory,'test.db');
    let db=createDatabase(file),repo=createMonitorRepository(db);
    try{
      const app=createApp(repo,{testMode:true,validateTarget:async()=>({}),rateLimit:1000});
      const payload={name:type+' validation',monitorType:type,intervalSeconds:15,timeoutMs:1000,...(type==='HTTP'?{url:'https://example.com'}:{domain:'example.com'}),...(type==='TCP'?{tcpPort:443}:{})};
      const created=await request(app).post('/api/monitors').send(payload).expect(201),id=created.body.data.id;
      await request(app).post('/api/monitors').send({...payload,...(type==='HTTP'?{url:'ftp://example.com'}:{domain:'127.0.0.1'})}).expect(400);
      await request(app).patch('/api/monitors/'+id).send({name:'Edited '+type}).expect(200);
      let result={status:'UP',responseTimeMs:5,httpStatusCode:type==='HTTP'?200:undefined};
      let release;let held=false;
      const checker=vi.fn(async()=>{if(held)await new Promise(resolve=>release=resolve);return result;});
      const options={checker,dnsChecker:checker,sslChecker:checker,tcpChecker:checker};
      let worker=createMonitorWorker(repo,options);
      await worker.tick();await new Promise(resolve=>setImmediate(resolve));
      expect(repo.get(id).currentStatus).toBe('UP');expect(checker).toHaveBeenCalledTimes(1);
      await worker.tick();expect(checker).toHaveBeenCalledTimes(1);
      held=true;const active=worker.check(repo.get(id));await worker.check(repo.get(id));expect(checker).toHaveBeenCalledTimes(2);release();await active;held=false;
      result={status:'DOWN',failureCategory:'CONNECTION_TIMEOUT',errorMessage:'Controlled timeout'};
      for(let i=0;i<4;i++)await worker.check(repo.get(id));
      expect(repo.incidents(id,{}).data).toHaveLength(1);expect(repo.incidents(id,{}).data[0]).toMatchObject({status:'OPEN',failure_count:4});
      expect(repo.get(id).currentStatus).toBe('DOWN');
      await worker.stop();db.close();db=createDatabase(file);repo=createMonitorRepository(db);
      expect(repo.checks(id,{}).pagination.total).toBe(6);expect(repo.get(id).consecutiveFailures).toBe(4);
      worker=createMonitorWorker(repo,options);await worker.tick();expect(repo.checks(id,{}).pagination.total).toBe(6);
      result={status:'UP',responseTimeMs:3};await worker.check(repo.get(id));await worker.stop();
      expect(repo.incidents(id,{}).data[0].status).toBe('RESOLVED');expect(repo.get(id).consecutiveFailures).toBe(0);
      expect(db.pragma('integrity_check',{simple:true})).toBe('ok');expect(db.pragma('foreign_key_check')).toEqual([]);
    }finally{db.close();fs.rmSync(directory,{recursive:true,force:true});}
  });
});

it('verifies TCP transport with a controlled real local socket without changing production policy',async()=>{
  const sockets=new Set();const server=net.createServer(socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const result=await checkTcp('example.com',443,1000,{
      resolver:async()=>[{address:'8.8.8.8',family:4}],
      connector:options=>{expect(options).toEqual({host:'8.8.8.8',family:4,port:443});return net.createConnection({host:'127.0.0.1',port:server.address().port});}
    });
    expect(result.status).toBe('UP');
    await new Promise(resolve=>setImmediate(resolve));
  }finally{for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));}
});

it('executes the actual SSL hostname verifier while retaining SNI and chain enforcement',async()=>{
  let options;
  const result=await checkCertificate('example.com',100,{resolver:async()=>[{address:'8.8.8.8',family:4}],connector:input=>{
    options=input;const socket=new EventEmitter();socket.destroy=vi.fn();
    queueMicrotask(()=>socket.emit('error',input.checkServerIdentity('8.8.8.8',{subject:{CN:'wrong.example.com'},subjectaltname:'DNS:wrong.example.com'})));
    return socket;
  }});
  expect(options.servername).toBe('example.com');expect(options.rejectUnauthorized).toBe(true);
  expect(result).toMatchObject({status:'DOWN',errorMessage:'SSL certificate hostname verification failed'});
});

const request=require('supertest');
const {createDatabase}=require('../src/database/database');
const {createMonitorRepository}=require('../src/repositories/monitorRepository');
const {createApp}=require('../src/app');
const {createMonitorWorker}=require('../src/workers/monitorWorker');
const {checkUrl}=require('../src/services/httpChecker');
const {checkDomain}=require('../src/services/dnsChecker');
const http=require('node:http');
const https=require('node:https');
const net=require('node:net');
const {checkTcp}=require('../src/services/tcpChecker');
const {EventEmitter}=require('node:events');
describe.each(['HTTP','DNS','SSL','TCP'])('%s acceptance',type=>{
 let db,repo,app,payload;
 beforeEach(()=>{db=createDatabase(':memory:');repo=createMonitorRepository(db);app=createApp(repo,{testMode:true,validateTarget:async()=>({}),rateLimit:1000});payload={name:'Acceptance',monitorType:type,intervalSeconds:15,timeoutMs:1000,...(type==='HTTP'?{url:'https://example.com'}:{domain:'example.com'}),...(type==='TCP'?{tcpPort:443}:{})};});
 afterEach(()=>db.close());
 it('rejects empty names, malformed targets and script/SQL inputs',async()=>{
   for(const name of ['', '<script>alert(1)</script>', "x'; DROP TABLE monitors;--"])await request(app).post('/api/monitors').send({...payload,name}).expect(400);
   for(const target of ['', 'bad..domain', 'http://'])await request(app).post('/api/monitors').send({...payload,[type==='HTTP'?'url':'domain']:target}).expect(400);
   expect(repo.list({}).pagination.total).toBe(0);
 });
 it('returns duplicate conflict and handles deletion with checks and incidents',async()=>{
   const created=await request(app).post('/api/monitors').send(payload).expect(201),id=created.body.data.id;
   await request(app).post('/api/monitors').send(payload).expect(409);
   repo.record(id,{status:'UP'});await request(app).delete('/api/monitors/'+id).expect(204);
   expect(repo.checks(id,{}).data).toHaveLength(0);
   const next=repo.create(payload);for(let i=0;i<3;i++)repo.record(next.id,{status:'DOWN'});
   await request(app).delete('/api/monitors/'+next.id).expect(409);expect(repo.get(next.id)).toBeTruthy();
   expect(repo.checks(next.id,{}).pagination.total).toBe(3);
   repo.record(next.id,{status:'UP'});
   await request(app).delete('/api/monitors/'+next.id).expect(409);
   expect(repo.incidents(next.id,{}).data[0].status).toBe('RESOLVED');
 });
 it('validates configuration edits, protects type boundaries, pauses and resumes through API',async()=>{
   const {body}=await request(app).post('/api/monitors').send(payload).expect(201),id=body.data.id;
   for(const invalid of [{timeoutMs:0},{timeoutMs:60001},{intervalSeconds:14},{name:''},{[type==='HTTP'?'url':'domain']:'bad..domain'}])await request(app).patch('/api/monitors/'+id).send(invalid).expect(400);
   await request(app).patch('/api/monitors/'+id).send(type==='HTTP'?{domain:'example.org'}:{url:'https://example.org'}).expect(400);
   const edit=type==='HTTP'?{url:'https://example.org'}:{domain:'example.org'};
   const changed=await request(app).patch('/api/monitors/'+id).send({...edit,timeoutMs:2000,intervalSeconds:120}).expect(200);
   expect(changed.body.data).toMatchObject({target:type==='HTTP'?edit.url:edit.domain,timeoutMs:2000,intervalSeconds:120});
   await request(app).post('/api/monitors/'+id+'/pause').expect(200).expect(response=>expect(response.body.data.enabled).toBe(false));
   await request(app).post('/api/monitors/'+id+'/resume').expect(200).expect(response=>expect(response.body.data.enabled).toBe(true));
 });
 it('dispatches only the correct checker with the stored target and configuration',async()=>{
   const monitor=repo.create(payload);
   const options={checker:vi.fn(async()=>({status:'UP',responseTimeMs:7})),dnsChecker:vi.fn(async()=>({status:'UP',responseTimeMs:7})),sslChecker:vi.fn(async()=>({status:'UP',responseTimeMs:7})),tcpChecker:vi.fn(async()=>({status:'UP',responseTimeMs:7}))};
   const selected={HTTP:'checker',DNS:'dnsChecker',SSL:'sslChecker',TCP:'tcpChecker'}[type];
   const worker=createMonitorWorker(repo,options);await worker.check(monitor);await worker.stop();
   for(const [name,checker] of Object.entries(options))expect(checker).toHaveBeenCalledTimes(name===selected?1:0);
   const args=type==='HTTP'?[payload.url,1000]:type==='SSL'?[payload.domain,1000,{warningDays:30}]:type==='TCP'?[payload.domain,443,1000]:[payload.domain,1000];
   expect(options[selected]).toHaveBeenCalledWith(...args);
   expect(repo.checks(monitor.id,{}).data[0].response_time_ms).toBe(7);
 });
 it('counts every threshold and starts a new incident after recovery; ignores paused/deleted due work',async()=>{
   const m=repo.create(payload),down=async()=>({status:'DOWN',failureCategory:'CONNECTION_REFUSED',errorMessage:'Controlled failure'});
   const worker=createMonitorWorker(repo,{checker:down,dnsChecker:down,sslChecker:down,tcpChecker:down});
   for(let i=1;i<=4;i++){await worker.check(m);expect(repo.incidents(m.id,{}).data.length).toBe(i<3?0:1);}
   const first=repo.incidents(m.id,{}).data[0].id;repo.record(m.id,{status:'UP'});
   expect(repo.get(m.id).consecutiveFailures).toBe(0);
   for(let i=0;i<3;i++)await worker.check(m);
   expect(repo.incidents(m.id,{}).data).toHaveLength(2);expect(repo.incidentById(first).status).toBe('RESOLVED');
   repo.setEnabled(m.id,false);const count=repo.checks(m.id,{}).pagination.total;await worker.tick();expect(repo.checks(m.id,{}).pagination.total).toBe(count);
   const other=repo.create({...payload,url:'https://example.org',domain:'example.org'});repo.remove(other.id);expect(repo.due().some(item=>item.id===other.id)).toBe(false);await worker.stop();
 });
});
describe('additional protocol acceptance',()=>{
 afterEach(()=>vi.restoreAllMocks());
 it.each([200,404,503])('records HTTP %s and discards the body',async code=>{
   const destroy=vi.fn();
   vi.spyOn(http,'request').mockImplementation((url,options,callback)=>{const req=new EventEmitter();req.end=()=>queueMicrotask(()=>callback({statusCode:code,headers:{},destroy}));req.destroy=()=>{};return req;});
   const result=await checkUrl('http://example.com',100,{resolver:async()=>[{address:'8.8.8.8',family:4}]});
   expect(result).toMatchObject({httpStatusCode:code,status:code===200?'UP':'DOWN'});expect(destroy).toHaveBeenCalledOnce();
 });
 it('handles empty and multiple public DNS answers',async()=>{
   expect((await checkDomain('example.com',100,{resolver:async()=>[]})).status).toBe('DOWN');
   expect((await checkDomain('example.com',100,{resolver:async()=>['8.8.8.8','1.1.1.1']})).status).toBe('UP');
 });
 it('exposes security headers and rejects malformed JSON without leaking stack traces',async()=>{
   const db=createDatabase(':memory:');try{const app=createApp(createMonitorRepository(db));
   const health=await request(app).get('/api/health').expect(200);
   expect(health.headers['x-content-type-options']).toBe('nosniff');expect(health.headers['content-security-policy']).toBeTruthy();
   const malformed=await request(app).post('/api/monitors').set('Content-Type','application/json').send('{');
   expect(JSON.stringify(malformed.body)).not.toMatch(/SyntaxError|stack|node_modules/);
   // A malformed request must be a client error, not a server failure.
   expect(malformed.status).toBe(400);
   }finally{db.close();}
 });
 it('rejects unsupported cross-type configuration',async()=>{
   const db=createDatabase(':memory:');try{
     const app=createApp(createMonitorRepository(db),{testMode:true,validateTarget:async()=>({})});
     await request(app).post('/api/monitors').send({name:'Unsupported',monitorType:'SSL',domain:'example.com',dnsRecordType:'A'}).expect(400);
   }finally{db.close();}
 });
 it('enforces the configured HTTP deadline during DNS resolution',async()=>{
   const transport=vi.spyOn(https,'request');
   let release;const pending=checkUrl('https://example.com',5,{resolver:()=>new Promise(resolve=>release=resolve)});
   const state=await Promise.race([pending.then(()=> 'finished',()=> 'finished'),new Promise(resolve=>setTimeout(()=>resolve('pending'),30))]);
   release([{address:'8.8.8.8',family:4}]);
   expect(await pending).toMatchObject({status:'DOWN',errorMessage:'Connection timed out'});
   await new Promise(resolve=>setImmediate(resolve));expect(transport).not.toHaveBeenCalled();
   expect(state).toBe('finished');
 });
 it('bounds DNS revalidation on a redirect by the original deadline',async()=>{
   let queries=0,release;
   const transport=vi.spyOn(http,'request').mockImplementation((url,options,callback)=>{const req=new EventEmitter();req.end=()=>queueMicrotask(()=>callback({statusCode:302,headers:{location:'/next'},destroy(){}}));req.destroy=()=>{};return req;});
   const pending=checkUrl('http://example.com',20,{resolver:async()=>++queries===1?[{address:'8.8.8.8',family:4}]:new Promise(resolve=>release=resolve)});
   expect(await pending).toMatchObject({status:'DOWN',errorMessage:'Connection timed out'});
   release([{address:'8.8.8.8',family:4}]);await new Promise(resolve=>setImmediate(resolve));
   expect(transport).toHaveBeenCalledOnce();
 });
 it.each(['CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','ERR_TLS_CERT_ALTNAME_INVALID'])('fails HTTPS %s without weakening TLS or leaking errors',async code=>{
   vi.spyOn(https,'request').mockImplementation((url,options)=>{
     expect(url.hostname).toBe('example.com');expect(options.rejectUnauthorized).not.toBe(false);
     options.lookup(url.hostname,{},(error,address)=>{expect(error).toBeNull();expect(address).toBe('8.8.8.8');});
     const req=new EventEmitter();req.end=()=>queueMicrotask(()=>req.emit('error',Object.assign(new Error('Internal 10.0.0.1 sensitive'),{code})));req.destroy=()=>{};return req;
   });
   const result=await checkUrl('https://example.com',100,{resolver:async()=>[{address:'8.8.8.8',family:4}]});
   expect(result).toMatchObject({status:'DOWN',errorMessage:'HTTP request failed'});
 });
 it('uses parameterized ID validation and safe missing-resource errors',async()=>{
   const db=createDatabase(':memory:');try{const app=createApp(createMonitorRepository(db));
     await request(app).get('/api/monitors/1%20OR%201%3D1').expect(400);
     await request(app).get('/api/monitors/99999').expect(404);
     expect(db.prepare('SELECT count(*) n FROM monitors').get().n).toBe(0);
   }finally{db.close();}
 });
 it('rejects invalid and unauthorized TCP ports at the API',async()=>{
   const db=createDatabase(':memory:');try{const app=createApp(createMonitorRepository(db));
     for(const tcpPort of [-1,0,65536,443.5,'443',25])await request(app).post('/api/monitors').send({name:'Invalid port',monitorType:'TCP',domain:'example.com',tcpPort}).expect(400);
     expect(db.prepare('SELECT count(*) n FROM monitors').get().n).toBe(0);
   }finally{db.close();}
 });
 it('contains thrown checker errors, drains and can run subsequent work',async()=>{
   const db=createDatabase(':memory:');try{const repo=createMonitorRepository(db),m=repo.create({name:'Worker error',url:'https://example.com',intervalSeconds:15,timeoutMs:1000});
     let fail=true;const worker=createMonitorWorker(repo,{checker:async()=>{if(fail)throw new Error('private internal stack');return {status:'UP'};}});
     await worker.check(m);expect(worker.state().active).toBe(0);expect(repo.checks(m.id,{}).data[0].error_message).toBe('Check failed');
     fail=false;await worker.check(m);await worker.stop();expect(repo.get(m.id).currentStatus).toBe('UP');
   }finally{db.close();}
 });
});

describe('controlled real local transports',()=>{
 let server,sockets;
 afterEach(async()=>{vi.restoreAllMocks();for(const socket of sockets||[])socket.destroy();if(server?.listening)await new Promise(resolve=>server.close(resolve));});
 it('handles real HTTP success, redirect, slow headers and malformed response',async()=>{
   sockets=new Set();server=net.createServer(socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.once('data',data=>{
     const target=data.toString().split(' ')[1];
     if(target==='/slow')return;
     if(target==='/malformed')return socket.end('not HTTP\r\n\r\n');
     if(target==='/redirect')return socket.end('HTTP/1.1 302 Found\r\nLocation: /ok\r\nContent-Length: 0\r\n\r\n');
     socket.end('HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nok');
   });});
   await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
   const original=http.request;
   vi.spyOn(http,'request').mockImplementation((url,options,callback)=>{
     expect(url.hostname).toBe('example.com');
     // Only this test routes the pinned request to its disposable loopback fixture.
     return original(new URL(url.pathname,'http://127.0.0.1:'+server.address().port),options,callback);
   });
   const opts={resolver:async()=>[{address:'8.8.8.8',family:4}]};
   expect((await checkUrl('http://example.com/ok',500,opts)).status).toBe('UP');
   expect((await checkUrl('http://example.com/redirect',500,opts)).status).toBe('UP');
   expect(await checkUrl('http://example.com/slow',30,opts)).toMatchObject({status:'DOWN',errorMessage:'Connection timed out'});
   expect(await checkUrl('http://example.com/malformed',500,opts)).toMatchObject({status:'DOWN',errorMessage:'HTTP request failed'});
 });
 it('detects an actual refused TCP connection to a retired local fixture',async()=>{
   server=net.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
   const port=server.address().port;await new Promise(resolve=>server.close(resolve));
   const result=await checkTcp('example.com',443,1000,{resolver:async()=>[{address:'8.8.8.8',family:4}],connector:options=>{
     expect(options).toMatchObject({host:'8.8.8.8',port:443});return net.createConnection({host:'127.0.0.1',port});
   }});
   expect(result).toMatchObject({status:'DOWN',failureCategory:'CONNECTION_REFUSED'});
 });
 it('connects using a validated IPv6 destination through an isolated real IPv6 fixture',async()=>{
   sockets=new Set();server=net.createServer(socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
   await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'::1',resolve);});
   const result=await checkTcp('example.com',443,1000,{resolver:async()=>[{address:'2606:4700:4700::1111',family:6}],connector:options=>{
     expect(options).toEqual({host:'2606:4700:4700::1111',family:6,port:443});return net.createConnection({host:'::1',port:server.address().port,family:6});
   }});
   expect(result.status).toBe('UP');
 });
});

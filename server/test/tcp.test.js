const {EventEmitter}=require('node:events');
const net=require('node:net'),http=require('node:http');
const request=require('supertest');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {checkTcp}=require('../src/services/tcpChecker');
const {isUnsafeAddress,resolvePublic}=require('../src/services/ssrf');
const {checkUrl}=require('../src/services/httpChecker');
const {checkDomain}=require('../src/services/dnsChecker');
const {checkCertificate}=require('../src/services/sslChecker');
const {createDatabase}=require('../src/database/database');
const {createMonitorRepository}=require('../src/repositories/monitorRepository');
const {createMonitorWorker}=require('../src/workers/monitorWorker');
const {createApp}=require('../src/app');
const {allowedPorts}=require('../src/config/tcpPolicy');
const publicAnswer=async()=>[{address:'8.8.8.8',family:4}];
const prohibited=['0.0.0.0','10.0.0.1','100.64.0.1','127.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','192.0.0.9','192.0.2.1','192.88.99.1','192.31.196.1','192.52.193.1','192.175.48.1','198.18.0.1','198.51.100.1','203.0.113.1','224.0.0.1','240.0.0.1','255.255.255.255','::','::1','::ffff:8.8.8.8','::ffff:7f00:1','64:ff9b::a00:1','64:ff9b:1::1','100::1','2001::1','2001:2::1','2001:db8::1','2002:0a00:0001::1','3ffe::1','3fff::1','fc00::1','fe80::1','fec0::1','ff02::1'];
function transport(event='connect'){
  let options,socket;
  const connector=value=>{options=value;socket=new EventEmitter();socket.destroy=vi.fn();queueMicrotask(()=>{if(event==='connect')socket.emit('connect');else if(event)socket.emit('error',Object.assign(new Error('sensitive address'),{code:event}));});return socket;};
  return {connector,get options(){return options;},get socket(){return socket;}};
}
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
describe('shared public destination policy',()=>{
  it.each(prohibited)('blocks %s without creating a TCP socket',async address=>{
    expect(isUnsafeAddress(address)).toBe(true);
    const connector=vi.fn();
    const result=await checkTcp('example.com',443,100,{resolver:async()=>[{address,family:net.isIP(address)}],connector});
    expect(result.status).toBe('DOWN');expect(connector).not.toHaveBeenCalled();
  });
  it('allows representative public destinations and rejects ambiguous input',()=>{
    for(const address of ['8.8.8.8','1.1.1.1','2606:4700:4700::1111'])expect(isUnsafeAddress(address)).toBe(false);
    for(const address of ['127.1','0x7f000001','fe80::1%eth0','garbage'])expect(isUnsafeAddress(address)).toBe(true);
  });
  it.each(['100::1','64:ff9b::a00:1','2002:0a00:0001::1','192.88.99.1'])('SSL rejects %s before TLS',async address=>{
    const connector=vi.fn();
    expect((await checkCertificate('example.com',100,{resolver:async()=>[{address,family:net.isIP(address)}],connector})).status).toBe('DOWN');
    expect(connector).not.toHaveBeenCalled();
  });
  it('rejects mixed DNS answers in shared resolution and DNS monitoring',async()=>{
    await expect(resolvePublic('example.com',async()=>[{address:'8.8.8.8',family:4},{address:'::ffff:8.8.8.8',family:6}])).rejects.toThrow();
    expect((await checkDomain('example.com',100,{resolver:async()=>['8.8.8.8','192.88.99.1']})).status).toBe('DOWN');
  });
  it('pins HTTP DNS answers and revalidates a same-host redirect against rebinding',async()=>{
    let resolutions=0,requests=0;
    vi.spyOn(http,'request').mockImplementation((url,options,callback)=>{
      requests++;expect(url.hostname).toBe('example.com');
      options.lookup(url.hostname,{},(error,address)=>{expect(error).toBeNull();expect(address).toBe('8.8.8.8');});
      const req=new EventEmitter();req.destroy=()=>{};req.end=()=>queueMicrotask(()=>callback({statusCode:302,headers:{location:'/next'},destroy(){}}));return req;
    });
    await expect(checkUrl('http://example.com',100,{resolver:async()=>[{address:++resolutions===1?'8.8.8.8':'100::1',family:resolutions===1?4:6}]})).rejects.toThrow();
    expect(requests).toBe(1);
  });
});
describe('TCP transport',()=>{
  it('pins one public IP, never connects by hostname and destroys on success',async()=>{
    const mock=transport();let calls=0;
    const result=await checkTcp('example.com',443,100,{resolver:async()=>{calls++;return publicAnswer();},connector:mock.connector});
    expect(result.status).toBe('UP');expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(mock.options).toEqual({host:'8.8.8.8',family:4,port:443});expect(calls).toBe(1);expect(mock.socket.destroy).toHaveBeenCalledOnce();
  });
  it.each([['ECONNREFUSED','CONNECTION_REFUSED'],['ETIMEDOUT','CONNECTION_TIMEOUT'],['ENETUNREACH','OTHER_NETWORK_FAILURE']])('classifies %s safely',async(code,category)=>{
    const mock=transport(code),result=await checkTcp('example.com',443,100,{resolver:publicAnswer,connector:mock.connector});
    expect(result.failureCategory).toBe(category);expect(result.errorMessage).not.toContain('sensitive');expect(mock.socket.destroy).toHaveBeenCalledOnce();
  });
  it('cleans up timeout and cancellation',async()=>{
    const timeout=transport(null);expect((await checkTcp('example.com',443,5,{resolver:publicAnswer,connector:timeout.connector})).failureCategory).toBe('CONNECTION_TIMEOUT');expect(timeout.socket.destroy).toHaveBeenCalledOnce();
    const abort=new AbortController(),mock=transport(null),pending=checkTcp('example.com',443,100,{resolver:publicAnswer,connector:mock.connector,signal:abort.signal});
    await new Promise(resolve=>setImmediate(resolve));abort.abort();expect((await pending).status).toBe('DOWN');expect(mock.socket.destroy).toHaveBeenCalledOnce();
  });
  it('bounds DNS waits and never connects after late resolution',async()=>{
    let release;const connector=vi.fn(),pending=checkTcp('example.com',443,5,{resolver:()=>new Promise(resolve=>release=resolve),connector});
    expect((await pending).failureCategory).toBe('CONNECTION_TIMEOUT');release(await publicAnswer());await new Promise(resolve=>setImmediate(resolve));expect(connector).not.toHaveBeenCalled();
    expect((await checkTcp('example.com',443,100,{resolver:async()=>{throw new Error('internal DNS');}})).failureCategory).toBe('DNS_RESOLUTION_FAILURE');
  });
  it.each(['localhost','127.0.0.1','::1','host.local','host.internal','host.home.arpa','https://example.com','bad..com'])('rejects domain %s before DNS',async domain=>{
    const resolver=vi.fn();expect((await checkTcp(domain,443,100,{resolver})).status).toBe('DOWN');expect(resolver).not.toHaveBeenCalled();
  });
  it('enforces the server allowlist independently of the API',async()=>{
    const resolver=vi.fn();expect((await checkTcp('example.com',25,100,{resolver})).status).toBe('DOWN');expect(resolver).not.toHaveBeenCalled();
    vi.stubEnv('TCP_ALLOWED_PORTS','443,8443');expect(allowedPorts()).toEqual([443,8443]);vi.stubEnv('TCP_ALLOWED_PORTS','*');expect(allowedPorts).toThrow();
  });
});
describe('TCP API and persisted lifecycle',()=>{
  it('migrates a version 4 database while preserving HTTP, DNS, SSL and incident history',()=>{
    const directory=fs.mkdtempSync(path.join(os.tmpdir(),'pulsewatch-tcp-migration-')),file=path.join(directory,'test.db');
    let db=createDatabase(file);
    try{
      const repo=createMonitorRepository(db);
      for(const monitorType of ['HTTP','DNS','SSL']){
        const item=repo.create({name:monitorType,monitorType,url:'https://example.com',domain:'example.com',intervalSeconds:60,timeoutMs:1000});
        for(let i=0;i<3;i++)repo.record(item.id,{status:'DOWN',errorMessage:'controlled'});
      }
      db.exec('ALTER TABLE monitors DROP COLUMN tcp_port; DELETE FROM schema_migrations WHERE version=5');
      db.close();db=createDatabase(file);
      expect(db.prepare('SELECT count(*) n FROM monitors').get().n).toBe(3);
      expect(db.prepare('SELECT count(*) n FROM checks').get().n).toBe(9);
      expect(db.prepare('SELECT count(*) n FROM incidents').get().n).toBe(3);
      expect(db.prepare('SELECT version FROM schema_migrations WHERE version=5').get()).toBeTruthy();
      expect(db.pragma('integrity_check',{simple:true})).toBe('ok');
    }finally{db.close();fs.rmSync(directory,{recursive:true,force:true});}
  });
  it('creates, edits, records, deduplicates and recovers across a restart',async()=>{
    const directory=fs.mkdtempSync(path.join(os.tmpdir(),'pulsewatch-tcp-')),file=path.join(directory,'test.db');
    let db=createDatabase(file);
    try{
      let repo=createMonitorRepository(db);const app=createApp(repo);
      const response=await request(app).post('/api/monitors').send({name:'TCP test',monitorType:'TCP',domain:'example.com',tcpPort:443,intervalSeconds:60,timeoutMs:1000}).expect(201);
      const id=response.body.data.id;
      await request(app).patch('/api/monitors/'+id).send({domain:'example.org'}).expect(200);
      await request(app).patch('/api/monitors/'+id).send({tcpPort:25}).expect(400);
      const item=repo.get(id);expect(item).toMatchObject({target:'example.org',tcpPort:443});
      const worker=createMonitorWorker(repo,{tcpChecker:async()=>({status:'DOWN',failureCategory:'CONNECTION_REFUSED',errorMessage:'TCP connection refused'})});
      for(let i=0;i<4;i++)await worker.check(item);
      expect(repo.incidents(id,{}).data).toHaveLength(1);expect(repo.incidents(id,{}).data[0]).toMatchObject({failure_count:4,status:'OPEN',failure_category:'CONNECTION_REFUSED'});
      db.close();db=createDatabase(file);repo=createMonitorRepository(db);
      expect(repo.checks(id,{}).data).toHaveLength(4);
      await createMonitorWorker(repo,{tcpChecker:async()=>({status:'UP',responseTimeMs:4})}).check(repo.get(id));
      expect(repo.incidents(id,{}).data[0]).toMatchObject({status:'RESOLVED',recovery_details:'Recovered with TCP connection'});
      expect(repo.get(id).consecutiveFailures).toBe(0);
      expect(db.pragma('integrity_check',{simple:true})).toBe('ok');expect(db.pragma('foreign_key_check')).toEqual([]);
    }finally{db.close();fs.rmSync(directory,{recursive:true,force:true});}
  });
  it('shares worker concurrency and overlap limits',async()=>{
    const db=createDatabase(':memory:'),repo=createMonitorRepository(db);
    try{const items=['example.com','example.org'].map(domain=>repo.create({name:'TCP',monitorType:'TCP',domain,tcpPort:443,intervalSeconds:60,timeoutMs:1000}));
      let release;const checker=vi.fn(()=>new Promise(resolve=>release=resolve)),worker=createMonitorWorker(repo,{concurrency:1,tcpChecker:checker});
      const pending=worker.check(items[0]);await worker.check(items[0]);await worker.check(items[1]);expect(checker).toHaveBeenCalledOnce();release({status:'UP'});await pending;await worker.stop();
    }finally{db.close();}
  });
});

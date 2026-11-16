// Real TLS handshakes against disposable local fixtures, with client-scoped trust.
// No global trust changes, production bypasses, or external network requests.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict'),tls=require('node:tls'),https=require('node:https'),net=require('node:net');
const {checkCertificate}=require('../src/services/sslChecker');
const {checkUrl}=require('../src/services/httpChecker');
const openssl=process.env.OPENSSL||(process.platform==='win32'?'C:\\Program Files\\Git\\usr\\bin\\openssl.exe':'openssl');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'pulsewatch-tls-'));
const evidence={startedAt:new Date().toISOString(),fixtureDirectory:directory,results:[]};
const run=(...args)=>execFileSync(openssl,args,{cwd:directory,stdio:'pipe',windowsHide:true});
const pem=file=>fs.readFileSync(path.join(directory,file));
const date=days=>new Date(Date.now()+days*86400000).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z').replace('T','');
const pass=test=>evidence.results.push({test,status:'PASS'});
const resolver=async()=>[{address:'8.8.8.8',family:4}];
async function serve(server,callback){
  const sockets=new Set();server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});server.on('tlsClientError',()=>{});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{await callback(server.address().port);}finally{for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));}
}
(async()=>{
  evidence.openssl=run('version').toString().trim();
  run('req','-x509','-newkey','rsa:2048','-nodes','-days','365','-subj','/CN=PulseWatch Acceptance CA','-keyout','ca.key','-out','ca.crt','-addext','basicConstraints=critical,CA:TRUE');
  run('req','-new','-newkey','rsa:2048','-nodes','-subj','/CN=example.com','-keyout','leaf.key','-out','leaf.csr');
  fs.writeFileSync(path.join(directory,'extensions.cnf'),'subjectAltName=DNS:example.com\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n');
  for(const [name,expiry] of [['valid',45],['warning',5],['expired',-1]])run('x509','-req','-in','leaf.csr','-CA','ca.crt','-CAkey','ca.key','-set_serial',String(expiry+100),'-out',name+'.crt','-extfile','extensions.cnf','-not_before',date(-3),'-not_after',date(expiry));
  for(const scenario of ['valid','warning','expired','mismatch','untrusted']){
    const certificate=scenario==='warning'?'warning':scenario==='expired'?'expired':'valid',domain=scenario==='mismatch'?'wrong.example.com':'example.com';
    let observedSni;
    const credentials={key:pem('leaf.key'),cert:pem(certificate+'.crt')};
    const server=https.createServer({...credentials,SNICallback:(name,callback)=>{observedSni=name;callback(null,tls.createSecureContext(credentials));}},(_req,res)=>res.end('ok'));
    await serve(server,async port=>{
      const result=await checkCertificate(domain,2000,{resolver,connector:options=>{
        assert.equal(options.host,'8.8.8.8');assert.equal(options.port,443);assert.equal(options.servername,domain);assert.equal(options.rejectUnauthorized,true);
        return tls.connect({...options,host:'127.0.0.1',port,...(scenario==='untrusted'?{}:{ca:pem('ca.crt')})});
      }});
      await new Promise(resolve=>setImmediate(resolve));
      if(scenario==='valid'||scenario==='warning'){
        assert.equal(result.status,'UP');assert.equal(result.certificateIssuer,'PulseWatch Acceptance CA');assert(result.certificateValidFrom&&result.certificateValidTo);assert.equal(observedSni,domain);
        if(scenario==='warning')assert.equal(result.monitorStatus,'WARNING');
      }else{assert.equal(result.status,'DOWN');assert.match(result.errorMessage,scenario==='expired'?/expired/:scenario==='mismatch'?/hostname verification/:/chain validation/);}
      pass('SSL real handshake: '+scenario+'; pinned transport options and strict verification');
      const native=https.request;
      try{
        https.request=(url,options,callback)=>{
          assert.equal(url.hostname,domain);assert.notEqual(options.rejectUnauthorized,false);
          options.lookup(domain,{},(error,address)=>{assert.equal(error,null);assert.equal(address,'8.8.8.8');});
          return native(url,{...options,port,lookup:(_host,opts,callback)=>opts?.all?callback(null,[{address:'127.0.0.1',family:4}]):callback(null,'127.0.0.1',4),...(scenario==='untrusted'?{}:{ca:pem('ca.crt')})},callback);
        };
        const httpResult=await checkUrl('https://'+domain,2000,{resolver});
        assert.equal(httpResult.status,['valid','warning'].includes(scenario)?'UP':'DOWN');
        pass('HTTPS real handshake: '+scenario+'; TLS remains enabled');
      }finally{https.request=native;}
    });
  }
  for(const mode of ['malformed','timeout'])await serve(net.createServer(socket=>{if(mode==='malformed')socket.end('Not a TLS record');}),async port=>{
    const result=await checkCertificate('example.com',100,{resolver,connector:options=>tls.connect({...options,host:'127.0.0.1',port,ca:pem('ca.crt')})});
    assert.equal(result.status,'DOWN');assert.match(result.errorMessage,mode==='timeout'?/timed out/:/connection failed/);pass('SSL real socket '+mode+' failure');
  });
  evidence.finishedAt=new Date().toISOString();
})().catch(error=>{evidence.results.push({test:'TLS acceptance runner',status:'FAIL',details:error.message});process.exitCode=1;}).finally(()=>{
  const destination=path.resolve(__dirname,'../../docs/acceptance-evidence');fs.mkdirSync(destination,{recursive:true});fs.writeFileSync(path.join(destination,'tls.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
});

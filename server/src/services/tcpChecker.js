const net=require('node:net');
const {resolvePublic}=require('./ssrf');
const {allowedPorts,validDomain}=require('../config/tcpPolicy');

function checkTcp(domain,port,timeoutMs,{resolver,connector=net.createConnection,signal}={}){
  const started=performance.now();
  return new Promise(resolve=>{
    let socket,timer,done=false;
    const finish=(status,errorMessage=null,failureCategory=null)=>{
      if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);
      socket?.destroy();
      resolve({status,errorMessage,failureCategory,responseTimeMs:Math.round(performance.now()-started)});
    };
    const cancel=()=>finish('DOWN','TCP check cancelled','OTHER_NETWORK_FAILURE');
    if(!validDomain(domain)||!Number.isInteger(port)||!allowedPorts().includes(port)||!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>60000)return finish('DOWN','TCP target is not permitted','OTHER_NETWORK_FAILURE');
    if(signal?.aborted)return cancel();
    signal?.addEventListener('abort',cancel,{once:true});
    timer=setTimeout(()=>finish('DOWN','TCP connection timed out','CONNECTION_TIMEOUT'),timeoutMs);
    resolvePublic(domain,resolver).then(addresses=>{
      if(done)return;
      try{
        socket=connector({host:addresses[0].address,family:addresses[0].family,port});
        socket.once('connect',()=>finish('UP'));
        socket.once('error',error=>finish('DOWN',error.code==='ECONNREFUSED'?'TCP connection refused':error.code==='ETIMEDOUT'?'TCP connection timed out':'TCP connection failed',error.code==='ECONNREFUSED'?'CONNECTION_REFUSED':error.code==='ETIMEDOUT'?'CONNECTION_TIMEOUT':'OTHER_NETWORK_FAILURE'));
        socket.once('close',()=>finish('DOWN','TCP connection closed','OTHER_NETWORK_FAILURE'));
      }catch{finish('DOWN','TCP connection failed','OTHER_NETWORK_FAILURE');}
    },()=>finish('DOWN','TCP public hostname resolution failed','DNS_RESOLUTION_FAILURE'));
  });
}
module.exports={checkTcp};

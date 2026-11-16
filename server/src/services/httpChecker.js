const http = require('node:http');const https = require('node:https');const { validateTarget } = require('./ssrf');
function safeTransportError(error){if(error?.code==='ECONNREFUSED')return 'Connection refused';if(error?.code==='ETIMEDOUT'||String(error?.message).toLowerCase().includes('timed out'))return 'Connection timed out';return 'HTTP request failed';}
async function requestOnce(url,addresses,timeoutMs) { return new Promise(resolve=>{const started=performance.now(),lib=url.protocol==='https:'?https:http;let settled=false;const finish=result=>{if(settled)return;settled=true;clearTimeout(deadline);resolve(result);};const lookup=(_host,opts,cb)=>opts?.all?cb(null,addresses):cb(null,addresses[0].address,addresses[0].family);const req=lib.request(url,{method:'GET',headers:{'User-Agent':'PulseWatch/1.0','Accept':'*/*'},lookup,agent:false},res=>{res.destroy();const elapsed=Math.round(performance.now()-started);finish({status:res.statusCode>=200&&res.statusCode<400?'UP':'DOWN',responseTimeMs:elapsed,httpStatusCode:res.statusCode,errorMessage:res.statusCode>=400?`HTTP ${res.statusCode}`:null,redirect:res.headers.location});});const deadline=setTimeout(()=>req.destroy(Object.assign(new Error('Request timed out'),{code:'ETIMEDOUT'})),timeoutMs);req.on('error',error=>finish({status:'DOWN',responseTimeMs:Math.round(performance.now()-started),errorMessage:safeTransportError(error)}));req.end();}); }
async function checkUrl(value,timeoutMs,options={}) {
  const started=performance.now(),remaining=()=>timeoutMs-(performance.now()-started);
  const timeoutError=()=>Object.assign(new Error('Request timed out'),{code:'ETIMEDOUT'});
  async function validateWithinDeadline(destination){
    if(remaining()<=0)throw timeoutError();
    let timer;
    try{return await Promise.race([validateTarget(destination,options.resolver),new Promise((_,reject)=>{timer=setTimeout(()=>reject(timeoutError()),Math.max(1,remaining()));})]);}
    finally{clearTimeout(timer);}
  }
  try{
    let target=await validateWithinDeadline(value),redirects=0;
    while(true){
      if(remaining()<=0)throw timeoutError();
      const result=await requestOnce(target.url,target.addresses,remaining());
      if(result.httpStatusCode>=300&&result.httpStatusCode<400&&result.redirect){
        if(++redirects>3)return {...result,status:'DOWN',errorMessage:'Too many redirects'};
        target=await validateWithinDeadline(new URL(result.redirect,target.url).toString());continue;
      }
      delete result.redirect;return result;
    }
  }catch(error){
    if(error?.code==='ETIMEDOUT')return {status:'DOWN',responseTimeMs:Math.round(performance.now()-started),errorMessage:'Connection timed out'};
    throw error;
  }
}
module.exports={checkUrl};

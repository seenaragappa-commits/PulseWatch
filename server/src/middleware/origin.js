// Browser Origin is checked independently of CORS. Requests without Origin
// remain available to local command-line clients; Fetch Metadata rejects
// cross-site browser requests even if Origin is missing.
function originGuard(allowedOrigin){
  return (req,res,next)=>{
    if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
    const origin=req.get('Origin'),site=req.get('Sec-Fetch-Site');
    if(site==='cross-site')return res.status(403).json({error:'Cross-origin request denied'});
    if(!origin)return next();
    let url;try{url=new URL(origin);}catch{return res.status(403).json({error:'Cross-origin request denied'});}
    const exact=url.origin===origin;
    const local=exact&&url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&Number(url.port||80)===req.socket.localPort;
    if(!exact||(!local&&origin!==allowedOrigin))return res.status(403).json({error:'Cross-origin request denied'});
    return next();
  };
}
module.exports={originGuard};

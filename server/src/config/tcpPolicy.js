function allowedPorts(){
  const raw=process.env.TCP_ALLOWED_PORTS??'443';
  const values=raw.split(',').map(value=>value.trim());
  if(!values.length||values.some(value=>!/^\d+$/.test(value)||Number(value)<1||Number(value)>65535))throw new Error('Invalid TCP_ALLOWED_PORTS configuration');
  return [...new Set(values.map(Number))];
}
function validDomain(value){
  return typeof value==='string'&&value.length<=253&&/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value)&&!/(^|\.)(localhost|local|internal|lan|home|test|invalid|example|onion|arpa)$/i.test(value);
}
module.exports={allowedPorts,validDomain};

const dns = require('node:dns').promises;
const net = require('node:net');
const { AppError } = require('../utils/errors');
const ipaddr = require('ipaddr.js');
const extraV6 = ['2001::/23','2001:db8::/32','2002::/16','3ffe::/16','3fff::/20'].map(value=>ipaddr.parseCIDR(value));
function isUnsafeAddress(address) {
  if(typeof address!=='string'||address.includes('%')||!net.isIP(address))return true;
  const ip=ipaddr.parse(address);
  if(ip.range()!=='unicast')return true;
  return ip.kind()==='ipv6'&&(!ip.match(ipaddr.parseCIDR('2000::/3'))||extraV6.some(range=>ip.match(range)));
}
function hostOf(url) { return url.hostname.replace(/^\[|\]$/g,''); }
function assertSafeUrl(value) { let url;try{url=new URL(value);}catch{throw new AppError(400,'Invalid URL');}const host=hostOf(url);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!host||host.toLowerCase()==='localhost'||host.toLowerCase().endsWith('.localhost'))throw new AppError(400,'URL is not an allowed public HTTP(S) destination');if(net.isIP(host)&&isUnsafeAddress(host))throw new AppError(400,'URL resolves to a private or reserved address');return url; }
async function resolvePublic(hostname,resolver=dns.lookup) { let items;try{items=await resolver(hostname,{all:true,verbatim:true});}catch{throw new AppError(400,'URL hostname cannot be resolved');}if(!Array.isArray(items)||!items.length||items.some(item=>isUnsafeAddress(item.address)))throw new AppError(400,'URL resolves to a private or reserved address');return items; }
async function validateTarget(value,resolver) { const url=assertSafeUrl(value);const addresses=await resolvePublic(hostOf(url),resolver);return {url,addresses}; }
module.exports={assertSafeUrl,resolvePublic,validateTarget,isUnsafeAddress};

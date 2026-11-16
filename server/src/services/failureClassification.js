const definitions={
  HTTP_4XX:{label:'HTTP 4xx',explanation:'The monitored endpoint returned an HTTP client-error response.'},
  HTTP_5XX:{label:'HTTP 5xx',explanation:'The monitored endpoint returned an HTTP server-error response.'},
  DNS_RESOLUTION_FAILURE:{label:'DNS resolution failure',explanation:'The monitoring resolver could not obtain a permitted public answer for this domain.'},
  CONNECTION_TIMEOUT:{label:'Connection timeout',explanation:'The monitoring connection did not complete within the configured timeout.'},
  CONNECTION_REFUSED:{label:'Connection refused',explanation:'The destination refused the monitoring connection.'},
  TLS_CERTIFICATE_EXPIRED:{label:'TLS certificate expired',explanation:'The destination TLS certificate is expired.'},
  TLS_CERTIFICATE_INVALID:{label:'TLS certificate invalid',explanation:'The destination TLS certificate did not pass chain validation.'},
  TLS_HOSTNAME_MISMATCH:{label:'TLS hostname mismatch',explanation:'The destination TLS certificate does not match the monitored hostname.'},
  OTHER_NETWORK_FAILURE:{label:'Other network failure',explanation:'The monitor could not complete its network check.'}
};
function classifyFailure(result,monitorType){
  if(result.status!=='DOWN')return null;
  if(definitions[result.failureCategory])return {category:result.failureCategory,...definitions[result.failureCategory]};
  const message=String(result.errorMessage||'').toLowerCase();
  if(Number.isInteger(result.httpStatusCode)&&result.httpStatusCode>=400&&result.httpStatusCode<500)return {category:'HTTP_4XX',...definitions.HTTP_4XX};
  if(Number.isInteger(result.httpStatusCode)&&result.httpStatusCode>=500)return {category:'HTTP_5XX',...definitions.HTTP_5XX};
  if(message.includes('timeout')||message.includes('timed out'))return {category:'CONNECTION_TIMEOUT',...definitions.CONNECTION_TIMEOUT};
  if(message.includes('econnrefused')||message.includes('connection refused'))return {category:'CONNECTION_REFUSED',...definitions.CONNECTION_REFUSED};
  if(message.includes('hostname verification'))return {category:'TLS_HOSTNAME_MISMATCH',...definitions.TLS_HOSTNAME_MISMATCH};
  if(message.includes('certificate is expired')||message.includes('certificate expires today'))return {category:'TLS_CERTIFICATE_EXPIRED',...definitions.TLS_CERTIFICATE_EXPIRED};
  if(message.includes('certificate chain')||message.includes('certificate metadata'))return {category:'TLS_CERTIFICATE_INVALID',...definitions.TLS_CERTIFICATE_INVALID};
  if(monitorType==='DNS')return {category:'DNS_RESOLUTION_FAILURE',...definitions.DNS_RESOLUTION_FAILURE};
  return {category:'OTHER_NETWORK_FAILURE',...definitions.OTHER_NETWORK_FAILURE};
}
module.exports={classifyFailure,definitions};

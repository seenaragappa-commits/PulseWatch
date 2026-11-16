const {pagination,pageResult}=require('../utils/pagination');
const {classifyFailure}=require('../services/failureClassification');
const iso=()=>new Date().toISOString();

function map(row){return row&&{...row,tcpPort:row.tcp_port,configRevision:row.config_revision,enabled:Boolean(row.enabled),intervalSeconds:row.interval_seconds,timeoutMs:row.timeout_ms,currentStatus:row.current_status,consecutiveFailures:row.consecutive_failures,lastCheckedAt:row.last_checked_at,latestResponseTimeMs:row.latest_response_time_ms,monitorType:row.monitor_type,target:row.target,dnsRecordType:row.dns_record_type,sslExpiryWarningDays:row.ssl_expiry_warning_days,createdAt:row.created_at,updatedAt:row.updated_at};}

function createMonitorRepository(db){
  const select="SELECT m.*, (SELECT response_time_ms FROM checks c WHERE c.monitor_id=m.id ORDER BY checked_at DESC,id DESC LIMIT 1) latest_response_time_ms FROM monitors m";
  return {
    create(value){
      const now=iso(),monitorType=value.monitorType||'HTTP',domainMonitor=['DNS','SSL','TCP'].includes(monitorType),endpoint=domainMonitor?`${monitorType.toLowerCase()}://${value.domain}${monitorType==='TCP'?':'+value.tcpPort:''}`:value.url,target=domainMonitor?value.domain:value.url,warningDays=monitorType==='SSL'?value.sslExpiryWarningDays??30:null;
      const result=db.prepare('INSERT INTO monitors(name,url,interval_seconds,timeout_ms,monitor_type,target,dns_record_type,ssl_expiry_warning_days,tcp_port,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(value.name,endpoint,value.intervalSeconds,value.timeoutMs,monitorType,target,monitorType==='DNS'?'A':null,warningDays,monitorType==='TCP'?value.tcpPort:null,now,now);
      return this.get(result.lastInsertRowid);
    },
    get(id){return map(db.prepare(`${select} WHERE m.id=?`).get(id));},
    list(query){const p=pagination(query),rows=db.prepare(`${select} ORDER BY m.id DESC LIMIT ? OFFSET ?`).all(p.limit,p.offset).map(map);return pageResult(rows,db.prepare('SELECT count(*) n FROM monitors').get().n,p);},
    update(id,value){
      return db.transaction(()=>{
      const current=this.get(id);if(!current)return null;
      // Monitor type is immutable through the API; DNS currently supports A only.
      const checkChanged=(value.url!==undefined&&current.monitorType==='HTTP'&&value.url!==current.url)||(value.domain!==undefined&&current.monitorType!=='HTTP'&&value.domain!==current.target)||(value.tcpPort!==undefined&&current.monitorType==='TCP'&&value.tcpPort!==current.tcpPort)||(value.dnsRecordType!==undefined&&current.monitorType==='DNS'&&value.dnsRecordType!==current.dnsRecordType)||(value.timeoutMs!==undefined&&value.timeoutMs!==current.timeoutMs)||(value.intervalSeconds!==undefined&&value.intervalSeconds!==current.intervalSeconds)||(value.sslExpiryWarningDays!==undefined&&current.monitorType==='SSL'&&value.sslExpiryWarningDays!==current.sslExpiryWarningDays);
      const parts=[],values=[];
      if(value.name!==undefined){parts.push('name=?');values.push(value.name);}
      if(value.intervalSeconds!==undefined){parts.push('interval_seconds=?');values.push(value.intervalSeconds);}
      if(value.timeoutMs!==undefined){parts.push('timeout_ms=?');values.push(value.timeoutMs);}
      if(current.monitorType==='HTTP'&&value.url!==undefined){parts.push('url=?','target=?');values.push(value.url,value.url);}
      if(['DNS','SSL'].includes(current.monitorType)&&value.domain!==undefined){parts.push('url=?','target=?');values.push(`${current.monitorType.toLowerCase()}://${value.domain}`,value.domain);}
      if(current.monitorType==='SSL'&&value.sslExpiryWarningDays!==undefined){parts.push('ssl_expiry_warning_days=?');values.push(value.sslExpiryWarningDays);}
      if(current.monitorType==='TCP'&&(value.domain!==undefined||value.tcpPort!==undefined)){const target=value.domain??current.target,port=value.tcpPort??current.tcpPort;parts.push('url=?','target=?','tcp_port=?');values.push('tcp://'+target+':'+port,target,port);}if(!parts.length)return current;
      const now=iso();values.push(now,id);db.prepare(`UPDATE monitors SET ${parts.join(',')}${checkChanged?',config_revision=config_revision+1,consecutive_failures=0,current_status=\'PENDING\',last_checked_at=NULL':''},updated_at=? WHERE id=?`).run(...values);
      if(checkChanged)db.prepare("UPDATE incidents SET status='RESOLVED',resolved_at=?,closure_reason='configuration_changed',recovery_details=NULL WHERE monitor_id=? AND status='OPEN'").run(now,id);
      return this.get(id);
      })();
    },
    setEnabled(id,enabled){db.prepare('UPDATE monitors SET enabled=?,config_revision=config_revision+1,updated_at=? WHERE id=?').run(enabled?1:0,iso(),id);return this.get(id);},
    remove(id){return db.prepare('DELETE FROM monitors WHERE id=?').run(id).changes>0;},
    due(){return db.prepare("SELECT * FROM monitors WHERE enabled=1 AND (last_checked_at IS NULL OR datetime(last_checked_at, '+' || interval_seconds || ' seconds') <= datetime('now'))").all().map(map);},
    checks(id,query){const p=pagination(query),rows=db.prepare('SELECT * FROM checks WHERE monitor_id=? ORDER BY checked_at DESC,id DESC LIMIT ? OFFSET ?').all(id,p.limit,p.offset);return pageResult(rows,db.prepare('SELECT count(*) n FROM checks WHERE monitor_id=?').get(id).n,p);},
    incidents(id,query){const p=pagination(query),rows=db.prepare("SELECT i.*,COALESCE(i.title,'Historical monitoring incident') incident_title,COALESCE(i.first_failure_at,i.started_at) incident_first_failure_at,COALESCE(i.last_failure_at,i.started_at) incident_last_failure_at FROM incidents i WHERE monitor_id=? ORDER BY started_at DESC,id DESC LIMIT ? OFFSET ?").all(id,p.limit,p.offset);return pageResult(rows,db.prepare('SELECT count(*) n FROM incidents WHERE monitor_id=?').get(id).n,p);},
    incidentsAll(query){const p=pagination(query),rows=db.prepare("SELECT i.*,m.name monitor_name,i.snapshot_target monitor_url,i.snapshot_monitor_type monitor_type,i.snapshot_target target,i.snapshot_tcp_port tcp_port,i.snapshot_dns_record_type dns_record_type,COALESCE(i.title,m.name || ' monitoring incident') incident_title,COALESCE(i.first_failure_at,i.started_at) incident_first_failure_at,COALESCE(i.last_failure_at,i.started_at) incident_last_failure_at FROM incidents i JOIN monitors m ON m.id=i.monitor_id ORDER BY CASE i.status WHEN 'OPEN' THEN 0 ELSE 1 END,i.started_at DESC,i.id DESC LIMIT ? OFFSET ?").all(p.limit,p.offset);return pageResult(rows,db.prepare('SELECT count(*) n FROM incidents').get().n,p);},
    incidentById(id){return db.prepare("SELECT i.*,m.name monitor_name,i.snapshot_target monitor_url,i.snapshot_monitor_type monitor_type,i.snapshot_target target,i.snapshot_tcp_port tcp_port,i.snapshot_dns_record_type dns_record_type,COALESCE(i.title,m.name || ' monitoring incident') incident_title,COALESCE(i.first_failure_at,i.started_at) incident_first_failure_at,COALESCE(i.last_failure_at,i.started_at) incident_last_failure_at FROM incidents i JOIN monitors m ON m.id=i.monitor_id WHERE i.id=?").get(id);},
    stats(){return db.prepare("SELECT count(*) total,sum(current_status='UP') operational,sum(current_status='DOWN') failed,(SELECT count(*) FROM incidents WHERE status='OPEN') openIncidents,round(avg((SELECT response_time_ms FROM checks c WHERE c.monitor_id=monitors.id AND c.status='UP' ORDER BY checked_at DESC,id DESC LIMIT 1))) responseTimeMs FROM monitors").get();},
    record(id,result,expectedRevision){
      const now=iso();return db.transaction(()=>{
        const monitor=db.prepare('SELECT * FROM monitors WHERE id=?').get(id);if(!monitor||!monitor.enabled||(expectedRevision!==undefined&&monitor.config_revision!==expectedRevision))return null;
        const failure=classifyFailure(result,monitor.monitor_type);
        db.prepare('INSERT INTO checks(monitor_id,status,response_time_ms,http_status_code,error_message,checked_at,certificate_issuer,certificate_valid_from,certificate_valid_to,certificate_expires_in_days,failure_category) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,result.status,result.responseTimeMs??null,result.httpStatusCode??null,result.errorMessage??null,now,result.certificateIssuer??null,result.certificateValidFrom??null,result.certificateValidTo??null,result.certificateExpiresInDays??null,failure?.category??null);
        const failures=result.status==='UP'?0:monitor.consecutive_failures+1,monitorStatus=result.monitorStatus||result.status;
        db.prepare('UPDATE monitors SET current_status=?,consecutive_failures=?,last_checked_at=?,updated_at=? WHERE id=?').run(monitorStatus,failures,now,now,id);
        const open=db.prepare("SELECT * FROM incidents WHERE monitor_id=? AND status='OPEN'").get(id);
        if(result.status==='DOWN'&&failures>=3){
          const firstFailure=db.prepare("SELECT checked_at FROM checks WHERE monitor_id=? AND status='DOWN' ORDER BY id DESC LIMIT 1 OFFSET ?").get(id,failures-1)?.checked_at||now;
          const title=`${monitor.name}: ${failure.label}`;
          if(open)db.prepare('UPDATE incidents SET failure_count=?,title=?,failure_category=?,failure_explanation=?,last_failure_at=?,last_http_status_code=?,consecutive_failure_count=? WHERE id=?').run(failures,title,failure.category,failure.explanation,now,result.httpStatusCode??null,failures,open.id);
          else db.prepare("INSERT INTO incidents(monitor_id,started_at,status,failure_count,title,failure_category,failure_explanation,first_failure_at,last_failure_at,last_http_status_code,consecutive_failure_count,snapshot_monitor_type,snapshot_target,snapshot_tcp_port,snapshot_dns_record_type) VALUES(?,?,'OPEN',?,?,?,?,?,?,?,?,?,?,?,?)").run(id,now,failures,title,failure.category,failure.explanation,firstFailure,now,result.httpStatusCode??null,failures,monitor.monitor_type,monitor.target,monitor.tcp_port,monitor.dns_record_type);
        }else if(result.status==='UP'&&open)db.prepare("UPDATE incidents SET status='RESOLVED',resolved_at=?,closure_reason='recovered',recovery_details=? WHERE id=?").run(now,`Recovered with ${monitor.monitor_type==='TCP'?'TCP connection':monitor.monitor_type==='DNS'?'DNS resolution':monitor.monitor_type==='SSL'?'a valid SSL certificate':`HTTP ${result.httpStatusCode||'response'}`}`,open.id);
        return this.get(id);
      })();
    },
    purge(days){return db.prepare("DELETE FROM checks WHERE checked_at < datetime('now', ?) AND monitor_id NOT IN (SELECT monitor_id FROM incidents WHERE status='OPEN')").run(`-${days} days`).changes;}
  };
}
module.exports={createMonitorRepository};

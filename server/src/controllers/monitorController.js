const {createMonitor,patchMonitor}=require('../validators/monitor');
const {validateTarget}=require('../services/ssrf');
const {AppError}=require('../utils/errors');
const {validDomain}=require('../config/tcpPolicy');
const id=value=>{const number=Number(value);if(!Number.isSafeInteger(number)||number<1)throw new AppError(400,'Invalid monitor ID');return number;};

function controller(repo,options={}){
  const validate=options.validateTarget||validateTarget;
  return {
    async create(req,res){const value=createMonitor.parse(req.body);if(value.monitorType==='HTTP')await validate(value.url);res.status(201).json({data:repo.create(value)});},
    list(req,res){res.json(repo.list(req.query));},
    get(req,res){const monitor=repo.get(id(req.params.id));if(!monitor)throw new AppError(404,'Monitor not found');res.json({data:monitor});},
    async update(req,res){
      const monitorId=id(req.params.id),current=repo.get(monitorId);if(!current)throw new AppError(404,'Monitor not found');
      const value=patchMonitor.parse(req.body);
      if(current.monitorType!=='TCP'&&value.tcpPort!==undefined)throw new AppError(400,'TCP port requires TCP monitoring');
      if(current.monitorType==='TCP'&&(value.sslExpiryWarningDays!==undefined||(value.domain!==undefined&&!validDomain(value.domain))))throw new AppError(400,'Invalid TCP configuration');
      if(current.monitorType==='HTTP'){
        if(value.domain!==undefined||value.dnsRecordType!==undefined||value.sslExpiryWarningDays!==undefined)throw new AppError(400,'Domain-monitor fields cannot be applied to an HTTP monitor');
        if(value.url)await validate(value.url);
      }else if(current.monitorType==='DNS'){
        if(value.url!==undefined||value.sslExpiryWarningDays!==undefined)throw new AppError(400,'HTTP and SSL fields cannot be applied to a DNS monitor');
      }else if(value.url!==undefined||value.dnsRecordType!==undefined)throw new AppError(400,'HTTP and DNS fields cannot be applied to an SSL monitor');
      res.json({data:repo.update(monitorId,value)});
    },
    pause(req,res){const monitorId=id(req.params.id);if(!repo.get(monitorId))throw new AppError(404,'Monitor not found');res.json({data:repo.setEnabled(monitorId,false)});},
    resume(req,res){const monitorId=id(req.params.id);const monitor=repo.get(monitorId);if(!monitor)throw new AppError(404,'Monitor not found');res.json({data:repo.setEnabled(monitorId,true)});},
    remove(req,res){const monitorId=id(req.params.id);if(repo.incidents(monitorId,{limit:1}).pagination.total>0)throw new AppError(409,'Monitor with incident history cannot be deleted');try{if(!repo.remove(monitorId))throw new AppError(404,'Monitor not found');res.status(204).end();}catch(error){if(error.code==='SQLITE_CONSTRAINT_FOREIGNKEY')throw new AppError(409,'Monitor with incident history cannot be deleted');throw error;}},
    checks(req,res){const monitorId=id(req.params.id);if(!repo.get(monitorId))throw new AppError(404,'Monitor not found');res.json(repo.checks(monitorId,req.query));},
    incidents(req,res){const monitorId=id(req.params.id);if(!repo.get(monitorId))throw new AppError(404,'Monitor not found');res.json(repo.incidents(monitorId,req.query));}
  };
}
module.exports={controller};

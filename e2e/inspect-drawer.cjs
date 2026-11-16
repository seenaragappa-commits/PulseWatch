const {chromium}=require('@playwright/test'),{fork}=require('node:child_process'),fs=require('node:fs');
(async()=>{
 await require('./global-setup.cjs')();
 const {outputPath}=require('./output-policy.cjs');const output=outputPath('run-drawer-diagnostic');fs.mkdirSync(output,{recursive:false});
 const child=fork('e2e/harness.cjs',[],{env:{...process.env,NODE_ENV:'test'},stdio:['ignore','ignore','ignore','ipc']});
 const ready=await new Promise((resolve,reject)=>{child.once('message',resolve);child.once('error',reject);child.once('exit',code=>reject(Error('Diagnostic harness exited before readiness: '+code)));});let id=0;
 const command=command=>new Promise(resolve=>{child.once('message',resolve);child.send({id:++id,command});});
 let browser;
 try{
 browser=await chromium.launch({chromiumSandbox:true});
 for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:width===390?844:900},isMobile:width===390,serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===ready.origin?route.continue():route.abort());
 const page=await context.newPage();await page.goto(ready.origin);
 if(width===390){await page.evaluate(()=>fetch('/api/monitors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Layout fixture',monitorType:'SSL',domain:'example.com',intervalSeconds:86400,timeoutMs:1000})}));await command('history');}
 await page.reload();await page.locator('tr.monitor-row b').click();const next=page.getByRole('button',{name:'Next',exact:true});await next.waitFor();await next.scrollIntoViewIfNeeded();
 const data=await page.evaluate(()=>{
 const box=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,class:e.className,x:r.x,y:r.y,width:r.width,height:r.height,clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,display:s.display,direction:s.flexDirection,shrink:s.flexShrink,align:s.alignItems,overflow:s.overflow,position:s.position,zIndex:s.zIndex};};
 const next=[...document.querySelectorAll('.pager button')].find(e=>e.textContent==='Next'),r=next.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
 return {innerWidth,outerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('.drawer,.drawer-head,.detail-grid,.check-history,.history-scroll,.pager,.pager button')].map(box),hit:hit?box(hit):null,nextReceivesClick:hit===next||next.contains(hit)};
 });
 fs.writeFileSync(output+'/'+width+'.json',JSON.stringify(data,null,2));await page.screenshot({path:output+'/'+width+'.png',fullPage:true});console.log(width,JSON.stringify(data));await context.close();
 }
 }finally{await browser?.close();await command('stop');}
})().catch(e=>{console.error(e);process.exitCode=1;});

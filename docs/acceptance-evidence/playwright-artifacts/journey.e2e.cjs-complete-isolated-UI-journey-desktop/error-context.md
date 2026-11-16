# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey.e2e.cjs >> complete isolated UI journey
- Location: e2e\journey.e2e.cjs:4:1

# Error details

```
Error: Browser acceptance defects

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 31

- Array []
+ Array [
+   Object {
+     "name": "open incident drawer refreshes after recovery",
+     "observed": "INCIDENT DETAILS
+
+ Browser HTTP: Connection refused
+ ×
+ Status
+ OPEN
+ Monitor
+ Browser HTTP
+ Monitor type
+ HTTP / HTTPS
+ Failure category
+ CONNECTION REFUSED
+ First failure
+ 11/15/2026, 11:03:45 PM
+ Latest failure
+ 11/15/2026, 11:03:45 PM
+ Consecutive failures
+ 4
+ Explanation
+
+ The destination refused the monitoring connection.",
+     "status": "FAIL",
+   },
+   Object {
+     "name": "certificate summary remains current while paging",
+     "status": "FAIL",
+   },
+ ]
```

# Page snapshot

```yaml
- main [ref=f5e3]:
  - complementary [ref=f5e4]:
    - generic [ref=f5e5]: ◉ PulseWatch
    - button "Overview" [ref=f5e6] [cursor=pointer]
    - button "Monitors" [ref=f5e7] [cursor=pointer]
    - button "Incidents" [ref=f5e8] [cursor=pointer]
    - button "About" [ref=f5e9] [cursor=pointer]
    - generic [ref=f5e10]: Local monitoring MVPSecure public destinations
  - generic [ref=f5e11]:
    - generic [ref=f5e12]:
      - generic [ref=f5e13]:
        - paragraph [ref=f5e14]: PULSEWATCH / OVERVIEW
        - heading "System overview" [level=1] [ref=f5e15]
      - generic [ref=f5e16]:
        - text: System operational
        - button "+ Add monitor" [ref=f5e18] [cursor=pointer]
    - generic [ref=f5e19]:
      - generic [ref=f5e20]:
        - strong [ref=f5e21]: "4"
        - generic [ref=f5e22]: Total monitors
      - generic [ref=f5e23]:
        - strong [ref=f5e24]: "4"
        - generic [ref=f5e25]: Operational
      - generic [ref=f5e26]:
        - strong [ref=f5e27]: "0"
        - generic [ref=f5e28]: Failed
      - generic [ref=f5e29]:
        - strong [ref=f5e30]: "0"
        - generic [ref=f5e31]: Open incidents
      - generic [ref=f5e32]:
        - strong [ref=f5e33]: 12 ms
        - generic [ref=f5e34]: Average response
    - generic [ref=f5e35]:
      - generic [ref=f5e36]:
        - heading "Monitors" [level=2] [ref=f5e37]
        - generic [ref=f5e38]: 4 configured
      - table [ref=f5e40]:
        - rowgroup [ref=f5e41]:
          - row [ref=f5e42]:
            - columnheader "Website / domain" [ref=f5e43]
            - columnheader "Status" [ref=f5e44]
            - columnheader "Response" [ref=f5e45]
            - columnheader "Last checked" [ref=f5e46]
            - columnheader "Schedule" [ref=f5e47]
            - columnheader [ref=f5e48]
        - rowgroup [ref=f5e49]:
          - row [ref=f5e50] [cursor=pointer]:
            - cell "Browser TCP example.org" [ref=f5e51]:
              - generic [ref=f5e52]: Browser TCP
              - generic [ref=f5e53]: example.org
            - cell "UP" [ref=f5e54]
            - cell "12 ms" [ref=f5e55]
            - cell "11/15/2026, 11:03:46 PM" [ref=f5e56]
            - cell "86400s" [ref=f5e57]
            - cell [ref=f5e58]:
              - button "Pause" [ref=f5e59]
              - button "Edit" [ref=f5e60]
              - button "Delete" [ref=f5e61]
          - row [ref=f5e62] [cursor=pointer]:
            - cell "Browser SSL SSL · example.org" [ref=f5e63]:
              - generic [ref=f5e64]: Browser SSL
              - generic [ref=f5e65]: SSL · example.org
            - cell "UP" [ref=f5e66]
            - cell "12 ms" [ref=f5e67]
            - cell "11/15/2026, 11:03:46 PM" [ref=f5e68]
            - cell "86400s" [ref=f5e69]
            - cell [ref=f5e70]:
              - button "Pause" [ref=f5e71]
              - button "Edit" [ref=f5e72]
              - button "Delete" [ref=f5e73]
          - row [ref=f5e74] [cursor=pointer]:
            - cell "Browser DNS DNS · example.org" [ref=f5e75]:
              - generic [ref=f5e76]: Browser DNS
              - generic [ref=f5e77]: DNS · example.org
            - cell "UP" [ref=f5e78]
            - cell "12 ms" [ref=f5e79]
            - cell "11/15/2026, 11:03:46 PM" [ref=f5e80]
            - cell "86400s" [ref=f5e81]
            - cell [ref=f5e82]:
              - button "Pause" [ref=f5e83]
              - button "Edit" [ref=f5e84]
              - button "Delete" [ref=f5e85]
          - row [ref=f5e86] [cursor=pointer]:
            - cell "Browser HTTP https://example.org" [ref=f5e87]:
              - generic [ref=f5e88]: Browser HTTP
              - generic [ref=f5e89]: https://example.org
            - cell "UP" [ref=f5e90]
            - cell "12 ms" [ref=f5e91]
            - cell "11/15/2026, 11:03:46 PM" [ref=f5e92]
            - cell "86400s" [ref=f5e93]
            - cell [ref=f5e94]:
              - button "Pause" [ref=f5e95]
              - button "Edit" [ref=f5e96]
              - button "Delete" [ref=f5e97]
    - generic [ref=f5e98]:
      - generic [ref=f5e99]:
        - generic [ref=f5e100]:
          - heading "Recent incidents" [level=2] [ref=f5e101]
          - generic [ref=f5e102]: 0 open
        - 'button "RESOLVED Browser HTTP: Connection refused HTTP · CONNECTION REFUSED · 4 failures First failure 11/15/2026, 11:03:45 PM · Recovered 11/15/2026, 11:03:46 PM" [ref=f5e103] [cursor=pointer]':
          - generic [ref=f5e104]: RESOLVED
          - generic [ref=f5e105]:
            - generic [ref=f5e106]: "Browser HTTP: Connection refused"
            - generic [ref=f5e107]: HTTP · CONNECTION REFUSED · 4 failures
            - generic [ref=f5e108]: First failure 11/15/2026, 11:03:45 PM · Recovered 11/15/2026, 11:03:46 PM
        - 'button "RESOLVED Browser DNS: Connection refused DNS · CONNECTION REFUSED · 4 failures First failure 11/15/2026, 11:03:45 PM · Recovered 11/15/2026, 11:03:46 PM" [ref=f5e109] [cursor=pointer]':
          - generic [ref=f5e110]: RESOLVED
          - generic [ref=f5e111]:
            - generic [ref=f5e112]: "Browser DNS: Connection refused"
            - generic [ref=f5e113]: DNS · CONNECTION REFUSED · 4 failures
            - generic [ref=f5e114]: First failure 11/15/2026, 11:03:45 PM · Recovered 11/15/2026, 11:03:46 PM
        - 'button "RESOLVED Browser SSL: Connection refused SSL · CONNECTION REFUSED · 4 failures First failure 11/15/2026, 11:03:45 PM · Recovered 11/15/2026, 11:03:46 PM" [ref=f5e115] [cursor=pointer]':
          - generic [ref=f5e116]: RESOLVED
          - generic [ref=f5e117]:
            - generic [ref=f5e118]: "Browser SSL: Connection refused"
            - generic [ref=f5e119]: SSL · CONNECTION REFUSED · 4 failures
            - generic [ref=f5e120]: First failure 11/15/2026, 11:03:45 PM · Recovered 11/15/2026, 11:03:46 PM
        - 'button "RESOLVED Browser TCP: Connection refused TCP · CONNECTION REFUSED · 4 failures First failure 11/15/2026, 11:03:45 PM · Recovered 11/15/2026, 11:03:46 PM" [ref=f5e121] [cursor=pointer]':
          - generic [ref=f5e122]: RESOLVED
          - generic [ref=f5e123]:
            - generic [ref=f5e124]: "Browser TCP: Connection refused"
            - generic [ref=f5e125]: TCP · CONNECTION REFUSED · 4 failures
            - generic [ref=f5e126]: First failure 11/15/2026, 11:03:45 PM · Recovered 11/15/2026, 11:03:46 PM
      - generic [ref=f5e127]:
        - heading "How incident detection works" [level=2] [ref=f5e128]
        - paragraph [ref=f5e129]: One or two failed checks are recorded as activity. The third consecutive failure opens one incident. A later successful check resolves it automatically.
```

# Test source

```ts
  1  | const {test,expect}=require('@playwright/test');
  2  | const {fork}=require('node:child_process');
  3  | const fs=require('node:fs'),path=require('node:path');
  4  | test('complete isolated UI journey',async({page,context},info)=>{
  5  |  const child=fork(path.resolve('e2e/harness.cjs'),[],{env:{...process.env,NODE_ENV:'test'},stdio:['ignore','pipe','pipe','ipc'],windowsHide:true});
  6  |  const logs={console:[],pageErrors:[],failedRequests:[],httpErrors:[],blocked:[],scenarios:[]};
  7  |  const ready=await new Promise((resolve,reject)=>{child.once('message',resolve);child.once('error',reject);child.once('exit',code=>reject(Error('Harness exited '+code)));});
  8  |  logs.database=ready.database;let seq=0;
  9  |  const command=command=>new Promise((resolve,reject)=>{const id=++seq;const listener=m=>{if(m.id===id){child.off('message',listener);m.error?reject(Error(m.error)):resolve();}};child.on('message',listener);child.send({id,command});});
  10 |  const shot=async name=>page.screenshot({path:info.outputPath(name+'.png'),fullPage:true});
  11 |  const scenario=async(name,fn)=>{try{await test.step(name,fn);logs.scenarios.push({name,status:'PASS'});}catch(error){logs.scenarios.push({name,status:'FAIL',error:error.message});await shot('failure-'+logs.scenarios.length);throw error;}};
  12 |  await context.route('**/*',route=>{if(new URL(route.request().url()).origin===ready.origin)return route.continue();logs.blocked.push(route.request().url());return route.abort();});
  13 |  page.on('console',m=>{if(m.type()==='error')logs.console.push(m.text());});page.on('pageerror',e=>logs.pageErrors.push(e.message));page.on('requestfailed',r=>logs.failedRequests.push({url:r.url(),error:r.failure()}));page.on('response',r=>{if(r.status()>=400)logs.httpErrors.push({url:r.url(),status:r.status()});});
  14 |  const row=type=>page.locator('tr.monitor-row').filter({hasText:'Browser '+type});
  15 |  try{
  16 |  await scenario('dashboard empty state and navigation',async()=>{await page.goto(ready.origin);await expect(page.getByText('No monitors yet.',{exact:false})).toBeVisible();for(const name of ['Monitors','Incidents','About','Overview']){await page.getByRole('button',{name,exact:true}).click();}await shot('empty');});
  17 |  for(const type of ['HTTP','DNS','SSL','TCP']){
  18 |  await scenario('create '+type,async()=>{await page.getByRole('button',{name:'+ Add monitor'}).click();await page.locator('[name=monitorType]').selectOption(type);await page.locator('[name=name]').fill('Browser '+type);await page.locator(type==='HTTP'?'[name=url]':'[name=domain]').fill(type==='HTTP'?'https://example.com':'example.com');await page.locator('[name=intervalSeconds]').fill('86400');await page.getByRole('button',{name:'Save monitor',exact:true}).click();await expect(row(type)).toBeVisible();});
  19 |  await scenario('edit '+type,async()=>{await row(type).getByRole('button',{name:'Edit',exact:true}).click();await page.locator(type==='HTTP'?'[name=url]':'[name=domain]').fill(type==='HTTP'?'https://example.org':'example.org');await page.getByRole('button',{name:'Save monitor',exact:true}).click();await expect(row(type)).toContainText('example.org');});
  20 |  }
  21 |  await scenario('form validation',async()=>{await page.getByRole('button',{name:'+ Add monitor'}).click();await page.getByRole('button',{name:'Save monitor',exact:true}).click();await expect(page.locator('[name=name]:invalid')).toBeVisible();await page.locator('[name=monitorType]').selectOption('DNS');await page.locator('[name=name]').fill('Invalid domain');await page.locator('[name=domain]').fill('bad..domain');await page.getByRole('button',{name:'Save monitor',exact:true}).click();await expect(page.locator('.modal .error')).toContainText('Validation failed');await shot('validation');await page.getByRole('button',{name:'Cancel',exact:true}).click();});
  22 |  await command('recover');await page.reload();
  23 |  await scenario('status history details and refresh persistence',async()=>{await expect(page.locator('tr.monitor-row')).toHaveCount(4);for(const type of ['HTTP','DNS','SSL','TCP']){await expect(row(type)).toContainText('UP');await row(type).locator('b').click();const drawer=page.getByRole('complementary',{name:'Monitor details'});await expect(drawer).toContainText('example.org');await expect(drawer.locator('tbody tr').first()).toContainText('12 ms');await shot('details-'+type);await page.getByRole('button',{name:'Close monitor details'}).click();}await shot('dashboard');});
  24 |  await scenario('three failures create one incident per monitor',async()=>{for(let i=1;i<=3;i++){await command('fail');await page.reload();await page.getByRole('button',{name:'Incidents',exact:true}).click();await expect(page.locator('button.incident')).toHaveCount(i<3?0:4);}await command('fail');await page.reload();await page.getByRole('button',{name:'Incidents',exact:true}).click();await expect(page.locator('button.incident')).toHaveCount(4);await expect(page.locator('button.incident').first()).toContainText('4 failures');await page.locator('button.incident').first().click();await expect(page.getByRole('complementary',{name:'Incident details'})).toContainText('destination refused');await shot('incident-open');});
  25 |  await command('recover');await page.waitForTimeout(16000);
  26 |  const stale=await page.getByRole('complementary',{name:'Incident details'}).innerText();logs.scenarios.push({name:'open incident drawer refreshes after recovery',status:stale.includes('RESOLVED')?'PASS':'FAIL',observed:stale});await shot('incident-after-recovery');
  27 |  await page.getByRole('button',{name:'Close incident details'}).click();
  28 |  await scenario('recovery and reopened incident details',async()=>{await expect(page.locator('button.incident').first()).toContainText('RESOLVED');await page.locator('button.incident').first().click();await expect(page.getByRole('complementary',{name:'Incident details'})).toContainText('Recovered');await shot('incident-resolved');await page.getByRole('button',{name:'Close incident details'}).click();});
  29 |  await command('history');await page.getByRole('button',{name:'Overview',exact:true}).click();await row('SSL').locator('b').click();const drawer=page.getByRole('complementary',{name:'Monitor details'});
  30 |  await scenario('certificate metadata and history pagination',async()=>{await expect(drawer).toContainText('Current fixture CA');await page.getByRole('button',{name:'Next',exact:true}).click();await expect(drawer).toContainText('Page 2');await shot('certificate-history-page2');});
  31 |  logs.scenarios.push({name:'certificate summary remains current while paging',status:(await drawer.innerText()).includes('Historical fixture CA')?'FAIL':'PASS'});
  32 |  await page.getByRole('button',{name:'Close monitor details'}).click();
  33 |  const width=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));logs.scenarios.push({name:'viewport has no document overflow',status:width.document<=width.viewport?'PASS':'FAIL',observed:width});await shot('layout');
  34 |  logs.scenarios.push({name:'no unexpected browser errors',status:logs.pageErrors.length||logs.failedRequests.length||logs.blocked.length||logs.httpErrors.some(r=>r.status!==400)?'FAIL':'PASS'});
  35 |  }finally{fs.writeFileSync(info.outputPath('observations.json'),JSON.stringify(logs,null,2));await command('stop');}
> 36 |  expect(logs.scenarios.filter(s=>s.status==='FAIL'),'Browser acceptance defects').toEqual([]);
     |                                                                                   ^ Error: Browser acceptance defects
  37 | });
  38 | 
```
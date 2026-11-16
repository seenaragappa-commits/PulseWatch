const {defineConfig}=require('@playwright/test');
const {outputPath}=require('./e2e/output-policy.cjs');
const output=outputPath(process.env.E2E_OUTPUT);
module.exports=defineConfig({testDir:'./e2e',testMatch:'*.e2e.cjs',globalSetup:'./e2e/global-setup.cjs',workers:1,retries:0,timeout:180000,outputDir:output,reporter:[['list'],['json',{outputFile:output+'-results.json'}]],use:{headless:true,serviceWorkers:'block',trace:'on',screenshot:'on',launchOptions:{chromiumSandbox:true}},projects:[{name:'desktop',use:{viewport:{width:1440,height:900}}},{name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}]});

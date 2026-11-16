const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../docs/e2e-runs');
function outputPath(requested){
  // Never allow an existing output directory: Playwright clears outputDir.
  const label=requested||`run-${crypto.randomUUID()}`;
  if(!/^run-[a-z0-9-]{1,80}$/.test(label))throw Error('E2E_OUTPUT must be a new run-<lowercase letters, digits or hyphens> name');
  if(fs.existsSync(root)&&fs.realpathSync(root)!==root)throw Error('E2E output root must not be a symbolic link');
  const requestedPath=path.join(root,label);
  if(fs.existsSync(requestedPath)||fs.existsSync(requestedPath+'-results.json'))throw Error('E2E output directory or result file already exists');
  // Playwright reloads configuration in workers. Each evaluation gets its own
  // unoccupied directory, so no worker can clear another run's evidence.
  const result=path.join(root,`${label}-${crypto.randomUUID()}`);
  if(fs.existsSync(result)||fs.existsSync(result+'-results.json'))throw Error('E2E output collision');
  return result;
}
module.exports={root,outputPath};

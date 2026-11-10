// Non-destructive rehearsal. Originals are opened read-only; no restore to source.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync, backup } = require('node:sqlite');
const { promisify } = require('node:util');
const run = promisify(require('node:child_process').execFile);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function inventory(root, relative = '') {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap(entry => {
    const rel = path.join(relative, entry.name), full = path.join(root, rel);
    if (fs.lstatSync(full).isSymbolicLink()) throw Error('Refusing linked storage entry');
    if (entry.isDirectory()) return inventory(root, rel);
    if (!entry.isFile()) throw Error('Unsupported storage entry');
    return [{ relative: rel, bytes: fs.statSync(full).size, sha256: hash(fs.readFileSync(full)) }];
  }).sort((a,b) => a.relative.localeCompare(b.relative));
}
function tables(db) {
  return db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name}) => {
    const rows = db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'"').all();
    const serial = rows.map(r => JSON.stringify(r, (_,v) => typeof v === 'bigint' ? String(v) : v)).sort();
    return { name, rows: rows.length, digest: hash(JSON.stringify(serial)) };
  });
}
async function main() {
  const [sourceArg, storageArg, mode, label='local-recovery-review'] = process.argv.slice(2);
  if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid report label');
  if (!sourceArg || !storageArg || !['restore','restore-and-scan'].includes(mode)) throw Error('Usage: node scripts/local-recovery-review.cjs DATABASE STORAGE restore|restore-and-scan');
  const source = fs.realpathSync(sourceArg), storage = fs.realpathSync(storageArg);
  const dest = fs.mkdtempSync(path.join(process.cwd(), '.tmp', 'recovery-review-'));
  const report = { date: new Date().toISOString(), destination: dest, sourceOpenedReadOnly: true, scanRequested: mode === 'restore-and-scan', checks: [], scans: [] };
  try {
    const original = new DatabaseSync(source, {readOnly:true});
    let baseline;
    try {
      if (original.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw Error('Source integrity failed');
      await backup(original, path.join(dest,'backup.sqlite'));
      baseline = tables(original);
    } finally { original.close(); }
    fs.copyFileSync(path.join(dest,'backup.sqlite'),path.join(dest,'restored.sqlite'),fs.constants.COPYFILE_EXCL);
    const restored = new DatabaseSync(path.join(dest,'restored.sqlite'), {readOnly:true});
    try {
      if (restored.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw Error('Restore integrity failed');
      if (restored.prepare('PRAGMA foreign_key_check').all().length) throw Error('Restore foreign keys failed');
      if (JSON.stringify(tables(restored)) !== JSON.stringify(baseline)) throw Error('Table/credential reconciliation failed');
      report.tableCount = baseline.length;
      report.rowCount = baseline.reduce((n,t)=>n+t.rows,0);
      report.checks.push('SQLite backup restored; integrity, foreign keys and every table row including credentials match');
    } finally { restored.close(); }
    const before = inventory(storage);
    fs.cpSync(storage,path.join(dest,'restored-storage'),{recursive:true,force:false,errorOnExist:true});
    if (JSON.stringify(before)!==JSON.stringify(inventory(path.join(dest,'restored-storage')))) throw Error('Restored files differ');
    report.fileCount=before.length; report.bytes=before.reduce((n,f)=>n+f.bytes,0);
    report.checks.push('All storage files restored and SHA-256 reconciled');
    if (report.scanRequested) {
      if(process.platform!=='win32') throw Error('This scanner rehearsal requires Windows Defender');
      const health=JSON.parse((await run('powershell.exe',['-NoProfile','-NonInteractive','-Command','Get-MpComputerStatus | Select-Object AntivirusEnabled,AMServiceEnabled,AntivirusSignatureLastUpdated | ConvertTo-Json -Compress'],{windowsHide:true,timeout:60000})).stdout);
      const updated=Number(String(health.AntivirusSignatureLastUpdated).match(/Date\((\d+)/)?.[1]);
      if(!health.AntivirusEnabled||!health.AMServiceEnabled||!updated||Date.now()-updated>7*86400000)throw Error('Scanner disabled/stale');
      report.scanner='Microsoft Defender'; report.signatureDate=new Date(updated).toISOString();
      for(const file of before) {
        const start=Date.now();
        try {
          await run('C:\\Program Files\\Windows Defender\\MpCmdRun.exe',['-Scan','-ScanType','3','-File',path.join(dest,'restored-storage',file.relative),'-DisableRemediation','-ReturnHR'],{windowsHide:true,timeout:180000,maxBuffer:1048576});
          report.scans.push({file:file.relative,status:'scanner-completed-no-detection',ms:Date.now()-start});
        } catch { report.scans.push({file:file.relative,status:'unresolved-detection-or-scanner-error',ms:Date.now()-start}); }
        console.log('Scanned '+report.scans.length+'/'+before.length+': '+report.scans.at(-1).status);
      }
    }
    if(JSON.stringify(before)!==JSON.stringify(inventory(storage)))throw Error('Source files changed during review');
    const finalSource=new DatabaseSync(source,{readOnly:true});
    try { if(JSON.stringify(tables(finalSource))!==JSON.stringify(baseline))throw Error('Source database changed during review; repeat in quiet window'); }
    finally{finalSource.close();}
    report.checks.push('Original database and storage unchanged during rehearsal');
    report.status=report.scans.some(s=>s.status.startsWith('unresolved'))?'partial':'passed';
  } catch(e) {report.status='failed'; report.error=e.message;process.exitCode=1;}
  report.scope='Specified database/storage only; not application boot, external FICCI directories, production DR or all historic repositories. Scanner completion is not a zero-malware guarantee.';
  fs.writeFileSync(path.join(dest,'result.json'),JSON.stringify(report,null,2));
  fs.writeFileSync('security-review/'+label+'-results.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:report.status,tableCount:report.tableCount,fileCount:report.fileCount,result:path.join(dest,'result.json'),error:report.error}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});

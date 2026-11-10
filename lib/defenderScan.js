import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const run=promisify(execFile);let healthCheckedAt=0;
export async function scanWithDefender(bytes) {
  if(process.platform!=="win32")throw new Error("Windows Defender scanning is available only on Windows.");
  if(Date.now()-healthCheckedAt>60000){
    try{
      const {stdout}=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command','Get-MpComputerStatus | Select-Object AntivirusEnabled,AMServiceEnabled,AntivirusSignatureLastUpdated | ConvertTo-Json -Compress'],{windowsHide:true,timeout:15000,maxBuffer:32768});
      const health=JSON.parse(stdout),updated=Number(String(health.AntivirusSignatureLastUpdated).match(/Date\((\d+)/)?.[1]);
      if(!health.AntivirusEnabled||!health.AMServiceEnabled||!updated||Date.now()-updated>7*86400000)throw new Error('Unhealthy scanner');
      healthCheckedAt=Date.now();
    }catch{throw new Error("Antivirus is unavailable or signatures are outdated. Upload was not accepted.");}
  }
  const folder=await mkdtemp(path.join(os.tmpdir(),'csir-upload-scan-')),file=path.join(folder,'upload.bin');
  try{
    await writeFile(file,Buffer.from(bytes),{flag:'wx'});
    await run('C:\\Program Files\\Windows Defender\\MpCmdRun.exe',['-Scan','-ScanType','3','-File',file,'-DisableRemediation','-ReturnHR'],{windowsHide:true,timeout:45000,maxBuffer:65536});
    return {scanned:true,engine:'Microsoft Defender'};
  }catch{throw new Error("Antivirus rejected the file or could not complete scanning. Upload was not accepted.");}
  finally{await unlink(file).catch(()=>{});await rmdir(folder).catch(()=>{});}
}

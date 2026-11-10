const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const JSZip = require('jszip');
const root = path.resolve(__dirname, '..');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
async function main() {
  const zip = new JSZip(), manifest = [];
  const prefix = 'csir-bdg-platform/';
  function add(relative, destination = relative) {
    const bytes = fs.readFileSync(path.join(root, relative));
    zip.file(prefix + destination, bytes);
    manifest.push({file: destination, bytes: bytes.length, sha256: hash(bytes)});
  }
  function walk(dir, accept = () => true) {
    for (const entry of fs.readdirSync(path.join(root, dir), {withFileTypes: true})) {
      const relative = dir + '/' + entry.name;
      if (entry.isSymbolicLink()) throw Error('Unexpected symlink: ' + relative);
      if (entry.isDirectory()) {
        if (!['node_modules', '__pycache__', '.venv', 'generated', 'data'].includes(entry.name)) walk(relative, accept);
      } else if (accept(relative)) add(relative);
    }
  }
  for (const folder of ['app', 'lib', 'public', 'python', 'deployment', 'scripts']) {
    walk(folder, p => !/\.(pyc|db|sqlite|zip|log)$/i.test(p));
  }
  for (const entry of fs.readdirSync(path.join(root, 'prisma'))) {
    if (/\.(prisma|js)$/.test(entry)) add('prisma/' + entry);
  }
  walk('prisma/mysql', p => /\.(prisma|sql|js|cjs|txt|md)$/.test(p));
  if (fs.existsSync(path.join(root, 'prisma/d1/schema.sql'))) add('prisma/d1/schema.sql');
  for (const file of ['package.json','package-lock.json','next.config.mjs','proxy.js',
    'instrumentation.js','open-next.config.ts','wrangler.jsonc','.gitignore','.env.example']) add(file);
  // Only dated/status evidence, no operational data, screenshots or transient logs.
  for (const entry of fs.readdirSync(path.join(root, 'security-review'))) {
    if (/\.(json|txt)$/.test(entry)) add('security-review/' + entry);
  }
  for (const file of ['security-integration.cjs','security-role-matrix.cjs',
    'business-uat.cjs','a11y-workflows.cjs','five-area-review.cjs',
    'five-accessibility.cjs','legacy-api-integration.cjs','security-parser-capacity.cjs']) {
    if (fs.existsSync(path.join(root, '.tmp', file))) add('.tmp/' + file);
  }
  add('security-review/SUBMISSION-READINESS-2026-11-09.txt', 'START-HERE.txt');
  zip.file(prefix + 'SHA256-MANIFEST.json', JSON.stringify(manifest, null, 2));
  const bytes = await zip.generateAsync({type:'nodebuffer', compression:'DEFLATE'});
  const check = await JSZip.loadAsync(bytes);
  for (const item of manifest) {
    const actual = await check.file(prefix + item.file).async('nodebuffer');
    if (hash(actual) !== item.sha256) throw Error('Hash mismatch: ' + item.file);
    if (/(^|\/)(\.env|dev\.db|initial-credentials\.json)$|\.(sqlite|db|zip)$/i.test(item.file)) throw Error('Forbidden file: ' + item.file);
  }
  for (const required of ['app/layout.js','prisma/schema.prisma','package.json','START-HERE.txt',
    'lib/parserRunner.js','scripts/legacy-office.cjs']) {
    if (!check.file(prefix + required)) throw Error('Missing required source: ' + required);
  }
  const out = path.join(root, 'output', 'submission');
  fs.mkdirSync(out, {recursive:true});
  const filename = 'CSIR-BDG-Submission-Candidate-2026-11-09.zip';
  fs.writeFileSync(path.join(out, filename), bytes);
  const result = {date:new Date().toISOString(), filename, files:manifest.length,
    bytes:bytes.length, sha256:hash(bytes), verified:true,
    excludes:'Operational database, credentials, .env, uploads, FICCI data, build outputs and dependencies'};
  fs.writeFileSync(path.join(out, 'PACKAGE-VERIFICATION.json'), JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
}
main().catch(error => {console.error(error);process.exitCode=1;});

const fs = require('fs');
const path = require('path');

function readLines(p) {
  return fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean);
}

function classify(v) {
  if (/^[0-9a-fA-F]{32}$/.test(v)) return 'md5';
  if (/^[0-9a-fA-F]{40}$/.test(v)) return 'sha1';
  if (/^[0-9a-fA-F]{64}$/.test(v)) return 'sha256';
  if (/^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(v)) return 'ipv4';
  if (/^[A-Za-z0-9._-]+\.[A-Za-z]{2,}$/.test(v)) return 'domain';
  try { new URL(v); return 'url'; } catch { return 'unknown'; }
}

function loadDb(file) {
  if (!fs.existsSync(file)) return { meta: { authors: 't.me/Bengamin_Button t.me/XillenAdapter' }, items: [] };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveDb(file, db) {
  fs.writeFileSync(file, JSON.stringify(db, null, 2), 'utf8');
}

function add(db, value, tags) {
  const t = classify(value);
  const id = require('crypto').createHash('sha256').update(value.toLowerCase()).digest('hex');
  const exists = db.items.find(x => x.id === id);
  if (exists) {
    const set = new Set([...(exists.tags||[]), ...tags]);
    exists.tags = Array.from(set);
    return exists;
  }
  const it = { id, value, type: t, tags: tags || [], score: score(t), authors: 't.me/Bengamin_Button t.me/XillenAdapter' };
  db.items.push(it);
  return it;
}

function score(t){
  if (t === 'sha256' || t === 'sha1' || t === 'md5') return 90;
  if (t === 'ipv4') return 70;
  if (t === 'domain') return 60;
  if (t === 'url') return 65;
  return 40;
}

function importFile(db, file, tag) {
  const lines = readLines(file);
  for (const v of lines) add(db, v.trim(), tag? [tag]: []);
}

function list(db, q) {
  let items = db.items;
  if (q) items = items.filter(x => x.value.includes(q) || (x.tags||[]).includes(q));
  console.log(JSON.stringify({ count: items.length, items }, null, 2));
}

function remove(db, id) {
  const n = db.items.length;
  db.items = db.items.filter(x => x.id !== id);
  console.log(n !== db.items.length ? 'ok' : 'not found');
}

function exportStix(db, out) {
  const bundle = { type: 'bundle', id: 'bundle--'+Date.now(), objects: db.items.map(x => ({ type: 'indicator', id: 'indicator--'+x.id.slice(0,32), pattern: `[${x.type}:value = '${x.value}']`, labels: x.tags })) };
  fs.writeFileSync(out, JSON.stringify(bundle, null, 2), 'utf8');
  console.log(out);
}

function usage(){
  console.log('t.me/Bengamin_Button t.me/XillenAdapter');
  console.log('usage: node index.js <db.json> cmd ...');
  console.log('cmds: add <value> [tag] | import <file> [tag] | list [q] | rm <id> | export-stix <out.json>');
}

function main(){
  if (process.argv.length < 4) { usage(); process.exit(1); }
  const dbPath = process.argv[2];
  const cmd = process.argv[3];
  const db = loadDb(dbPath);
  if (cmd === 'add') { const v = process.argv[4]; const tag = process.argv[5]; add(db, v, tag? [tag]: []); saveDb(dbPath, db); console.log('ok'); return; }
  if (cmd === 'import') { const f = process.argv[4]; const tag = process.argv[5]; importFile(db, f, tag); saveDb(dbPath, db); console.log('ok'); return; }
  if (cmd === 'list') { const q = process.argv[4]; list(db, q); return; }
  if (cmd === 'rm') { const id = process.argv[4]; remove(db, id); saveDb(dbPath, db); return; }
  if (cmd === 'export-stix') { const out = process.argv[4] || 'iocs.stix.json'; exportStix(db, out); return; }
  usage();
}

if (require.main === module) main();

console.log("t.me/Bengamin_Button t.me/XillenAdapter")

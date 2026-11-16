const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const file = path.join(__dirname, '..', 'data', 'sqlite-verification.db');
fs.mkdirSync(path.dirname(file), { recursive: true });
try { fs.unlinkSync(file); } catch {}
let db = new Database(file);
db.exec('CREATE TABLE verification (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');
db.prepare('INSERT INTO verification (value) VALUES (?)').run('persisted');
db.close();
db = new Database(file, { readonly: true });
const row = db.prepare('SELECT value FROM verification WHERE id = 1').get();
db.close();
if (row?.value !== 'persisted') throw new Error('SQLite persistence verification failed');
console.log(`SQLite persistence verified: ${file}`);

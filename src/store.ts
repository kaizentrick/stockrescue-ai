import { DatabaseSync } from 'node:sqlite';
import type { Case } from './domain.ts';
export class Store {
 db: DatabaseSync;
 constructor(path=':memory:') {
  this.db=new DatabaseSync(path); this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS mock_orders (key TEXT PRIMARY KEY, data TEXT NOT NULL);');
 }
 get(id:string):Case { const row=this.db.prepare('SELECT data FROM cases WHERE id=?').get(id) as {data:string}|undefined; if(!row) throw new Error('Expediente no encontrado.'); return JSON.parse(row.data) as Case; }
 all():Case[] { return (this.db.prepare('SELECT data FROM cases ORDER BY rowid DESC').all() as {data:string}[]).map(r=>JSON.parse(r.data) as Case); }
 save(c:Case) { this.db.prepare('INSERT INTO cases VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(c.id,JSON.stringify(c)); }
 transaction<T>(fn:()=>T):T {this.db.exec('BEGIN IMMEDIATE');try {const result=fn();this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 close(){this.db.close();}
}

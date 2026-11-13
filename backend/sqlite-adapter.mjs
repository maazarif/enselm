// Local development/test adapter. Production uses the host-provided D1 binding.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export function createSqliteDB(filename=':memory:'){
  const sqlite=new DatabaseSync(filename);
  sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='relay_mailboxes'").get())sqlite.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
  const wrap=(sql,args=[])=>({
    bind(...values){return wrap(sql,values);},
    run(){const result=sqlite.prepare(sql).run(...args);return Promise.resolve({success:true,meta:{changes:Number(result.changes)}});},
    first(){return Promise.resolve(sqlite.prepare(sql).get(...args)||null);},
    all(){return Promise.resolve({success:true,results:sqlite.prepare(sql).all(...args)});},
    _run(){const result=sqlite.prepare(sql).run(...args);return {success:true,meta:{changes:Number(result.changes)}};}
  });
  return {
    prepare:sql=>wrap(sql),
    async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const result=statements.map(s=>s._run());sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}},
    close(){sqlite.close();}
  };
}

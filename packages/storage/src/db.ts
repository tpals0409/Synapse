import BetterSqlite3 from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';

export type Database = BetterSqlite3.Database;

export function openDb(path: string): Database {
  const db = new BetterSqlite3(path);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  sqliteVec.load(db);
  return db;
}

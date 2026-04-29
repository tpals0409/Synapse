import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Database } from './db.ts';

const SCHEMA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'schema');

export function migrate(db: Database): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS _migrations (
       name TEXT PRIMARY KEY,
       ts INTEGER NOT NULL
     )`,
  );

  const files = readdirSync(SCHEMA_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const isApplied = db.prepare('SELECT 1 FROM _migrations WHERE name = ?');
  const markApplied = db.prepare('INSERT INTO _migrations (name, ts) VALUES (?, ?)');

  for (const name of files) {
    if (isApplied.get(name)) continue;
    const sql = readFileSync(join(SCHEMA_DIR, name), 'utf8');
    const apply = db.transaction(() => {
      db.exec(sql);
      markApplied.run(name, Date.now());
    });
    apply();
  }
}

import Database from 'better-sqlite3';

const db = new Database('registry.db');

// 🚀 Production standard optimization for SQLite speed
db.pragma('journal_mode = WAL');

// 🛠️ Initialize Tables on Startup
db.exec(`
  -- 1. SCHEMA REGISTRY TABLE
  CREATE TABLE IF NOT EXISTS schemas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    blueprint TEXT NOT NULL,          -- Stringified JSON blueprint configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 2. EXTRACTION LOGS & FAILURES TABLE
  CREATE TABLE IF NOT EXISTS extraction_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schema_name TEXT NOT NULL,
    prompt TEXT NOT NULL,             -- The raw unstructured text input
    status TEXT NOT NULL,             -- 'Success' or 'Failure'
    attempts INTEGER NOT NULL,        -- Total retry count (1, 2, or 3)
    latency_ms INTEGER NOT NULL,      -- Processing time down to the millisecond
    error_history TEXT,               -- Stringified JSON array tracking Zod failures
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

/**
 * DATABASE OPERATIONS (CRUD)
 */

// Save or overwrite a reusable schema contract
export function registerSchemaInDb(name: string, blueprint: any) {
  const stmt = db.prepare('INSERT OR REPLACE INTO schemas (name, blueprint) VALUES (?, ?)');
  return stmt.run(name, JSON.stringify(blueprint));
}

// Fetch a saved blueprint by its unique name
export function getSchemaFromDb(name: string) {
  const stmt = db.prepare('SELECT * FROM schemas WHERE name = ?');
  return stmt.get(name);
}

// Log an extraction pipeline transaction result
export function saveLogToDb(log: {
  schemaName: string;
  prompt: string;
  status: 'Success' | 'Failure';
  attempts: number;
  latencyMs: number;
  errorHistory: any[];
}) {
  const stmt = db.prepare(`
    INSERT INTO extraction_logs (schema_name, prompt, status, attempts, latency_ms, error_history)
    VALUES (@schemaName, @prompt, @status, @attempts, @latencyMs, @errorHistory)
  `);

  return stmt.run({
    schemaName: log.schemaName,
    prompt: log.prompt,
    status: log.status,
    attempts: log.attempts,
    latencyMs: log.latencyMs,
    errorHistory: JSON.stringify(log.errorHistory) // Converts the array into a text blob for SQLite
  });
}

// Pull all historical data for your /history endpoint
export function getAllLogsFromDb() {
  const stmt = db.prepare('SELECT * FROM extraction_logs ORDER BY created_at DESC');
  return stmt.all(); // Returns a clean array of row objects
}

export default db;
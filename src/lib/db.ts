import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "bot.sqlite");

function ensureDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

let _db: DatabaseSync | null = null;

export function db() {
  if (_db) return _db;
  ensureDir();
  const d = new DatabaseSync(dbPath);
  d.exec("PRAGMA journal_mode=WAL;");
  d.exec("PRAGMA synchronous=NORMAL;");
  d.exec("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);");
  _db = d;
  return d;
}

export function kvGet<T>(key: string, fallback: T): T {
  const d = db();
  const row = d.prepare("SELECT v FROM kv WHERE k = ?").get(key) as any;
  if (!row?.v) return fallback;
  try { return JSON.parse(row.v) as T; } catch { return fallback; }
}

export function kvSet<T>(key: string, value: T) {
  const d = db();
  const v = JSON.stringify(value);
  d.prepare("INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").run(key, v);
}

export function kvDel(key: string) {
  const d = db();
  d.prepare("DELETE FROM kv WHERE k = ?").run(key);
}

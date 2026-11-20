/**
 * SQLite (встроенный node:sqlite, без внешних зависимостей).
 * Хранилище реплик ребёнка — база для ИИ-агента «Аналитик речи».
 * Файл: data/qamqor.db (в .gitignore).
 */
const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "..", "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, "qamqor.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS utterances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    lang TEXT NOT NULL DEFAULT 'ru',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE INDEX IF NOT EXISTS idx_utterances_created ON utterances (created_at);
`);

const stmtInsert = db.prepare("INSERT INTO utterances (text, lang) VALUES (?, ?)");
const stmtRecent = db.prepare(
  "SELECT id, text, lang, created_at FROM utterances ORDER BY id DESC LIMIT ?"
);
const stmtAll = db.prepare("SELECT id, text, lang, created_at FROM utterances ORDER BY id ASC");
const stmtCount = db.prepare("SELECT COUNT(*) AS c FROM utterances");
const stmtDeleteAll = db.prepare("DELETE FROM utterances");

function addUtterance(text, lang = "ru") {
  const info = stmtInsert.run(text, lang === "kk" ? "kk" : "ru");
  return Number(info.lastInsertRowid);
}

function recentUtterances(limit = 50) {
  return stmtRecent.all(Math.max(1, Math.min(limit, 200)));
}

function allUtterances() {
  return stmtAll.all();
}

function countUtterances() {
  return Number(stmtCount.get().c);
}

function clearUtterances() {
  return Number(stmtDeleteAll.run().changes);
}

module.exports = { addUtterance, recentUtterances, allUtterances, countUtterances, clearUtterances };

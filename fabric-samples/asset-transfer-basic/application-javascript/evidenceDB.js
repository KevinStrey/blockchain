const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho do banco de dados local
const dbPath = path.resolve(__dirname, 'evidence.db');
const db = new sqlite3.Database(dbPath);

// Cria a tabela de evidências se não existir
function initDB() {
    db.run(`CREATE TABLE IF NOT EXISTS evidences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assetId TEXT NOT NULL,
        filename TEXT NOT NULL,
        mimetype TEXT NOT NULL,
        data BLOB NOT NULL,
        hash TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}

// Insere uma nova evidência
function insertEvidence(assetId, filename, mimetype, data, hash, callback) {
    const stmt = db.prepare('INSERT INTO evidences (assetId, filename, mimetype, data, hash) VALUES (?, ?, ?, ?, ?)');
    stmt.run(assetId, filename, mimetype, data, hash, function(err) {
        callback(err, this.lastID);
    });
    stmt.finalize();
}

// Busca evidências por assetId
function getEvidencesByAsset(assetId, callback) {
    db.all('SELECT id, filename, mimetype, hash, createdAt FROM evidences WHERE assetId = ?', [assetId], callback);
}

// Busca o arquivo de evidência por id
function getEvidenceFileById(id, callback) {
    db.get('SELECT filename, mimetype, data FROM evidences WHERE id = ?', [id], callback);
}

module.exports = {
    initDB,
    insertEvidence,
    getEvidencesByAsset,
    getEvidenceFileById
}; 
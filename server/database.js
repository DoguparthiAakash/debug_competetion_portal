const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize Database
const dbPath = path.resolve(__dirname, 'contest.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Error opening database:', err.message);
    else console.log('Connected to the SQLite database.');
});

function initDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Students table
            db.run(`CREATE TABLE IF NOT EXISTS students (
                rollNumber TEXT PRIMARY KEY,
                data TEXT
            )`);

            // Config table
            db.run(`CREATE TABLE IF NOT EXISTS config (
                key TEXT PRIMARY KEY,
                value TEXT
            )`, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

// --- Student Operations ---

function saveStudent(student) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare('INSERT OR REPLACE INTO students (rollNumber, data) VALUES (?, ?)');
        stmt.run(student.rollNumber, JSON.stringify(student), (err) => {
            if (err) {
                console.error('Error saving student:', err);
                reject(err);
            } else {
                resolve();
            }
        });
        stmt.finalize();
    });
}

function getAllStudents() {
    return new Promise((resolve, reject) => {
        db.all('SELECT data FROM students', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const students = rows.map(row => JSON.parse(row.data));
                resolve(students);
            }
        });
    });
}

// --- Config Operations ---

function saveConfig(key, value) {
    return new Promise((resolve, reject) => {
        const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const stmt = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
        stmt.run(key, strValue, (err) => {
            if (err) reject(err);
            else resolve();
        });
        stmt.finalize();
    });
}

function getConfig(key) {
    return new Promise((resolve, reject) => {
        db.get('SELECT value FROM config WHERE key = ?', [key], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? JSON.parse(row.value) : null);
            }
        });
    });
}

module.exports = {
    initDatabase,
    saveStudent,
    getAllStudents,
    saveConfig,
    getConfig
};

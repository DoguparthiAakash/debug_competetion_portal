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
            )`);

            // Questions Table
            db.run(`CREATE TABLE IF NOT EXISTS questions (
                id TEXT PRIMARY KEY,
                title TEXT,
                description TEXT,
                buggyCode TEXT,
                correctSnippet TEXT,
                language TEXT,
                difficulty TEXT
            )`);

            // Student-Question Mapping
            db.run(`CREATE TABLE IF NOT EXISTS student_questions (
                studentRoll TEXT,
                questionId TEXT,
                PRIMARY KEY (studentRoll, questionId)
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

// --- Question Operations ---

function addQuestion(question) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT OR REPLACE INTO questions 
            (id, title, description, buggyCode, correctSnippet, language, difficulty) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`);

        stmt.run(
            question.id,
            question.title,
            question.description,
            question.buggyCode,
            question.correctSnippet || '',
            question.language,
            question.difficulty,
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
        stmt.finalize();
    });
}

function getQuestionsByLangAndDiff(language, difficulty) {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM questions WHERE language = ? AND difficulty = ?', [language, difficulty], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function assignQuestionsToStudent(rollNumber, questionIds) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare('INSERT OR IGNORE INTO student_questions (studentRoll, questionId) VALUES (?, ?)');
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            questionIds.forEach(qId => {
                stmt.run(rollNumber, qId);
            });
            db.run("COMMIT", (err) => {
                if (err) reject(err);
                else resolve();
            });
            stmt.finalize();
        });
    });
}

function getStudentQuestions(rollNumber) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT q.* FROM questions q
            JOIN student_questions sq ON q.id = sq.questionId
            WHERE sq.studentRoll = ?
        `;
        db.all(query, [rollNumber], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}


module.exports = {
    initDatabase,
    saveStudent,
    getAllStudents,
    saveConfig,
    getConfig,
    addQuestion,
    getQuestionsByLangAndDiff,
    assignQuestionsToStudent,
    getStudentQuestions
};

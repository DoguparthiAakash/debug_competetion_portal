
console.log("Hello from Node");
try {
    const sqlite3 = require('sqlite3');
    console.log("sqlite3 loaded");
} catch (e) {
    console.error("Failed to load sqlite3", e.message);
}


const { initDatabase, saveStudent, getAllStudents, saveConfig, getConfig } = require('./database');

(async () => {
    try {
        console.log("Initializing DB...");
        await initDatabase();
        console.log("DB Initialized.");

        const student = {
            rollNumber: "test_roll_1",
            fullName: "Test User",
            score: 100
        };

        console.log("Saving student...");
        await saveStudent(student);
        console.log("Student saved.");

        console.log("Fetching students...");
        const students = await getAllStudents();
        console.log("Fetched students:", students);

        const saved = students.find(s => s.rollNumber === "test_roll_1");
        if (saved && saved.score === 100) {
            console.log("VERIFICATION SUCCESS: Student data persisted.");
        } else {
            console.error("VERIFICATION FAILED: Student data not found or incorrect.");
        }

    } catch (e) {
        console.error("Error during verification:", e);
    }
})();

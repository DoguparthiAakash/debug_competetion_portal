const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const {
    initDatabase, saveStudent, getAllStudents, saveConfig, getConfig,
    addQuestion, getQuestionsByLangAndDiff, assignQuestionsToStudent, getStudentQuestions
} = require('./database');
const crypto = require('crypto');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// In-memory store (initially empty, loaded from DB)
let students = {}; // socketId -> Student Data
let adminSocket = null;
let contestConfig = {
    status: "active",
    startTime: Date.now()
};

let levelConfig = {
    1: { duration: 30 },
    2: { duration: 45 },
    3: { duration: 60 }
};

let allStudents = {}; // RollNumber -> Student
let socketToRoll = {}; // SocketId -> RollNumber

// Load data from DB on startup
(async () => {
    try {
        await initDatabase();
        console.log("Database tables initialized.");

        const storedStudents = await getAllStudents();
        storedStudents.forEach(s => {
            allStudents[s.rollNumber] = s;
        });
        console.log(`Loaded ${storedStudents.length} students from database.`);

        const cfg = await getConfig('contestConfig');
        if (cfg) {
            contestConfig = cfg;
            console.log('Loaded contest config:', cfg);
        }

        const lvlCfg = await getConfig('levelConfig');
        if (lvlCfg) {
            levelConfig = lvlCfg;
            console.log('Loaded level config:', lvlCfg);
        }
    } catch (e) {
        console.error("Failed to load DB data", e);
    }
})();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // --- Student Events ---

    socket.on('register_student', async (studentData) => {
        // Update persistent store
        allStudents[studentData.rollNumber] = {
            ...allStudents[studentData.rollNumber], // Merge with existing (keeps history)
            ...studentData,
            socketId: socket.id,
            lastSeen: Date.now(),
            connected: true
        };

        // Update lookup
        socketToRoll[socket.id] = studentData.rollNumber;

        // Save to DB
        await saveStudent(allStudents[studentData.rollNumber]);

        console.log(`Student Registered: ${studentData.fullName} (${studentData.rollNumber})`);

        // Assign Questions if needed
        let assignedQuestions = await getStudentQuestions(studentData.rollNumber);
        if (assignedQuestions.length === 0) {
            console.log(`Assigning questions for ${studentData.rollNumber} (${studentData.language})...`);
            try {
                // Round 1: Easy (Count 5)
                const easyQ = await getQuestionsByLangAndDiff(studentData.language, 'easy');
                // Round 2: Medium (Count 3)
                const medQ = await getQuestionsByLangAndDiff(studentData.language, 'medium');
                // Round 3: Hard (Count 2)
                const hardQ = await getQuestionsByLangAndDiff(studentData.language, 'hard');

                const pickRandom = (arr, n) => arr.sort(() => 0.5 - Math.random()).slice(0, n);

                const selected = [
                    ...pickRandom(easyQ, 5),
                    ...pickRandom(medQ, 3),
                    ...pickRandom(hardQ, 2)
                ];

                if (selected.length > 0) {
                    await assignQuestionsToStudent(studentData.rollNumber, selected.map(q => q.id));
                    console.log(`Assigned ${selected.length} questions to ${studentData.rollNumber}`);
                } else {
                    console.log("No questions available to assign!");
                }
            } catch (e) {
                console.error("Error assigning questions:", e);
            }
        }

        // Send current contest status & level config
        socket.emit('contest_status', contestConfig);
        socket.emit('level_config_update', levelConfig);

        // Notify Admin
        if (adminSocket) {
            io.to(adminSocket).emit('student_update', allStudents[studentData.rollNumber]);
            io.to(adminSocket).emit('all_students', Object.values(allStudents));
        }
    });

    socket.on('get_student_questions', async () => {
        const roll = socketToRoll[socket.id];
        if (roll) {
            const questions = await getStudentQuestions(roll);
            socket.emit('student_questions', questions);
        }
    });

    socket.on('update_progress', (updatedData) => {
        const roll = socketToRoll[socket.id];
        if (roll && allStudents[roll]) {
            allStudents[roll] = { ...allStudents[roll], ...updatedData, lastSeen: Date.now() };
            saveStudent(allStudents[roll]); // Persist

            // Notify Admin
            if (adminSocket) {
                io.to(adminSocket).emit('student_update', allStudents[roll]);
            }
        }
    });

    socket.on('get_contest_status', () => {
        socket.emit('contest_status', contestConfig);
    });

    // --- Admin Events ---

    socket.on('admin_login', () => {
        adminSocket = socket.id;
        console.log('Admin Logged In');
        // Send full list from persistence
        socket.emit('all_students', Object.values(allStudents));
        socket.emit('contest_status', contestConfig);
        socket.emit('level_config_update', levelConfig);
    });

    socket.on('admin_update_level_config', (newConfig) => {
        levelConfig = newConfig;
        saveConfig('levelConfig', levelConfig);
        io.emit('level_config_update', levelConfig);
        console.log("Admin updated level config:", levelConfig);
    });

    socket.on('admin_upload_questions', async ({ language, difficulty, files }) => {
        console.log(`Received ${files.length} questions [${language} - ${difficulty}]`);
        let count = 0;
        for (const file of files) {
            const q = {
                id: crypto.randomUUID(),
                title: file.name,
                description: "Debug the provided code to fix the issues.", // Default desc
                buggyCode: file.content,
                language,
                difficulty
            };
            try {
                await addQuestion(q);
                count++;
            } catch (e) {
                console.error("Error adding question:", e);
            }
        }
        console.log(`Saved ${count} questions.`);
        // Ideally notify admin of success?
    });

    socket.on('admin_broadcast', (message) => {
        console.log('Broadcasting:', message);
        io.emit('broadcast_message', message);
    });

    socket.on('admin_set_contest_status', (status) => {
        console.log('Setting contest status:', status);
        contestConfig.status = status;
        saveConfig('contestConfig', contestConfig); // Persist
        io.emit('contest_status', contestConfig);
    });

    socket.on('admin_command', ({ targetSocketId, command, payload }) => {
        // Use targetSocketId directly only for emitting, but check validity via our map?
        // Actually targetSocketId comes from the student object we sent admin.
        if (targetSocketId) {
            io.to(targetSocketId).emit('command_received', { command, payload });

            // Also update local state if needed
            const roll = socketToRoll[targetSocketId];
            if (roll && allStudents[roll]) {
                console.log(`Admin sent ${command} to ${roll}`);

                if (command === 'force_terminate') {
                    allStudents[roll].contestStatus = 'TERMINATED';
                    saveStudent(allStudents[roll]);
                    if (adminSocket) io.to(adminSocket).emit('student_update', allStudents[roll]);
                } else if (command === 'force_update') {
                    allStudents[roll] = { ...allStudents[roll], ...payload };
                    saveStudent(allStudents[roll]);
                    if (adminSocket) io.to(adminSocket).emit('student_update', allStudents[roll]);
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket.id === adminSocket) {
            adminSocket = null;
        } else {
            const roll = socketToRoll[socket.id];
            if (roll && allStudents[roll]) {
                allStudents[roll].connected = false;
                // Don't delete, just mark offline
                // Start a grace period? for now just update admin
                if (adminSocket) io.to(adminSocket).emit('student_update', allStudents[roll]);

                // Cleanup socket map?
                delete socketToRoll[socket.id];
            }
        }
    });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

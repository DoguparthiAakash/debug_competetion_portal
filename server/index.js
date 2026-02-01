const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for now, or specifying localhost:3000
        methods: ["GET", "POST"]
    }
});

// In-memory store
let students = {}; // socketId -> Student Data
let adminSocket = null; // Assuming single admin for now
let contestConfig = {
    status: "active", // active, paused, ended
    startTime: Date.now()
};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // --- Student Events ---

    socket.on('register_student', (studentData) => {
        students[socket.id] = { ...studentData, socketId: socket.id, lastSeen: Date.now() };
        console.log(`Student Registered: ${studentData.fullName} (${studentData.rollNumber})`);

        // Send current contest status to new student
        socket.emit('contest_status', contestConfig);

        // Notify Admin
        if (adminSocket) {
            io.to(adminSocket).emit('student_update', students[socket.id]);
            io.to(adminSocket).emit('all_students', Object.values(students));
        }
    });

    socket.on('update_progress', (updatedData) => {
        if (students[socket.id]) {
            students[socket.id] = { ...students[socket.id], ...updatedData, lastSeen: Date.now() };
            // Notify Admin
            if (adminSocket) {
                io.to(adminSocket).emit('student_update', students[socket.id]);
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
        // Send full list to admin immediately
        socket.emit('all_students', Object.values(students));
        socket.emit('contest_status', contestConfig);
    });

    socket.on('admin_broadcast', (message) => {
        console.log('Broadcasting:', message);
        io.emit('broadcast_message', message);
    });

    socket.on('admin_set_contest_status', (status) => {
        console.log('Setting contest status:', status);
        contestConfig.status = status;
        io.emit('contest_status', contestConfig);
    });

    socket.on('admin_command', ({ targetSocketId, command, payload }) => {
        if (targetSocketId && students[targetSocketId]) {
            io.to(targetSocketId).emit('command_received', { command, payload });
            console.log(`Admin sent ${command} to ${students[targetSocketId].rollNumber}`);

            // Update local state if needed (e.g., force terminate)
            if (command === 'force_terminate') {
                students[targetSocketId].contestStatus = 'TERMINATED';
                if (adminSocket) io.to(adminSocket).emit('student_update', students[targetSocketId]);
            } else if (command === 'force_update') {
                students[targetSocketId] = { ...students[targetSocketId], ...payload };
                if (adminSocket) io.to(adminSocket).emit('student_update', students[targetSocketId]);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket.id === adminSocket) {
            adminSocket = null;
        } else if (students[socket.id]) {
            // Mark as offline but don't delete yet? Or delete?
            // Let's keep them but maybe mark connection status
            students[socket.id].connected = false;
            if (adminSocket) io.to(adminSocket).emit('student_update', students[socket.id]);
        }
    });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

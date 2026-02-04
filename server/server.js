/**
 * server.js
 * ─────────
 * Main entry point for the backend.
 * Initializes Express, connects to MongoDB, mounts routes.
 * 
 * OPTIMIZED FOR LOCAL NETWORK DEPLOYMENT:
 *   - Binds to 0.0.0.0 to accept connections from any device on local network
 *   - Rate limiting to prevent abuse
 *   - Request monitoring and logging
 *   - Connection pooling for high concurrency
 */

require('dotenv').config(); // load .env from project root or backend/

const http = require('http');
const { Server } = require("socket.io");
const Student = require('./models/Student');
const Question = require('./models/Question');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

/* ──────────────────────────────────────
   MIDDLEWARE
   ────────────────────────────────────── */

// CORS - Allow all local network IPs
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:3000$/,
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/,
      /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:3000$/,
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}:3000$/
    ];

    const isAllowed = allowedOrigins.some(pattern => {
      if (pattern instanceof RegExp) return pattern.test(origin);
      return pattern === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Monitoring middleware
app.use(trackConnection);
app.use(requestLogger);
app.use(generalLimiter);

/* ──────────────────────────────────────
   SOCKET.IO SETUP
   ────────────────────────────────────── */
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all for sockets to avoid headaches during contest
    methods: ["GET", "POST"]
  }
});

// Socket State
let adminSocket = null;
let socketToRoll = {}; // socketId -> rollNumber

// Validates student by roll number from socket map
const getStudentBySocket = async (socketId) => {
  const roll = socketToRoll[socketId];
  if (!roll) return null;
  return await Student.findOne({ rollNumber: roll });
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // --- Student Events ---

  socket.on('register_student', async (studentData) => {
    // In the new architecture, registration happens via REST API. 
    // This event acts as "Login/Join" for real-time updates.
    try {
      const { rollNumber } = studentData;
      if (!rollNumber) return;

      socketToRoll[socket.id] = rollNumber;

      // Mark as online/connected in DB if tracking needed
      // For now, just logging
      console.log(`Student Connected: ${rollNumber}`);

      // Notify Admin
      if (adminSocket) {
        const s = await Student.findOne({ rollNumber });
        io.to(adminSocket).emit('student_update', s);
      }
    } catch (e) {
      console.error("Error in register_student:", e);
    }
  });

  socket.on('get_student_questions', async () => {
    try {
      const student = await getStudentBySocket(socket.id);
      if (!student) return;

      // Fetch assigned questions for the CURRENT round
      const questionIds = student.assignedQuestions ? student.assignedQuestions[student.currentRound] : [];

      if (questionIds && questionIds.length > 0) {
        const questions = await Question.find({ _id: { $in: questionIds } }).select('-correctCode -testCases');
        // The frontend expects "round" or "difficulty" to map them?
        // The Question model has "round" (1, 2, 3).
        socket.emit('student_questions', questions);
      } else {
        socket.emit('student_questions', []);
      }
    } catch (e) {
      console.error("Error fetching questions:", e);
    }
  });

  socket.on('update_progress', async (updatedData) => {
    try {
      const roll = socketToRoll[socket.id];
      if (!roll) return;

      // Securely update only allowed fields via Mongoose
      // Actually, for scores/updates, we usually prefer REST.
      // But if the frontend uses sockets for live score updates:
      if (updatedData.scores) {
        // Merge scores? Logic should probably normally be server-side executed result
        // But if this is just "I finished this question", we might handle it.
        // For now, let's defer critical updates to REST and use this for status only.
      }

      // Notify Admin of activity
      if (adminSocket) {
        const s = await Student.findOne({ rollNumber: roll });
        io.to(adminSocket).emit('student_update', s);
      }
    } catch (e) {
      console.error("Error updating progress:", e);
    }
  });

  // --- Admin Events ---

  socket.on('admin_login', async () => {
    adminSocket = socket.id;
    console.log('Admin Socket Logged In');
    const allStudents = await Student.find({});
    socket.emit('all_students', allStudents);
  });

  socket.on('admin_broadcast', (message) => {
    io.emit('broadcast_message', message);
  });

  socket.on('disconnect', () => {
    const roll = socketToRoll[socket.id];
    if (roll) {
      console.log(`Student Disconnected: ${roll}`);
      delete socketToRoll[socket.id];
      if (adminSocket) {
        // Could notify admin of offline status
      }
    } else if (socket.id === adminSocket) {
      adminSocket = null;
      console.log('Admin Disconnected');
    }
  });
});

// Attach io to request object if needed in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

/* ──────────────────────────────────────
   ROUTES
   ────────────────────────────────────── */
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);

/* ──────────────────────────────────────
   HEALTH CHECK & MONITORING
   ────────────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/stats', (req, res) => {
  const stats = getStats();
  // Safe require if service exists
  try {
    const executionQueue = require('./services/executionQueue');
    if (executionQueue.getStats) stats.executionQueue = executionQueue.getStats();
  } catch (e) { }
  res.json(stats);
});

/* ──────────────────────────────────────
   404 CATCH-ALL
   ────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

/* ──────────────────────────────────────
   GLOBAL ERROR HANDLER
   ────────────────────────────────────── */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

/* ──────────────────────────────────────
   START
   ────────────────────────────────────── */
(async () => {
  await connectDB();

  // Bind to 0.0.0.0 to accept connections from local network
  server.listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();

    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`   Local: http://localhost:${PORT}`);

    // Display all local network IPs
    Object.keys(networkInterfaces).forEach(interfaceName => {
      networkInterfaces[interfaceName].forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`   Network: http://${iface.address}:${PORT}`);
        }
      });
    });

    console.log(`\n   Frontend should use available Network IP`);
  });
})();

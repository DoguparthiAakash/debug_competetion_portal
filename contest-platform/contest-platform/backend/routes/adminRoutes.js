/**
 * adminRoutes.js
 * ─────────────
 * All /api/admin/* endpoints.
 * Protected by JWT after login.
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');

// Models
const Question = require('../models/Question');
const RoundConfig = require('../models/RoundConfig');
const Student = require('../models/Student');
const Submission = require('../models/Submission');

// Services
const { injectBug } = require('../services/bugInjectionService');
const { generateTestCases } = require('../services/testCaseGenerationService');

const JWT_SECRET = process.env.JWT_SECRET || 'debug_contest_jwt_secret_key_2024';

/* ══════════════════════════════════════════════════════════
   POST /api/admin/login
   Validates admin credentials and returns a JWT.
   ══════════════════════════════════════════════════════════ */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

    if (username === ADMIN_USER && password === ADMIN_PASS) {
      const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
      return res.json({ success: true, token });
    }

    return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   POST /api/admin/rounds/config
   Set timer (in minutes) for a specific round.
   Body: { round: 1|2|3, timerMinutes: Number }
   ══════════════════════════════════════════════════════════ */
router.post('/rounds/config', authMiddleware, async (req, res) => {
  try {
    const { round, timerMinutes } = req.body;
    if (![1, 2, 3].includes(round) || !timerMinutes || timerMinutes < 1) {
      return res.status(400).json({ success: false, message: 'Invalid round or timer value' });
    }

    // Upsert – update if exists, create if not
    const config = await RoundConfig.findOneAndUpdate(
      { roundNumber: round },
      { timerMinutes },
      { new: true, upsert: true }
    );

    return res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   GET /api/admin/rounds/config
   Retrieve timer config for all rounds.
   ══════════════════════════════════════════════════════════ */
router.get('/rounds/config', authMiddleware, async (req, res) => {
  try {
    const configs = await RoundConfig.find({}).sort('roundNumber');
    // Build a map: { 1: minutes, 2: minutes, 3: minutes }
    const timerMap = { 1: 30, 2: 30, 3: 30 }; // defaults
    configs.forEach(c => { timerMap[c.roundNumber] = c.timerMinutes; });
    return res.json({ success: true, timers: timerMap });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   POST /api/admin/questions
   Upload a single question (correct code + title + description).
   System auto-generates buggy version + test cases.
   Body: { title, description, round, language, correctCode }
   ══════════════════════════════════════════════════════════ */
router.post('/questions', authMiddleware, async (req, res) => {
  try {
    const { title, description, round, language, correctCode } = req.body;

    // ── Validation ──
    if (!title || !description || !round || !language || !correctCode) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (![1, 2, 3].includes(Number(round))) {
      return res.status(400).json({ success: false, message: 'Round must be 1, 2, or 3' });
    }
    if (!['C', 'Java', 'Python'].includes(language)) {
      return res.status(400).json({ success: false, message: 'Language must be C, Java, or Python' });
    }

    // ── Check: admin can upload max 15 questions per round per language ──
    const existingCount = await Question.countDocuments({ round: Number(round), language });
    if (existingCount >= 15) {
      return res.status(400).json({
        success: false,
        message: `Maximum 15 questions per round per language. Round ${round} / ${language} already has ${existingCount}.`
      });
    }

    // ── 1. Inject bug into correct code (with round-based difficulty) ──
    const buggyCode = injectBug(correctCode, language, Number(round));

    // ── 2. Generate test cases using the correct solution ──
    const testCases = await generateTestCases(correctCode, language);

    // ── 3. Save to DB ──
    const question = await Question.create({
      title,
      description,
      round: Number(round),
      language,
      correctCode,   // hidden – never sent to frontend
      buggyCode,     // shown to students
      testCases      // hidden – never sent to frontend
    });

    // Return only safe fields to admin (no correctCode or testCases)
    return res.status(201).json({
      success: true,
      message: 'Question created with auto-generated bug and test cases',
      question: {
        _id: question._id,
        title: question.title,
        description: question.description,
        round: question.round,
        language: question.language,
        buggyCode: question.buggyCode,
        testCaseCount: question.testCases.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   GET /api/admin/questions
   List all questions (summary only – no correctCode or testCases).
   Query params: ?round=1&language=C
   ══════════════════════════════════════════════════════════ */
router.get('/questions', authMiddleware, async (req, res) => {
  try {
    const filter = {};
    if (req.query.round) filter.round = Number(req.query.round);
    if (req.query.language) filter.language = req.query.language;

    const questions = await Question.find(filter)
      .select('-correctCode -testCases')  // NEVER expose these
      .sort({ round: 1, createdAt: -1 });

    return res.json({ success: true, questions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   DELETE /api/admin/questions/:id
   Delete a question by ID.
   ══════════════════════════════════════════════════════════ */
router.delete('/questions/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await Question.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Question not found' });
    return res.json({ success: true, message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   GET /api/admin/dashboard
   Full score dashboard – all students with round scores.
   ══════════════════════════════════════════════════════════ */
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const students = await Student.find({}).sort({ createdAt: -1 });

    const dashboard = students.map(s => {
      const r1 = s.scores.round1 ?? 0;
      const r2 = s.scores.round2 ?? 0;
      const r3 = s.scores.round3 ?? 0;

      // Final average = (R1 + R2 + R3) / 3  (only if all rounds attempted)
      let finalAvg = null;
      if (s.scores.round1 !== null && s.scores.round2 !== null && s.scores.round3 !== null) {
        finalAvg = parseFloat(((r1 + r2 + r3) / 3).toFixed(2));
      }

      return {
        _id: s._id,
        name: s.fullName,
        rollNumber: s.rollNumber,
        college: s.collegeName,
        department: s.department,
        year: s.yearOfStudy,
        language: s.language,
        round1Score: s.scores.round1,
        round2Score: s.scores.round2,
        round3Score: s.scores.round3,
        finalAvgScore: finalAvg,
        violationAttempts: s.violationAttempts || 0,
        status: s.isDisqualified ? 'Disqualified' : 'Active'
      };
    });

    return res.json({ success: true, dashboard });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   DELETE /api/admin/students/:id
   Delete a student record and all associated submissions.
   ══════════════════════════════════════════════════════════ */
router.delete('/students/:id', authMiddleware, async (req, res) => {
  try {
    const studentId = req.params.id;

    // Find and delete the student
    const deletedStudent = await Student.findByIdAndDelete(studentId);

    if (!deletedStudent) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Also delete all submissions associated with this student
    await Submission.deleteMany({ studentId: studentId });

    return res.json({
      success: true,
      message: `Student ${deletedStudent.fullName} and all associated data deleted successfully`
    });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   GET /api/admin/export-excel
   Exports the score dashboard as an Excel file.
   ══════════════════════════════════════════════════════════ */
router.get('/export-excel', authMiddleware, async (req, res) => {
  try {
    const ExcelJS = require('exceljs');

    // Fetch all students
    const students = await Student.find({}).sort({ createdAt: -1 });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Debug Contest Platform';
    wb.lastModifiedBy = 'System';

    const ws = wb.addWorksheet('Results');

    // ── Header row ──
    const headers = ['Name', 'Roll No', 'College', 'Dept', 'Year', 'Language', 'R1 Score', 'R2 Score', 'R3 Score', 'Final Avg Score', 'Violations', 'Status'];
    ws.addRow(headers);

    // Style the header
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Arial' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF2C3E50' } },
        bottom: { style: 'thin', color: { argb: 'FF2C3E50' } },
        left: { style: 'thin', color: { argb: 'FF2C3E50' } },
        right: { style: 'thin', color: { argb: 'FF2C3E50' } }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // ── Column widths ──
    ws.columns = [
      { width: 24 }, { width: 14 }, { width: 22 }, { width: 16 },
      { width: 8 }, { width: 12 }, { width: 12 }, { width: 12 },
      { width: 12 }, { width: 16 }, { width: 12 }, { width: 14 }
    ];

    // ── Data rows ──
    students.forEach((s, idx) => {
      const r1 = s.scores.round1 ?? 0;
      const r2 = s.scores.round2 ?? 0;
      const r3 = s.scores.round3 ?? 0;
      let finalAvg = '-';
      if (s.scores.round1 !== null && s.scores.round2 !== null && s.scores.round3 !== null) {
        finalAvg = parseFloat(((r1 + r2 + r3) / 3).toFixed(2));
      }

      const row = ws.addRow([
        s.fullName,
        s.rollNumber,
        s.collegeName,
        s.department,
        s.yearOfStudy,
        s.language,
        s.scores.round1 ?? '-',
        s.scores.round2 ?? '-',
        s.scores.round3 ?? '-',
        finalAvg,
        s.violationAttempts || 0,
        s.isDisqualified ? 'Disqualified' : 'Active'
      ]);

      // Alternate row coloring
      const bgColor = idx % 2 === 0 ? 'FFF2F2F2' : 'FFFFFFFF';
      row.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD5D5D5' } },
          bottom: { style: 'thin', color: { argb: 'FFD5D5D5' } },
          left: { style: 'thin', color: { argb: 'FFD5D5D5' } },
          right: { style: 'thin', color: { argb: 'FFD5D5D5' } }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    // ── Stream the file to response ──
    res.setHeader('Content-Disposition', 'attachment; filename=contest_results.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

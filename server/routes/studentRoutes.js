/**
 * studentRoutes.js
 * ────────────────
 * All /api/student/* endpoints.
 * No authentication required – students are identified by rollNumber.
 */

const express = require('express');
const router = express.Router();

// Models
const Student = require('../models/Student');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const RoundConfig = require('../models/RoundConfig');

// Services
const { assignQuestions, QUESTIONS_PER_ROUND } = require('../services/questionDistributionService');
const { scoreSubmission } = require('../services/scoringService');

/* ══════════════════════════════════════════════════════════
   POST /api/student/register
   Registers a new student with personal info + language.
   Language is locked after this call.
   ══════════════════════════════════════════════════════════ */
router.post('/register', async (req, res) => {
  try {
    const { fullName, rollNumber, collegeName, department, yearOfStudy, email, language } = req.body;

    // ── Validation ──
    if (!fullName || !rollNumber || !collegeName || !department || !yearOfStudy || !email || !language) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (!['C', 'Java', 'Python'].includes(language)) {
      return res.status(400).json({ success: false, message: 'Language must be C, Java, or Python' });
    }

    // ── Check for existing roll number ──
    const existing = await Student.findOne({ rollNumber: rollNumber.trim() });
    if (existing) {
      // Return existing student info so they can continue (idempotent)
      return res.json({
        success: true,
        message: 'Student already registered',
        student: sanitizeStudent(existing)
      });
    }

    // ── Create student ──
    const student = await Student.create({
      fullName,
      rollNumber: rollNumber.trim(),
      collegeName,
      department,
      yearOfStudy: Number(yearOfStudy),
      email,
      language,
      currentRound: 1,
      roundsCompleted: [],
      scores: { round1: null, round2: null, round3: null }
    });

    // ── Auto-assign Round 1 questions ──
    const questionIds = await assignQuestions(student._id, language, 1);
    student.assignedQuestions = { ...student.assignedQuestions, 1: questionIds };
    await student.save();

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      student: sanitizeStudent(student)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   GET /api/student/:rollNumber/status
   Returns current round, scores, and progress info.
   ══════════════════════════════════════════════════════════ */
router.get('/:rollNumber/status', async (req, res) => {
  try {
    const student = await Student.findOne({ rollNumber: req.params.rollNumber });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    return res.json({ success: true, student: sanitizeStudent(student) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   POST /api/student/:rollNumber/start-round
   Starts a round's timer for this student (records startTime).
   Body: { round }
   ══════════════════════════════════════════════════════════ */
router.post('/:rollNumber/start-round', async (req, res) => {
  try {
    const student = await Student.findOne({ rollNumber: req.params.rollNumber });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const round = Number(req.body.round);

    // Can only start the current round
    if (round !== student.currentRound) {
      return res.status(400).json({ success: false, message: `Cannot start round ${round}. Current round is ${student.currentRound}.` });
    }

    // Already started?
    if (student.roundStartedAt[round]) {
      return res.json({ success: true, message: 'Round already started', startedAt: student.roundStartedAt[round] });
    }

    student.roundStartedAt[round] = new Date();
    await student.save();

    return res.json({ success: true, message: `Round ${round} started`, startedAt: student.roundStartedAt[round] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   GET /api/student/:rollNumber/questions/:round
   Returns the questions assigned to this student for a round.
   ONLY returns safe fields (title, description, buggyCode).
   correctCode and testCases are NEVER included.
   ══════════════════════════════════════════════════════════ */
router.get('/:rollNumber/questions/:round', async (req, res) => {
  try {
    const student = await Student.findOne({ rollNumber: req.params.rollNumber });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const round = Number(req.params.round);

    // Enforce round progression – can only view current or completed rounds
    if (round > student.currentRound) {
      return res.status(403).json({ success: false, message: `Round ${round} is not yet unlocked` });
    }

    const questionIds = student.assignedQuestions[round] || [];
    if (questionIds.length === 0) {
      return res.status(404).json({ success: false, message: `No questions assigned for round ${round}` });
    }

    // Fetch questions – EXCLUDE correctCode and testCases
    const questions = await Question.find({ _id: { $in: questionIds } })
      .select('-correctCode -testCases');

    // Also fetch existing submissions for this round so frontend knows what's already submitted
    const submissions = await Submission.find({
      studentId: student._id,
      round
    }).select('questionId verdict score submittedCode');

    const submissionMap = {};
    submissions.forEach(s => { submissionMap[s.questionId.toString()] = s; });

    // Attach submission info to each question
    const enriched = questions.map(q => ({
      _id: q._id,
      title: q.title,
      description: q.description,
      language: q.language,
      buggyCode: q.buggyCode,
      submission: submissionMap[q._id.toString()] || null
    }));

    return res.json({ success: true, questions: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   POST /api/student/:rollNumber/submit
   Submit an answer for one question.
   Body: { questionId, submittedCode, round }
   Auto-scores and returns result.
   ══════════════════════════════════════════════════════════ */
router.post('/:rollNumber/submit', async (req, res) => {
  try {
    const student = await Student.findOne({ rollNumber: req.params.rollNumber });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const { questionId, submittedCode, round } = req.body;
    if (!questionId || !submittedCode || !round) {
      return res.status(400).json({ success: false, message: 'questionId, submittedCode, and round are required' });
    }

    const roundNum = Number(round);

    // ── Validate: question is assigned to this student in this round ──
    const assignedIds = (student.assignedQuestions[roundNum] || []).map(id => id.toString());
    if (!assignedIds.includes(questionId)) {
      return res.status(403).json({ success: false, message: 'Question not assigned to you for this round' });
    }

    // ── Check timer: has the round timed out? ──
    const roundConfig = await RoundConfig.findOne({ roundNumber: roundNum });
    const timerMinutes = roundConfig ? roundConfig.timerMinutes : 30;
    const startedAt = student.roundStartedAt[roundNum];

    if (startedAt) {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 60000; // minutes
      if (elapsed > timerMinutes) {
        return res.status(400).json({ success: false, message: 'Round timer has expired. You can no longer submit.' });
      }
    }

    // ── Fetch the full question (with testCases) for scoring ──
    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

    // ── Score the submission ──
    const result = await scoreSubmission(submittedCode, question.language, question.testCases);

    // ── Upsert submission ──
    const submission = await Submission.findOneAndUpdate(
      { studentId: student._id, questionId },
      {
        submittedCode,
        round: roundNum,
        language: question.language,
        verdict: result.verdict,
        score: result.score,
        testResults: result.testResults,
        compileError: result.compileError,
        runtimeError: result.runtimeError,
        executionTimeMs: result.executionTimeMs,
        submittedAt: new Date()
      },
      { new: true, upsert: true }
    );

    return res.json({
      success: true,
      verdict: result.verdict,
      score: result.score,
      testResults: result.testResults,
      compileError: result.compileError,
      runtimeError: result.runtimeError,
      executionTimeMs: result.executionTimeMs
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   POST /api/student/:rollNumber/complete-round
   Mark a round as completed, calculate round score, unlock next round.
   Body: { round }
   ══════════════════════════════════════════════════════════ */
router.post('/:rollNumber/complete-round', async (req, res) => {
  try {
    const student = await Student.findOne({ rollNumber: req.params.rollNumber });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const round = Number(req.body.round);
    if (round !== student.currentRound) {
      return res.status(400).json({ success: false, message: `Cannot complete round ${round}. Current round is ${student.currentRound}.` });
    }

    // ── Calculate round score: sum of all question scores in this round ──
    const submissions = await Submission.find({
      studentId: student._id,
      round
    });

    // Sum scores for questions that were assigned
    const assignedIds = (student.assignedQuestions[round] || []).map(id => id.toString());
    let roundScore = 0;
    submissions.forEach(sub => {
      if (assignedIds.includes(sub.questionId.toString())) {
        roundScore += sub.score;
      }
    });

    // ── Update student ──
    const scoreKey = `scores.round${round}`;
    student.scores[`round${round}`] = roundScore;
    student.roundsCompleted.push(round);

    // Unlock next round (if exists)
    if (round < 3) {
      student.currentRound = round + 1;
      // Pre-assign questions for next round
      const nextQuestionIds = await assignQuestions(student._id, student.language, round + 1);
      student.assignedQuestions[round + 1] = nextQuestionIds;
    } else {
      // All rounds done
      student.currentRound = 4; // sentinel: contest complete
    }

    await student.save();

    return res.json({
      success: true,
      message: `Round ${round} completed`,
      roundScore,
      nextRound: round < 3 ? round + 1 : null,
      contestComplete: round === 3
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   HELPER: Sanitize student object before sending to frontend.
   Remove any fields that shouldn't be exposed.
   ══════════════════════════════════════════════════════════ */
function sanitizeStudent(student) {
  return {
    _id: student._id,
    fullName: student.fullName,
    rollNumber: student.rollNumber,
    collegeName: student.collegeName,
    department: student.department,
    yearOfStudy: student.yearOfStudy,
    email: student.email,
    language: student.language,
    currentRound: student.currentRound,
    roundsCompleted: student.roundsCompleted,
    scores: student.scores,
    roundStartedAt: student.roundStartedAt,
    violationAttempts: student.violationAttempts || 0,
    isDisqualified: student.isDisqualified || false
  };
}

/* ══════════════════════════════════════════════════════════
   POST /api/student/:rollNumber/log-violation
   Logs a fullscreen violation attempt.
   Increments violation count and disqualifies if >= 3.
   Body: { violationType: 'exit_fullscreen' | 'tab_switch' | 'window_blur' }
   ══════════════════════════════════════════════════════════ */
router.post('/:rollNumber/log-violation', async (req, res) => {
  try {
    const { rollNumber } = req.params;
    const { violationType } = req.body;

    // Validate violation type
    const validTypes = ['exit_fullscreen', 'tab_switch', 'window_blur'];
    if (!validTypes.includes(violationType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid violation type'
      });
    }

    const student = await Student.findOne({ rollNumber });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // If already disqualified, don't log more violations
    if (student.isDisqualified) {
      return res.json({
        success: true,
        isDisqualified: true,
        violationAttempts: student.violationAttempts,
        message: 'Student is already disqualified'
      });
    }

    // Increment violation count
    student.violationAttempts += 1;

    // Log the violation
    student.violationLogs.push({
      timestamp: new Date(),
      violationType,
      round: student.currentRound
    });

    // Check if should be disqualified (>= 3 violations)
    if (student.violationAttempts >= 3) {
      student.isDisqualified = true;
    }

    await student.save();

    return res.json({
      success: true,
      violationAttempts: student.violationAttempts,
      isDisqualified: student.isDisqualified,
      message: student.isDisqualified
        ? 'Student disqualified due to multiple violations'
        : `Violation logged. Attempt ${student.violationAttempts} of 3`
    });

  } catch (err) {
    console.error('Log violation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

const mongoose = require('mongoose');

/**
 * SubmissionSchema
 * One document per student per question.
 * Stores the student's submitted code and the auto-grading verdict.
 */
const SubmissionSchema = new mongoose.Schema(
  {
    studentId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    questionId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    round:          { type: Number, required: true, enum: [1, 2, 3] },
    language:       { type: String, required: true, enum: ['C', 'Java', 'Python'] },

    /* ─── Student's code ─── */
    submittedCode:  { type: String, required: true },

    /* ─── Grading Result ─── */
    // verdict: 'all_pass' | 'some_pass' | 'wrong_output' | 'compile_error' | 'runtime_error' | 'pending'
    verdict:        { type: String, default: 'pending' },
    score:          { type: Number, default: 0 },          // 0 | 5 | 15 | 30

    /* ─── Detailed test-case results (for debugging feedback) ─── */
    // Each: { testIndex, passed, actualOutput, expectedOutput }
    testResults:    { type: [Object], default: [] },

    /* ─── Execution meta ─── */
    executionTimeMs: { type: Number, default: 0 },
    compileError:   { type: String, default: null },
    runtimeError:   { type: String, default: null },

    /* ─── Was this submitted within the round timer? ─── */
    submittedAt:    { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Unique per student + question (only one final submission tracked)
SubmissionSchema.index({ studentId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model('Submission', SubmissionSchema);

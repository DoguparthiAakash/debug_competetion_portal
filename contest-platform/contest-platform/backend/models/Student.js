const mongoose = require('mongoose');

/**
 * StudentSchema
 * Stores student registration, language choice, round unlock status, and scores.
 * Roll number is unique and acts as the student identifier (no login system).
 */
const StudentSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, unique: true, trim: true },
    collegeName: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    yearOfStudy: { type: Number, required: true, min: 1, max: 6 },
    email: { type: String, required: true, trim: true, lowercase: true },
    language: { type: String, required: true, enum: ['C', 'Java', 'Python'] },

    /* ─── Round Progress ─── */
    currentRound: { type: Number, default: 1 },              // 1 | 2 | 3
    roundsCompleted: { type: [Number], default: [] },           // e.g. [1, 2]

    /* ─── Assigned Questions per round (IDs only) ─── */
    assignedQuestions: {
      1: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
      2: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
      3: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }]
    },

    /* ─── Per-round scores ─── */
    scores: {
      round1: { type: Number, default: null },   // null = not yet attempted
      round2: { type: Number, default: null },
      round3: { type: Number, default: null }
    },

    /* ─── Per-round timer tracking ─── */
    roundStartedAt: {
      1: { type: Date, default: null },
      2: { type: Date, default: null },
      3: { type: Date, default: null }
    },

    /* ─── Fullscreen Violation Tracking ─── */
    violationAttempts: { type: Number, default: 0 },
    isDisqualified: { type: Boolean, default: false },
    violationLogs: [{
      timestamp: { type: Date, default: Date.now },
      violationType: { type: String, enum: ['exit_fullscreen', 'tab_switch', 'window_blur'] },
      round: { type: Number }
    }]
  },
  { timestamps: true }   // createdAt, updatedAt
);

module.exports = mongoose.model('Student', StudentSchema);

const mongoose = require('mongoose');

/**
 * QuestionSchema
 * Each document = one question for a specific round and language.
 * Admin uploads the correct solution; the system auto-generates the buggy version and test cases.
 * correctCode and testCases are NEVER sent to the frontend.
 */
const QuestionSchema = new mongoose.Schema(
  {
    title:          { type: String, required: true, trim: true },
    description:    { type: String, required: true, trim: true },
    round:          { type: Number, required: true, enum: [1, 2, 3] },
    language:       { type: String, required: true, enum: ['C', 'Java', 'Python'] },

    /* ─── Code Payloads ─── */
    correctCode:    { type: String, required: true },   // HIDDEN – never exposed to frontend
    buggyCode:      { type: String, required: true },   // Shown to students

    /* ─── Auto-generated test cases ─── */
    // Each test case: { input: "...", expectedOutput: "..." }
    testCases:      { type: [{ input: String, expectedOutput: String }], required: true },  // HIDDEN

    /* ─── Meta ─── */
    createdBy:      { type: String, default: 'admin' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Question', QuestionSchema);

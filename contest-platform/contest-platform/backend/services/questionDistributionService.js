/**
 * questionDistributionService.js
 * ─────────────────────────────
 * Handles per-student question assignment.
 *
 * Rules:
 *   Round 1 → 4 questions
 *   Round 2 → 3 questions
 *   Round 3 → 2 questions
 *
 * Each student gets a different random subset (shuffled independently).
 * Questions are filtered by language before selection.
 */

const Question = require('../models/Question');

const QUESTIONS_PER_ROUND = { 1: 4, 2: 3, 3: 2 };

/**
 * Fisher-Yates shuffle – returns a NEW shuffled copy of the array
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * assignQuestions(studentId, language, round)
 * Fetches all questions for the given round + language,
 * shuffles them, picks the required count, and returns the IDs.
 *
 * @returns {Promise<ObjectId[]>} – array of question IDs
 * @throws  Error if not enough questions in the pool
 */
async function assignQuestions(studentId, language, round) {
  const required = QUESTIONS_PER_ROUND[round];
  if (!required) throw new Error(`Invalid round: ${round}`);

  // Fetch all questions for this round + language
  const pool = await Question.find({ round, language }).select('_id');

  if (pool.length < required) {
    throw new Error(
      `Not enough questions for Round ${round} / ${language}. ` +
      `Need ${required}, have ${pool.length}. Admin must upload at least 15 questions per round per language.`
    );
  }

  // Shuffle and pick
  const shuffled = shuffle(pool.map(q => q._id));
  return shuffled.slice(0, required);
}

module.exports = { assignQuestions, QUESTIONS_PER_ROUND };

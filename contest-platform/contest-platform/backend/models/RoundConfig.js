const mongoose = require('mongoose');

/**
 * RoundConfigSchema
 * Admin sets the timer duration (in minutes) for each round.
 * Only one document should exist; we use roundNumber as a natural key.
 */
const RoundConfigSchema = new mongoose.Schema(
  {
    roundNumber:    { type: Number, required: true, unique: true, enum: [1, 2, 3] },
    timerMinutes:   { type: Number, required: true, min: 1, default: 30 }   // default 30 min
  },
  { timestamps: true }
);

module.exports = mongoose.model('RoundConfig', RoundConfigSchema);

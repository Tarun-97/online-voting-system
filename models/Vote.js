const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema(
  {
    voterID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    candidateID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
    },
  },
  { timestamps: true }
);

// Ensure one vote per voter
voteSchema.index({ voterID: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
const mongoose = require('mongoose');

const votingSessionSchema = new mongoose.Schema(
  {
    electionName: {
      type: String,
      default: 'Election',
    },
    isOpen: {
      type: Boolean,
      default: false,
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    totalVotes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['closed', 'ongoing', 'completed'],
      default: 'closed',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VotingSession', votingSessionSchema);
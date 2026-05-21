const mongoose = require('mongoose');

const electionHistorySchema = new mongoose.Schema(
  {
    electionName: {
      type: String,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    totalVotes: {
      type: Number,
      default: 0,
    },
    candidates: [
      {
        candidateId: mongoose.Schema.Types.ObjectId,
        name: String,
        party: String,
        symbol: String,
        voteCount: Number,
        percentage: Number,
      },
    ],
    winner: {
      name: String,
      party: String,
      symbol: String,
      voteCount: Number,
      percentage: Number,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ElectionHistory', electionHistorySchema);
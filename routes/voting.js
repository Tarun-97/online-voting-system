const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const VotingSession = require('../models/VotingSession');

// Middleware to verify token
const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
};

// Get all active candidates (TC05: Candidate Selection)
router.get('/candidates', verifyToken, async (req, res) => {
  try {
    const candidates = await Candidate.find({ isActive: true });

    return res.status(200).json({
      success: true,
      candidates,
    });
  } catch (error) {
    console.error('Fetch candidates error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// Get voting session status (TC18: Check if voting is open)
router.get('/session-status', async (req, res) => {
  try {
    const session = await VotingSession.findOne().sort({ createdAt: -1 });

    if (!session) {
      return res.status(200).json({
        success: true,
        isOpen: false,
        message: 'Voting session not initialized',
      });
    }

    return res.status(200).json({
      success: true,
      isOpen: session.isOpen,
      startTime: session.startTime,
      endTime: session.endTime,
    });
  } catch (error) {
    console.error('Fetch session status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// TC05 & TC06: Cast a vote (One vote per person)
router.post('/cast-vote', verifyToken, async (req, res) => {
  try {
    const { candidateID } = req.body;
    const voterID = req.user.id;

    if (!candidateID) {
      return res.status(400).json({
        success: false,
        message: 'Candidate ID is required',
      });
    }

    // TC18: Check if voting is open
    const session = await VotingSession.findOne().sort({ createdAt: -1 });
    if (!session || !session.isOpen) {
      return res.status(403).json({
        success: false,
        message: 'Voting is not open at this time',
      });
    }

    // TC06: Check if user already voted
    const existingVote = await Vote.findOne({ voterID });
    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted. One vote per person is allowed.',
      });
    }

    // Verify candidate exists
    const candidate = await Candidate.findById(candidateID);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found',
      });
    }

    // Create vote record
    const vote = new Vote({
      voterID,
      candidateID,
      ipAddress: req.ip,
    });

    await vote.save();

    // TC07: Update vote count in database
    candidate.voteCount += 1;
    await candidate.save();

    // Update user's hasVoted status
    await User.findByIdAndUpdate(voterID, { hasVoted: true });

    // Update session total votes
    session.totalVotes += 1;
    await session.save();

    return res.status(201).json({
      success: true,
      message: 'Vote cast successfully!',
      vote: {
        candidateID: vote.candidateID,
        timestamp: vote.timestamp,
      },
    });
  } catch (error) {
    console.error('Cast vote error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while casting vote',
      error: error.message,
    });
  }
});

// TC08: Verify vote cannot be changed after submission
router.post('/change-vote', verifyToken, async (req, res) => {
  try {
    return res.status(403).json({
      success: false,
      message: 'Vote cannot be changed after submission',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// Check if current user has voted
router.get('/check-vote-status', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    return res.status(200).json({
      success: true,
      hasVoted: user.hasVoted,
    });
  } catch (error) {
    console.error('Check vote status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

module.exports = router;
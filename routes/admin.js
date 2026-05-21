const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const VotingSession = require('../models/VotingSession');
const ElectionHistory = require('../models/ElectionHistory');

// Middleware to verify admin token
const verifyAdminToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

// TC09: Admin Dashboard
router.get('/dashboard', verifyAdminToken, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);

    if (admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access',
      });
    }

    const totalVoters = await User.countDocuments({ role: 'voter' });
    const totalCandidates = await Candidate.countDocuments({ isActive: true });
    const totalVotes = await Vote.countDocuments();

    return res.status(200).json({
      success: true,
      message: 'Welcome to Admin Dashboard',
      admin: {
        name: admin.name,
        email: admin.email,
      },
      stats: {
        totalVoters,
        totalCandidates,
        totalVotes,
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// TC10: Add a new candidate
router.post('/add-candidate', verifyAdminToken, async (req, res) => {
  try {
    const { name, party, symbol } = req.body;

    if (!name || !party) {
      return res.status(400).json({
        success: false,
        message: 'Candidate name and party are required',
      });
    }

    const candidate = new Candidate({
      name,
      party,
      symbol: symbol || '🔵',
      voteCount: 0,
      isActive: true,
    });

    await candidate.save();

    return res.status(201).json({
      success: true,
      message: 'Candidate added successfully',
      candidate,
    });
  } catch (error) {
    console.error('Add candidate error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while adding candidate',
      error: error.message,
    });
  }
});

// TC11: Remove a candidate (Hard delete - FIX for Issue 2)
router.delete('/remove-candidate/:candidateID', verifyAdminToken, async (req, res) => {
  try {
    const { candidateID } = req.params;

    const candidate = await Candidate.findById(candidateID);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found',
      });
    }

    // Hard delete - completely remove the candidate
    await Candidate.findByIdAndDelete(candidateID);

    return res.status(200).json({
      success: true,
      message: 'Candidate removed successfully',
    });
  } catch (error) {
    console.error('Remove candidate error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while removing candidate',
      error: error.message,
    });
  }
});

// Get all ACTIVE candidates only (FIX for Issue 2)
router.get('/candidates', verifyAdminToken, async (req, res) => {
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

// TC12: Open/Close voting session with election history
router.post('/toggle-voting', verifyAdminToken, async (req, res) => {
  try {
    const { isOpen } = req.body;

    let session = await VotingSession.findOne().sort({ createdAt: -1 });

    // If closing voting, save to history (FIX for Issue 1 & 3)
    if (!isOpen && session && session.isOpen) {
      await saveElectionToHistory(session);
      
      // Reset for new election
      await resetElectionData();
    }

    if (!session) {
      session = new VotingSession({
        electionName: `Election ${new Date().toLocaleDateString()}`,
        isOpen,
        startTime: isOpen ? new Date() : null,
        endTime: null,
        status: isOpen ? 'ongoing' : 'closed',
      });
    } else {
      session.isOpen = isOpen;
      if (isOpen) {
        session.startTime = new Date();
        session.status = 'ongoing';
      } else {
        session.endTime = new Date();
        session.status = 'completed';
      }
    }

    await session.save();

    return res.status(200).json({
      success: true,
      message: `Voting ${isOpen ? 'opened' : 'closed'} successfully`,
      session,
    });
  } catch (error) {
    console.error('Toggle voting error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while toggling voting',
      error: error.message,
    });
  }
});

// Save election to history
async function saveElectionToHistory(session) {
  try {
    const candidates = await Candidate.find();
    const totalVotes = await Vote.countDocuments();

    if (totalVotes === 0) return; // Don't save empty elections

    const candidatesData = candidates.map((c) => ({
      candidateId: c._id,
      name: c.name,
      party: c.party,
      symbol: c.symbol,
      voteCount: c.voteCount,
      percentage: totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(2) : 0,
    }));

    const winner = candidatesData.reduce((prev, current) =>
      prev.voteCount > current.voteCount ? prev : current
    );

    const history = new ElectionHistory({
      electionName: session.electionName || `Election ${new Date().toLocaleDateString()}`,
      startTime: session.startTime,
      endTime: new Date(),
      totalVotes: totalVotes,
      candidates: candidatesData,
      winner: {
        name: winner.name,
        party: winner.party,
        symbol: winner.symbol,
        voteCount: winner.voteCount,
        percentage: winner.percentage,
      },
    });

    await history.save();
    console.log('✓ Election saved to history');
  } catch (error) {
    console.error('Error saving election to history:', error);
  }
}

// Reset election data for new election
async function resetElectionData() {
  try {
    // Reset all votes
    await Vote.deleteMany({});
    
    // Reset candidate vote counts
    await Candidate.updateMany({}, { voteCount: 0 });
    
    // Reset user hasVoted status
    await User.updateMany({}, { hasVoted: false });
    
    console.log('✓ Election data reset for new election');
  } catch (error) {
    console.error('Error resetting election data:', error);
  }
}

// Get current voting status
router.get('/voting-status', verifyAdminToken, async (req, res) => {
  try {
    const session = await VotingSession.findOne().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      session: session || {
        isOpen: false,
        startTime: null,
        endTime: null,
      },
    });
  } catch (error) {
    console.error('Fetch voting status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// Get election history (last 5 elections) - NEW ENDPOINT for Issue 3
router.get('/election-history', verifyAdminToken, async (req, res) => {
  try {
    const history = await ElectionHistory.find()
      .sort({ createdAt: -1 })
      .limit(5);

    return res.status(200).json({
      success: true,
      message: 'Election history retrieved successfully',
      elections: history,
    });
  } catch (error) {
    console.error('Fetch election history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

module.exports = router;
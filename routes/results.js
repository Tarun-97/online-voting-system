const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const User = require('../models/User');

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

// TC15: Only admin can view detailed results
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
        message: 'Only admin can view results',
      });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
};

// TC13: Get results (Vote count) - FIXED: Only show ACTIVE candidates
router.get('/results', verifyAdminToken, async (req, res) => {
  try {
    // FIX: Only get active candidates
    const candidates = await Candidate.find({ isActive: true }).sort({ voteCount: -1 });

    if (candidates.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No candidates available',
        results: [],
        winner: null,
      });
    }

    // TC16: Identify winner (Highest votes)
    const winner = candidates[0];
    const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);

    // TC20: Handle no votes cast gracefully
    if (totalVotes === 0) {
      return res.status(200).json({
        success: true,
        message: 'No votes cast yet',
        results: candidates,
        winner: null,
        totalVotes: 0,
      });
    }

    const results = candidates.map((candidate) => ({
      id: candidate._id,
      name: candidate.name,
      party: candidate.party,
      symbol: candidate.symbol,
      voteCount: candidate.voteCount,
      percentage: ((candidate.voteCount / totalVotes) * 100).toFixed(2),
    }));

    return res.status(200).json({
      success: true,
      results,
      winner: {
        name: winner.name,
        party: winner.party,
        voteCount: winner.voteCount,
        percentage: ((winner.voteCount / totalVotes) * 100).toFixed(2),
      },
      totalVotes,
    });
  } catch (error) {
    console.error('Fetch results error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// TC14: Export results as PDF - FIXED: Only export ACTIVE candidates
router.get('/export-pdf', verifyAdminToken, async (req, res) => {
  try {
    // FIX: Only get active candidates
    const candidates = await Candidate.find({ isActive: true }).sort({ voteCount: -1 });
    const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);

    const doc = new PDFDocument();
    const filename = `voting_results_${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../public', filename);

    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text('VOTING RESULTS REPORT', { align: 'center' });
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1);

    // Summary
    doc.fontSize(12).font('Helvetica-Bold').text('SUMMARY', { underline: true });
    doc.fontSize(11).font('Helvetica').text(`Total Votes Cast: ${totalVotes}`);
    doc.text(`Total Candidates: ${candidates.length}`);
    doc.moveDown(1);

    // Results Table
    doc.fontSize(12).font('Helvetica-Bold').text('DETAILED RESULTS', { underline: true });
    doc.moveDown(0.5);

    // Table Headers
    const headers = ['Rank', 'Candidate Name', 'Party', 'Votes', 'Percentage'];
    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 120;
    const col3 = 220;
    const col4 = 300;
    const col5 = 380;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(headers[0], col1, tableTop);
    doc.text(headers[1], col2, tableTop);
    doc.text(headers[2], col3, tableTop);
    doc.text(headers[3], col4, tableTop);
    doc.text(headers[4], col5, tableTop);

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    doc.moveDown(1);

    // Table Data
    doc.fontSize(10).font('Helvetica');
    candidates.forEach((candidate, index) => {
      const percentage = totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(2) : 0;
      doc.text(index + 1, col1, doc.y);
      doc.text(candidate.name, col2, doc.y - 12);
      doc.text(candidate.party, col3, doc.y - 12);
      doc.text(candidate.voteCount.toString(), col4, doc.y - 12);
      doc.text(`${percentage}%`, col5, doc.y - 12);
      doc.moveDown(0.8);
    });

    // Winner
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold').text('WINNER', { underline: true });
    if (totalVotes > 0 && candidates.length > 0) {
      const winner = candidates[0];
      const percentage = ((winner.voteCount / totalVotes) * 100).toFixed(2);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Name: ${winner.name}`);
      doc.text(`Party: ${winner.party}`);
      doc.text(`Votes: ${winner.voteCount}`);
      doc.text(`Percentage: ${percentage}%`);
    } else {
      doc.fontSize(11).text('No votes cast yet');
    }

    doc.end();

    stream.on('finish', () => {
      res.download(filepath, filename, (err) => {
        if (err) console.error('Download error:', err);
        // Delete file after download
        fs.unlink(filepath, (err) => {
          if (err) console.error('File deletion error:', err);
        });
      });
    });

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      res.status(500).json({
        success: false,
        message: 'Error generating PDF',
        error: err.message,
      });
    });
  } catch (error) {
    console.error('Export PDF error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while exporting PDF',
      error: error.message,
    });
  }
});

module.exports = router;
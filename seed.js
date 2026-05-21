const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Candidate = require('./models/Candidate');
const VotingSession = require('./models/VotingSession');

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✓ MongoDB connected successfully');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

// Clear existing data
async function clearData() {
  try {
    console.log('\n📋 Clearing existing data...');
    await User.deleteMany({});
    await Candidate.deleteMany({});
    await VotingSession.deleteMany({});
    console.log('✓ Data cleared');
  } catch (error) {
    console.error('✗ Error clearing data:', error.message);
  }
}

// Hash password function
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

// Create admin user with pre-hashed password
async function createAdmin() {
  try {
    console.log('\n👨‍💼 Creating admin user...');
    
    const hashedPassword = await hashPassword('Admin@123');
    
    const admin = new User({
      voterID: 'ADMIN001',
      name: 'Admin User',
      email: 'admin@votingsystem.com',
      dateOfBirth: new Date('1990-01-01'),
      password: hashedPassword, // Pre-hashed password
      role: 'admin',
      hasVoted: false,
    });

    // Disable the pre-save hook to avoid double hashing
    await User.collection.insertOne(admin.toObject());

    console.log('✓ Admin created successfully');
    console.log('  Admin Credentials:');
    console.log('  - Voter ID: ADMIN001');
    console.log('  - Password: Admin@123');
  } catch (error) {
    console.error('✗ Error creating admin:', error.message);
  }
}

// Create test voters with pre-hashed passwords
async function createTestVoters() {
  try {
    console.log('\n👥 Creating test voters...');

    const voters = [
      {
        voterID: 'voter01',
        name: 'John Doe',
        email: 'john@example.com',
        dateOfBirth: new Date('1995-05-15'),
        password: 'Vote@123',
        role: 'voter',
      },
      {
        voterID: 'voter02',
        name: 'Jane Smith',
        email: 'jane@example.com',
        dateOfBirth: new Date('1998-03-22'),
        password: 'Vote@123',
        role: 'voter',
      },
      {
        voterID: 'voter03',
        name: 'Robert Johnson',
        email: 'robert@example.com',
        dateOfBirth: new Date('1992-07-10'),
        password: 'Vote@123',
        role: 'voter',
      },
      {
        voterID: 'voter04',
        name: 'Sarah Williams',
        email: 'sarah@example.com',
        dateOfBirth: new Date('2000-11-30'),
        password: 'Vote@123',
        role: 'voter',
      },
      {
        voterID: 'voter05',
        name: 'Michael Brown',
        email: 'michael@example.com',
        dateOfBirth: new Date('1997-09-18'),
        password: 'Vote@123',
        role: 'voter',
      },
    ];

    for (const voterData of voters) {
      const hashedPassword = await hashPassword(voterData.password);
      const voterObj = {
        ...voterData,
        password: hashedPassword,
      };
      await User.collection.insertOne(voterObj);
    }

    console.log(`✓ ${voters.length} test voters created successfully`);
    console.log('  Test Voter Credentials (all use password: Vote@123):');
    voters.forEach((voter) => {
      console.log(`  - Voter ID: ${voter.voterID} | Name: ${voter.name}`);
    });
  } catch (error) {
    console.error('✗ Error creating test voters:', error.message);
  }
}

// Create test candidates
async function createCandidates() {
  try {
    console.log('\n🎤 Creating test candidates...');

    const candidates = [
      {
        name: 'Candidate A',
        party: 'Party A',
        symbol: '🔵',
        voteCount: 0,
        isActive: true,
      },
      {
        name: 'Candidate B',
        party: 'Party B',
        symbol: '🟢',
        voteCount: 0,
        isActive: true,
      },
      {
        name: 'Candidate C',
        party: 'Party C',
        symbol: '🟡',
        voteCount: 0,
        isActive: true,
      },
      {
        name: 'Candidate D',
        party: 'Party D',
        symbol: '🔴',
        voteCount: 0,
        isActive: true,
      },
      {
        name: 'Candidate E',
        party: 'Party E',
        symbol: '⭐',
        voteCount: 0,
        isActive: true,
      },
    ];

    for (const candidateData of candidates) {
      const candidate = new Candidate(candidateData);
      await candidate.save();
    }

    console.log(`✓ ${candidates.length} test candidates created successfully`);
    candidates.forEach((candidate) => {
      console.log(`  - ${candidate.symbol} ${candidate.name} (${candidate.party})`);
    });
  } catch (error) {
    console.error('✗ Error creating candidates:', error.message);
  }
}

// Create voting session
async function createVotingSession() {
  try {
    console.log('\n🗳️ Creating voting session...');

    const session = new VotingSession({
      isOpen: false,
      startTime: null,
      endTime: null,
      totalVotes: 0,
    });

    await session.save();
    console.log('✓ Voting session created (Currently: CLOSED)');
    console.log('  Use Admin Dashboard to open voting when ready');
  } catch (error) {
    console.error('✗ Error creating voting session:', error.message);
  }
}

// Main function
async function seedDatabase() {
  try {
    console.log(`
╔════════════════════════════════════════╗
║      🗳️  DATABASE SEEDING STARTED     ║
╚════════════════════════════════════════╝
    `);

    await connectDB();
    await clearData();
    await createAdmin();
    await createTestVoters();
    await createCandidates();
    await createVotingSession();

    console.log(`
╔════════════════════════════════════════╗
║    ✅ DATABASE SEEDING COMPLETED       ║
╚════════════════════════════════════════╝

📝 SUMMARY:
   ✓ 1 Admin user created
   ✓ 5 Test voters created
   ✓ 5 Test candidates created
   ✓ 1 Voting session created (CLOSED)

🚀 NEXT STEPS:
   1. Start your server: npm run dev
   2. Open: http://localhost:5000
   3. Login as Admin or Voter
   4. Admin: Open voting session from dashboard
   5. Start voting!

📝 TEST CREDENTIALS:
   Admin: ADMIN001 / Admin@123
   Voters: voter01-voter05 / Vote@123
    `);

    process.exit(0);
  } catch (error) {
    console.error('✗ Seeding error:', error);
    process.exit(1);
  }
}

// Run seed
seedDatabase();
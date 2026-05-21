const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const votingRoutes = require('./routes/voting');
const adminRoutes = require('./routes/admin');
const resultsRoutes = require('./routes/results');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Get allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5000', 'http://localhost:3000'];

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Session configuration (TC17: Session management)
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
      mongoUrl: process.env.MONGODB_URI,
      touchAfter: 24 * 3600,
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production', // true in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
  })
);

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/voting', votingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/results', resultsRoutes);

// Security middleware - TC19: Prevent SQL Injection
app.use((req, res, next) => {
  const sqlInjectionPatterns = [
    /(\bOR\b|\bAND\b)\s*1\s*=\s*1/gi,
    /('|")\s*(\bOR\b|\bAND\b)\s*('|")/gi,
    /--\s*$/,
    /\/\*/,
    /\*\//,
  ];

  const checkString = (str) => {
    if (typeof str !== 'string') return false;
    return sqlInjectionPatterns.some((pattern) => pattern.test(str));
  };

  for (let key in req.body) {
    if (checkString(req.body[key])) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input detected',
      });
    }
  }

  for (let key in req.query) {
    if (checkString(req.query[key])) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input detected',
      });
    }
  }

  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🗳️  ONLINE VOTING SYSTEM STARTED    ║
║                                        ║
║   Server running on port: ${PORT}
║   Environment: ${process.env.NODE_ENV || 'development'}
╚════════════════════════════════════════╝
  `);
});

module.exports = app;
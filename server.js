const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data files if they don't exist
const WAITLIST_FILE = path.join(DATA_DIR, 'waitlist.json');
const BETA_FILE = path.join(DATA_DIR, 'beta_applications.json');

if (!fs.existsSync(WAITLIST_FILE)) {
  fs.writeFileSync(WAITLIST_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(BETA_FILE)) {
  fs.writeFileSync(BETA_FILE, JSON.stringify([], null, 2));
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const statsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper: read JSON file
function readJSON(filepath) {
  try {
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Helper: write JSON file
function writeJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

// Helper: validate email
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

// Routes - Pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/beta', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'beta.html'));
});

app.get('/thanks', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'thanks.html'));
});

app.get('/beta-thanks', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'beta-thanks.html'));
});

// API Routes
app.post('/api/waitlist', apiLimiter, (req, res) => {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const sanitizedEmail = String(email).toLowerCase().trim();
  const waitlist = readJSON(WAITLIST_FILE);

  // Check for duplicates
  if (waitlist.some(entry => entry.email === sanitizedEmail)) {
    return res.status(200).json({ message: "You're already on the list. We'll be in touch." });
  }

  waitlist.push({
    email: sanitizedEmail,
    timestamp: new Date().toISOString(),
    source: 'waitlist',
  });

  writeJSON(WAITLIST_FILE, waitlist);
  res.status(201).json({ message: "You're in. We'll be in touch soon." });
});

app.post('/api/beta-apply', apiLimiter, (req, res) => {
  const { name, email, linkedin, topic, engagements, feeRange } = req.body;

  // Validate required fields
  if (!name || !email || !topic) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const sanitizedEmail = String(email).toLowerCase().trim();
  const applications = readJSON(BETA_FILE);

  // Check for duplicates
  if (applications.some(entry => entry.email === sanitizedEmail)) {
    return res.status(200).json({ message: "We already have your application. We'll be reviewing it shortly." });
  }

  applications.push({
    name: String(name).trim(),
    email: sanitizedEmail,
    linkedin: linkedin ? String(linkedin).trim() : '',
    topic: String(topic).trim(),
    engagements: engagements || 'not specified',
    feeRange: feeRange || 'not specified',
    timestamp: new Date().toISOString(),
    status: 'pending',
  });

  writeJSON(BETA_FILE, applications);
  res.status(201).json({ message: 'Application received. We review every application personally.' });
});

app.get('/api/stats', statsLimiter, (req, res) => {
  const waitlist = readJSON(WAITLIST_FILE);
  const beta = readJSON(BETA_FILE);
  res.json({
    waitlistCount: waitlist.length,
    betaCount: beta.length,
    spotsRemaining: Math.max(0, 25 - beta.length),
  });
});

// 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Speaker Agent AI waitlist running on port ${PORT}`);
});

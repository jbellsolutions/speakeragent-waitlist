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
const ALPHA_FILE = path.join(DATA_DIR, 'alpha_members.json');
const REFERRALS_FILE = path.join(DATA_DIR, 'referrals.json');

if (!fs.existsSync(WAITLIST_FILE)) {
  fs.writeFileSync(WAITLIST_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(BETA_FILE)) {
  fs.writeFileSync(BETA_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(ALPHA_FILE)) {
  fs.writeFileSync(ALPHA_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(REFERRALS_FILE)) {
  fs.writeFileSync(REFERRALS_FILE, JSON.stringify([], null, 2));
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

// Helper: generate unique ref code (firstname-xxxx)
function generateRefCode(name) {
  const alphaMembers = readJSON(ALPHA_FILE);
  const firstName = String(name).trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '');
  const prefix = firstName || 'member';
  let code;
  let attempts = 0;

  do {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = prefix + '-' + suffix;
    attempts++;
  } while (alphaMembers.some(m => m.ref_code === code) && attempts < 100);

  return code;
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

app.get('/alpha', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'alpha.html'));
});

app.get('/alpha-thanks', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'alpha-thanks.html'));
});

// API Routes
app.post('/api/waitlist', apiLimiter, (req, res) => {
  const { email, ref } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const sanitizedEmail = String(email).toLowerCase().trim();
  const waitlist = readJSON(WAITLIST_FILE);

  // Check for duplicates
  if (waitlist.some(entry => entry.email === sanitizedEmail)) {
    return res.status(200).json({ message: "You're already on the list. We'll be in touch." });
  }

  const entry = {
    email: sanitizedEmail,
    timestamp: new Date().toISOString(),
    source: 'waitlist',
  };

  // Track referral if ref code provided
  if (ref) {
    const refCode = String(ref).trim().toLowerCase();
    const alphaMembers = readJSON(ALPHA_FILE);
    const referrer = alphaMembers.find(m => m.ref_code === refCode);

    if (referrer) {
      entry.referred_by = refCode;

      // Increment referral count on the alpha member
      referrer.referral_count = (referrer.referral_count || 0) + 1;
      writeJSON(ALPHA_FILE, alphaMembers);

      // Save to referrals log
      const referrals = readJSON(REFERRALS_FILE);
      referrals.push({
        ref_code: refCode,
        referred_email: sanitizedEmail,
        timestamp: new Date().toISOString(),
      });
      writeJSON(REFERRALS_FILE, referrals);
    }
  }

  waitlist.push(entry);
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

// Alpha Accept
app.post('/api/alpha-accept', apiLimiter, (req, res) => {
  const { name, email, linkedin, topic, relationship } = req.body;

  // Validate required fields
  if (!name || !email || !topic || !relationship) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const sanitizedEmail = String(email).toLowerCase().trim();
  const alphaMembers = readJSON(ALPHA_FILE);

  // Check for duplicates
  if (alphaMembers.some(entry => entry.email === sanitizedEmail)) {
    const existing = alphaMembers.find(entry => entry.email === sanitizedEmail);
    return res.status(200).json({
      success: true,
      ref_code: existing.ref_code,
      message: "You've already accepted. Welcome back.",
    });
  }

  // Check if alpha is full (50 spots)
  if (alphaMembers.length >= 50) {
    return res.status(400).json({ error: 'The alpha program is currently full. Contact tony@speakeragentai.com directly.' });
  }

  const refCode = generateRefCode(name);

  alphaMembers.push({
    name: String(name).trim(),
    email: sanitizedEmail,
    linkedin: linkedin ? String(linkedin).trim() : '',
    topic: String(topic).trim(),
    relationship: String(relationship).trim(),
    ref_code: refCode,
    accepted_at: new Date().toISOString(),
    referral_count: 0,
  });

  writeJSON(ALPHA_FILE, alphaMembers);
  res.status(201).json({ success: true, ref_code: refCode });
});

// Alpha Stats
app.get('/api/alpha-stats', statsLimiter, (req, res) => {
  const alphaMembers = readJSON(ALPHA_FILE);
  const referrals = readJSON(REFERRALS_FILE);
  res.json({
    memberCount: alphaMembers.length,
    totalReferrals: referrals.length,
    spotsRemaining: Math.max(0, 50 - alphaMembers.length),
  });
});

app.get('/api/stats', statsLimiter, (req, res) => {
  const waitlist = readJSON(WAITLIST_FILE);
  const beta = readJSON(BETA_FILE);
  const alphaMembers = readJSON(ALPHA_FILE);
  const referrals = readJSON(REFERRALS_FILE);
  res.json({
    waitlistCount: waitlist.length,
    betaCount: beta.length,
    spotsRemaining: Math.max(0, 25 - beta.length),
    alphaCount: alphaMembers.length,
    totalReferrals: referrals.length,
  });
});

// 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Speaker Agent AI waitlist running on port ${PORT}`);
});
